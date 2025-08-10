const prisma = require('../db/prisma');

const FINANCIAL_ROLES = [
  'ADMIN',
  'DELIVERY_MANAGER',
  'GENERAL_MANAGER',
  'ENGINEERING_MANAGER',
];

const MANAGEMENT_ROLES = [
  'ADMIN',
  'DELIVERY_MANAGER',
  'GENERAL_MANAGER',
  'ENGINEERING_MANAGER',
];

const rbac = {
  requireRoles: (...roles) => {
    return (req, res, next) => {
      if (!req.user) {
        return res.status(401).json({ error: 'Authentication required' });
      }

      if (!roles.includes(req.user.role)) {
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      next();
    };
  },

  requireAdmin: (req, res, next) => {
    if (!req.user || req.user.role !== 'ADMIN') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  },

  requireFinancialAccess: (req, res, next) => {
    if (!req.user || !req.user.role) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  // Only management + admin can access financial data
  const ALLOWED = [
    'ADMIN',
    'DELIVERY_MANAGER',
    'GENERAL_MANAGER',
    'ENGINEERING_MANAGER',
  ];
  if (!ALLOWED.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: financial access required' });
  }
    next();
  },

  requireManagement: (req, res, next) => {
    if (!req.user || !MANAGEMENT_ROLES.includes(req.user.role)) {
      return res.status(403).json({ error: 'Management access required' });
    }
    next();
  },
// allow leaders and management (planning roles)
allowPlanning: (req, res, next) => {
  if (!req.user || !req.user.role) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  const ALLOWED = [
    'ADMIN',
    'DELIVERY_MANAGER',
    'GENERAL_MANAGER',
    'ENGINEERING_MANAGER',
    'PROJECT_LEADER',
    'TEAM_LEADER',
    'TECHNICAL_LEADER',
  ];
  if (!ALLOWED.includes(req.user.role)) {
    return res.status(403).json({ message: 'Forbidden: planning access required' });
  }
  next();
},
  requireRfqAccess: async (req, res, next) => {
    try {
      const rfqId = req.params.rfqId || req.params.id;
      
      if (!rfqId) {
        return next();
      }

      // Check if user is management
      if (MANAGEMENT_ROLES.includes(req.user.role)) {
        return next();
      }

      // Check if user is a member of the RFQ
      const member = await prisma.rfqMember.findFirst({
        where: {
          rfqId,
          userId: req.user.id,
        },
      });

      if (!member) {
        return res.status(403).json({ error: 'Access to this RFQ denied' });
      }

      req.rfqMember = member;
      next();
    } catch (error) {
      next(error);
    }
  },

  filterFinancialData: (data) => {
    // Remove financial fields for non-financial roles
    const removeFinancialFields = (obj) => {
      if (!obj) return obj;
      
      const fieldsToRemove = [
        'costPerHour',
        'sellPerHour',
        'revenue',
        'cost',
        'margin',
        'marginPercentage',
        'totalCost',
        'totalRevenue',
        'averageHourlyRate',
        'hwOverhead',
        'additionalCosts',
      ];

      if (Array.isArray(obj)) {
        return obj.map(item => removeFinancialFields(item));
      }

      if (typeof obj === 'object') {
        const filtered = { ...obj };
        fieldsToRemove.forEach(field => {
          delete filtered[field];
        });

        Object.keys(filtered).forEach(key => {
          if (typeof filtered[key] === 'object') {
            filtered[key] = removeFinancialFields(filtered[key]);
          }
        });

        return filtered;
      }

      return obj;
    };

    return (req, res, next) => {
      if (!FINANCIAL_ROLES.includes(req.user.role)) {
        const originalJson = res.json;
        res.json = function(data) {
          const filteredData = removeFinancialFields(data);
          return originalJson.call(this, filteredData);
        };
      }
      next();
    };
  },
};

module.exports = rbac;