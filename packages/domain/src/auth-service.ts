import { and, eq } from 'drizzle-orm';
import {
	consumeRateLimit,
	createSession,
	destroySession,
	hashPassword,
	hashToken,
	loadSession,
	requireCapability,
	setSessionClient,
	tenantContextFromSession,
	verifyPassword,
	type SessionRecord
} from '@vector/auth';
import {
	ForbiddenError,
	UnauthorizedError,
	loginSchema,
	parseContract,
	type Capability,
	type TenantContext
} from '@vector/contracts';
import { createRequestId } from '@vector/observability';
import { db, memberships, permissions, rolePermissions, roles, sessions, users } from '@vector/db';
import { recordAudit } from './audit';

const LOCK_AFTER = 5;
const LOCK_MS = 15 * 60_000;

export type Actor = SessionRecord;

export async function login(input: unknown, ip: string) {
	consumeRateLimit(`login:${ip}`, 10, 15 * 60_000);
	consumeRateLimit(`login-reset:${ip}`, 5, 15 * 60_000);
	const parsed = parseContract(loginSchema, input);
	const [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, parsed.email.toLowerCase()))
		.limit(1);
	if (!user) throw new UnauthorizedError('Invalid credentials');
	if (user.lockedUntil && user.lockedUntil > new Date()) {
		throw new UnauthorizedError('Account locked');
	}
	const ok = await verifyPassword(parsed.password, user.passwordHash);
	if (!ok) {
		const failed = user.failedLoginCount + 1;
		await db
			.update(users)
			.set({
				failedLoginCount: failed,
				lockedUntil: failed >= LOCK_AFTER ? new Date(Date.now() + LOCK_MS) : null,
				updatedAt: new Date()
			})
			.where(eq(users.id, user.id));
		throw new UnauthorizedError('Invalid credentials');
	}
	await db
		.update(users)
		.set({ failedLoginCount: 0, lockedUntil: null, updatedAt: new Date() })
		.where(eq(users.id, user.id));
	const access = await loadAccess(user.id);
	if (!access) throw new ForbiddenError('No membership');
	const session = await createSession({
		userId: user.id,
		organizationId: access.organizationId,
		clientId: access.clientId,
		permissions: access.permissions,
		roleIds: access.roleIds
	});
	await recordAudit({
		organizationId: access.organizationId,
		clientId: access.clientId,
		actorType: 'human',
		actorId: user.id,
		action: 'auth.login',
		entityType: 'session',
		entityId: session.id,
		requestId: createRequestId()
	});
	return { session, user: { id: user.id, email: user.email, name: user.name } };
}

export async function logout(token: string, session: SessionRecord | null) {
	if (token) await destroySession(token);
	if (session) {
		await recordAudit({
			organizationId: session.organizationId,
			clientId: session.clientId,
			actorType: 'human',
			actorId: session.userId,
			action: 'auth.logout',
			entityType: 'session',
			entityId: session.id,
			requestId: createRequestId()
		});
	}
}

export async function resolveSession(token: string | undefined) {
	if (!token) return null;
	const hashedPeek = token;
	const accessByUser = await peekUserAccessFromToken(hashedPeek);
	if (!accessByUser) return null;
	return loadSession(token, accessByUser.permissions, accessByUser.roleIds);
}

async function peekUserAccessFromToken(token: string) {
	const [row] = await db
		.select()
		.from(sessions)
		.where(eq(sessions.tokenHash, hashToken(token)))
		.limit(1);
	if (!row) return null;
	return loadAccess(row.userId, row.clientId, row.organizationId);
}

export async function loadAccess(
	userId: string,
	preferredClientId?: string | null,
	organizationId?: string
) {
	const rows = await db
		.select({
			organizationId: memberships.organizationId,
			clientId: memberships.clientId,
			roleId: roles.id,
			roleKey: roles.key,
			permissionKey: permissions.key
		})
		.from(memberships)
		.innerJoin(roles, eq(memberships.roleId, roles.id))
		.innerJoin(rolePermissions, eq(rolePermissions.roleId, roles.id))
		.innerJoin(permissions, eq(rolePermissions.permissionId, permissions.id))
		.where(
			organizationId
				? and(eq(memberships.userId, userId), eq(memberships.organizationId, organizationId))
				: eq(memberships.userId, userId)
		);
	if (!rows.length) return null;
	const orgId = rows[0].organizationId;
	const clientId =
		preferredClientId ?? rows.find((row) => row.clientId)?.clientId ?? rows[0].clientId;
	const permissionsSet = [...new Set(rows.map((row) => row.permissionKey))];
	const roleIds = [...new Set(rows.map((row) => row.roleId))];
	return { organizationId: orgId, clientId, permissions: permissionsSet, roleIds };
}

export function actorCan(actor: Actor, capability: Capability) {
	requireCapability(actor.permissions, capability);
}

export function contextFor(actor: Actor, requestId: string): TenantContext {
	return tenantContextFromSession(actor, requestId);
}

export async function switchActiveClient(
	actor: Actor,
	token: string,
	clientId: string,
	requestId: string
) {
	const allowed = await db
		.select()
		.from(memberships)
		.where(
			and(
				eq(memberships.userId, actor.userId),
				eq(memberships.organizationId, actor.organizationId)
			)
		);
	const orgWide = allowed.some((row) => row.clientId === null);
	const clientOk = allowed.some((row) => row.clientId === clientId);
	if (!orgWide && !clientOk) {
		throw new ForbiddenError('Cannot switch to that client');
	}
	await setSessionClient(token, clientId);
	await recordAudit({
		organizationId: actor.organizationId,
		clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'session.switch_client',
		entityType: 'client',
		entityId: clientId,
		requestId
	});
}

export { hashPassword };
