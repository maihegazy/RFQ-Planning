const { z } = require('zod');

const idParam = z.object({ id: z.string().min(1) });

const listSchema = z.object({
  query: z.object({
    role: z.string().optional(),
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).default(50).optional(),
  }),
});

const updateSchema = z.object({
  params: idParam.shape,
  body: z.object({
    // Controlled by Admin only
    role: z.string().optional(),        // must be in UserRole enum server-side
    isActive: z.coerce.boolean().optional(),
    name: z.string().optional(),
  }),
});

module.exports = { listSchema, updateSchema };
