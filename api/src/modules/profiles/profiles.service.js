const prisma = require('../../db/prisma');

async function listProfiles({ role, level, location, costCenter, q, page = 1, pageSize = 50 }) {
  const where = {};

  if (role) where.role = { contains: role, mode: 'insensitive' };
  if (level) where.level = { contains: level, mode: 'insensitive' };
  if (location) where.location = { equals: location };
  if (costCenter) where.costCenter = { equals: costCenter };

  if (q) {
    // crude OR search over a few fields
    where.OR = [
      { role: { contains: q, mode: 'insensitive' } },
      { level: { contains: q, mode: 'insensitive' } },
      { location: { contains: q, mode: 'insensitive' } },
      { costCenter: { contains: q, mode: 'insensitive' } },
      { notes: { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.profile.count({ where }),
    prisma.profile.findMany({
      where,
      orderBy: [{ role: 'asc' }, { level: 'asc' }, { location: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
  ]);

  return { total, page, pageSize, items };
}

async function createProfile(data) {
  // rely on unique constraint (role, level, location) for duplicates
  try {
    return await prisma.profile.create({ data });
  } catch (err) {
    if (err.code === 'P2002') {
      const error = new Error('Profile with the same role, level, and location already exists');
      error.status = 409;
      throw error;
    }
    throw err;
  }
}

async function updateProfile(id, patch) {
  try {
    return await prisma.profile.update({
      where: { id },
      data: patch,
    });
  } catch (err) {
    if (err.code === 'P2002') {
      const error = new Error('Update conflicts with existing profile (role, level, location must be unique)');
      error.status = 409;
      throw error;
    }
    if (err.code === 'P2025') {
      const error = new Error('Profile not found');
      error.status = 404;
      throw error;
    }
    throw err;
  }
}

async function deleteProfile(id) {
  try {
    await prisma.profile.delete({ where: { id } });
  } catch (err) {
    if (err.code === 'P2025') {
      const error = new Error('Profile not found');
      error.status = 404;
      throw error;
    }
    throw err;
  }
}

module.exports = {
  listProfiles,
  createProfile,
  updateProfile,
  deleteProfile,
};
