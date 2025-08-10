const { z } = require('zod');

const idParam = z.object({ id: z.string().min(1) });

const createSchema = z.object({
  body: z.object({
    rfqId: z.string().min(1),
    name: z.string().min(1),
    targetMonth: z.coerce.number().int().min(1).max(12).optional(),
    targetYear: z.coerce.number().int().min(2000).max(2100).optional(),
  }),
});

const updateSchema = z.object({
  params: idParam.shape,
  body: z.object({
    name: z.string().min(1).optional(),
    targetMonth: z.coerce.number().int().min(1).max(12).optional(),
    targetYear: z.coerce.number().int().min(2000).max(2100).optional(),
  }),
});

const listByRfqSchema = z.object({
  params: z.object({ rfqId: z.string().min(1) }),
  query: z.object({
    q: z.string().optional(), // name contains
    withTargets: z.coerce.boolean().optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).default(50).optional(),
  }),
});

module.exports = { createSchema, updateSchema, listByRfqSchema };
