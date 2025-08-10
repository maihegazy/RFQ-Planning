const svc = require('./scenarios.service');
const prisma = require('../../db/prisma');

const controller = {
  async listByRfq(req, res, next) {
    try {
      const data = await svc.listByRfq({
        rfqId: req.params.rfqId,
        q: req.query.q,
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
    try { res.status(201).json(await svc.create(req.body)); }
    catch (err) { next(err); }
  },

  async update(req, res, next) {
    try { res.json(await svc.update(req.params.id, req.body)); }
    catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try { await svc.remove(req.params.id); res.status(204).end(); }
    catch (err) { next(err); }
  },

  async clone(req, res, next) {
    try { res.status(201).json(await svc.clone(req.params.id, req.body.name)); }
    catch (err) { next(err); }
  },

  // simple diff endpoint: ?a=scenarioIdA&b=scenarioIdB
  async diff(req, res, next) {
    try {
      const a = await svc.get(req.query.a);
      const b = await svc.get(req.query.b);
      res.json(svc.diff(a, b));
    } catch (err) { next(err); }
  },
};

module.exports = controller;
