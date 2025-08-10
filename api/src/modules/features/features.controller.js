const svc = require('./features.service');

const controller = {
  async listByRfq(req, res, next) {
    try {
      const data = await svc.listByRfq({
        rfqId: req.params.rfqId,
        q: req.query.q,
        withTargets: req.query.withTargets ? req.query.withTargets === 'true' : undefined,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async get(req, res, next) {
    try { res.json(await svc.get(req.params.id)); }
    catch (err) { next(err); }
  },

  async create(req, res, next) {
    try { res.status(201).json(await svc.create(req.body, req.user)); }
    catch (err) { next(err); }
  },

  async update(req, res, next) {
    try { res.json(await svc.update(req.params.id, req.body, req.user)); }
    catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try { await svc.remove(req.params.id, req.user); res.status(204).end(); }
    catch (err) { next(err); }
  },
};

module.exports = controller;
