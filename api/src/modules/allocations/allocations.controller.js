const allocationsService = require('./allocations.service');

const allocationsController = {
  async listByProfile(req, res, next) {
    try {
      const allocations = await allocationsService.listByProfile(req.params.profileId);
      res.json(allocations);
    } catch (error) {
      next(error);
    }
  },

  async listByRfq(req, res, next) {
    try {
      const allocations = await allocationsService.listByRfq(req.params.rfqId);
      res.json(allocations);
    } catch (error) {
      next(error);
    }
  },

  async listByFeature(req, res, next) {
    try {
      const allocations = await allocationsService.listByFeature(req.params.featureId);
      res.json(allocations);
    } catch (error) {
      next(error);
    }
  },

  async bulkUpdate(req, res, next) {
    try {
      const allocations = await allocationsService.bulkUpdate(
        req.params.profileId,
        req.body.allocations,
        req.user
      );
      res.json(allocations);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const allocation = await allocationsService.update(req.params.id, req.body, req.user);
      res.json(allocation);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await allocationsService.delete(req.params.id, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async copyAllocations(req, res, next) {
    try {
      const result = await allocationsService.copyAllocations(
        req.body.sourceYear,
        req.body.targetYear,
        req.body.profileIds,
        req.user
      );
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async fillAllocations(req, res, next) {
    try {
      const result = await allocationsService.fillAllocations(req.body, req.user);
      res.json(result);
    } catch (error) {
      next(error);
    }
  },

  async clearAllocations(req, res, next) {
    try {
      await allocationsService.clearAllocations(req.params.profileId, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async getSummary(req, res, next) {
    try {
      const summary = await allocationsService.getSummary(req.params.rfqId);
      res.json(summary);
    } catch (error) {
      next(error);
    }
  },
};

module.exports = allocationsController;