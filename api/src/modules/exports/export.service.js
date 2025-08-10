const ExcelJS = require('exceljs');
const puppeteer = require('puppeteer');
const prisma = require('../../db/prisma');
const calcService = require('../calc/calc.service');
const nextCloudService = require('../../utils/nextcloud');
const logger = require('../../config/logger');

class ExportService {
  /**
   * Export yearly plan to Excel
   */
  async exportYearlyPlan(rfqId) {
    try {
      const rfq = await prisma.rfq.findUnique({
        where: { id: rfqId },
        include: {
          features: true,
          profilePlans: {
            include: {
              monthlyAllocations: {
                orderBy: [{ year: 'asc' }, { month: 'asc' }],
              },
              feature: true,
            },
          },
        },
      });

      const workbook = new ExcelJS.Workbook();
      const worksheet = workbook.addWorksheet('Yearly Plan');

      // Define columns
      worksheet.columns = [
        { header: 'RFQ', key: 'rfq', width: 30 },
        { header: 'Year', key: 'year', width: 10 },
        { header: 'Month', key: 'month', width: 10 },
        { header: 'Feature', key: 'feature', width: 30 },
        { header: 'Role', key: 'role', width: 20 },
        { header: 'Level', key: 'level', width: 15 },
        { header: 'Location/Cost Center', key: 'location', width: 20 },
        { header: 'FTE', key: 'fte', width: 10 },
        { header: 'Hours', key: 'hours', width: 10 },
        { header: 'Notes', key: 'notes', width: 30 },
      ];

      // Add data rows
      for (const profile of rfq.profilePlans) {
        for (const allocation of profile.monthlyAllocations) {
          worksheet.addRow({
            rfq: rfq.name,
            year: allocation.year,
            month: allocation.month,
            feature: profile.feature.name,
            role: profile.role,
            level: profile.level,
            location: profile.location,
            fte: parseFloat(allocation.fte),
            hours: parseFloat(allocation.fte) * 160,
            notes: profile.notes || '',
          });
        }
      }

      // Add totals
      worksheet.addRow({}); // Empty row
      
      // Calculate totals per cost center and year
      const totals = {};
      for (const profile of rfq.profilePlans) {
        for (const allocation of profile.monthlyAllocations) {
          const key = `${profile.location}-${allocation.year}`;
          if (!totals[key]) {
            totals[key] = {
              location: profile.location,
              year: allocation.year,
              totalFTE: 0,
              totalHours: 0,
            };
          }
          totals[key].totalFTE += parseFloat(allocation.fte);
          totals[key].totalHours += parseFloat(allocation.fte) * 160;
        }
      }

      // Add summary section
      worksheet.addRow({ rfq: 'SUMMARY BY COST CENTER AND YEAR' });
      worksheet.addRow({
        rfq: 'Cost Center',
        year: 'Year',
        feature: 'Total FTE',
        role: 'Total Hours',
      });

      for (const total of Object.values(totals)) {
        worksheet.addRow({
          rfq: total.location,
          year: total.year,
          feature: total.totalFTE.toFixed(1),
          role: total.totalHours.toFixed(0),
        });
      }

      // Apply styles
      worksheet.getRow(1).font = { bold: true };
      worksheet.getRow(1).fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFE0E0E0' },
      };

      return workbook.xlsx.writeBuffer();
    } catch (error) {
      logger.error('Yearly plan export error:', error);
      throw error;
    }
  }

  /**
   * Generate Executive PDF
   */
  async generateExecutivePDF(rfqId, decisionPackageId) {
    try {
      const rfq = await prisma.rfq.findUnique({
        where: { id: rfqId },
        include: {
          createdBy: true,
          decisionPackages: {
            where: { id: decisionPackageId },
            include: {
              scenarios: {
                include: {
                  scenario: {
                    include: {
                      additionalCosts: true,
                    },
                  },
                },
              },
            },
          },
          hwItems: true,
        },
      });

      const decisionPackage = rfq.decisionPackages[0];
      if (!decisionPackage) {
        throw new Error('Decision package not found');
      }

      // Calculate scenarios
      const scenarioCalculations = [];
      for (const dpScenario of decisionPackage.scenarios) {
        const scenario = dpScenario.scenario;
        let calculation;
        
        if (scenario.type === 'TM') {
          calculation = await calcService.calculateTM(rfqId, scenario.id, scenario.useCase);
        } else {
          calculation = await calcService.calculateFixed(rfqId, scenario);
        }

        scenarioCalculations.push({
          name: scenario.name,
          type: scenario.type,
          calculation,
        });
      }

      // Generate HTML content
      const html = this.generateExecutiveHTML(rfq, decisionPackage, scenarioCalculations);

      // Convert to PDF using Puppeteer
      const browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
      
      const page = await browser.newPage();
      await page.setContent(html, { waitUntil: 'networkidle0' });
      
      const pdf = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
          top: '20mm',
          right: '20mm',
          bottom: '20mm',
          left: '20mm',
        },
      });

      await browser.close();

      // Store in NextCloud
      const storagePath = await nextCloudService.uploadFile(rfqId, {
        originalname: `Executive_Summary_${rfq.name}_${new Date().toISOString()}.pdf`,
        buffer: pdf,
        size: pdf.length,
        mimetype: 'application/pdf',
      }, { type: 'exports' });

      logger.info(`Executive PDF generated for RFQ ${rfqId}`);

      return pdf;
    } catch (error) {
      logger.error('Executive PDF generation error:', error);
      throw error;
    }
  }

  generateExecutiveHTML(rfq, decisionPackage, scenarios) {
    const logoPath = '/logo.png'; // This should be configurable

    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-bottom: 2px solid #1976d2;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .logo {
            height: 60px;
          }
          h1 {
            color: #1976d2;
            margin: 0;
          }
          h2 {
            color: #333;
            border-bottom: 1px solid #ccc;
            padding-bottom: 5px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
          }
          th, td {
            border: 1px solid #ddd;
            padding: 8px;
            text-align: left;
          }
          th {
            background-color: #f2f2f2;
            font-weight: bold;
          }
          .highlight {
            background-color: #e3f2fd;
          }
          .summary-box {
            background-color: #f5f5f5;
            padding: 15px;
            border-radius: 5px;
            margin: 20px 0;
          }
          .metric {
            display: inline-block;
            margin: 10px 20px 10px 0;
          }
          .metric-label {
            font-weight: bold;
            color: #666;
          }
          .metric-value {
            font-size: 1.2em;
            color: #1976d2;
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div>
            <h1>Executive Summary</h1>
            <p>${rfq.name}</p>
          </div>
          <img src="${logoPath}" alt="Company Logo" class="logo">
        </div>

        <div class="summary-box">
          <h2>RFQ Overview</h2>
          <div class="metric">
            <span class="metric-label">Customer:</span>
            <span class="metric-value">${rfq.customer}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Period:</span>
            <span class="metric-value">${rfq.startYear} - ${rfq.endYear}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Status:</span>
            <span class="metric-value">${rfq.status}</span>
          </div>
          <div class="metric">
            <span class="metric-label">Decision Package:</span>
            <span class="metric-value">${decisionPackage.name} v${decisionPackage.version}</span>
          </div>
        </div>

        <h2>Scenario Comparison</h2>
        <table>
          <thead>
            <tr>
              <th>Scenario</th>
              <th>Type</th>
              <th>Total Revenue (€)</th>
              <th>Total Cost (€)</th>
              <th>Margin (€)</th>
              <th>Margin %</th>
            </tr>
          </thead>
          <tbody>
            ${scenarios.map(s => `
              <tr class="${s.name === scenarios[0].name ? 'highlight' : ''}">
                <td>${s.name}</td>
                <td>${s.type}</td>
                <td>${this.formatCurrency(s.calculation.total.revenue || s.calculation.total.totalRevenue)}</td>
                <td>${this.formatCurrency(s.calculation.total.finalCost || s.calculation.total.totalCost)}</td>
                <td>${this.formatCurrency(s.calculation.total.margin)}</td>
                <td>${parseFloat(s.calculation.total.marginPercent).toFixed(1)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        ${rfq.hwItems.length > 0 ? `
          <h2>Hardware Summary</h2>
          <table>
            <thead>
              <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Unit Cost (€)</th>
                <th>Total Cost (€)</th>
                <th>Vendor</th>
              </tr>
            </thead>
            <tbody>
              ${rfq.hwItems.map(item => `
                <tr>
                  <td>${item.item}</td>
                  <td>${item.quantity}</td>
                  <td>${this.formatCurrency(item.unitCost)}</td>
                  <td>${this.formatCurrency(item.unitCost * item.quantity)}</td>
                  <td>${item.vendor || '-'}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        ` : ''}

        <div class="summary-box">
          <h2>Key Assumptions</h2>
          <ul>
            <li>Fixed monthly capacity: 160 hours per FTE</li>
            <li>Currency: EUR</li>
            <li>Cost rates are per cost center</li>
            <li>Selling rates vary by level and location</li>
            ${scenarios[0].type === 'FIXED' ? '<li>Fixed price includes risk factor adjustment</li>' : ''}
          </ul>
        </div>

        <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #ccc; font-size: 0.9em; color: #666;">
          <p>Generated on ${new Date().toLocaleDateString()} by ${rfq.createdBy.name}</p>
          <p>This document contains confidential information</p>
        </div>
      </body>
      </html>
    `;
  }

  formatCurrency(value) {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(value);
  }
}

module.exports = new ExportService();