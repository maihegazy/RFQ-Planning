const { z } = require('zod');

const idParam = z.object({ id: z.string().min(1) });

const createSchema = z.object({
  body: z.object({
    rfqId: z.string().min(1),
    featureId: z.string().min(1),
    // Optional link to Profile master; if provided, we’ll snapshot fields
    profileId: z.string().min(1).optional(),
    // Snapshot fields (required if no profileId)
    role: z.string().min(1).optional(),
    level: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    notes: z.string().optional(),
  }).refine(
    (body) => !!body.profileId || (!!body.role && !!body.level && !!body.location),
    { message: 'Either profileId or (role, level, location) must be provided' }
  ),
});

const updateSchema = z.object({
  params: idParam.shape,
  body: z.object({
    profileId: z.string().min(1).optional(),
    role: z.string().min(1).optional(),
    level: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    notes: z.string().optional(),
  }),
});

const listByRfqSchema = z.object({
  params: z.object({ rfqId: z.string().min(1) }),
  query: z.object({
    featureId: z.string().optional(),
    role: z.string().optional(),
    level: z.string().optional(),
    location: z.string().optional(),
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).default(50).optional(),
  }),
});

const listByFeatureSchema = z.object({
  params: z.object({ featureId: z.string().min(1) }),
  query: z.object({
    role: z.string().optional(),
    level: z.string().optional(),
    location: z.string().optional(),
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).default(50).optional(),
  }),
});

module.exports = {
  createSchema,
  updateSchema,
  listByRfqSchema,
  listByFeatureSchema,
};
