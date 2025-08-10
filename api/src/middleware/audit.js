const prisma = require('../db/prisma');
const logger = require('../config/logger');

const auditMiddleware = async (req, res, next) => {
  // Skip audit for GET requests and certain paths
  if (req.method === 'GET' || req.path.includes('/health') || req.path.includes('/auth')) {
    return next();
  }

  const originalSend = res.send;
  
  res.send = async function(data) {
    // Log the action if user is authenticated
    if (req.user && res.statusCode < 400) {
      try {
        const auditEntry = {
          userId: req.user.id,
          entity: req.baseUrl.split('/').pop() || 'unknown',
          entityId: req.params.id || 'N/A',
          action: `${req.method} ${req.path}`,
          changes: req.body,
        };

        // Add RFQ ID if available
        if (req.params.rfqId || req.body.rfqId) {
          auditEntry.rfqId = req.params.rfqId || req.body.rfqId;
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