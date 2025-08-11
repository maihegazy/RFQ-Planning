const prisma = require('../../db/prisma');

async function applyProfileSnapshotIfNeeded(data) {
  if (data.profileId) {
    const p = await prisma.profile.findUnique({ where: { id: data.profileId } });
    if (!p) {
      const e = new Error('profileId not found');
      e.status = 400;
      throw e;
    }
    // Fill snapshot fields if not provided explicitly
    data.role = data.role ?? p.role;
    data.level = data.level ?? p.level;
    data.location = data.location ?? p.location;
  }
  return data;
}

async function listByRfq({ rfqId, featureId, role, level, location, q, page = 1, pageSize = 50 }) {
  const where = { rfqId };
  if (featureId) where.featureId = featureId;
  if (role) where.role = { contains: role, mode: 'insensitive' };
  if (level) where.level = { contains: level, mode: 'insensitive' };
  if (location) where.location = location;
  if (q) {
    where.OR = [
      { role: { contains: q, mode: 'insensitive' } },
      { level: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.profilePlan.count({ where }),
    prisma.profilePlan.findMany({
      where,
      orderBy: [{ featureId: 'asc' }, { role: 'asc' }, { level: 'asc' }, { location: 'asc' }],
      include: { monthlyAllocations: true, feature: true }, // helpful for UI
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

async function listByFeature({ featureId, role, level, location, q, page = 1, pageSize = 50 }) {
  const where = { featureId };
  if (role) where.role = { contains: role, mode: 'insensitive' };
  if (level) where.level = { contains: level, mode: 'insensitive' };
  if (location) where.location = location;
  if (q) {
    where.OR = [
      { role: { contains: q, mode: 'insensitive' } },
      { level: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.profilePlan.count({ where }),
    prisma.profilePlan.findMany({
      where,
      orderBy: [{ role: 'asc' }, { level: 'asc' }, { location: 'asc' }],
      include: { monthlyAllocations: true, profile: true },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

async function getById(id) {
  const item = await prisma.profilePlan.findUnique({
    where: { id },
    include: { monthlyAllocations: true, profile: true },
  });
  if (!item) {
    const e = new Error('Profile plan not found');
    e.status = 404; throw e;
  }
  return item;
}

async function create(data, user) {
  const payload = await applyProfileSnapshotIfNeeded({ ...data });
  const created = await prisma.profilePlan.create({ data: payload });
  // (Audit log can be added via your audit middleware)
  return created;
}

async function update(id, patch, user) {
  const payload = await applyProfileSnapshotIfNeeded({ ...patch });
  try {
    const updated = await prisma.profilePlan.update({
      where: { id },
      data: payload,
    });
    return updated;
  } catch (err) {
    if (err.code === 'P2025') {
      const e = new Error('Profile plan not found');
      e.status = 404; throw e;
    }
    throw err;
  }
}

async function remove(id, user) {
  try {
    await prisma.profilePlan.delete({ where: { id } });
  } catch (err) {
    if (err.code === 'P2025') {
      const e = new Error('Profile plan not found');
      e.status = 404; throw e;
    }
    throw err;
  }
}

module.exports = {
  listByRfq,
  listByFeature,
  getById,
  create,
  update,
  remove,
};
