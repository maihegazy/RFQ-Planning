const express = require('express');
const { z } = require('zod');
const allocationsController = require('./allocations.controller');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');

const router = express.Router();

// Apply authentication to all routes
router.use(authenticate);

// Validation schemas
const allocationSchema = z.object({
  year: z.number().min(2025).max(2050),
  month: z.number().min(1).max(12),
  fte: z.number().min(0).max(1).multipleOf(0.1),
});

const bulkUpdateSchema = z.object({
  body: z.object({
    allocations: z.array(allocationSchema),
  }),
});

const updateAllocationSchema = z.object({
  body: allocationSchema,
});

const copyAllocationsSchema = z.object({
  body: z.object({
    sourceYear: z.number().min(2025).max(2050),
    targetYear: z.number().min(2025).max(2050),
    profileIds: z.array(z.string()).optional(),
  }),
});

const fillAllocationSchema = z.object({
  body: z.object({
    profileId: z.string(),
    startYear: z.number().min(2025).max(2050),
    startMonth: z.number().min(1).max(12),
    endYear: z.number().min(2025).max(2050),
    endMonth: z.number().min(1).max(12),
    fte: z.number().min(0).max(1).multipleOf(0.1),
  }),
});

// Routes

// Get allocations by profile
router.get('/profile/:profileId', rbac.requireRfqAccess, allocationsController.listByProfile);

// Get allocations by RFQ (summary view)
router.get('/rfq/:rfqId', rbac.requireRfqAccess, allocationsController.listByRfq);

// Get allocations by feature
router.get('/feature/:featureId', rbac.requireRfqAccess, allocationsController.listByFeature);

// Bulk update allocations for a profile
router.post(
  '/profile/:profileId/bulk',
  rbac.requireRfqAccess,
  validateRequest(bulkUpdateSchema),
  allocationsController.bulkUpdate
);

// Update single allocation
router.put(
  '/:id',
  rbac.requireRfqAccess,
  validateRequest(updateAllocationSchema),
  allocationsController.update
);

// Delete allocation
router.delete('/:id', rbac.requireRfqAccess, allocationsController.delete);

// Copy allocations from one year to another
router.post(
  '/copy',
  rbac.requireRfqAccess,
  validateRequest(copyAllocationsSchema),
  allocationsController.copyAllocations
);

// Fill allocations for a date range
router.post(
  '/fill',
  rbac.requireRfqAccess,
  validateRequest(fillAllocationSchema),
  allocationsController.fillAllocations
);

// Clear allocations for a profile
router.delete('/profile/:profileId/clear', rbac.requireRfqAccess, allocationsController.clearAllocations);

// Get allocation summary (FTE totals)
router.get('/rfq/:rfqId/summary', rbac.requireRfqAccess, allocationsController.getSummary);

module.exports = router;