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
	SEED_USER_A_PASSWORD: z.string().min(10).default('ChangeMeNow!vector-a')
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
	SEED_USER_A_PASSWORD: process.env.SEED_USER_A_PASSWORD
});
