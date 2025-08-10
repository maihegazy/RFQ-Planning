const prisma = require('../../db/prisma');
const logger = require('../../config/logger');
const Decimal = require('decimal.js');

const allocationsService = {
  async listByProfile(profilePlanId) {
    const allocations = await prisma.monthlyAllocation.findMany({
      where: { profilePlanId },
      orderBy: [{ year: 'asc' }, { month: 'asc' }],
    });

    return allocations;
  },

  async listByRfq(rfqId) {
    const profiles = await prisma.profilePlan.findMany({
      where: { rfqId },
      include: {
        feature: true,
        monthlyAllocations: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
      },
    });

    return profiles;
  },

  async listByFeature(featureId) {
    const profiles = await prisma.profilePlan.findMany({
      where: { featureId },
      include: {
        monthlyAllocations: {
          orderBy: [{ year: 'asc' }, { month: 'asc' }],
        },
      },
    });

    return profiles;
  },

  async bulkUpdate(profilePlanId, allocations, user) {
    // Verify profile exists
    const profile = await prisma.profilePlan.findUnique({
      where: { id: profilePlanId },
    });

    if (!profile) {
      throw new Error('Profile not found');
    }

    // Validate FTE values
    for (const allocation of allocations) {
      if (allocation.fte < 0 || allocation.fte > 1) {
        throw new Error(`FTE must be between 0 and 1 (got ${allocation.fte} for ${allocation.year}-${allocation.month})`);
      }
      if ((allocation.fte * 10) % 1 !== 0) {
        throw new Error(`FTE must be in 0.1 increments (got ${allocation.fte})`);
      }
    }

    // Use transaction for bulk update
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing allocations
      await tx.monthlyAllocation.deleteMany({
        where: { profilePlanId },
      });

      // Create new allocations
      const created = await tx.monthlyAllocation.createMany({
        data: allocations.map(allocation => ({
          profilePlanId,
          year: allocation.year,
          month: allocation.month,
          fte: allocation.fte,
        })),
      });

      // Fetch and return the created allocations
      const newAllocations = await tx.monthlyAllocation.findMany({
        where: { profilePlanId },
        orderBy: [{ year: 'asc' }, { month: 'asc' }],
      });

      return newAllocations;
    });

    logger.info(`Bulk allocation update for profile: ${profilePlanId} by user: ${user.id}`);
    return result;
  },

  async update(id, data, user) {
    // Validate FTE value
    if (data.fte < 0 || data.fte > 1) {
      throw new Error('FTE must be between 0 and 1');
    }
    if ((data.fte * 10) % 1 !== 0) {
      throw new Error('FTE must be in 0.1 increments');
    }

    const allocation = await prisma.monthlyAllocation.update({
      where: { id },
      data: {
        fte: data.fte,
      },
    });

    logger.info(`Allocation updated: ${id} by user: ${user.id}`);
    return allocation;
  },

  async delete(id, user) {
    await prisma.monthlyAllocation.delete({
      where: { id },
    });

    logger.info(`Allocation deleted: ${id} by user: ${user.id}`);
  },

  async copyAllocations(sourceYear, targetYear, profileIds, user) {
    // Get source allocations
    const whereClause = {
      year: sourceYear,
    };

    if (profileIds && profileIds.length > 0) {
      whereClause.profilePlanId = { in: profileIds };
    }

    const sourceAllocations = await prisma.monthlyAllocation.findMany({
      where: whereClause,
      include: {
        profilePlan: true,
      },
    });

    if (sourceAllocations.length === 0) {
      throw new Error(`No allocations found for year ${sourceYear}`);
    }

    // Create target allocations
    const targetAllocations = sourceAllocations.map(allocation => ({
      profilePlanId: allocation.profilePlanId,
      year: targetYear,
      month: allocation.month,
      fte: allocation.fte,
    }));

    // Use transaction to ensure consistency
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing allocations for target year
      await tx.monthlyAllocation.deleteMany({
        where: {
          year: targetYear,
          profilePlanId: { in: targetAllocations.map(a => a.profilePlanId) },
        },
      });

      // Create new allocations
      const created = await tx.monthlyAllocation.createMany({
        data: targetAllocations,
        skipDuplicates: true,
      });

      return created;
    });

    logger.info(`Copied ${result.count} allocations from ${sourceYear} to ${targetYear} by user: ${user.id}`);
    
    return {
      success: true,
      copied: result.count,
      sourceYear,
      targetYear,
    };
  },

  async fillAllocations(data, user) {
    const { profileId, startYear, startMonth, endYear, endMonth, fte } = data;

    // Validate date range
    if (startYear > endYear || (startYear === endYear && startMonth > endMonth)) {
      throw new Error('Invalid date range');
    }

    // Generate list of year-month combinations
    const allocations = [];
    for (let year = startYear; year <= endYear; year++) {
      const monthStart = year === startYear ? startMonth : 1;
      const monthEnd = year === endYear ? endMonth : 12;
      
      for (let month = monthStart; month <= monthEnd; month++) {
        allocations.push({
          profilePlanId: profileId,
          year,
          month,
          fte,
        });
      }
    }

    // Use transaction to update allocations
    const result = await prisma.$transaction(async (tx) => {
      // Delete existing allocations in the range
      await tx.monthlyAllocation.deleteMany({
        where: {
          profilePlanId: profileId,
          OR: allocations.map(a => ({
            year: a.year,
            month: a.month,
          })),
        },
      });

      // Create new allocations
      const created = await tx.monthlyAllocation.createMany({
        data: allocations,
      });

      return created;
    });

    logger.info(`Filled ${result.count} allocations for profile ${profileId} by user: ${user.id}`);
    
    return {
      success: true,
      filled: result.count,
      profileId,
      fte,
    };
  },

  async clearAllocations(profilePlanId, user) {
    const result = await prisma.monthlyAllocation.deleteMany({
      where: { profilePlanId },
    });

    logger.info(`Cleared ${result.count} allocations for profile ${profilePlanId} by user: ${user.id}`);
  },

  async getSummary(rfqId) {
    const profiles = await prisma.profilePlan.findMany({
      where: { rfqId },
      include: {
        feature: true,
        monthlyAllocations: true,
      },
    });

    // Calculate summary statistics
    const summary = {
      totalProfiles: profiles.length,
      byFeature: {},
      byCostCenter: {},
      byYearMonth: {},
      totalFTE: {},
    };

    for (const profile of profiles) {
      // By feature
      if (!summary.byFeature[profile.feature.name]) {
        summary.byFeature[profile.feature.name] = {
          profiles: 0,
          totalFTE: new Decimal(0),
        };
      }
      summary.byFeature[profile.feature.name].profiles++;

      // By cost center
      if (!summary.byCostCenter[profile.location]) {
        summary.byCostCenter[profile.location] = {
          profiles: 0,
          totalFTE: new Decimal(0),
        };
      }
      summary.byCostCenter[profile.location].profiles++;

      // Process allocations
      for (const allocation of profile.monthlyAllocations) {
        const key = `${allocation.year}-${allocation.month}`;
        
        // By year-month
        if (!summary.byYearMonth[key]) {
          summary.byYearMonth[key] = new Decimal(0);
        }
        summary.byYearMonth[key] = summary.byYearMonth[key].plus(allocation.fte);

        // Feature FTE
        summary.byFeature[profile.feature.name].totalFTE = 
          summary.byFeature[profile.feature.name].totalFTE.plus(allocation.fte);

        // Cost center FTE
        summary.byCostCenter[profile.location].totalFTE = 
          summary.byCostCenter[profile.location].totalFTE.plus(allocation.fte);

        // Total by year
        if (!summary.totalFTE[allocation.year]) {
          summary.totalFTE[allocation.year] = new Decimal(0);
        }
        summary.totalFTE[allocation.year] = summary.totalFTE[allocation.year].plus(allocation.fte);
      }
    }

    // Convert Decimal to numbers for JSON serialization
    const convertDecimalToNumber = (obj) => {
      const result = {};
      for (const [key, value] of Object.entries(obj)) {
        if (value instanceof Decimal) {
          result[key] = parseFloat(value.toFixed(2));
        } else if (typeof value === 'object' && value !== null) {
          if (value.totalFTE instanceof Decimal) {
            result[key] = {
              ...value,
              totalFTE: parseFloat(value.totalFTE.toFixed(2)),
            };
          } else {
            result[key] = value;
          }
        } else {
          result[key] = value;
        }
      }
      return result;
    };

    return {
      ...summary,
      byFeature: convertDecimalToNumber(summary.byFeature),
      byCostCenter: convertDecimalToNumber(summary.byCostCenter),
      byYearMonth: convertDecimalToNumber(summary.byYearMonth),
      totalFTE: convertDecimalToNumber(summary.totalFTE),
    };
  },
};

module.exports = allocationsService;