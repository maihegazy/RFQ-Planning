const prisma = require('../../db/prisma');

const FINANCIAL_FIELDS = [
  'type','useCase','spSmall','spMedium','spLarge','quotaSmall','quotaMedium','quotaLarge',
  'spToHoursMultiplier','riskFactor','hwOverhead','notes','createdAt','updatedAt'
];

async function listByRfq({ rfqId, q, page = 1, pageSize = 50 }) {
  const where = { rfqId };
  if (q) where.name = { contains: q, mode: 'insensitive' };

  const [total, items] = await Promise.all([
    prisma.scenario.count({ where }),
    prisma.scenario.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, items };
}

async function get(id) {
  const item = await prisma.scenario.findUnique({ where: { id } });
  if (!item) {
    const e = new Error('Scenario not found'); e.status = 404; throw e;
  }
  return item;
}

async function create(data) {
  return prisma.scenario.create({ data });
}

async function update(id, patch) {
  try {
    return await prisma.scenario.update({ where: { id }, data: patch });
  } catch (err) {
    if (err.code === 'P2025') {
      const e = new Error('Scenario not found'); e.status = 404; throw e;
    }
    throw err;
  }
}

async function remove(id) {
  try {
    await prisma.scenario.delete({ where: { id } });
  } catch (err) {
    if (err.code === 'P2025') {
      const e = new Error('Scenario not found'); e.status = 404; throw e;
    }
    throw err;
  }
}

async function clone(id, newName) {
  const s = await get(id);
  const cloneData = { ...s, id: undefined, name: newName, createdAt: undefined, updatedAt: undefined };
  return prisma.scenario.create({ data: cloneData });
}

function diff(a, b) {
  const changes = {};
  FINANCIAL_FIELDS.concat(['name']).forEach((k) => {
    if (a[k] !== b[k]) changes[k] = { from: a[k], to: b[k] };
  });
  return changes;
}

module.exports = { listByRfq, get, create, update, remove, clone, diff };
