const svc = require('./users.service');

const controller = {
  async list(req, res, next) {
    try {
      const data = await svc.list({
        role: req.query.role,
        q: req.query.q,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async listBasic(req, res, next) {
    try {
      // Return a simplified list of users for mentions/assignments
      const data = await svc.listBasic();
      res.json(data);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try { res.json(await svc.update(req.params.id, req.body)); }
    catch (err) { next(err); }
  },
};

module.exports = controller;