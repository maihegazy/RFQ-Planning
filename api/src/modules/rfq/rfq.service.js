const prisma = require('../../db/prisma');
const logger = require('../../config/logger');

const MANAGEMENT_ROLES = [
  'ADMIN',
  'DELIVERY_MANAGER',
  'GENERAL_MANAGER',
  'ENGINEERING_MANAGER',
];

const rfqService = {
  async list(user, filters = {}) {
    const where = {};

    // Apply filters
    if (filters.status) {
      where.status = filters.status;
    }
    if (filters.customer) {
      where.customer = { contains: filters.customer, mode: 'insensitive' };
    }
    if (filters.year) {
      where.OR = [
        { startYear: { lte: parseInt(filters.year) } },
        { endYear: { gte: parseInt(filters.year) } },
      ];
    }
    if (filters.search) {
      where.OR = [
        { name: { contains: filters.search, mode: 'insensitive' } },
        { customer: { contains: filters.search, mode: 'insensitive' } },
      ];
    }

    // Filter by membership for non-management users
    if (!MANAGEMENT_ROLES.includes(user.role)) {
      where.members = {
        some: {
          userId: user.id,
        },
      };
    }

    const rfqs = await prisma.rfq.findMany({
      where,
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        _count: {
          select: {
            features: true,
            scenarios: true,
            decisionPackages: true,
          },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return rfqs;
  },

  async getById(id, user) {
    const rfq = await prisma.rfq.findUnique({
      where: { id },
      include: {
        createdBy: {
          select: { id: true, name: true, email: true },
        },
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true, role: true },
            },
          },
        },
        features: true,
        scenarios: {
          include: {
            additionalCosts: true,
          },
        },
        decisionPackages: {
          include: {
            scenarios: {
              include: {
                scenario: true,
              },
            },
            approvalTasks: {
              include: {
                assignedTo: {
                  select: { id: true, name: true, email: true },
                },
                decidedBy: {
                  select: { id: true, name: true, email: true },
                },
              },
            },
          },
        },
        hwItems: true,
        _count: {
          select: {
            features: true,
            profilePlans: true,
            scenarios: true,
            comments: true,
            attachments: true,
          },
        },
      },
    });

    if (!rfq) {
      throw new Error('RFQ not found');
    }

    // Check access for non-management users
    if (!MANAGEMENT_ROLES.includes(user.role)) {
      const isMember = rfq.members.some(m => m.userId === user.id);
      if (!isMember) {
        throw new Error('Access denied to this RFQ');
      }
    }

    return rfq;
  },

  async create(data, user) {
    const { team, ...rfqData } = data;

    // Validate year range
    if (rfqData.endYear < rfqData.startYear) {
      throw new Error('End year must be greater than or equal to start year');
    }

    const rfq = await prisma.rfq.create({
      data: {
        ...rfqData,
        createdById: user.id,
        members: {
          create: [
            // Add creator as owner
            {
              userId: user.id,
              isOwner: true,
            },
            // Add team members
            ...(team || []).map(userId => ({
              userId,
              isOwner: false,
            })),
          ],
        },
      },
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    logger.info(`RFQ created: ${rfq.id} by user: ${user.id}`);
    return rfq;
  },

  async update(id, data, user) {
    // Check if RFQ exists
    const existing = await this.getById(id, user);

    // Prevent certain updates based on status
    if (existing.status === 'SUBMITTED' && data.status !== 'AWARDED' && data.status !== 'NOT_AWARDED') {
      throw new Error('Cannot modify submitted RFQ except to mark as awarded/not awarded');
    }

    const updated = await prisma.rfq.update({
      where: { id },
      data,
      include: {
        members: {
          include: {
            user: {
              select: { id: true, name: true, email: true },
            },
          },
        },
      },
    });

    logger.info(`RFQ updated: ${id} by user: ${user.id}`);
    return updated;
  },

  async delete(id, user) {
    await this.getById(id, user); // Check access
    
    await prisma.rfq.delete({
      where: { id },
    });

    logger.info(`RFQ deleted: ${id} by user: ${user.id}`);
  },

  async addMember(rfqId, userId, capabilities, currentUser) {
    await this.getById(rfqId, currentUser); // Check access

    const member = await prisma.rfqMember.upsert({
      where: {
        rfqId_userId: {
          rfqId,
          userId,
        },
      },
      update: {
        isTechReviewer: capabilities?.isTechReviewer || false,
        isOwner: capabilities?.isOwner || false,
      },
      create: {
        rfqId,
        userId,
        isTechReviewer: capabilities?.isTechReviewer || false,
        isOwner: capabilities?.isOwner || false,
      },
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
      },
    });

    logger.info(`Member added to RFQ: ${rfqId}, user: ${userId}`);
    return member;
  },

  async removeMember(rfqId, userId, currentUser) {
    await this.getById(rfqId, currentUser); // Check access

    await prisma.rfqMember.delete({
      where: {
        rfqId_userId: {
          rfqId,
          userId,
        },
      },
    });

    logger.info(`Member removed from RFQ: ${rfqId}, user: ${userId}`);
  },
};

module.exports = rfqService;