const prisma = require('../../db/prisma');

const MANAGEMENT_ROLES = [
  'ADMIN',
  'DELIVERY_MANAGER',
  'GENERAL_MANAGER',
  'ENGINEERING_MANAGER',
];

const dashboardService = {
  async getStats(user) {
    // Build where clause based on user role
    const rfqWhere = {};
    
    if (!MANAGEMENT_ROLES.includes(user.role)) {
      // Get RFQs where user is a member
      const memberRfqs = await prisma.rfqMember.findMany({
        where: { userId: user.id },
        select: { rfqId: true, isOwner: true },
      });
      
      const rfqIds = memberRfqs.map(m => m.rfqId);
      rfqWhere.id = { in: rfqIds };
    }

    // Get various statistics
    const [
      totalRfqs,
      rfqsByStatus,
      myRfqs,
      pendingApprovals,
      recentRfqs,
      upcomingDeadlines,
      teamActivity,
    ] = await Promise.all([
      // Total RFQs
      prisma.rfq.count({ where: rfqWhere }),

      // RFQs by status
      prisma.rfq.groupBy({
        by: ['status'],
        where: rfqWhere,
        _count: true,
      }),

      // My RFQs (where user is owner)
      prisma.rfqMember.count({
        where: {
          userId: user.id,
          isOwner: true,
        },
      }),

      // Pending approvals for user
      prisma.approvalTask.count({
        where: {
          OR: [
            { assignedToId: user.id },
            {
              AND: [
                { assignedToId: null },
                { assignedToRole: user.role },
              ],
            },
          ],
          status: 'PENDING',
        },
      }),

      // Recent RFQs
      prisma.rfq.findMany({
        where: rfqWhere,
        include: {
          createdBy: {
            select: { id: true, name: true },
          },
          _count: {
            select: {
              features: true,
              scenarios: true,
              comments: true,
            },
          },
        },
        orderBy: { updatedAt: 'desc' },
        take: 5,
      }),

      // Upcoming deadlines (approvals due in next 7 days)
      prisma.approvalTask.findMany({
        where: {
          OR: [
            { assignedToId: user.id },
            {
              AND: [
                { assignedToId: null },
                { assignedToRole: user.role },
              ],
            },
          ],
          status: 'PENDING',
          dueDate: {
            lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
          },
        },
        include: {
          decisionPackage: {
            include: {
              rfq: {
                select: { id: true, name: true },
              },
            },
          },
        },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),

      // Team activity (last 24 hours)
      prisma.auditLog.groupBy({
        by: ['userId'],
        where: {
          at: {
            gte: new Date(Date.now() - 24 * 60 * 60 * 1000),
          },
          ...(rfqWhere.id ? { rfqId: { in: rfqWhere.id.in } } : {}),
        },
        _count: true,
      }),
    ]);

    // Format RFQs by status
    const statusCounts = rfqsByStatus.reduce((acc, item) => {
      acc[item.status] = item._count;
      return acc;
    }, {});

    // Get user details for team activity
    const activeUserIds = teamActivity.map(a => a.userId);
    const activeUsers = await prisma.user.findMany({
      where: { id: { in: activeUserIds } },
      select: { id: true, name: true, role: true },
    });

    const userMap = activeUsers.reduce((acc, u) => {
      acc[u.id] = u;
      return acc;
    }, {});

    // Calculate trends (mock data for now - would need historical data)
    const trends = {
      rfqs: '+12%',
      approvals: '-5%',
      activities: '+23%',
    };

    return {
      overview: {
        totalRfqs,
        myRfqs,
        pendingApprovals,
        inPlanning: statusCounts.IN_PLANNING || 0,
        submitted: statusCounts.SUBMITTED || 0,
        awarded: statusCounts.AWARDED || 0,
      },
      statusBreakdown: statusCounts,
      recentRfqs,
      upcomingDeadlines,
      teamActivity: teamActivity.map(a => ({
        user: userMap[a.userId],
        activityCount: a._count,
      })).sort((a, b) => b.activityCount - a.activityCount),
      trends,
    };
  },
};

module.exports = dashboardService;