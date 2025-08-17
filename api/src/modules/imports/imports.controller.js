const importService = require('./import.service');

const importsController = {
  async importResourcePlan(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const result = await importService.importResourcePlan(req.params.rfqId, req.file.buffer);
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async importRates(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const result = await importService.importRates(req.file.buffer, req.query.type || 'both');
      
      if (!result.success) {
        return res.status(400).json(result);
      }

      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async downloadTemplate(req, res, next) {
    try {
      const { type } = req.params;
      if (type !== 'resource-plan' && type !== 'rates') {
        return res.status(400).json({ error: 'Bad Request', message: "type must be 'resource-plan' or 'rates'" });
      }

      let buffer, filename;
      
      if (type === 'resource-plan') {
        // Check if rfqId is provided for RFQ-specific templates
        const { rfqId } = req.query;
        
        if (rfqId) {
          // Generate template based on RFQ data
          const result = await importService.generateRfqResourcePlanTemplate(rfqId);
          buffer = result.buffer;
          filename = result.filename;
        } else {
          // Fallback to generic template with optional years
          let { startYear, endYear } = req.query;
          startYear = startYear ? Number(startYear) : undefined;
          endYear = endYear ? Number(endYear) : undefined;

          if (Number.isInteger(startYear) && Number.isInteger(endYear)) {
            buffer = await importService.generateResourcePlanTemplateByYears(startYear, endYear);
            filename = `resource-plan-${startYear}-${endYear}.xlsx`;
          } else {
            buffer = await importService.generateResourcePlanPlaceholderTemplate();
            filename = 'resource-plan-XXXX.xlsx';
          }
        }
      } else {
        buffer = await importService.generateRatesTemplate();
        filename = 'rates-template.xlsx';
      }

      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      });
      res.send(Buffer.from(buffer));
    } catch (err) {
      next(err);
    }
  },
};

module.exports = importsController;