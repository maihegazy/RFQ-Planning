const prisma = require('../../db/prisma');

async function list({ role, q, page = 1, pageSize = 50 }) {
  const where = {};
  if (role) where.role = role;
  if (q) {
    where.OR = [
      { email: { contains: q, mode: 'insensitive' } },
      { name:  { contains: q, mode: 'insensitive' } },
    ];
  }

  const [total, items] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: [{ role: 'asc' }, { email: 'asc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    }),
  ]);

  return { total, page, pageSize, items };
}

async function update(id, patch) {
  // Optionally validate role against enum (Prisma will also validate)
  try {
    return await prisma.user.update({
      where: { id },
      data: patch,
      select: { id: true, email: true, name: true, role: true, isActive: true, createdAt: true },
    });
  } catch (err) {
    if (err.code === 'P2025') {
      const e = new Error('User not found'); e.status = 404; throw e;
    }
    throw err;
  }
}

module.exports = { list, update };
