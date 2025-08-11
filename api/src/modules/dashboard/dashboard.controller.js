const dashboardService = require('./dashboard.service');

const dashboardController = {
  async getStats(req, res, next) {
    try {
      const stats = await dashboardService.getStats(req.user);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = dashboardController;