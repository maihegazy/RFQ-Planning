const { z } = require('zod');

const dateISO = z.string().datetime().or(z.string().regex(/^\d{4}-\d{2}-\d{2}$/));

const createCostRateSchema = z.object({
  body: z.object({
    costCenter: z.string().min(1),
    effectiveFrom: dateISO,
    effectiveTo: dateISO.optional().nullable(),
    costPerHour: z.coerce.number().positive(),
    notes: z.string().optional(),
  }),
});

const updateCostRateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    costCenter: z.string().min(1).optional(),
    effectiveFrom: dateISO.optional(),
    effectiveTo: dateISO.optional().nullable(),
    costPerHour: z.coerce.number().positive().optional(),
    notes: z.string().optional(),
  }),
});

const listCostRateSchema = z.object({
  query: z.object({
    costCenter: z.string().optional(),
    effectiveAt: dateISO.optional(), // list rates effective on this date
    page: z.coerce.number().int().min(1).default(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).default(50).optional(),
  }),
});

const createSellRateSchema = z.object({
  body: z.object({
    location: z.string().min(1),
    level: z.string().min(1),
    useCase: z.string().min(1),
    effectiveFrom: dateISO,
    effectiveTo: dateISO.optional().nullable(),
    sellPerHour: z.coerce.number().positive(),
    notes: z.string().optional(),
  }),
});

const updateSellRateSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    location: z.string().min(1).optional(),
    level: z.string().min(1).optional(),
    useCase: z.string().min(1).optional(),
    effectiveFrom: dateISO.optional(),
    effectiveTo: dateISO.optional().nullable(),
    sellPerHour: z.coerce.number().positive().optional(),
    notes: z.string().optional(),
  }),
});

const listSellRateSchema = z.object({
  query: z.object({
    location: z.string().optional(),
    level: z.string().optional(),
    useCase: z.string().optional(),
    effectiveAt: dateISO.optional(),
    page: z.coerce.number().int().min(1).default(1).optional(),
    pageSize: z.coerce.number().int().min(1).max(200).default(50).optional(),
  }),
});

module.exports = {
  createCostRateSchema,
  updateCostRateSchema,
  listCostRateSchema,
  createSellRateSchema,
  updateSellRateSchema,
  listSellRateSchema,
};
