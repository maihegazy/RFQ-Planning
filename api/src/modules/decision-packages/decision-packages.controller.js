const decisionPackagesService = require('./decision-packages.service');

const decisionPackagesController = {
  async listByRfq(req, res, next) {
    try {
      const packages = await decisionPackagesService.listByRfq(req.params.rfqId);
      res.json(packages);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const pkg = await decisionPackagesService.getById(req.params.id);
      res.json(pkg);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const pkg = await decisionPackagesService.create(req.body, req.user);
      res.status(201).json(pkg);
    } catch (error) {
      next(error);
    }
  },

  async submit(req, res, next) {
    try {
      const pkg = await decisionPackagesService.submit(req.params.id, req.user);
      res.json(pkg);
    } catch (error) {
      next(error);
    }
  },

  async recall(req, res, next) {
    try {
      const pkg = await decisionPackagesService.recall(req.params.id, req.user);
      res.json(pkg);
    } catch (error) {
      next(error);
    }
  },

  async getStatus(req, res, next) {
    try {
      const status = await decisionPackagesService.getApprovalStatus(req.params.id);
      res.json(status);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = decisionPackagesController;