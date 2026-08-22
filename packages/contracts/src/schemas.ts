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
