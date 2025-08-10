const express = require('express');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');
const ctrl = require('./scenarios.controller');
const { createSchema, updateSchema, listByRfqSchema, cloneSchema, diffSchema } = require('./scenarios.validation');

const router = express.Router();
router.use(authenticate, rbac.requireFinancialAccess); // managers/admin only

router.get('/rfq/:rfqId', validateRequest(listByRfqSchema), ctrl.listByRfq);
router.get('/diff', validateRequest(diffSchema), ctrl.diff);
router.get('/:id', ctrl.get);
router.post('/', validateRequest(createSchema), ctrl.create);
router.post('/:id/clone', validateRequest(cloneSchema), ctrl.clone);
router.put('/:id', validateRequest(updateSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

module.exports = router;
