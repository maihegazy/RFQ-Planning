const express = require('express');
const auditController = require('./audit.controller');
const authenticate = require('../../middleware/auth');

const router = express.Router();

// All audit endpoints require authentication
router.use(authenticate);

// Get recent activities for dashboard
router.get('/dashboard', auditController.getDashboardActivities);

// Get activity statistics
router.get('/stats', auditController.getActivityStats);

// Get paginated activities with filters
router.get('/', auditController.getRecentActivities);

module.exports = router;