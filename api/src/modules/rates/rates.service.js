const prisma = require('../../db/prisma');
const dayjs = require('dayjs');

function overlaps(aFrom, aTo, bFrom, bTo) {
  const aStart = dayjs(aFrom);
  const aEnd = aTo ? dayjs(aTo) : null; // open-ended
  const bStart = dayjs(bFrom);
  const bEnd = bTo ? dayjs(bTo) : null;

  // Overlap logic with open-ended ranges:
  // aStart <= (bEnd || +inf) && bStart <= (aEnd || +inf)
  const cond1 = aStart.isSame(bEnd) || aStart.isBefore(bEnd || dayjs('9999-12-31'));
  const cond2 = bStart.isSame(aEnd) || bStart.isBefore(aEnd || dayjs('9999-12-31'));
  return cond1 && cond2;
}

async function assertNoCostRateOverlap({ idToIgnore = null, costCenter, effectiveFrom, effectiveTo }) {
  const existing = await prisma.costRate.findMany({
    where: { costCenter },
    orderBy: { effectiveFrom: 'asc' },
  });

  for (const row of existing) {
    if (idToIgnore && row.id === idToIgnore) continue;
    if (overlaps(effectiveFrom, effectiveTo, row.effectiveFrom, row.effectiveTo)) {
      throw Object.assign(new Error('Overlapping effective date range for this cost center'), { status: 400 });
    }
  }
}

async function assertNoSellRateOverlap({ idToIgnore = null, location, level, useCase, effectiveFrom, effectiveTo }) {
  const existing = await prisma.sellRate.findMany({
    where: { location, level, useCase },
    orderBy: { effectiveFrom: 'asc' },
  });

  for (const row of existing) {
    if (idToIgnore && row.id === idToIgnore) continue;
    if (overlaps(effectiveFrom, effectiveTo, row.effectiveFrom, row.effectiveTo)) {
      throw Object.assign(new Error('Overlapping effective date range for this (location, level, useCase)'), { status: 400 });
    }
  }
}

/** COST RATES **/
async function listCostRates({ costCenter, effectiveAt, page = 1, pageSize = 50 }) {
  const where = {};
  if (costCenter) where.costCenter = costCenter;

  // If effectiveAt provided, filter by that date
  if (effectiveAt) {
    const dt = new Date(effectiveAt);
    where.effectiveFrom = { lte: dt };
    where.OR = [
      { effectiveTo: null },
      { effectiveTo: { gte: dt } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.costRate.count({ where }),
    prisma.costRate.findMany({
      where,
      orderBy: [{ costCenter: 'asc' }, { effectiveFrom: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

async function createCostRate(payload) {
  await assertNoCostRateOverlap(payload);
  return prisma.costRate.create({ data: payload });
}

async function updateCostRate(id, patch) {
  // Load current
  const current = await prisma.costRate.findUnique({ where: { id } });
  if (!current) throw Object.assign(new Error('Cost rate not found'), { status: 404 });

  const merged = {
    costCenter: patch.costCenter ?? current.costCenter,
    effectiveFrom: patch.effectiveFrom ?? current.effectiveFrom,
    effectiveTo: patch.effectiveTo ?? current.effectiveTo,
  };

  await assertNoCostRateOverlap({ idToIgnore: id, ...merged });
  return prisma.costRate.update({ where: { id }, data: patch });
}

async function deleteCostRate(id) {
  await prisma.costRate.delete({ where: { id } });
}

/** SELL RATES **/
async function listSellRates({ location, level, useCase, effectiveAt, page = 1, pageSize = 50 }) {
  const where = {};
  if (location) where.location = location;
  if (level) where.level = level;
  if (useCase) where.useCase = useCase;

  if (effectiveAt) {
    const dt = new Date(effectiveAt);
    where.effectiveFrom = { lte: dt };
    where.OR = [
      { effectiveTo: null },
      { effectiveTo: { gte: dt } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.sellRate.count({ where }),
    prisma.sellRate.findMany({
      where,
      orderBy: [{ location: 'asc' }, { level: 'asc' }, { useCase: 'asc' }, { effectiveFrom: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

async function createSellRate(payload) {
  await assertNoSellRateOverlap(payload);
  return prisma.sellRate.create({ data: payload });
}

async function updateSellRate(id, patch) {
  const current = await prisma.sellRate.findUnique({ where: { id } });
  if (!current) throw Object.assign(new Error('Sell rate not found'), { status: 404 });

  const merged = {
    location: patch.location ?? current.location,
    level: patch.level ?? current.level,
    useCase: patch.useCase ?? current.useCase,
    effectiveFrom: patch.effectiveFrom ?? current.effectiveFrom,
    effectiveTo: patch.effectiveTo ?? current.effectiveTo,
  };

  await assertNoSellRateOverlap({ idToIgnore: id, ...merged });
  return prisma.sellRate.update({ where: { id }, data: patch });
}

async function deleteSellRate(id) {
  await prisma.sellRate.delete({ where: { id } });
}

module.exports = {
  listCostRates,
  createCostRate,
  updateCostRate,
  deleteCostRate,
  listSellRates,
  createSellRate,
  updateSellRate,
  deleteSellRate,
};
