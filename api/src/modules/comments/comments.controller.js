const commentsService = require('./comments.service');

const commentsController = {
  async listByParent(req, res, next) {
    try {
      const { parentType, parentId } = req.params;
      const comments = await commentsService.listByParent(parentType, parentId);
      res.json(comments);
    } catch (error) {
      next(error);
    }
  },

  async create(req, res, next) {
    try {
      const comment = await commentsService.create(req.body, req.user);
      res.status(201).json(comment);
    } catch (error) {
      next(error);
    }
  },

  async update(req, res, next) {
    try {
      const comment = await commentsService.update(req.params.id, req.body, req.user);
      res.json(comment);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await commentsService.delete(req.params.id, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};

module.exports = commentsController;