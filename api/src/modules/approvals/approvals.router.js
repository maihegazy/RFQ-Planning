const express = require('express');
const { z } = require('zod');
const approvalsController = require('./approvals.controller');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');

const router = express.Router();

router.use(authenticate);

const decisionSchema = z.object({
  body: z.object({
    decision: z.enum(['APPROVED', 'REJECTED']),
    comment: z.string().min(1),
  }),
});

const assignSchema = z.object({
  body: z.object({
    userId: z.string(),
  }),
});

router.get('/my-tasks', approvalsController.getMyTasks);
router.get('/available', rbac.requireManagement, approvalsController.getAvailableTasks);
router.get('/:id', approvalsController.getTask);
router.post('/:id/assign', rbac.requireManagement, validateRequest(assignSchema), approvalsController.assignTask);
router.post('/:id/claim', rbac.requireManagement, approvalsController.claimTask);
router.post('/:id/approve', validateRequest(decisionSchema), approvalsController.approve);
router.post('/:id/reject', validateRequest(decisionSchema), approvalsController.reject);

module.exports = router;