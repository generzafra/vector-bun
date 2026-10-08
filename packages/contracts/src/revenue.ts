import { z } from 'zod';

export const REVENUE_SOURCES = ['manual'] as const;

export const recordRevenueEventSchema = z
	.object({
		amountMinor: z.number().int().nonnegative().max(1_000_000_000_000_000),
		currency: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/),
		occurredAt: z
			.string()
			.regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z$/)
			.optional(),
		note: z.string().trim().max(400).optional().nullable(),
		leadId: z.string().uuid().optional().nullable(),
		salesOutcomeId: z.string().uuid().optional().nullable(),
		idempotencyKey: z.string().trim().min(8).max(120).optional().nullable()
	})
	.strict();
