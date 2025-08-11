const auditService = require('./audit.service');

const auditController = {
  async getRecentActivities(req, res, next) {
    try {
      const { limit = 20, offset = 0, rfqId, userId } = req.query;
      const activities = await auditService.getRecentActivities({
        limit: parseInt(limit),
        offset: parseInt(offset),
        rfqId,
        userId,
        currentUser: req.user,
      });
      res.json(activities);
    } catch (error) {
      next(error);
    }
  },

  async getDashboardActivities(req, res, next) {
    try {
      const activities = await auditService.getDashboardActivities(req.user);
      res.json(activities);
    } catch (error) {
      next(error);
    }
  },

  async getActivityStats(req, res, next) {
    try {
      const stats = await auditService.getActivityStats(req.user);
      res.json(stats);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = auditController;