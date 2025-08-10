const rfqService = require('./rfq.service');

const rfqController = {
  async list(req, res, next) {
    try {
      const { status, customer, year, search } = req.query;
      const filters = { status, customer, year, search };
      const rfqs = await rfqService.list(req.user, filters);
      res.json(rfqs);
    } catch (error) {
      next(error);
    }
  },

  async getById(req, res, next) {
    try {
      const rfq = await rfqService.getById(req.params.id, req.user);
      res.json(rfq);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const rfq = await rfqService.create(req.body, req.user);
      res.status(201).json(rfq);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const rfq = await rfqService.update(req.params.id, req.body, req.user);
      res.json(rfq);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await rfqService.delete(req.params.id, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },

  async addMember(req, res, next) {
    try {
      const member = await rfqService.addMember(
        req.params.id,
        req.body.userId,
        req.body.capabilities,
        req.user
      );
      res.json(member);
    } catch (error) {
      next(error);
    }
  },

  async removeMember(req, res, next) {
    try {
      await rfqService.removeMember(req.params.id, req.params.userId, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};

module.exports = rfqController;