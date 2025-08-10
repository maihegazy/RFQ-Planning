const prisma = require('../../db/prisma');
const logger = require('../../config/logger');
const emailService = require('../../utils/email');
const calcService = require('../calc/calc.service');

const decisionPackagesService = {
  async listByRfq(rfqId) {
    const packages = await prisma.decisionPackage.findMany({
      where: { rfqId },
      include: {
        scenarios: {
          include: {
            scenario: {
              include: {
                additionalCosts: true,
              },
            },
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
      orderBy: { version: 'desc' },
    });

    return packages;
  },

  async getById(id) {
    const pkg = await prisma.decisionPackage.findUnique({
      where: { id },
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
    });

    if (!pkg) {
      throw new Error('Decision package not found');
    }

    return pkg;
  },

  async create(data, user) {
    const { rfqId, name, scenarioIds, submit } = data;

    // Get next version number
    const lastPackage = await prisma.decisionPackage.findFirst({
      where: { rfqId },
      orderBy: { version: 'desc' },
    });
    const version = (lastPackage?.version || 0) + 1;

    // Create package
    const pkg = await prisma.decisionPackage.create({
      data: {
        rfqId,
        name,
        version,
        status: 'DRAFT',
        scenarios: {
          create: scenarioIds.map(scenarioId => ({
            scenarioId,
          })),
        },
      },
      include: {
        scenarios: {
          include: {
            scenario: true,
          },
        },
      },
    });

    logger.info(`Decision package created: ${pkg.id} by user: ${user.id}`);

    // Submit if requested
    if (submit) {
      return await this.submit(pkg.id, user);
    }

    return pkg;
  },

  async submit(id, user) {
    const pkg = await this.getById(id);

    if (pkg.status !== 'DRAFT') {
      throw new Error('Package is not in draft status');
    }

    // Create snapshot of scenarios
    const snapshotData = await Promise.all(
      pkg.scenarios.map(async (ps) => {
        const scenario = ps.scenario;
        let calculation;
        
        if (scenario.type === 'TM') {
          calculation = await calcService.calculateTM(pkg.rfqId, scenario.id, scenario.useCase);
        } else {
          calculation = await calcService.calculateFixed(pkg.rfqId, scenario);
        }

        return {
          scenario,
          calculation,
        };
      })
    );

    // Lock scenarios and create approval tasks
    const updatedPkg = await prisma.$transaction(async (tx) => {
      // Update package status
      await tx.decisionPackage.update({
        where: { id },
        data: { status: 'SUBMITTED' },
      });

      // Lock scenarios with snapshot
      for (let i = 0; i < pkg.scenarios.length; i++) {
        await tx.decisionPackageScenario.update({
          where: { id: pkg.scenarios[i].id },
          data: {
            lockedAt: new Date(),
            snapshotData: snapshotData[i],
          },
        });
      }

      // Create approval tasks based on RFQ policy
      if (pkg.rfq.policy === 'PARALLEL_TECH_BUDGET_OVERALL') {
        // Get technical reviewers
        const techReviewers = await tx.rfqMember.findMany({
          where: {
            rfqId: pkg.rfqId,
            isTechReviewer: true,
          },
          include: {
            user: true,
          },
        });

        // Create TECH tasks for each reviewer
        for (const reviewer of techReviewers) {
          await tx.approvalTask.create({
            data: {
              decisionPackageId: id,
              type: 'TECH',
              assignedToId: reviewer.userId,
              status: 'PENDING',
            },
          });

          // Send email notification
          await emailService.sendApprovalRequest({
            to: reviewer.user.email,
            rfqName: pkg.rfq.name,
            packageName: pkg.name,
            taskType: 'Technical',
          });
        }

        // Create BUDGET task (unassigned, management can claim)
        await tx.approvalTask.create({
          data: {
            decisionPackageId: id,
            type: 'BUDGET',
            assignedToRole: 'ENGINEERING_MANAGER',
            status: 'PENDING',
          },
        });
      }

      return await tx.decisionPackage.findUnique({
        where: { id },
        include: {
          scenarios: {
            include: {
              scenario: true,
            },
          },
          approvalTasks: true,
        },
      });
    });

    logger.info(`Decision package submitted: ${id} by user: ${user.id}`);
    return updatedPkg;
  },

  async recall(id, user) {
    const pkg = await this.getById(id);

    if (pkg.status !== 'SUBMITTED') {
      throw new Error('Package is not submitted');
    }

    // Check if any approvals have been made
    const hasDecisions = pkg.approvalTasks.some(task => task.status !== 'PENDING');
    if (hasDecisions) {
      throw new Error('Cannot recall package with completed approvals');
    }

    // Recall the package
    const updatedPkg = await prisma.$transaction(async (tx) => {
      // Update status
      await tx.decisionPackage.update({
        where: { id },
        data: { status: 'DRAFT' },
      });

      // Unlock scenarios
      await tx.decisionPackageScenario.updateMany({
        where: { decisionPackageId: id },
        data: {
          lockedAt: null,
          snapshotData: null,
        },
      });

      // Cancel approval tasks
      await tx.approvalTask.deleteMany({
        where: {
          decisionPackageId: id,
          status: 'PENDING',
        },
      });

      return await tx.decisionPackage.findUnique({
        where: { id },
        include: {
          scenarios: {
            include: {
              scenario: true,
            },
          },
          approvalTasks: true,
        },
      });
    });

    logger.info(`Decision package recalled: ${id} by user: ${user.id}`);
    return updatedPkg;
  },

  async getApprovalStatus(id) {
    const pkg = await this.getById(id);

    const techTasks = pkg.approvalTasks.filter(t => t.type === 'TECH');
    const budgetTasks = pkg.approvalTasks.filter(t => t.type === 'BUDGET');
    const overallTasks = pkg.approvalTasks.filter(t => t.type === 'OVERALL');

    const techApproved = techTasks.length > 0 && techTasks.every(t => t.status === 'APPROVED');
    const budgetApproved = budgetTasks.length > 0 && budgetTasks.every(t => t.status === 'APPROVED');
    const overallApproved = overallTasks.length > 0 && overallTasks.every(t => t.status === 'APPROVED');

    const anyRejected = pkg.approvalTasks.some(t => t.status === 'REJECTED');

    return {
      packageStatus: pkg.status,
      techStatus: techApproved ? 'APPROVED' : techTasks.some(t => t.status === 'REJECTED') ? 'REJECTED' : 'PENDING',
      budgetStatus: budgetApproved ? 'APPROVED' : budgetTasks.some(t => t.status === 'REJECTED') ? 'REJECTED' : 'PENDING',
      overallStatus: overallApproved ? 'APPROVED' : overallTasks.some(t => t.status === 'REJECTED') ? 'REJECTED' : 'PENDING',
      canProceedToOverall: techApproved && budgetApproved && !overallTasks.length,
      isFullyApproved: overallApproved,
      isRejected: anyRejected,
      tasks: pkg.approvalTasks,
    };
  },
};

module.exports = decisionPackagesService;