import { createHash } from 'node:crypto';
import { and, eq, gt } from 'drizzle-orm';
import { env, isProd } from '@vector/config';
import { UnauthorizedError, type TenantContext } from '@vector/contracts';
import { db, sessions } from '@vector/db';
import { createCsrfToken } from './csrf';

export type SessionRecord = {
	id: string;
	token: string;
	userId: string;
	organizationId: string;
	clientId: string | null;
	csrf: string;
	permissions: string[];
	roleIds: string[];
};

export function hashToken(token: string) {
	return createHash('sha256').update(token).digest('hex');
}

export function sessionCookieOptions() {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: isProd,
		maxAge: env.SESSION_ABSOLUTE_HOURS * 3600
	};
}

export async function createSession(input: {
	userId: string;
	organizationId: string;
	clientId: string | null;
	permissions: string[];
	roleIds: string[];
}): Promise<SessionRecord> {
	const token = Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
	const csrf = createCsrfToken();
	const now = new Date();
	const idle = new Date(now.getTime() + env.SESSION_IDLE_MINUTES * 60_000);
	const absolute = new Date(now.getTime() + env.SESSION_ABSOLUTE_HOURS * 3_600_000);
	const [row] = await db
		.insert(sessions)
		.values({
			userId: input.userId,
			organizationId: input.organizationId,
			clientId: input.clientId,
			tokenHash: hashToken(token),
			csrf,
			expiresAt: idle,
			absoluteExpiresAt: absolute
		})
		.returning();
	return {
		id: row.id,
		token,
		userId: input.userId,
		organizationId: input.organizationId,
		clientId: input.clientId,
		csrf,
		permissions: input.permissions,
		roleIds: input.roleIds
	};
}

export async function loadSession(
	token: string | undefined,
	permissions: string[],
	roleIds: string[]
) {
	if (!token) return null;
	const [row] = await db
		.select()
		.from(sessions)
		.where(
			and(eq(sessions.tokenHash, hashToken(token)), gt(sessions.absoluteExpiresAt, new Date()))
		)
		.limit(1);
	if (!row) return null;
	if (row.expiresAt < new Date()) return null;
	return {
		id: row.id,
		token,
		userId: row.userId,
		organizationId: row.organizationId,
		clientId: row.clientId,
		csrf: row.csrf,
		permissions,
		roleIds
	} satisfies SessionRecord;
}

export async function setSessionClient(token: string, clientId: string) {
	const [row] = await db
		.update(sessions)
		.set({ clientId })
		.where(eq(sessions.tokenHash, hashToken(token)))
		.returning();
	return row ?? null;
}

export async function destroySession(token: string) {
	await db.delete(sessions).where(eq(sessions.tokenHash, hashToken(token)));
}

export function tenantContextFromSession(session: SessionRecord, requestId: string): TenantContext {
	if (!session.clientId) {
		throw new UnauthorizedError('No active client');
	}
	return {
		organizationId: session.organizationId,
		clientId: session.clientId,
		userId: session.userId,
		roleIds: session.roleIds,
		requestId
	};
}

export function cookieName() {
	return env.SESSION_COOKIE;
}
