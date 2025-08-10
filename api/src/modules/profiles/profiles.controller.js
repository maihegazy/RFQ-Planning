const svc = require('./profiles.service');

const profilesController = {
  async list(req, res, next) {
    try {
      const data = await svc.listProfiles({
        role: req.query.role,
        level: req.query.level,
        location: req.query.location,
        costCenter: req.query.costCenter,
        q: req.query.q,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async create(req, res, next) {
    try {
      const created = await svc.createProfile(req.body);
      res.status(201).json(created);
    } catch (err) { next(err); }
  },

  async update(req, res, next) {
    try {
      const updated = await svc.updateProfile(req.params.id, req.body);
      res.json(updated);
    } catch (err) { next(err); }
  },

  async remove(req, res, next) {
    try {
      await svc.deleteProfile(req.params.id);
      res.status(204).end();
    } catch (err) { next(err); }
  },
};

module.exports = profilesController;
