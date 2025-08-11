const express = require('express');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');
const ctrl = require('./users.controller');
const { listSchema, updateSchema } = require('./users.validation');

const router = express.Router();

// Public endpoint for authenticated users to get basic user list (for mentions, etc.)
router.get('/list', authenticate, ctrl.listBasic);

// Admin-only routes
router.use(authenticate, rbac.requireAdmin);
router.get('/', validateRequest(listSchema), ctrl.list);
router.put('/:id', validateRequest(updateSchema), ctrl.update);

module.exports = router;