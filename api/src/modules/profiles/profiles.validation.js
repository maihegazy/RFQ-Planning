const { z } = require('zod');

const createProfileSchema = z.object({
  body: z.object({
    role: z.string().min(1),
    level: z.string().min(1),
    location: z.string().min(1),
    costCenter: z.string().min(1),
    notes: z.string().optional(),
  }),
});

const updateProfileSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    role: z.string().min(1).optional(),
    level: z.string().min(1).optional(),
    location: z.string().min(1).optional(),
    costCenter: z.string().min(1).optional(),
    notes: z.string().optional(),
  }),
});

const listProfileSchema = z.object({
  query: z.object({
    role: z.string().optional(),
    level: z.string().optional(),
    location: z.string().optional(),
    costCenter: z.string().optional(),
    q: z.string().optional(), // free-text search
    page: z.coerce.number().int().min(1).default(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).default(50).optional(),
  }),
});

module.exports = {
  createProfileSchema,
  updateProfileSchema,
  listProfileSchema,
};
