const prisma = require('../../db/prisma');

async function listByRfq({ rfqId, q, withTargets, page = 1, pageSize = 50 }) {
  const where = { rfqId };
  if (q) where.name = { contains: q, mode: 'insensitive' };
  if (withTargets) where.AND = [{ targetMonth: { not: null } }, { targetYear: { not: null } }];

  const [total, items] = await Promise.all([
    prisma.feature.count({ where }),
    prisma.feature.findMany({
      where,
      orderBy: [{ targetYear: 'asc' }, { targetMonth: 'asc' }, { name: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);
  return { total, page, pageSize, items };
}

async function get(id) {
  const item = await prisma.feature.findUnique({
    where: { id },
    include: { profilePlans: true },
  });
  if (!item) {
    const e = new Error('Feature not found');
    e.status = 404; throw e;
  }
  return item;
}

async function create(data, user) {
  return prisma.feature.create({ data });
}

async function update(id, patch, user) {
  try {
    return await prisma.feature.update({ where: { id }, data: patch });
  } catch (err) {
    if (err.code === 'P2025') {
      const e = new Error('Feature not found'); e.status = 404; throw e;
    }
    throw err;
  }
}

async function remove(id, user) {
  try {
    await prisma.feature.delete({ where: { id } });
  } catch (err) {
    if (err.code === 'P2025') {
      const e = new Error('Feature not found'); e.status = 404; throw e;
    }
    throw err;
  }
}

module.exports = { listByRfq, get, create, update, remove };
