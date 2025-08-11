const prisma = require('../db/prisma');
const logger = require('../config/logger');

const auditMiddleware = async (req, res, next) => {
  // Skip audit for GET requests and certain paths
  if (req.method === 'GET' || 
      req.path.includes('/health') || 
      req.path.includes('/auth') ||
      req.path.includes('/audit')) {
    return next();
  }

  const originalSend = res.send;
  
  res.send = async function(data) {
    // Log the action if user is authenticated
    if (req.user && res.statusCode < 400) {
      try {
        // Extract entity name from the URL
        const pathParts = req.baseUrl.split('/').filter(p => p);
        const entity = pathParts[pathParts.length - 1] || 'unknown';
        
        // Create a more descriptive action
        let action = `${req.method} ${req.path}`;
        if (req.route) {
          action = `${req.method} ${req.route.path}`;
        }

        const auditEntry = {
          userId: req.user.id,
          entity: entity.charAt(0).toUpperCase() + entity.slice(1), // Capitalize
          entityId: req.params.id || req.params.rfqId || 'N/A',
          action,
          changes: req.body ? JSON.stringify(req.body) : null,
        };

        // Add RFQ ID if available
        if (req.params.rfqId || req.body?.rfqId) {
          auditEntry.rfqId = req.params.rfqId || req.body.rfqId;
        }
        
        // Try to get RFQ ID from the entity if it's an RFQ-related entity
        if (!auditEntry.rfqId && req.params.id) {
          try {
            if (entity === 'features') {
              const feature = await prisma.feature.findUnique({
                where: { id: req.params.id },
                select: { rfqId: true },
              });
              if (feature) auditEntry.rfqId = feature.rfqId;
            } else if (entity === 'scenarios') {
              const scenario = await prisma.scenario.findUnique({
                where: { id: req.params.id },
                select: { rfqId: true },
              });
              if (scenario) auditEntry.rfqId = scenario.rfqId;
            }
          } catch (e) {
            // Ignore errors in getting RFQ ID
          }
        }

        await prisma.auditLog.create({
          data: auditEntry,
        });
      } catch (error) {
        logger.error('Failed to create audit log:', error);
      }
    }

    return originalSend.call(this, data);
  };

  next();
};

module.exports = auditMiddleware;