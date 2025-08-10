const ExcelJS = require('exceljs');
const { z } = require('zod');
const prisma = require('../../db/prisma');
const logger = require('../../config/logger');

class ImportService {
  /**
   * Import resource plan from Excel
   */
  async importResourcePlan(rfqId, buffer) {
    const errors = [];
    const imported = [];

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);
      const worksheet = workbook.getWorksheet(1);

      // Define expected schema
      const rowSchema = z.object({
        feature: z.string().min(1),
        role: z.string().min(1),
        level: z.string().min(1),
        location: z.enum(['BCC', 'HCC', 'MCC']),
        year: z.number().min(2025).max(2050),
        month: z.number().min(1).max(12),
        fte: z.number().min(0).max(1).multipleOf(0.1),
        notes: z.string().optional(),
      });

      // Skip header row
      let rowNumber = 2;
      const featureMap = new Map();
      const profileMap = new Map();

      // First pass: collect all data and validate
      const rows = [];
      worksheet.eachRow((row, rowIndex) => {
        if (rowIndex === 1) return; // Skip header

        try {
          const data = {
            feature: row.getCell(1).value?.toString().trim(),
            role: row.getCell(2).value?.toString().trim(),
            level: row.getCell(3).value?.toString().trim(),
            location: row.getCell(4).value?.toString().trim(),
            year: parseInt(row.getCell(5).value),
            month: parseInt(row.getCell(6).value),
            fte: parseFloat(row.getCell(7).value),
            notes: row.getCell(8).value?.toString().trim(),
          };

          const validated = rowSchema.parse(data);
          rows.push({ ...validated, rowNumber: rowIndex });
        } catch (error) {
          errors.push({
            row: rowIndex,
            errors: error.errors?.map(e => e.message) || [error.message],
          });
        }
      });

      // If there are validation errors, return them
      if (errors.length > 0) {
        return {
          success: false,
          errors,
          imported: 0,
        };
      }

      // Second pass: import data
      await prisma.$transaction(async (tx) => {
        // Create/get features
        for (const row of rows) {
          if (!featureMap.has(row.feature)) {
            let feature = await tx.feature.findFirst({
              where: {
                rfqId,
                name: row.feature,
              },
            });

            if (!feature) {
              feature = await tx.feature.create({
                data: {
                  rfqId,
                  name: row.feature,
                },
              });
            }

            featureMap.set(row.feature, feature.id);
          }
        }

        // Create/get profile plans
        for (const row of rows) {
          const featureId = featureMap.get(row.feature);
          const profileKey = `${featureId}-${row.role}-${row.level}-${row.location}`;

          if (!profileMap.has(profileKey)) {
            let profile = await tx.profilePlan.findFirst({
              where: {
                rfqId,
                featureId,
                role: row.role,
                level: row.level,
                location: row.location,
              },
            });

            if (!profile) {
              profile = await tx.profilePlan.create({
                data: {
                  rfqId,
                  featureId,
                  role: row.role,
                  level: row.level,
                  location: row.location,
                  notes: row.notes,
                },
              });
            }

            profileMap.set(profileKey, profile.id);
          }
        }

        // Create/update monthly allocations
        for (const row of rows) {
          const featureId = featureMap.get(row.feature);
          const profileKey = `${featureId}-${row.role}-${row.level}-${row.location}`;
          const profilePlanId = profileMap.get(profileKey);

          await tx.monthlyAllocation.upsert({
            where: {
              profilePlanId_year_month: {
                profilePlanId,
                year: row.year,
                month: row.month,
              },
            },
            update: {
              fte: row.fte,
            },
            create: {
              profilePlanId,
              year: row.year,
              month: row.month,
              fte: row.fte,
            },
          });

          imported.push({
            row: row.rowNumber,
            feature: row.feature,
            profile: `${row.role}/${row.level}@${row.location}`,
            allocation: `${row.year}-${row.month}: ${row.fte}`,
          });
        }
      });

      logger.info(`Imported ${imported.length} resource allocations for RFQ ${rfqId}`);

      return {
        success: true,
        imported: imported.length,
        details: imported,
      };
    } catch (error) {
      logger.error('Resource plan import error:', error);
      return {
        success: false,
        errors: [{ row: 0, errors: [error.message] }],
        imported: 0,
      };
    }
  }

  /**
   * Import rates from Excel
   */
  async importRates(buffer, type = 'both') {
    const errors = [];
    const imported = { cost: 0, sell: 0 };

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(buffer);

      // Import cost rates
      if (type === 'cost' || type === 'both') {
        const costSheet = workbook.getWorksheet('Cost Rates');
        if (costSheet) {
          const costResult = await this.importCostRates(costSheet);
          if (costResult.errors.length > 0) {
            errors.push(...costResult.errors);
          }
          imported.cost = costResult.imported;
        }
      }

      // Import sell rates
      if (type === 'sell' || type === 'both') {
        const sellSheet = workbook.getWorksheet('Sell Rates');
        if (sellSheet) {
          const sellResult = await this.importSellRates(sellSheet);
          if (sellResult.errors.length > 0) {
            errors.push(...sellResult.errors);
          }
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

  async importCostRates(worksheet) {
    const errors = [];
    let imported = 0;

    const rowSchema = z.object({
      costCenter: z.enum(['BCC', 'HCC', 'MCC']),
      effectiveFrom: z.date(),
      effectiveTo: z.date(),
      costPerHour: z.number().positive(),
    });

    worksheet.eachRow(async (row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header

      try {
        const data = {
          costCenter: row.getCell(1).value?.toString().trim(),
          effectiveFrom: new Date(row.getCell(2).value),
          effectiveTo: new Date(row.getCell(3).value),
          costPerHour: parseFloat(row.getCell(4).value),
        };

        const validated = rowSchema.parse(data);

        // Check for overlapping rates
        const overlap = await prisma.rateCost.findFirst({
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
          await prisma.rateCost.create({
            data: validated,
          });
          imported++;
        }
      } catch (error) {
        errors.push({
          sheet: 'Cost Rates',
          row: rowIndex,
          errors: error.errors?.map(e => e.message) || [error.message],
        });
      }
    });

    return { errors, imported };
  }

  async importSellRates(worksheet) {
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

    worksheet.eachRow(async (row, rowIndex) => {
      if (rowIndex === 1) return; // Skip header

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
        const overlap = await prisma.rateSell.findFirst({
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
          await prisma.rateSell.create({
            data: validated,
          });
          imported++;
        }
      } catch (error) {
        errors.push({
          sheet: 'Sell Rates',
          row: rowIndex,
          errors: error.errors?.map(e => e.message) || [error.message],
        });
      }
    });

    return { errors, imported };
  }

  /**
   * Generate import templates
   */
  async generateTemplates() {
    const workbook = new ExcelJS.Workbook();

    // Resource Plan template
    const resourceSheet = workbook.addWorksheet('Resource Plan');
    resourceSheet.columns = [
      { header: 'Feature', key: 'feature', width: 30 },
      { header: 'Role', key: 'role', width: 20 },
      { header: 'Level', key: 'level', width: 15 },
      { header: 'Location', key: 'location', width: 10 },
      { header: 'Year', key: 'year', width: 10 },
      { header: 'Month', key: 'month', width: 10 },
      { header: 'FTE', key: 'fte', width: 10 },
      { header: 'Notes', key: 'notes', width: 30 },
    ];

    // Add sample data
    resourceSheet.addRow({
      feature: 'Core Development',
      role: 'Developer',
      level: 'Senior',
      location: 'HCC',
      year: 2026,
      month: 1,
      fte: 1.0,
      notes: 'Full-time allocation',
    });

    // Cost Rates template
    const costSheet = workbook.addWorksheet('Cost Rates');
    costSheet.columns = [
      { header: 'Cost Center', key: 'costCenter', width: 15 },
      { header: 'Effective From', key: 'effectiveFrom', width: 15 },
      { header: 'Effective To', key: 'effectiveTo', width: 15 },
      { header: 'Cost €/h', key: 'costPerHour', width: 15 },
    ];

    costSheet.addRow({
      costCenter: 'HCC',
      effectiveFrom: '2025-01-01',
      effectiveTo: '2025-12-31',
      costPerHour: 45,
    });

    // Sell Rates template
    const sellSheet = workbook.addWorksheet('Sell Rates');
    sellSheet.columns = [
      { header: 'Location', key: 'location', width: 15 },
      { header: 'Level', key: 'level', width: 15 },
      { header: 'Use Case', key: 'useCase', width: 15 },
      { header: 'Effective From', key: 'effectiveFrom', width: 15 },
      { header: 'Effective To', key: 'effectiveTo', width: 15 },
      { header: 'Sell €/h', key: 'sellPerHour', width: 15 },
    ];

    sellSheet.addRow({
      location: 'HCC',
      level: 'Senior',
      useCase: 'UC1',
      effectiveFrom: '2025-01-01',
      effectiveTo: '2025-12-31',
      sellPerHour: 70,
    });

    return workbook.xlsx.writeBuffer();
  }
}

module.exports = new ImportService();