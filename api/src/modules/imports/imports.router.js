const express = require('express');
const multer = require('multer');
const importsController = require('./imports.controller');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');

const router = express.Router();

router.use(authenticate);

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB
  },
});

router.post('/resource-plan/:rfqId', rbac.requireRfqAccess, upload.single('file'), importsController.importResourcePlan);
router.post('/rates', rbac.requireFinancialAccess, upload.single('file'), importsController.importRates);
router.get('/templates/:type', importsController.downloadTemplate);

module.exports = router;