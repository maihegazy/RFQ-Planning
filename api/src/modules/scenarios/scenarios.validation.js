const { z } = require('zod');

const idParam = z.object({ id: z.string().min(1) });

const createSchema = z.object({
  body: z.object({
    rfqId: z.string().min(1),
    name: z.string().min(1),
    type: z.enum(['TM', 'FIXED']), // align with your ScenarioType enum if different
    useCase: z.string().optional(),

    // Fixed-price fields (optional for type === 'FIXED')
    spSmall: z.coerce.number().nonnegative().optional(),
    spMedium: z.coerce.number().nonnegative().optional(),
    spLarge: z.coerce.number().nonnegative().optional(),
    quotaSmall: z.coerce.number().nonnegative().max(100).optional(),
    quotaMedium: z.coerce.number().nonnegative().max(100).optional(),
    quotaLarge: z.coerce.number().nonnegative().max(100).optional(),
    spToHoursMultiplier: z.coerce.number().positive().optional(),

    riskFactor: z.coerce.number().positive().optional(),
    hwOverhead: z.coerce.number().nonnegative().optional(),
    notes: z.string().optional(),
  }),
});

const updateSchema = z.object({
  params: idParam.shape,
  body: createSchema.shape.body.partial(),
});

const listByRfqSchema = z.object({
  params: z.object({ rfqId: z.string().min(1) }),
  query: z.object({
    q: z.string().optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).default(50).optional(),
  }),
});

const cloneSchema = z.object({
  params: idParam.shape,
  body: z.object({
    name: z.string().min(1), // new name for clone
  }),
});

const diffSchema = z.object({
  query: z.object({
    a: z.string().min(1),
    b: z.string().min(1),
  }),
});

module.exports = { createSchema, updateSchema, listByRfqSchema, cloneSchema, diffSchema };
