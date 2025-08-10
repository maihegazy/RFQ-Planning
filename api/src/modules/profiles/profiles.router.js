const express = require('express');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');
const ctrl = require('./profiles.controller');
const { createProfileSchema, updateProfileSchema, listProfileSchema } = require('./profiles.validation');

const router = express.Router();

router.use(authenticate);

// READ: allow all authenticated users (leaders need to view profiles to plan)
router.get('/', validateRequest(listProfileSchema), ctrl.list);

// WRITE: restrict to management (Admin/EM/DM/GM)
router.post('/', rbac.requireManagement, validateRequest(createProfileSchema), ctrl.create);
router.put('/:id', rbac.requireManagement, validateRequest(updateProfileSchema), ctrl.update);
router.delete('/:id', rbac.requireManagement, ctrl.remove);

module.exports = router;
