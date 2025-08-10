const prisma = require('../../db/prisma');
const logger = require('../../config/logger');
const emailService = require('../../utils/email');

const MANAGEMENT_ROLES = [
  'DELIVERY_MANAGER',
  'GENERAL_MANAGER',
  'ENGINEERING_MANAGER',
];

const approvalsService = {
  async getUserTasks(user) {
    const tasks = await prisma.approvalTask.findMany({
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
      },
      include: {
        decisionPackage: {
          include: {
            rfq: true,
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    // Filter out financial data for non-financial roles
    if (user.role === 'TECHNICAL_REVIEWER') {
      return tasks.filter(t => t.type === 'TECH');
    }

    return tasks;
  },

  async getAvailableTasks(user) {
    if (!MANAGEMENT_ROLES.includes(user.role)) {
      return [];
    }

    const tasks = await prisma.approvalTask.findMany({
      where: {
        assignedToId: null,
        status: 'PENDING',
        type: { in: ['BUDGET', 'OVERALL'] },
      },
      include: {
        decisionPackage: {
          include: {
            rfq: true,
          },
        },
      },
      orderBy: [
        { dueDate: 'asc' },
        { createdAt: 'asc' },
      ],
    });

    return tasks;
  },

  async getTaskById(id, user) {
    const task = await prisma.approvalTask.findUnique({
      where: { id },
      include: {
        decisionPackage: {
          include: {
            rfq: true,
            scenarios: {
              include: {
                scenario: {
                  include: {
                    additionalCosts: true,
                  },
                },
              },
            },
          },
        },
        assignedTo: {
          select: { id: true, name: true, email: true },
        },
        decidedBy: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!task) {
      throw new Error('Approval task not found');
    }

    // Check access
    const canAccess = 
      task.assignedToId === user.id ||
      (task.assignedToRole && task.assignedToRole === user.role) ||
      MANAGEMENT_ROLES.includes(user.role) ||
      user.role === 'ADMIN';

    if (!canAccess) {
      throw new Error('Access denied to this approval task');
    }

    return task;
  },

  async assignTask(id, userId, currentUser) {
    if (!MANAGEMENT_ROLES.includes(currentUser.role) && currentUser.role !== 'ADMIN') {
      throw new Error('Only management can assign tasks');
    }

    const task = await prisma.approvalTask.update({
      where: { id },
      data: {
        assignedToId: userId,
        assignedToRole: null,
      },
      include: {
        decisionPackage: {
          include: {
            rfq: true,
          },
        },
        assignedTo: true,
      },
    });

    // Send notification to assigned user
    await emailService.sendApprovalRequest({
      to: task.assignedTo.email,
      rfqName: task.decisionPackage.rfq.name,
      packageName: task.decisionPackage.name,
      taskType: task.type,
      dueDate: task.dueDate,
    });

    logger.info(`Approval task ${id} assigned to user ${userId} by ${currentUser.id}`);
    return task;
  },

  async claimTask(id, user) {
    const task = await prisma.approvalTask.findUnique({
      where: { id },
    });

    if (!task) {
      throw new Error('Task not found');
    }

    if (task.assignedToId) {
      throw new Error('Task is already assigned');
    }

    // Check if user can claim this task
    const canClaim = 
      (task.type === 'BUDGET' && MANAGEMENT_ROLES.includes(user.role)) ||
      (task.type === 'OVERALL' && MANAGEMENT_ROLES.includes(user.role)) ||
      (task.type === 'TECH' && task.assignedToRole === user.role);

    if (!canClaim) {
      throw new Error('You cannot claim this task');
    }

    const updatedTask = await prisma.approvalTask.update({
      where: { id },
      data: {
        assignedToId: user.id,
        assignedToRole: null,
      },
      include: {
        decisionPackage: {
          include: {
            rfq: true,
          },
        },
      },
    });

    logger.info(`Approval task ${id} claimed by user ${user.id}`);
    return updatedTask;
  },

  async makeDecision(id, decision, comment, user) {
    const task = await this.getTaskById(id, user);

    if (task.status !== 'PENDING') {
      throw new Error('Task has already been decided');
    }

    if (task.assignedToId !== user.id) {
      throw new Error('Task is not assigned to you');
    }

    // Update task with decision
    const updatedTask = await prisma.$transaction(async (tx) => {
      const updated = await tx.approvalTask.update({
        where: { id },
        data: {
          status: decision,
          decidedById: user.id,
          decidedAt: new Date(),
          decisionComment: comment,
        },
        include: {
          decisionPackage: {
            include: {
              rfq: true,
            },
          },
        },
      });

      // Check if we need to create OVERALL approval task
      if (task.decisionPackage.rfq.policy === 'PARALLEL_TECH_BUDGET_OVERALL') {
        // Get all tasks for this package
        const allTasks = await tx.approvalTask.findMany({
          where: { decisionPackageId: task.decisionPackageId },
        });

        const techTasks = allTasks.filter(t => t.type === 'TECH');
        const budgetTasks = allTasks.filter(t => t.type === 'BUDGET');
        const overallTasks = allTasks.filter(t => t.type === 'OVERALL');

        const techApproved = techTasks.every(t => t.status === 'APPROVED');
        const budgetApproved = budgetTasks.every(t => t.status === 'APPROVED');

        // If both tech and budget are approved and no overall task exists, create it
        if (techApproved && budgetApproved && overallTasks.length === 0) {
          await tx.approvalTask.create({
            data: {
              decisionPackageId: task.decisionPackageId,
              type: 'OVERALL',
              assignedToRole: 'ENGINEERING_MANAGER',
              status: 'PENDING',
            },
          });

          logger.info(`Overall approval task created for package ${task.decisionPackageId}`);
        }
      }

      // If this was an OVERALL approval and it was approved, update RFQ status
      if (task.type === 'OVERALL' && decision === 'APPROVED') {
        await tx.rfq.update({
          where: { id: task.decisionPackage.rfq.id },
          data: { status: 'SUBMITTED' },
        });
      }

      // Handle rejection - unlock the package
      if (decision === 'REJECTED') {
        await tx.decisionPackage.update({
          where: { id: task.decisionPackageId },
          data: { status: 'REJECTED' },
        });

        await tx.decisionPackageScenario.updateMany({
          where: { decisionPackageId: task.decisionPackageId },
          data: {
            lockedAt: null,
            snapshotData: null,
          },
        });
      }

      return updated;
    });

    // Send notification to package creator
    const creator = await prisma.user.findFirst({
      where: {
        id: updatedTask.decisionPackage.rfq.createdById,
      },
    });

    if (creator) {
      await emailService.sendApprovalDecision({
        to: creator.email,
        rfqName: updatedTask.decisionPackage.rfq.name,
        packageName: updatedTask.decisionPackage.name,
        decision,
        comment,
      });
    }

    logger.info(`Approval task ${id} decided as ${decision} by user ${user.id}`);
    return updatedTask;
  },
};

module.exports = approvalsService;