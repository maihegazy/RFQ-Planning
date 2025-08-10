const Decimal = require('decimal.js');
const prisma = require('../../db/prisma');
const logger = require('../../config/logger');

class CalculationService {
  constructor() {
    // Set decimal precision
    Decimal.set({ precision: 10, rounding: Decimal.ROUND_HALF_UP });
  }

  /**
   * Calculate T&M scenario costs and revenue
   */
  async calculateTM(rfqId, scenarioId, useCase) {
    try {
      // Get all profile plans with allocations
      const profilePlans = await prisma.profilePlan.findMany({
        where: { rfqId },
        include: {
          monthlyAllocations: true,
          feature: true,
        },
      });

      // Get RFQ details
      const rfq = await prisma.rfq.findUnique({
        where: { id: rfqId },
      });

      // Group allocations by cost center and year
      const costCenterHours = {};
      const levelLocationHours = {};

      for (const profile of profilePlans) {
        const costCenter = profile.location;
        const levelLocation = `${profile.level}_${profile.location}`;

        for (const allocation of profile.monthlyAllocations) {
          const year = allocation.year;
          const hours = new Decimal(allocation.fte).mul(160); // 160 hours per month

          // Aggregate by cost center
          if (!costCenterHours[costCenter]) {
            costCenterHours[costCenter] = {};
          }
          if (!costCenterHours[costCenter][year]) {
            costCenterHours[costCenter][year] = new Decimal(0);
          }
          costCenterHours[costCenter][year] = costCenterHours[costCenter][year].plus(hours);

          // Aggregate by level+location
          if (!levelLocationHours[levelLocation]) {
            levelLocationHours[levelLocation] = {};
          }
          if (!levelLocationHours[levelLocation][year]) {
            levelLocationHours[levelLocation][year] = new Decimal(0);
          }
          levelLocationHours[levelLocation][year] = levelLocationHours[levelLocation][year].plus(hours);
        }
      }

      // Calculate costs
      const costsByYear = {};
      let totalCost = new Decimal(0);

      for (const [costCenter, years] of Object.entries(costCenterHours)) {
        for (const [year, hours] of Object.entries(years)) {
          // Get cost rate for this cost center and year
          const costRate = await this.getCostRate(costCenter, new Date(year, 0, 1));
          
          if (!costRate) {
            logger.warn(`No cost rate found for ${costCenter} in ${year}`);
            continue;
          }

          const yearCost = hours.mul(costRate.costPerHour);
          
          if (!costsByYear[year]) {
            costsByYear[year] = new Decimal(0);
          }
          costsByYear[year] = costsByYear[year].plus(yearCost);
          totalCost = totalCost.plus(yearCost);
        }
      }

      // Calculate revenue
      const revenueByYear = {};
      let totalRevenue = new Decimal(0);

      for (const [levelLocation, years] of Object.entries(levelLocationHours)) {
        const [level, location] = levelLocation.split('_');
        
        for (const [year, hours] of Object.entries(years)) {
          // Get sell rate for this level+location+useCase
          const sellRate = await this.getSellRate(location, level, useCase, new Date(year, 0, 1));
          
          if (!sellRate) {
            logger.warn(`No sell rate found for ${level}@${location} UC:${useCase} in ${year}`);
            continue;
          }

          const yearRevenue = hours.mul(sellRate.sellPerHour);
          
          if (!revenueByYear[year]) {
            revenueByYear[year] = new Decimal(0);
          }
          revenueByYear[year] = revenueByYear[year].plus(yearRevenue);
          totalRevenue = totalRevenue.plus(yearRevenue);
        }
      }

      // Calculate margins
      const marginByYear = {};
      const marginPercentByYear = {};
      
      for (const year of Object.keys({ ...costsByYear, ...revenueByYear })) {
        const yearRevenue = revenueByYear[year] || new Decimal(0);
        const yearCost = costsByYear[year] || new Decimal(0);
        const yearMargin = yearRevenue.minus(yearCost);
        
        marginByYear[year] = yearMargin;
        marginPercentByYear[year] = yearCost.isZero() 
          ? new Decimal(0) 
          : yearMargin.div(yearRevenue).mul(100);
      }

      const totalMargin = totalRevenue.minus(totalCost);
      const totalMarginPercent = totalCost.isZero() 
        ? new Decimal(0) 
        : totalMargin.div(totalRevenue).mul(100);

      // Get additional costs if scenario exists
      let additionalCosts = [];
      if (scenarioId) {
        additionalCosts = await prisma.additionalCost.findMany({
          where: { scenarioId },
        });
      }

      // Apply additional costs
      let totalAdditionalCost = new Decimal(0);
      for (const addCost of additionalCosts) {
        if (addCost.type === 'ABSOLUTE') {
          totalAdditionalCost = totalAdditionalCost.plus(addCost.value);
        } else {
          // Percentage of total cost
          totalAdditionalCost = totalAdditionalCost.plus(
            totalCost.mul(addCost.value).div(100)
          );
        }
      }

      const finalCost = totalCost.plus(totalAdditionalCost);
      const finalMargin = totalRevenue.minus(finalCost);
      const finalMarginPercent = finalCost.isZero()
        ? new Decimal(0)
        : finalMargin.div(totalRevenue).mul(100);

      return {
        type: 'TM',
        useCase,
        byYear: {
          revenue: this.decimalMapToObject(revenueByYear),
          cost: this.decimalMapToObject(costsByYear),
          margin: this.decimalMapToObject(marginByYear),
          marginPercent: this.decimalMapToObject(marginPercentByYear),
        },
        total: {
          revenue: totalRevenue.toFixed(2),
          cost: totalCost.toFixed(2),
          additionalCost: totalAdditionalCost.toFixed(2),
          finalCost: finalCost.toFixed(2),
          margin: finalMargin.toFixed(2),
          marginPercent: finalMarginPercent.toFixed(2),
        },
        hours: {
          byCostCenter: this.decimalMapToObject(costCenterHours),
          byLevelLocation: this.decimalMapToObject(levelLocationHours),
        },
      };
    } catch (error) {
      logger.error('T&M calculation error:', error);
      throw error;
    }
  }

  /**
   * Calculate Fixed Price scenario
   */
  async calculateFixed(rfqId, scenario) {
    try {
      // First calculate T&M to get the weighted average hourly rate
      const tmCalc = await this.calculateTM(rfqId, scenario.id, scenario.useCase);

      // Calculate total engineering hours
      let totalHours = new Decimal(0);
      for (const years of Object.values(tmCalc.hours.byCostCenter)) {
        for (const hours of Object.values(years)) {
          totalHours = totalHours.plus(hours);
        }
      }

      // Calculate weighted average hourly rate
      const avgHourlyRate = totalHours.isZero()
        ? new Decimal(0)
        : new Decimal(tmCalc.total.revenue).div(totalHours);

      // Apply risk factor
      const riskAdjustedRate = avgHourlyRate.mul(scenario.riskFactor || 1);

      // Calculate SP-based metrics
      const spToHours = new Decimal(scenario.spToHoursMultiplier || 6.5);
      
      // Calculate total SPs from ticket sizes
      const totalSPs = new Decimal(scenario.spSmall || 0).mul(scenario.quotaSmall || 0).div(100)
        .plus(new Decimal(scenario.spMedium || 0).mul(scenario.quotaMedium || 0).div(100))
        .plus(new Decimal(scenario.spLarge || 0).mul(scenario.quotaLarge || 0).div(100));

      // Calculate hours from SPs
      const spBasedHours = totalSPs.mul(spToHours);

      // Calculate revenue
      const engineeringRevenue = spBasedHours.mul(riskAdjustedRate);

      // Add HW overhead
      const hwOverhead = new Decimal(scenario.hwOverhead || 0);

      // Get additional costs
      const additionalCosts = await prisma.additionalCost.findMany({
        where: { scenarioId: scenario.id },
      });

      let totalAdditionalCost = new Decimal(0);
      for (const addCost of additionalCosts) {
        if (addCost.type === 'ABSOLUTE') {
          totalAdditionalCost = totalAdditionalCost.plus(addCost.value);
        } else {
          // Percentage of engineering revenue
          totalAdditionalCost = totalAdditionalCost.plus(
            engineeringRevenue.mul(addCost.value).div(100)
          );
        }
      }

      const totalRevenue = engineeringRevenue.plus(hwOverhead).plus(totalAdditionalCost);

      // Get the base cost from T&M calculation
      const baseCost = new Decimal(tmCalc.total.cost);
      const totalCost = baseCost.plus(hwOverhead).plus(totalAdditionalCost);

      const margin = totalRevenue.minus(totalCost);
      const marginPercent = totalCost.isZero()
        ? new Decimal(0)
        : margin.div(totalRevenue).mul(100);

      return {
        type: 'FIXED',
        useCase: scenario.useCase,
        ticketSizes: {
          small: { sp: scenario.spSmall, quota: scenario.quotaSmall },
          medium: { sp: scenario.spMedium, quota: scenario.quotaMedium },
          large: { sp: scenario.spLarge, quota: scenario.quotaLarge },
        },
        calculations: {
          totalSPs: totalSPs.toFixed(2),
          spToHours: spToHours.toFixed(2),
          totalHours: spBasedHours.toFixed(2),
          avgHourlyRate: avgHourlyRate.toFixed(2),
          riskFactor: scenario.riskFactor || 1,
          riskAdjustedRate: riskAdjustedRate.toFixed(2),
        },
        total: {
          engineeringRevenue: engineeringRevenue.toFixed(2),
          hwOverhead: hwOverhead.toFixed(2),
          additionalCost: totalAdditionalCost.toFixed(2),
          totalRevenue: totalRevenue.toFixed(2),
          totalCost: totalCost.toFixed(2),
          margin: margin.toFixed(2),
          marginPercent: marginPercent.toFixed(2),
        },
      };
    } catch (error) {
      logger.error('Fixed price calculation error:', error);
      throw error;
    }
  }

  /**
   * Get cost rate for a cost center at a specific date
   */
  async getCostRate(costCenter, date) {
    const rate = await prisma.rateCost.findFirst({
      where: {
        costCenter,
        effectiveFrom: { lte: date },
        effectiveTo: { gte: date },
      },
    });
    return rate;
  }

  /**
   * Get sell rate for a level+location+useCase at a specific date
   */
  async getSellRate(location, level, useCase, date) {
    const rate = await prisma.rateSell.findFirst({
      where: {
        location,
        level,
        useCase,
        effectiveFrom: { lte: date },
        effectiveTo: { gte: date },
      },
    });
    return rate;
  }

  /**
   * Convert Decimal map to plain object
   */
  decimalMapToObject(map) {
    const result = {};
    for (const [key, value] of Object.entries(map)) {
      if (value instanceof Decimal) {
        result[key] = value.toFixed(2);
      } else if (typeof value === 'object') {
        result[key] = this.decimalMapToObject(value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  /**
   * Compare multiple scenarios
   */
  async compareScenarios(scenarioIds) {
    const comparisons = [];

    for (const scenarioId of scenarioIds) {
      const scenario = await prisma.scenario.findUnique({
        where: { id: scenarioId },
        include: {
          additionalCosts: true,
        },
      });

      if (!scenario) continue;

      let calculation;
      if (scenario.type === 'TM') {
        calculation = await this.calculateTM(scenario.rfqId, scenario.id, scenario.useCase);
      } else {
        calculation = await this.calculateFixed(scenario.rfqId, scenario);
      }

      comparisons.push({
        scenarioId: scenario.id,
        name: scenario.name,
        type: scenario.type,
        calculation,
      });
    }

    return comparisons;
  }
}

module.exports = new CalculationService();