import { z } from 'zod';
import { ValidationError } from './errors';

export const loginSchema = z
	.object({
		email: z.string().email(),
		password: z.string().min(1)
	})
	.strict();

export const createClientSchema = z
	.object({
		name: z.string().min(1).max(120),
		slug: z
			.string()
			.min(2)
			.max(60)
			.regex(/^[a-z0-9-]+$/),
		timezone: z.string().min(1).default('UTC')
	})
	.strict();

export const switchClientSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export const createMembershipSchema = z
	.object({
		email: z.string().email(),
		name: z.string().min(1).max(120),
		roleKey: z.enum(['client_owner', 'client_admin', 'read_only'])
	})
	.strict();

export const updateClientSettingsSchema = z
	.object({
		displayName: z.string().min(1).max(120)
	})
	.strict();

export const brandTokensSchema = z
	.object({
		background: z.string().max(32).optional(),
		surface: z.string().max(32).optional(),
		text: z.string().max(32).optional(),
		accent: z.string().max(32).optional(),
		fontFamily: z.string().max(80).optional()
	})
	.strict();

export const upsertBrandSchema = z
	.object({
		displayName: z.string().min(1).max(120),
		tagline: z.string().max(200).optional().nullable(),
		audience: z.string().max(400).optional().nullable(),
		offer: z.string().max(400).optional().nullable(),
		primaryConversion: z.string().max(160).optional().nullable(),
		secondaryConversion: z.string().max(160).optional().nullable(),
		brandPersonality: z
			.enum(['premium', 'technology', 'growth', 'creative', 'corporate'])
			.optional()
			.nullable(),
		tokens: brandTokensSchema.default({})
	})
	.strict();

export const createServiceSchema = z
	.object({
		name: z.string().min(1).max(120),
		slug: z
			.string()
			.min(2)
			.max(60)
			.regex(/^[a-z0-9-]+$/),
		outcome: z.string().min(1).max(200),
		summary: z.string().min(1).max(400)
	})
	.strict();

export const createOfferSchema = z
	.object({
		name: z.string().min(1).max(120),
		summary: z.string().min(1).max(400),
		startingPriceMinor: z.number().int().nonnegative().optional().nullable(),
		currency: z.string().length(3).default('USD')
	})
	.strict();

export const createClaimSchema = z
	.object({
		kind: z.enum(['approved', 'prohibited']),
		statement: z.string().min(1).max(400),
		evidence: z.string().max(400).optional().nullable()
	})
	.strict();

export const knowledgeClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export function parseContract<T>(
	schema: { safeParse(input: unknown): { success: true; data: T } | { success: false } },
	input: unknown
): T {
	const result = schema.safeParse(input);
	if (!result.success) {
		throw new ValidationError('Validation failed');
	}
	return result.data;
}
