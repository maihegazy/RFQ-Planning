const svc = require('./profile-plans.service');

const controller = {
  async listByRfq(req, res, next) {
    try {
      const data = await svc.listByRfq({
        rfqId: req.params.rfqId,
        featureId: req.query.featureId,
        role: req.query.role,
        level: req.query.level,
        location: req.query.location,
        q: req.query.q,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async listByFeature(req, res, next) {
    try {
      const data = await svc.listByFeature({
        featureId: req.params.featureId,
        role: req.query.role,
        level: req.query.level,
        location: req.query.location,
        q: req.query.q,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try {
      res.json(await svc.getById(req.params.id));
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const created = await svc.create(req.body, req.user);
      res.status(201).json(created);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const updated = await svc.update(req.params.id, req.body, req.user);
      res.json(updated);
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      await svc.remove(req.params.id, req.user);
      res.status(204).end();
    } catch (err) { next(err); }
  },
};

module.exports = controller;
