const prisma = require('../../db/prisma');
const logger = require('../../config/logger');

const MANAGEMENT_ROLES = [
  'ADMIN',
  'DELIVERY_MANAGER',
  'GENERAL_MANAGER',
  'ENGINEERING_MANAGER',
];

const auditService = {
  async getRecentActivities({ limit, offset, rfqId, userId, currentUser }) {
    const where = {};

    // Filter by RFQ if specified
    if (rfqId) {
      where.rfqId = rfqId;
    }

    // Filter by user if specified
    if (userId) {
      where.userId = userId;
    }

    // Non-management users can only see activities for RFQs they're members of
    if (!MANAGEMENT_ROLES.includes(currentUser.role)) {
      const memberRfqs = await prisma.rfqMember.findMany({
        where: { userId: currentUser.id },
        select: { rfqId: true },
      });
      
      const rfqIds = memberRfqs.map(m => m.rfqId);
      where.rfqId = { in: rfqIds };
    }

    const [activities, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        include: {
          user: {
            select: { id: true, name: true, email: true },
          },
          rfq: {
            select: { id: true, name: true },
          },
        },
        orderBy: { at: 'desc' },
        take: limit,
        skip: offset,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return {
      activities: activities.map(this.formatActivity),
      total,
      limit,
      offset,
    };
  },

  async getDashboardActivities(user) {
    // Get activities for the dashboard - last 10 activities
    const where = {};

    // For non-management, only show their RFQs
    if (!MANAGEMENT_ROLES.includes(user.role)) {
      const memberRfqs = await prisma.rfqMember.findMany({
        where: { userId: user.id },
        select: { rfqId: true },
      });
      
      const rfqIds = memberRfqs.map(m => m.rfqId);
      where.rfqId = { in: rfqIds };
    }

    const activities = await prisma.auditLog.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, email: true, role: true },
        },
        rfq: {
          select: { id: true, name: true, customer: true },
        },
      },
      orderBy: { at: 'desc' },
      take: 10,
    });

    // Also get some specific important activities
    const [recentApprovals, recentSubmissions, recentComments] = await Promise.all([
      // Recent approval decisions
      prisma.approvalTask.findMany({
        where: {
          decidedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
          },
        },
        include: {
          decidedBy: {
            select: { id: true, name: true },
          },
          decisionPackage: {
            include: {
              rfq: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { decidedAt: 'desc' },
        take: 5,
      }),
      
      // Recent RFQ submissions
      prisma.rfq.findMany({
        where: {
          status: 'SUBMITTED',
          updatedAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
          },
        },
        select: {
          id: true,
          name: true,
          customer: true,
          updatedAt: true,
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Recent comments
      prisma.comment.findMany({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000), // Last 2 days
          },
        },
        include: {
          user: {
            select: { id: true, name: true },
          },
        },
        orderBy: { createdAt: 'desc' },
        take: 5,
      }),
    ]);

    // Combine and format all activities
    const formattedActivities = [
      ...activities.map(this.formatActivity),
      ...recentApprovals.map(a => ({
        id: `approval-${a.id}`,
        type: 'approval',
        action: a.status === 'APPROVED' ? 'approved' : 'rejected',
        entity: 'Decision Package',
        entityId: a.decisionPackageId,
        rfq: a.decisionPackage.rfq,
        user: a.decidedBy,
        at: a.decidedAt,
        details: {
          packageName: a.decisionPackage.name,
          taskType: a.type,
          comment: a.decisionComment,
        },
      })),
      ...recentSubmissions.map(r => ({
        id: `submission-${r.id}`,
        type: 'submission',
        action: 'submitted',
        entity: 'RFQ',
        entityId: r.id,
        rfq: { id: r.id, name: r.name },
        at: r.updatedAt,
        details: {
          customer: r.customer,
        },
      })),
      ...recentComments.map(c => ({
        id: `comment-${c.id}`,
        type: 'comment',
        action: 'commented',
        entity: c.parentType,
        entityId: c.parentId,
        user: c.user,
        at: c.createdAt,
        details: {
          preview: c.body.substring(0, 100) + (c.body.length > 100 ? '...' : ''),
        },
      })),
    ];

    // Sort by date and return top 15
    return formattedActivities
      .sort((a, b) => new Date(b.at) - new Date(a.at))
      .slice(0, 15);
  },

  async getActivityStats(user) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const thisWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const where = {};
    
    // Filter for non-management users
    if (!MANAGEMENT_ROLES.includes(user.role)) {
      const memberRfqs = await prisma.rfqMember.findMany({
        where: { userId: user.id },
        select: { rfqId: true },
      });
      
      const rfqIds = memberRfqs.map(m => m.rfqId);
      where.rfqId = { in: rfqIds };
    }

    const [todayCount, weekCount, monthCount, topUsers] = await Promise.all([
      prisma.auditLog.count({
        where: {
          ...where,
          at: { gte: today },
        },
      }),
      prisma.auditLog.count({
        where: {
          ...where,
          at: { gte: thisWeek },
        },
      }),
      prisma.auditLog.count({
        where: {
          ...where,
          at: { gte: thisMonth },
        },
      }),
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          ...where,
          at: { gte: thisWeek },
        },
        _count: true,
        orderBy: {
          _count: {
            userId: 'desc',
          },
        },
        take: 5,
      }),
    ]);

    // Get user details for top users
    const userIds = topUsers.map(u => u.userId);
    const users = await prisma.user.findMany({
      where: { id: { in: userIds } },
      select: { id: true, name: true },
    });

    const userMap = users.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {});

    return {
      today: todayCount,
      thisWeek: weekCount,
      thisMonth: monthCount,
      topUsers: topUsers.map(u => ({
        user: userMap[u.userId],
        count: u._count,
      })),
    };
  },

  formatActivity(activity) {
    const actionDescriptions = {
      'POST /rfqs': 'created RFQ',
      'PUT /rfqs': 'updated RFQ',
      'DELETE /rfqs': 'deleted RFQ',
      'POST /features': 'added feature',
      'PUT /features': 'updated feature',
      'DELETE /features': 'removed feature',
      'POST /scenarios': 'created scenario',
      'PUT /scenarios': 'updated scenario',
      'DELETE /scenarios': 'deleted scenario',
      'POST /comments': 'added comment',
      'POST /decision-packages': 'created decision package',
      'POST /approvals': 'made approval decision',
      'POST /profile-plans': 'added resource profile',
      'PUT /profile-plans': 'updated resource profile',
      'DELETE /profile-plans': 'removed resource profile',
      'POST /allocations': 'updated allocations',
    };

    // Try to match action to a description
    let actionText = activity.action;
    for (const [pattern, description] of Object.entries(actionDescriptions)) {
      if (activity.action.includes(pattern.split(' ')[0]) && 
          activity.action.includes(pattern.split(' ')[1])) {
        actionText = description;
        break;
      }
    }

    return {
      id: activity.id,
      type: 'audit',
      action: actionText,
      entity: activity.entity,
      entityId: activity.entityId,
      rfq: activity.rfq,
      user: activity.user,
      at: activity.at,
      details: activity.changes,
    };
  },
};

module.exports = auditService;