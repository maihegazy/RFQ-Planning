const express = require('express');
const authenticate = require('../../middleware/auth');
const rbac = require('../../middleware/rbac');
const { validateRequest } = require('../../middleware/validation');
const ctrl = require('./rates.controller');
const {
  createCostRateSchema,
  updateCostRateSchema,
  listCostRateSchema,
  createSellRateSchema,
  updateSellRateSchema,
  listSellRateSchema,
} = require('./rates.validation');

const router = express.Router();

// All rates endpoints require auth + financial access
router.use(authenticate, rbac.requireFinancialAccess);

// COST RATES
router.get('/cost', validateRequest(listCostRateSchema), ctrl.listCost);
router.post('/cost', validateRequest(createCostRateSchema), ctrl.createCost);
router.put('/cost/:id', validateRequest(updateCostRateSchema), ctrl.updateCost);
router.delete('/cost/:id', ctrl.deleteCost);

// SELL RATES
router.get('/sell', validateRequest(listSellRateSchema), ctrl.listSell);
router.post('/sell', validateRequest(createSellRateSchema), ctrl.createSell);
router.put('/sell/:id', validateRequest(updateSellRateSchema), ctrl.updateSell);
router.delete('/sell/:id', ctrl.deleteSell);

module.exports = router;
