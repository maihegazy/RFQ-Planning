const prisma = require('../../db/prisma');

async function applyProfileSnapshotIfNeeded(data) {
  // If profileId is provided, fetch and copy fields to snapshot columns
  if (data.profileId) {
    const p = await prisma.profile.findUnique({ where: { id: data.profileId } });
    if (!p) {
      const e = new Error('profileId not found'); e.status = 400; throw e;
    }
    // copy snapshot values (do not overwrite if user explicitly set them)
    data.role = data.role ?? p.role;
    data.level = data.level ?? p.level;
    data.location = data.location ?? p.location;
    // costCenter is not stored in ProfilePlan; used in calcs via location mapping
  }
  return data;
}

module.exports = { applyProfileSnapshotIfNeeded };
