const express = require('express');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');
const ctrl = require('./profile-plans.controller');
const { createSchema, updateSchema, listByRfqSchema, listByFeatureSchema } = require('./profile-plans.validation');

const router = express.Router();
router.use(authenticate);

// Read access: any RFQ team member or manager/admin (auth middleware + RFQ scoping handled in service layer via rfqId filters you already use elsewhere)

// List by RFQ and Feature
router.get('/rfq/:rfqId', validateRequest(listByRfqSchema), ctrl.listByRfq);
router.get('/feature/:featureId', validateRequest(listByFeatureSchema), ctrl.listByFeature);

// Single plan
router.get('/:id', ctrl.get);

// Create/Update/Delete: only management (Admin/EM/DM/GM) and PL/TL/Tech Lead (since they do planning)
// If you want to restrict delete to management only, swap rbac.allowPlanning to rbac.requireManagement where needed.
router.post('/', rbac.allowPlanning, validateRequest(createSchema), ctrl.create);
router.put('/:id', rbac.allowPlanning, validateRequest(updateSchema), ctrl.update);
router.delete('/:id', rbac.allowPlanning, ctrl.remove);

module.exports = router;
