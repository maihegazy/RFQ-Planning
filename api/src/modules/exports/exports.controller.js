const exportService = require('./export.service');

const exportsController = {
  async exportYearlyPlan(req, res, next) {
    try {
      const buffer = await exportService.exportYearlyPlan(req.params.rfqId);
      
      res.set({
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="yearly-plan.xlsx"',
      });
      
      res.send(buffer);
    } catch (error) {
      next(error);
    }
  },

  async generateExecutivePDF(req, res, next) {
    try {
      const pdf = await exportService.generateExecutivePDF(req.params.rfqId, req.params.packageId);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="executive-summary.pdf"',
      });
      
      res.send(pdf);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = exportsController;