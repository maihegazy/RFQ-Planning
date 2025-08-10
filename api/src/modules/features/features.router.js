const express = require('express');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');
const ctrl = require('./features.controller');
const { createSchema, updateSchema, listByRfqSchema } = require('./features.validation');

const router = express.Router();
router.use(authenticate);

// Leaders (PL/TL/Tech Lead) plan features; managers/admin too.
router.get('/rfq/:rfqId', validateRequest(listByRfqSchema), ctrl.listByRfq);
router.get('/:id', ctrl.get);
router.post('/', rbac.allowPlanning, validateRequest(createSchema), ctrl.create);
router.put('/:id', rbac.allowPlanning, validateRequest(updateSchema), ctrl.update);
router.delete('/:id', rbac.allowPlanning, ctrl.remove);

module.exports = router;
