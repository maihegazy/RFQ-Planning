const ExcelJS = require('exceljs');
const { z } = require('zod');
const prisma = require('../../db/prisma');
const logger = require('../../config/logger');

const LOCATION_LIST = ['BCC', 'HCC', 'MCC'];
const MONTH_HEADERS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

class ImportService {
  // =============================================
  // PUBLIC METHODS - Resource Plan Import/Export
  // =============================================

  /**
   * Import resource plan from Excel - HANDLES REPEATED ROLES CORRECTLY
   */
  async importResourcePlan(rfqId, buffer) {
    const errors = [];
    const imported = [];
    const rows = []; // normalized -> {feature, role, level, location, year, month, fte, rowNumber, rowId}

    const rowSchema = z.object({
      feature: z.string().min(1),
      role: z.string().min(1),
      level: z.string().min(1),
      location: z.enum(LOCATION_LIST),
      year: z.number().min(2025).max(2050),
      month: z.number().min(1).max(12),
      fte: z.number().min(0).max(1).multipleOf(0.1),
      notes: z.string().optional(),
    });

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      const first = workbook.worksheets[0];
      if (!first) {
        return { success: false, imported: 0, errors: [{ row: 0, errors: ['Workbook is empty'] }] };
      }

      // Detect format: legacy (Year/Month columns) vs new (Jan..Dec columns)
      const headerVals = [];
      first.getRow(1).eachCell((cell) => headerVals.push(String(cell.value ?? '').trim()));
      const hasLegacyColumns = headerVals.some(h => /^year$/i.test(h)) && headerVals.some(h => /^month$/i.test(h));
      const hasNewMonths = MONTH_HEADERS.every(h => headerVals.includes(h));

      if (hasLegacyColumns && !hasNewMonths) {
        // Legacy format processing
        this._processLegacyFormat(first, rows, errors, rowSchema);
      } else {
        // New format processing
        this._processNewFormat(workbook, rows, errors, rowSchema);
      }

      if (errors.length > 0) {
        return { success: false, errors, imported: 0 };
      }

      // Process the normalized rows and create database records
      const result = await this._createDatabaseRecords(rfqId, rows);
      
      logger.info(`Imported ${result.imported.length} monthly allocations for RFQ ${rfqId}`);
      return { 
        success: true, 
        imported: result.imported.length, 
        details: result.imported 
      };

    } catch (error) {
      logger.error('Resource plan import error:', error);
      return { 
        success: false, 
        errors: [{ row: 0, errors: [error.message] }], 
        imported: 0 
      };
    }
  }

  /**
   * Generate RFQ-specific resource plan template
   */
  async generateRfqResourcePlanTemplate(rfqId) {
    try {
      const rfq = await prisma.rfq.findUnique({
        where: { id: rfqId },
        include: {
          features: {
            include: {
              profilePlans: {
                include: {
                  monthlyAllocations: {
                    orderBy: [{ year: 'asc' }, { month: 'asc' }],
                  },
                },
              },
            },
          },
        },
      });

      if (!rfq) {
        throw new Error('RFQ not found');
      }

      const workbook = new ExcelJS.Workbook();
      
      // Generate years from RFQ start/end
      const startYear = rfq.startYear;
      const endYear = rfq.endYear;
      const startMonth = rfq.startMonth || 1;
      const endMonth = rfq.endMonth || 12;

      // Create one worksheet per year
      for (let year = startYear; year <= endYear; year++) {
        const worksheet = workbook.addWorksheet(`ProjectPlan-${year}`);
        
        // Determine month range for this year
        const yearStartMonth = (year === startYear) ? startMonth : 1;
        const yearEndMonth = (year === endYear) ? endMonth : 12;
        
        this._setupRfqResourcePlanSheet(worksheet, yearStartMonth, yearEndMonth);
        await this._populateRfqData(worksheet, rfq, year, yearStartMonth, yearEndMonth);
      }

      const buffer = await workbook.xlsx.writeBuffer();
      const filename = `${rfq.name}-resource-plan-${startYear}-${endYear}.xlsx`.replace(/[^a-zA-Z0-9\-_\.]/g, '_');

      return { buffer, filename };
    } catch (error) {
      logger.error('RFQ resource plan template generation error:', error);
      throw error;
    }
  }

  /**
   * Generate generic resource plan template by years
   */
  async generateResourcePlanTemplateByYears(startYear, endYear) {
    const workbook = new ExcelJS.Workbook();
    for (let year = startYear; year <= endYear; year++) {
      const worksheet = workbook.addWorksheet(`ProjectPlan-${year}`);
      this._setupGenericResourcePlanSheet(worksheet);
      this._addExampleData(worksheet, 2, 1, 12);
    }
    return workbook.xlsx.writeBuffer();
  }

  /**
   * Generate placeholder template
   */
  async generateResourcePlanPlaceholderTemplate() {
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('ProjectPlan-XXXX');
    this._setupGenericResourcePlanSheet(worksheet);
    this._addExampleData(worksheet, 2, 1, 12);
    
    const infoSheet = workbook.addWorksheet('Instructions');
    infoSheet.getColumn(1).width = 100;
    infoSheet.addRow(['This is a placeholder template. When you provide Start/End Year, the file will include one sheet per year (e.g., ProjectPlan-2026, ProjectPlan-2027, …).']);
    
    return workbook.xlsx.writeBuffer();
  }

  // =============================================
  // PUBLIC METHODS - Rates Import/Export
  // =============================================

  /**
   * Import rates from Excel
   */
  async importRates(buffer, type = 'both') {
    const errors = [];
    const imported = { cost: 0, sell: 0 };

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      if (type === 'cost' || type === 'both') {
        const costSheet = workbook.getWorksheet('Cost Rates');
        if (costSheet) {
          const costResult = await this._importCostRates(costSheet);
          errors.push(...costResult.errors);
          imported.cost = costResult.imported;
        }
      }

      if (type === 'sell' || type === 'both') {
        const sellSheet = workbook.getWorksheet('Sell Rates');
        if (sellSheet) {
          const sellResult = await this._importSellRates(sellSheet);
          errors.push(...sellResult.errors);
          imported.sell = sellResult.imported;
        }
      }

      return {
        success: errors.length === 0,
        errors,
        imported,
      };
    } catch (error) {
      logger.error('Rates import error:', error);
      return {
        success: false,
        errors: [{ sheet: 'General', errors: [error.message] }],
        imported,
      };
    }
  }

  /**
   * Generate rates template
   */
  async generateRatesTemplate() {
    const workbook = new ExcelJS.Workbook();

    // Cost rates sheet
    const costSheet = workbook.addWorksheet('Cost Rates');
    costSheet.columns = [
      { header: 'Cost Center',    key: 'costCenter',   width: 15 },
      { header: 'Effective From', key: 'effectiveFrom', width: 15 },
      { header: 'Effective To',   key: 'effectiveTo',   width: 15 },
      { header: 'Cost €/h',       key: 'costPerHour',   width: 15 },
    ];
    costSheet.addRow({ 
      costCenter: 'HCC', 
      effectiveFrom: '2025-01-01', 
      effectiveTo: '2025-12-31', 
      costPerHour: 45 
    });
    costSheet.views = [{ state: 'frozen', ySplit: 1 }];

    // Sell rates sheet
    const sellSheet = workbook.addWorksheet('Sell Rates');
    sellSheet.columns = [
      { header: 'Location',       key: 'location',      width: 15 },
      { header: 'Level',          key: 'level',         width: 15 },
      { header: 'Use Case',       key: 'useCase',       width: 15 },
      { header: 'Effective From', key: 'effectiveFrom', width: 15 },
      { header: 'Effective To',   key: 'effectiveTo',   width: 15 },
      { header: 'Sell €/h',       key: 'sellPerHour',   width: 15 },
    ];
    sellSheet.addRow({ 
      location: 'HCC', 
      level: 'Senior', 
      useCase: 'UC1', 
      effectiveFrom: '2025-01-01', 
      effectiveTo: '2025-12-31', 
      sellPerHour: 70 
    });
    sellSheet.views = [{ state: 'frozen', ySplit: 1 }];

    return workbook.xlsx.writeBuffer();
  }

  // =============================================
  // PRIVATE METHODS - Resource Plan Processing
  // =============================================

  /**
   * Process legacy Excel format (Year/Month columns)
   */
  _processLegacyFormat(worksheet, rows, errors, rowSchema) {
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header
      
      try {
        const data = {
          feature: row.getCell(1).value?.toString().trim(),
          role: row.getCell(2).value?.toString().trim(),
          level: row.getCell(3).value?.toString().trim(),
          location: row.getCell(4).value?.toString().trim(),
          year: Number(row.getCell(5).value),
          month: Number(row.getCell(6).value),
          fte: Number(row.getCell(7).value),
          notes: row.getCell(8).value?.toString().trim(),
        };
        
        const validated = rowSchema.parse(data);
        rows.push({ 
          ...validated, 
          rowNumber: rowIndex,
          rowId: `legacy-${rowIndex}` // Unique identifier for legacy format
        });
      } catch (e) {
        errors.push({ 
          row: rowIndex, 
          errors: e.errors?.map(er => er.message) || [e.message] 
        });
      }
    });
  }

  /**
   * Process new Excel format (monthly columns)
   */
  _processNewFormat(workbook, rows, errors, rowSchema) {
    for (const worksheet of workbook.worksheets) {
      // Extract year from sheet name
      const yearMatch = (worksheet.name || '').match(/(\d{4})$/) || 
                       (worksheet.name || '').match(/ProjectPlan[-\s]?(\d{4})/i);
      
      if (!yearMatch) {
        errors.push({ 
          sheet: worksheet.name, 
          row: 1, 
          errors: ['Sheet name must end with a 4-digit year, e.g., ProjectPlan-2027'] 
        });
        continue;
      }
      
      const year = Number(yearMatch[1]);
      this._processWorksheetRows(worksheet, year, rows, errors, rowSchema);
    }
  }

  /**
   * Process individual worksheet rows
   */
  _processWorksheetRows(worksheet, year, rows, errors, rowSchema) {
    // Map headers to column numbers
    const headerIndex = {};
    worksheet.getRow(1).eachCell((cell, colNumber) => {
      const key = String(cell.value ?? '').trim();
      if (key) headerIndex[key] = colNumber;
    });

    const domainCol = headerIndex['Domain'] ?? 1;
    const roleCol = headerIndex['Role'] ?? 2;
    const levelCol = headerIndex['Level'] ?? 3;
    const locationCol = headerIndex['Location'] ?? 4;

    const monthCols = MONTH_HEADERS.map((monthName, idx) => ({
      name: monthName,
      month: idx + 1,
      col: headerIndex[monthName]
    }));

    if (monthCols.some(c => !c.col)) {
      errors.push({ 
        sheet: worksheet.name, 
        row: 1, 
        errors: ['Missing month columns (Jan..Dec).'] 
      });
      return;
    }

    let currentFeature = null;

    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header

      const domainVal = (row.getCell(domainCol).value ?? '').toString().trim();
      const roleVal = (row.getCell(roleCol).value ?? '').toString().trim();
      const levelVal = (row.getCell(levelCol).value ?? '').toString().trim();
      const locationVal = (row.getCell(locationCol).value ?? '').toString().trim();

      const monthsEmpty = monthCols.every(c => {
        const value = row.getCell(c.col).value;
        return value === null || value === undefined || value === '';
      });

      // Check if this is a domain header row
      const isDomainHeader = domainVal && !roleVal && !levelVal && !locationVal && monthsEmpty;
      if (isDomainHeader) {
        currentFeature = domainVal;
        return;
      }

      // Skip completely empty rows
      if (!domainVal && !roleVal && !levelVal && !locationVal && monthsEmpty) return;

      const featureName = domainVal || currentFeature;
      if (!featureName) {
        errors.push({ 
          sheet: worksheet.name, 
          row: rowIndex, 
          errors: ['Missing Domain: add a section row above with the domain name in column A.'] 
        });
        return;
      }

      // Validate required fields
      if (!roleVal) {
        errors.push({ sheet: worksheet.name, row: rowIndex, errors: ['Role is required'] });
        return;
      }
      if (!levelVal) {
        errors.push({ sheet: worksheet.name, row: rowIndex, errors: ['Level is required'] });
        return;
      }
      if (!LOCATION_LIST.includes(locationVal)) {
        errors.push({ 
          sheet: worksheet.name, 
          row: rowIndex, 
          errors: [`Invalid Location '${locationVal}'. Allowed: ${LOCATION_LIST.join(', ')}`] 
        });
        return;
      }

      // Process each month column
      const rowId = `${worksheet.name}-${rowIndex}`;
      
      monthCols.forEach(({ name, month, col }) => {
        const rawValue = row.getCell(col).value;
        if (rawValue === null || rawValue === undefined || rawValue === '') return;

        const fteValue = Number(rawValue);
        if (Number.isNaN(fteValue)) {
          errors.push({ 
            sheet: worksheet.name, 
            row: rowIndex, 
            errors: [`${name}: not a number`] 
          });
          return;
        }
        if (fteValue < 0 || fteValue > 1) {
          errors.push({ 
            sheet: worksheet.name, 
            row: rowIndex, 
            errors: [`${name}: FTE must be between 0 and 1`] 
          });
          return;
        }

        const fteRounded = Math.round(fteValue * 10) / 10;

        try {
          const normalized = rowSchema.parse({
            feature: featureName,
            role: roleVal,
            level: levelVal,
            location: locationVal,
            year,
            month,
            fte: fteRounded,
          });
          rows.push({ ...normalized, rowNumber: rowIndex, rowId });
        } catch (e) {
          errors.push({ 
            sheet: worksheet.name, 
            row: rowIndex, 
            errors: e.errors?.map(er => er.message) || [e.message] 
          });
        }
      });
    });
  }

  /**
   * Create database records from normalized rows - HANDLES REPEATED ROLES
   */
  async _createDatabaseRecords(rfqId, rows) {
    const featureMap = new Map();
    const imported = [];

    return await prisma.$transaction(async (tx) => {
      // Create/get features
      for (const row of rows) {
        if (!featureMap.has(row.feature)) {
          let feature = await tx.feature.findFirst({ 
            where: { rfqId, name: row.feature } 
          });
          if (!feature) {
            feature = await tx.feature.create({ 
              data: { rfqId, name: row.feature } 
            });
          }
          featureMap.set(row.feature, feature.id);
        }
      }

      // Group rows by unique profile signature (including rowId for uniqueness)
      const profileGroups = new Map();
      for (const row of rows) {
        const featureId = featureMap.get(row.feature);
        // Use rowId to ensure each Excel row can create a separate profile
        const profileKey = `${featureId}-${row.role}-${row.level}-${row.location}-${row.rowId}`;
        
        if (!profileGroups.has(profileKey)) {
          profileGroups.set(profileKey, {
            featureId,
            role: row.role,
            level: row.level,
            location: row.location,
            rowId: row.rowId,
            allocations: []
          });
        }
        
        profileGroups.get(profileKey).allocations.push({
          year: row.year,
          month: row.month,
          fte: row.fte
        });
      }

      // Create profile plans for each unique group
      for (const [profileKey, profileData] of profileGroups) {
        let profilePlanId;

        // Check if an identical profile already exists
        const existingProfile = await tx.profilePlan.findFirst({
          where: {
            rfqId,
            featureId: profileData.featureId,
            role: profileData.role,
            level: profileData.level,
            location: profileData.location,
          },
          include: {
            monthlyAllocations: true,
          },
        });

        if (existingProfile) {
          // Check for conflicting allocations
          const hasConflicts = profileData.allocations.some(newAlloc => 
            existingProfile.monthlyAllocations.some(existing => 
              existing.year === newAlloc.year && 
              existing.month === newAlloc.month &&
              parseFloat(existing.fte) !== newAlloc.fte
            )
          );

          if (hasConflicts) {
            // Create new profile for conflicting data
            const newProfile = await tx.profilePlan.create({
              data: {
                rfqId,
                featureId: profileData.featureId,
                role: profileData.role,
                level: profileData.level,
                location: profileData.location,
                notes: `Imported ${new Date().toISOString().split('T')[0]}`,
              },
            });
            profilePlanId = newProfile.id;
          } else {
            // Use existing profile
            profilePlanId = existingProfile.id;
          }
        } else {
          // Create new profile
          const newProfile = await tx.profilePlan.create({
            data: {
              rfqId,
              featureId: profileData.featureId,
              role: profileData.role,
              level: profileData.level,
              location: profileData.location,
            },
          });
          profilePlanId = newProfile.id;
        }

        // Upsert monthly allocations
        for (const allocation of profileData.allocations) {
          await tx.monthlyAllocation.upsert({
            where: { 
              profilePlanId_year_month: { 
                profilePlanId, 
                year: allocation.year, 
                month: allocation.month 
              } 
            },
            update: { fte: allocation.fte },
            create: { 
              profilePlanId, 
              year: allocation.year, 
              month: allocation.month, 
              fte: allocation.fte 
            },
          });

          imported.push({
            row: rows.find(r => 
              r.year === allocation.year && 
              r.month === allocation.month &&
              r.rowId === profileData.rowId
            )?.rowNumber,
            feature: profileData.role,
            profile: `${profileData.role}/${profileData.level}@${profileData.location}`,
            allocation: `${allocation.year}-${allocation.month}: ${allocation.fte}`,
          });
        }
      }

      return { imported };
    });
  }

  // =============================================
  // PRIVATE METHODS - Template Generation
  // =============================================

  /**
   * Setup RFQ-specific resource plan sheet with dynamic month columns
   */
  _setupRfqResourcePlanSheet(worksheet, startMonth, endMonth) {
    const baseColumns = [
      { header: 'Domain',   key: 'domain',   width: 28 },
      { header: 'Role',     key: 'role',     width: 26 },
      { header: 'Level',    key: 'level',    width: 14 },
      { header: 'Location', key: 'location', width: 10 },
    ];

    const monthColumns = [];
    for (let month = startMonth; month <= endMonth; month++) {
      const monthName = MONTH_HEADERS[month - 1];
      monthColumns.push({ 
        header: monthName, 
        key: monthName.toLowerCase(), 
        width: 8 
      });
    }

    const sumColumn = { header: 'SUM', key: 'sum', width: 10 };
    worksheet.columns = [...baseColumns, ...monthColumns, sumColumn];

    this._styleWorksheetHeader(worksheet);
    this._addWorksheetValidations(worksheet, startMonth, endMonth);
  }

  /**
   * Setup generic resource plan sheet with all 12 months
   */
  _setupGenericResourcePlanSheet(worksheet) {
    worksheet.columns = [
      { header: 'Domain',   key: 'domain',   width: 28 },
      { header: 'Role',     key: 'role',     width: 26 },
      { header: 'Level',    key: 'level',    width: 14 },
      { header: 'Location', key: 'location', width: 10 },
      ...MONTH_HEADERS.map(h => ({ header: h, key: h.toLowerCase(), width: 8 })),
      { header: 'SUM',      key: 'sum',      width: 10 },
    ];

    this._styleWorksheetHeader(worksheet);
    this._addWorksheetValidations(worksheet, 1, 12);
  }

  /**
   * Apply consistent header styling
   */
  _styleWorksheetHeader(worksheet) {
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' },
    };
    worksheet.views = [{ state: 'frozen', ySplit: 1 }];
  }

  /**
   * Add data validations to worksheet
   */
  _addWorksheetValidations(worksheet, startMonth, endMonth) {
    // Location validation
    worksheet.dataValidations.add(`D2:D1000`, {
      type: 'list',
      formulae: [`"${LOCATION_LIST.join(',')}"`],
      allowBlank: true
    });

    // FTE validation for month columns
    const monthStartCol = 5; // Column E
    const monthEndCol = monthStartCol + (endMonth - startMonth);
    const monthRange = `${this._getColumnLetter(monthStartCol)}2:${this._getColumnLetter(monthEndCol)}1000`;
    
    worksheet.dataValidations.add(monthRange, {
      type: 'decimal',
      operator: 'between',
      formulae: [0, 1],
      allowBlank: true
    });
  }

  /**
   * Populate worksheet with existing RFQ data
   */
  async _populateRfqData(worksheet, rfq, year, startMonth, endMonth) {
    let currentRow = 2;

    // Group profiles by feature
    const featureGroups = new Map();
    
    for (const feature of rfq.features) {
      if (!featureGroups.has(feature.name)) {
        featureGroups.set(feature.name, []);
      }
      
      for (const profile of feature.profilePlans) {
        const allocations = profile.monthlyAllocations
          .filter(alloc => alloc.year === year)
          .reduce((acc, alloc) => {
            acc[alloc.month] = parseFloat(alloc.fte);
            return acc;
          }, {});

        featureGroups.get(feature.name).push({
          role: profile.role,
          level: profile.level,
          location: profile.location,
          allocations,
          notes: profile.notes,
        });
      }
    }

    // Add data to worksheet
    for (const [featureName, profiles] of featureGroups) {
      currentRow = this._addFeatureSection(worksheet, featureName, profiles, currentRow, startMonth, endMonth);
    }

    // Add example data if no existing data
    if (featureGroups.size === 0) {
      this._addExampleData(worksheet, currentRow, startMonth, endMonth);
    }
  }

  /**
   * Add a feature section to the worksheet
   */
  _addFeatureSection(worksheet, featureName, profiles, startRow, startMonth, endMonth) {
    // Feature header
    const featureRow = worksheet.getRow(startRow);
    featureRow.getCell(1).value = featureName;
    featureRow.font = { bold: true };
    featureRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F8FF' },
    };
    let currentRow = startRow + 1;

    // Profile rows
    for (const profile of profiles) {
      const row = worksheet.getRow(currentRow);
      row.getCell(1).value = ''; // Empty domain for profile rows
      row.getCell(2).value = profile.role;
      row.getCell(3).value = profile.level;
      row.getCell(4).value = profile.location;

      // Month allocations
      for (let month = startMonth; month <= endMonth; month++) {
        const colIndex = 5 + (month - startMonth);
        const fte = profile.allocations[month] || 0;
        row.getCell(colIndex).value = fte || null;
      }

      // SUM formula
      const sumColIndex = 5 + (endMonth - startMonth) + 1;
      const startCol = this._getColumnLetter(5);
      const endCol = this._getColumnLetter(5 + (endMonth - startMonth));
      row.getCell(sumColIndex).value = { 
        formula: `SUM(${startCol}${currentRow}:${endCol}${currentRow})` 
      };

      currentRow++;
    }

    return currentRow + 1; // Add spacing between features
  }

  /**
   * Add example data to worksheet
   */
  _addExampleData(worksheet, startRow, startMonth, endMonth) {
    // Example feature header
    const featureRow = worksheet.getRow(startRow);
    featureRow.getCell(1).value = 'Example Feature';
    featureRow.font = { bold: true };
    featureRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF0F8FF' },
    };

    // Example profiles (including duplicates to show it's allowed)
    const exampleProfiles = [
      { role: 'SW Developer', level: 'Senior', location: 'HCC' },
      { role: 'SW Developer', level: 'Senior', location: 'HCC' }, // Duplicate!
      { role: 'SW Test engineer (UT, IT)', level: 'Senior', location: 'MCC' },
    ];

    for (let i = 0; i < exampleProfiles.length; i++) {
      const row = worksheet.getRow(startRow + 1 + i);
      const profile = exampleProfiles[i];
      
      row.getCell(1).value = '';
      row.getCell(2).value = profile.role;
      row.getCell(3).value = profile.level;
      row.getCell(4).value = profile.location;

      // Example FTE values
      for (let month = startMonth; month <= endMonth; month++) {
        const colIndex = 5 + (month - startMonth);
        row.getCell(colIndex).value = 1.0;
      }

      // SUM formula
      const sumColIndex = 5 + (endMonth - startMonth) + 1;
      const startCol = this._getColumnLetter(5);
      const endCol = this._getColumnLetter(5 + (endMonth - startMonth));
      row.getCell(sumColIndex).value = { 
        formula: `SUM(${startCol}${startRow + 1 + i}:${endCol}${startRow + 1 + i})` 
      };
    }
  }

  // =============================================
  // PRIVATE METHODS - Rates Processing
  // =============================================

  /**
   * Import cost rates from worksheet
   */
  async _importCostRates(worksheet) {
    const errors = [];
    let imported = 0;

    const rowSchema = z.object({
      costCenter: z.enum(['BCC', 'HCC', 'MCC']),
      effectiveFrom: z.date(),
      effectiveTo: z.date(),
      costPerHour: z.number().positive(),
    });

    const rows = [];
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header
      rows.push({ row, rowIndex });
    });

    for (const { row, rowIndex } of rows) {
      try {
        const data = {
          costCenter: row.getCell(1).value?.toString().trim(),
          effectiveFrom: new Date(row.getCell(2).value),
          effectiveTo: new Date(row.getCell(3).value),
          costPerHour: parseFloat(row.getCell(4).value),
        };

        const validated = rowSchema.parse(data);

        // Check for overlapping rates
        const overlap = await prisma.costRate.findFirst({
          where: {
            costCenter: validated.costCenter,
            OR: [
              {
                effectiveFrom: { lte: validated.effectiveTo },
                effectiveTo: { gte: validated.effectiveFrom },
              },
            ],
          },
        });

        if (overlap) {
          errors.push({
            sheet: 'Cost Rates',
            row: rowIndex,
            errors: ['Overlapping date range with existing rate'],
          });
        } else {
          await prisma.costRate.create({ data: validated });
          imported++;
        }
      } catch (error) {
        errors.push({
          sheet: 'Cost Rates',
          row: rowIndex,
          errors: error.errors?.map(e => e.message) || [error.message],
        });
      }
    }

    return { errors, imported };
  }

  /**
   * Import sell rates from worksheet
   */
  async _importSellRates(worksheet) {
    const errors = [];
    let imported = 0;

    const rowSchema = z.object({
      location: z.enum(['BCC', 'HCC', 'MCC']),
      level: z.string().min(1),
      useCase: z.string().min(1),
      effectiveFrom: z.date(),
      effectiveTo: z.date(),
      sellPerHour: z.number().positive(),
    });

    const rows = [];
    worksheet.eachRow((row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header
      rows.push({ row, rowIndex });
    });

    for (const { row, rowIndex } of rows) {
      try {
        const data = {
          location: row.getCell(1).value?.toString().trim(),
          level: row.getCell(2).value?.toString().trim(),
          useCase: row.getCell(3).value?.toString().trim(),
          effectiveFrom: new Date(row.getCell(4).value),
          effectiveTo: new Date(row.getCell(5).value),
          sellPerHour: parseFloat(row.getCell(6).value),
        };

        const validated = rowSchema.parse(data);

        // Check for overlapping rates
        const overlap = await prisma.sellRate.findFirst({
          where: {
            location: validated.location,
            level: validated.level,
            useCase: validated.useCase,
            OR: [
              {
                effectiveFrom: { lte: validated.effectiveTo },
                effectiveTo: { gte: validated.effectiveFrom },
              },
            ],
          },
        });

        if (overlap) {
          errors.push({
            sheet: 'Sell Rates',
            row: rowIndex,
            errors: ['Overlapping date range with existing rate'],
          });
        } else {
          await prisma.sellRate.create({ data: validated });
          imported++;
        }
      } catch (error) {
        errors.push({
          sheet: 'Sell Rates',
          row: rowIndex,
          errors: error.errors?.map(e => e.message) || [error.message],
        });
      }
    }

    return { errors, imported };
  }

  // =============================================
  // UTILITY METHODS
  // =============================================

  /**
   * Convert column number to Excel letter (1=A, 2=B, etc.)
   */
  _getColumnLetter(columnNumber) {
    let result = '';
    while (columnNumber > 0) {
      columnNumber--;
      result = String.fromCharCode(65 + (columnNumber % 26)) + result;
      columnNumber = Math.floor(columnNumber / 26);
    }
    return result;
  }

  /**
   * Unified template generation entry point
   */
  async generateTemplateByType(type, params = {}) {
    if (type === 'resource-plan') {
      const { startYear, endYear } = params;
      return this.generateResourcePlanTemplateByYears(startYear, endYear);
    }
    if (type === 'rates') {
      return this.generateRatesTemplate();
    }
    
    const error = new Error('Unsupported template type');
    error.status = 400;
    throw error;
  }
}

module.exports = new ImportService();