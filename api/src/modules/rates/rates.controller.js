const ratesService = require('./rates.service');

const ratesController = {
  // COST
  async listCost(req, res, next) {
    try {
      const data = await ratesService.listCostRates({
        costCenter: req.query.costCenter,
        effectiveAt: req.query.effectiveAt,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async createCost(req, res, next) {
    try {
      const created = await ratesService.createCostRate(req.body);
      res.status(201).json(created);
    } catch (err) { next(err); }
  },

  async updateCost(req, res, next) {
    try {
      const updated = await ratesService.updateCostRate(req.params.id, req.body);
      res.json(updated);
    } catch (err) { next(err); }
  },

  async deleteCost(req, res, next) {
    try {
      await ratesService.deleteCostRate(req.params.id);
      res.status(204).end();
    } catch (err) { next(err); }
  },

  // SELL
  async listSell(req, res, next) {
    try {
      const data = await ratesService.listSellRates({
        location: req.query.location,
        level: req.query.level,
        useCase: req.query.useCase,
        effectiveAt: req.query.effectiveAt,
        page: req.query.page ? Number(req.query.page) : undefined,
        pageSize: req.query.pageSize ? Number(req.query.pageSize) : undefined,
      });
      res.json(data);
    } catch (err) { next(err); }
  },

  async createSell(req, res, next) {
    try {
      const created = await ratesService.createSellRate(req.body);
      res.status(201).json(created);
    } catch (err) { next(err); }
  },

  async updateSell(req, res, next) {
    try {
      const updated = await ratesService.updateSellRate(req.params.id, req.body);
      res.json(updated);
    } catch (err) { next(err); }
  },

  async deleteSell(req, res, next) {
    try {
      await ratesService.deleteSellRate(req.params.id);
      res.status(204).end();
    } catch (err) { next(err); }
  },
  async getUseCases(req, res, next) {
  try {
    // Get unique use cases from existing sell rates
    const sellRates = await prisma.sellRate.findMany({
      select: { useCase: true },
      distinct: ['useCase'],
    });
    
    const useCases = sellRates.map(r => r.useCase).filter(Boolean);
    
    // Add default use cases if they don't exist
    const defaultUseCases = ['UC1', 'UC2', 'UC3'];
    const allUseCases = [...new Set([...defaultUseCases, ...useCases])];
    
    res.json(allUseCases);
  } catch (err) { 
    next(err); 
  }
},
async getUseCases(req, res, next) {
    try {
      // Get unique use cases from existing sell rates
      const sellRates = await prisma.sellRate.findMany({
        select: { useCase: true },
        distinct: ['useCase'],
      });
      
      const useCases = sellRates.map(r => r.useCase).filter(Boolean);
      
      // Add default use cases if they don't exist
      const defaultUseCases = ['UC1', 'UC2', 'UC3'];
      const allUseCases = [...new Set([...defaultUseCases, ...useCases])];
      
      res.json(allUseCases.sort());
    } catch (err) { 
      next(err); 
    }
  },
};

module.exports = ratesController;
