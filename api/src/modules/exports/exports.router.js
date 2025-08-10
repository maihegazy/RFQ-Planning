const express = require('express');
const exportsController = require('./exports.controller');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticate);

router.get('/yearly-plan/:rfqId', rbac.requireRfqAccess, exportsController.exportYearlyPlan);
router.get('/executive-pdf/:rfqId/:packageId', rbac.requireRfqAccess, exportsController.generateExecutivePDF);

module.exports = router;