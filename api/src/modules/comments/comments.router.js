const express = require('express');
const { z } = require('zod');
const commentsController = require('./comments.controller');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');

const router = express.Router();

router.use(authenticate);

const createCommentSchema = z.object({
  body: z.object({
    parentType: z.enum(['RFQ', 'FEATURE', 'SCENARIO', 'DECISION_PACKAGE']),
    parentId: z.string(),
    body: z.string().min(1),
    mentions: z.array(z.string()).optional(),
  }),
});

const updateCommentSchema = z.object({
  body: z.object({
    body: z.string().min(1),
  }),
});

router.get('/:parentType/:parentId', rbac.requireRfqAccess, commentsController.listByParent);
router.post('/', rbac.requireRfqAccess, validateRequest(createCommentSchema), commentsController.create);
router.put('/:id', rbac.requireRfqAccess, validateRequest(updateCommentSchema), commentsController.update);
router.delete('/:id', rbac.requireRfqAccess, commentsController.delete);

module.exports = router;