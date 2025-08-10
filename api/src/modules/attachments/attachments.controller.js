const attachmentsService = require('./attachments.service');

const attachmentsController = {
  async listByParent(req, res, next) {
    try {
      const { parentType, parentId } = req.params;
      const attachments = await attachmentsService.listByParent(parentType, parentId);
      res.json(attachments);
    } catch (error) {
      next(error);
    }
  },

  async upload(req, res, next) {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const attachment = await attachmentsService.upload(
        req.file,
        req.body,
        req.user
      );
      res.status(201).json(attachment);
    } catch (error) {
      next(error);
    }
  },

  async download(req, res, next) {
    try {
      const { attachment, content } = await attachmentsService.download(req.params.id, req.user);
      
      res.set({
        'Content-Type': attachment.mimeType,
        'Content-Disposition': `attachment; filename="${attachment.filename}"`,
        'Content-Length': content.length,
      });
      
      res.send(content);
    } catch (error) {
      next(error);
    }
  },

  async delete(req, res, next) {
    try {
      await attachmentsService.delete(req.params.id, req.user);
      res.status(204).send();
    } catch (error) {
      next(error);
    }
  },
};

module.exports = attachmentsController;