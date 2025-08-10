const express = require('express');
const { z } = require('zod');
const decisionPackagesController = require('./decision-packages.controller');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');

const router = express.Router();

router.use(authenticate);

const createPackageSchema = z.object({
  body: z.object({
    rfqId: z.string(),
    name: z.string().min(1),
    scenarioIds: z.array(z.string()).min(1),
    submit: z.boolean().optional(),
  }),
});

router.get('/rfq/:rfqId', rbac.requireRfqAccess, decisionPackagesController.listByRfq);
router.get('/:id', rbac.requireRfqAccess, decisionPackagesController.getById);
router.post('/', rbac.requireRfqAccess, validateRequest(createPackageSchema), decisionPackagesController.create);
router.post('/:id/submit', rbac.requireManagement, decisionPackagesController.submit);
router.post('/:id/recall', rbac.requireManagement, decisionPackagesController.recall);
router.get('/:id/status', rbac.requireRfqAccess, decisionPackagesController.getStatus);

module.exports = router;