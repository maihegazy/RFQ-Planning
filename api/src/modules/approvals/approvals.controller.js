const approvalsService = require('./approvals.service');

const approvalsController = {
  async getMyTasks(req, res, next) {
    try {
      const tasks = await approvalsService.getUserTasks(req.user);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  },

  async getAvailableTasks(req, res, next) {
    try {
      const tasks = await approvalsService.getAvailableTasks(req.user);
      res.json(tasks);
    } catch (error) {
      next(error);
    }
  },

  async getTask(req, res, next) {
    try {
      const task = await approvalsService.getTaskById(req.params.id, req.user);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async assignTask(req, res, next) {
    try {
      const task = await approvalsService.assignTask(req.params.id, req.body.userId, req.user);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async claimTask(req, res, next) {
    try {
      const task = await approvalsService.claimTask(req.params.id, req.user);
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async approve(req, res, next) {
    try {
      const task = await approvalsService.makeDecision(
        req.params.id,
        'APPROVED',
        req.body.comment,
        req.user
      );
      res.json(task);
    } catch (error) {
      next(error);
    }
  },

  async reject(req, res, next) {
    try {
      const task = await approvalsService.makeDecision(
        req.params.id,
        'REJECTED',
        req.body.comment,
        req.user
      );
      res.json(task);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = approvalsController;