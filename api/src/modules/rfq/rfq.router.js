const express = require('express');
const { z } = require('zod');
const rfqController = require('./rfq.controller');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const createRfqSchema = z.object({
  body: z.object({
    name: z.string().min(1),
    customer: z.string().min(1),
    description: z.string().optional(),
    startYear: z.number().min(2025).max(2050),
    endYear: z.number().min(2025).max(2050),
    startMonth: z.number().min(1).max(12).default(1),
    endMonth: z.number().min(1).max(12).default(12),
    policy: z.enum(['PARALLEL_TECH_BUDGET_OVERALL', 'SIMPLE']).default('PARALLEL_TECH_BUDGET_OVERALL'),
    team: z.array(z.string()).optional(),
  }),
});

const updateRfqSchema = z.object({
  body: z.object({
    name: z.string().min(1).optional(),
    customer: z.string().min(1).optional(),
    description: z.string().optional(),
    status: z.enum(['NEW', 'IN_ANALYSIS', 'IN_PLANNING', 'SUBMITTED', 'AWARDED', 'NOT_AWARDED']).optional(),
  }),
});

// Routes
router.get('/', rfqController.list);
router.get('/:id', rbac.requireRfqAccess, rbac.filterFinancialData(), rfqController.getById);
router.post('/', validateRequest(createRfqSchema), rfqController.create);
router.put('/:id', rbac.requireRfqAccess, validateRequest(updateRfqSchema), rfqController.update);
router.delete('/:id', rbac.requireManagement, rfqController.delete);

// Team management
router.post('/:id/members', rbac.requireRfqAccess, rfqController.addMember);
router.delete('/:id/members/:userId', rbac.requireRfqAccess, rfqController.removeMember);

module.exports = router;