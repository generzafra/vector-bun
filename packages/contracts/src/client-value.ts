import { z } from 'zod';

export const VALUE_ACTIVITY_TYPES = [
	'website',
	'content',
	'social',
	'email',
	'lead_operations',
	'reporting',
	'other'
] as const;
export type ValueActivityType = (typeof VALUE_ACTIVITY_TYPES)[number];

export const saveClientValueProfileSchema = z
	.object({
		packageName: z.string().trim().min(1).max(80),
		feeMinor: z.number().int().positive().max(1_000_000_000_000_000),
		currency: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/)
	})
	.strict();

export const recordValueActivitySchema = z
	.object({
		activityType: z.enum(VALUE_ACTIVITY_TYPES),
		description: z.string().trim().min(1).max(200),
		quantity: z.number().int().positive().max(10_000).default(1),
		automated: z.boolean().default(false)
	})
	.strict();

export const clientValueClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export function utcMonthWindow(now = new Date()) {
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
	return { start, end };
}
