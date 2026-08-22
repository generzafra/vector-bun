import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { z } from 'zod';

function findEnvFile() {
	let dir = process.cwd();
	for (let i = 0; i < 6; i++) {
		const path = resolve(dir, '.env');
		if (existsSync(path)) return path;
		const parent = resolve(dir, '..');
		if (parent === dir) break;
		dir = parent;
	}
	return null;
}

function loadEnvFile() {
	const path = findEnvFile();
	if (!path) return;
	for (const line of readFileSync(path, 'utf8').split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed || trimmed.startsWith('#')) continue;
		const eq = trimmed.indexOf('=');
		if (eq === -1) continue;
		const key = trimmed.slice(0, eq).trim();
		let value = trimmed.slice(eq + 1).trim();
		if (
			(value.startsWith('"') && value.endsWith('"')) ||
			(value.startsWith("'") && value.endsWith("'"))
		) {
			value = value.slice(1, -1);
		}
		if (process.env[key] === undefined) process.env[key] = value;
	}
}

loadEnvFile();

const schema = z.object({
	NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
	DATABASE_URL: z.string().min(1).default('postgres://vector:vector@127.0.0.1:5436/vector'),
	REDIS_URL: z.string().min(1).default('redis://127.0.0.1:6382'),
	SESSION_COOKIE: z.string().default('vector_sid'),
	SESSION_IDLE_MINUTES: z.coerce.number().default(30),
	SESSION_ABSOLUTE_HOURS: z.coerce.number().default(12),
	CONTROL_ORIGIN: z.string().url().default('http://localhost:5183'),
	DELIVERY_ORIGIN: z.string().url().default('http://localhost:5184'),
	DELIVERY_PREVIEW_PARENT_HOST: z.string().min(1).default('localhost'),
	API_ORIGIN: z.string().url().default('http://localhost:3011'),
	API_PORT: z.coerce.number().default(3011),
	SEED_ADMIN_EMAIL: z.string().email().default('admin@vector.test'),
	SEED_ADMIN_PASSWORD: z.string().min(10).default('ChangeMeNow!vector'),
	SEED_USER_A_EMAIL: z.string().email().default('usera@vector.test'),
	SEED_USER_A_PASSWORD: z.string().min(10).default('ChangeMeNow!vector-a'),
	STORAGE_LOCAL_DIR: z.string().min(1).default('.data/storage'),
	R2_ACCOUNT_ID: z.string().optional(),
	R2_ACCESS_KEY_ID: z.string().optional(),
	R2_SECRET_ACCESS_KEY: z.string().optional(),
	R2_BUCKET: z.string().optional(),
	R2_ENDPOINT: z.string().optional(),
	POSTHOG_API_KEY: z.string().optional(),
	POSTHOG_HOST: z.string().url().default('https://us.i.posthog.com'),
	RESEND_API_KEY: z.string().optional(),
	RESEND_WEBHOOK_SECRET: z.string().optional(),
	EMAIL_UNSUBSCRIBE_SECRET: z.string().min(16).default('vector-unsubscribe-test-secret'),
	EMAIL_SENDING_PAUSED: z.boolean().default(false),
	TRIGGER_SECRET_KEY: z.string().optional(),
	TRIGGER_PROJECT_REF: z.string().optional(),
	TRIGGER_API_URL: z.string().url().optional(),
	XAI_API_KEY: z.string().optional(),
	XAI_BASE_URL: z.string().url().default('https://api.x.ai/v1'),
	XAI_MODEL_DEFAULT: z.string().min(1).default('grok-3-mini'),
	XAI_MODEL_RESEARCH: z.string().min(1).default('grok-4'),
	AI_EXECUTION_PAUSED: z.boolean().default(false),
	AI_COST_CEILING_MICROS: z.coerce.number().int().nonnegative().default(5_000_000),
	AI_INPUT_MICROS_PER_TOKEN: z.coerce.number().int().nonnegative().default(3),
	AI_OUTPUT_MICROS_PER_TOKEN: z.coerce.number().int().nonnegative().default(15),
	TOKEN_ENCRYPTION_KEY: z.string().min(32).default('vector-token-encryption-test-key-32'),
	SOCIAL_PUBLISHING_PAUSED: z.boolean().default(false),
	SOCIAL_ADAPTER: z.enum(['memory', 'official']).default('memory'),
	LINKEDIN_CLIENT_ID: z.string().optional(),
	LINKEDIN_CLIENT_SECRET: z.string().optional(),
	X_CLIENT_ID: z.string().optional(),
	X_CLIENT_SECRET: z.string().optional(),
	META_APP_ID: z.string().optional(),
	META_APP_SECRET: z.string().optional(),
	SOCIAL_OAUTH_REDIRECT_URI: z.string().url().optional()
});

export const isProd = process.env.NODE_ENV === 'production';
export const isTest = process.env.NODE_ENV === 'test';
export const isViteBuild =
	process.env.npm_lifecycle_event === 'build' ||
	(/\bvite(\.js)?\b/.test(process.argv.join(' ')) && /\bbuild\b/.test(process.argv.join(' ')));

export const env = schema.parse({
	NODE_ENV: process.env.NODE_ENV,
	DATABASE_URL:
		process.env.DATABASE_URL ??
		(isViteBuild ? 'postgres://vector:vector@127.0.0.1:5436/vector' : undefined),
	REDIS_URL: process.env.REDIS_URL,
	SESSION_COOKIE: process.env.SESSION_COOKIE,
	SESSION_IDLE_MINUTES: process.env.SESSION_IDLE_MINUTES,
	SESSION_ABSOLUTE_HOURS: process.env.SESSION_ABSOLUTE_HOURS,
	CONTROL_ORIGIN: process.env.CONTROL_ORIGIN,
	DELIVERY_ORIGIN: process.env.DELIVERY_ORIGIN,
	DELIVERY_PREVIEW_PARENT_HOST: process.env.DELIVERY_PREVIEW_PARENT_HOST,
	API_ORIGIN: process.env.API_ORIGIN,
	API_PORT: process.env.API_PORT,
	SEED_ADMIN_EMAIL: process.env.SEED_ADMIN_EMAIL,
	SEED_ADMIN_PASSWORD: process.env.SEED_ADMIN_PASSWORD,
	SEED_USER_A_EMAIL: process.env.SEED_USER_A_EMAIL,
	SEED_USER_A_PASSWORD: process.env.SEED_USER_A_PASSWORD,
	STORAGE_LOCAL_DIR: process.env.STORAGE_LOCAL_DIR,
	R2_ACCOUNT_ID: emptyToUndefined(process.env.R2_ACCOUNT_ID),
	R2_ACCESS_KEY_ID: emptyToUndefined(process.env.R2_ACCESS_KEY_ID),
	R2_SECRET_ACCESS_KEY: emptyToUndefined(process.env.R2_SECRET_ACCESS_KEY),
	R2_BUCKET: emptyToUndefined(process.env.R2_BUCKET),
	R2_ENDPOINT: emptyToUndefined(process.env.R2_ENDPOINT),
	POSTHOG_API_KEY: emptyToUndefined(process.env.POSTHOG_API_KEY),
	POSTHOG_HOST: process.env.POSTHOG_HOST,
	RESEND_API_KEY: emptyToUndefined(process.env.RESEND_API_KEY),
	RESEND_WEBHOOK_SECRET: emptyToUndefined(process.env.RESEND_WEBHOOK_SECRET),
	EMAIL_UNSUBSCRIBE_SECRET: process.env.EMAIL_UNSUBSCRIBE_SECRET,
	EMAIL_SENDING_PAUSED:
		process.env.EMAIL_SENDING_PAUSED === 'true' || process.env.EMAIL_SENDING_PAUSED === '1',
	TRIGGER_SECRET_KEY: emptyToUndefined(process.env.TRIGGER_SECRET_KEY),
	TRIGGER_PROJECT_REF: emptyToUndefined(process.env.TRIGGER_PROJECT_REF),
	TRIGGER_API_URL: emptyToUndefined(process.env.TRIGGER_API_URL),
	XAI_API_KEY: emptyToUndefined(process.env.XAI_API_KEY),
	XAI_BASE_URL: process.env.XAI_BASE_URL,
	XAI_MODEL_DEFAULT: process.env.XAI_MODEL_DEFAULT,
	XAI_MODEL_RESEARCH: process.env.XAI_MODEL_RESEARCH,
	AI_EXECUTION_PAUSED:
		process.env.AI_EXECUTION_PAUSED === 'true' || process.env.AI_EXECUTION_PAUSED === '1',
	AI_COST_CEILING_MICROS: process.env.AI_COST_CEILING_MICROS,
	AI_INPUT_MICROS_PER_TOKEN: process.env.AI_INPUT_MICROS_PER_TOKEN,
	AI_OUTPUT_MICROS_PER_TOKEN: process.env.AI_OUTPUT_MICROS_PER_TOKEN,
	TOKEN_ENCRYPTION_KEY: process.env.TOKEN_ENCRYPTION_KEY,
	SOCIAL_PUBLISHING_PAUSED:
		process.env.SOCIAL_PUBLISHING_PAUSED === 'true' || process.env.SOCIAL_PUBLISHING_PAUSED === '1',
	SOCIAL_ADAPTER: process.env.SOCIAL_ADAPTER === 'official' ? 'official' : undefined,
	LINKEDIN_CLIENT_ID: emptyToUndefined(process.env.LINKEDIN_CLIENT_ID),
	LINKEDIN_CLIENT_SECRET: emptyToUndefined(process.env.LINKEDIN_CLIENT_SECRET),
	X_CLIENT_ID: emptyToUndefined(process.env.X_CLIENT_ID),
	X_CLIENT_SECRET: emptyToUndefined(process.env.X_CLIENT_SECRET),
	META_APP_ID: emptyToUndefined(process.env.META_APP_ID),
	META_APP_SECRET: emptyToUndefined(process.env.META_APP_SECRET),
	SOCIAL_OAUTH_REDIRECT_URI: emptyToUndefined(process.env.SOCIAL_OAUTH_REDIRECT_URI)
});

function emptyToUndefined(value: string | undefined) {
	return value && value.trim() ? value : undefined;
}
