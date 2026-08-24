import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { cookieName, sessionCookieOptions } from '@vector/auth';
import { env } from '@vector/config';
import { ForbiddenError, TenantContextError } from '@vector/contracts';
import { auditLogs, clients, db, updateClientSettingsForTenant } from '@vector/db';
import {
	addMembership,
	contextFor,
	createClient,
	getClient,
	listClientsForActor,
	login,
	resolveSession,
	switchActiveClient,
	updateClientSettings
} from '@vector/domain';
import { app } from '../apps/api/src/app';

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function cookieHeader(token: string) {
	return `${cookieName()}=${token}`;
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

test('session cookie options are HttpOnly', () => {
	expect(sessionCookieOptions().httpOnly).toBe(true);
	expect(sessionCookieOptions().sameSite).toBe('lax');
});

test('API logout requires CSRF and then rejects the session token', async () => {
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.0.92'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	expect(loginRes.status).toBe(200);
	const cookie = sessionCookie(loginRes);
	const { data } = (await loginRes.json()) as { data: { csrf: string } };
	const token = cookie.split(';')[0]?.split('=')[1] ?? '';
	expect(await resolveSession(token)).not.toBeNull();

	const denied = await app.request('/v1/auth/logout', {
		method: 'POST',
		headers: { cookie }
	});
	expect(denied.status).toBe(403);
	expect(await resolveSession(token)).not.toBeNull();

	const ok = await app.request('/v1/auth/logout', {
		method: 'POST',
		headers: {
			cookie,
			'x-csrf-token': data.csrf
		}
	});
	expect(ok.status).toBe(200);
	expect(await resolveSession(token)).toBeNull();
});

test('user on client A cannot read or update client B', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.0.12'
	);
	const visible = await listClientsForActor(session);
	expect(visible.map((row) => row.slug)).toEqual(['alpha']);
	expect(visible.some((row) => row.id === beta.id)).toBe(false);

	const ctx = contextFor(session, 'iso-read');
	expect(ctx.clientId).toBe(alpha.id);
	await expect(getClient(ctx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
	await expect(updateClientSettingsForTenant(ctx, beta.id, 'Hijacked Beta')).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(
		updateClientSettings(session, ctx, beta.id, { displayName: 'Hijacked Beta' }, 'iso-update')
	).rejects.toBeInstanceOf(ForbiddenError);
});

test('missing capability returns 403', async () => {
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.0.10'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	expect(loginRes.status).toBe(200);
	const cookie = sessionCookie(loginRes);
	expect(cookie.toLowerCase()).toContain('httponly');
	const { data } = (await loginRes.json()) as { data: { csrf: string } };
	const createRes = await app.request('/v1/clients', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			cookie,
			'x-csrf-token': data.csrf
		},
		body: JSON.stringify({ name: 'Gamma', slug: 'gamma', timezone: 'UTC' })
	});
	expect(createRes.status).toBe(403);
	const body = (await createRes.json()) as { error: string };
	expect(body.error).toBe('FORBIDDEN');
});

test('route client id does not leak the other tenant through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.0.11'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/clients/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta');
	expect(text).not.toContain(beta.name);
});

test('client create and membership change write audit rows', async () => {
	const { alpha } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.0.2'
	);
	const slug = `iso-${crypto.randomUUID().slice(0, 8)}`;
	const created = await createClient(
		session,
		{ name: 'Isolation Client', slug, timezone: 'UTC' },
		'audit-create'
	);
	const [createAudit] = await db.select().from(auditLogs).where(eq(auditLogs.entityId, created.id));
	expect(createAudit?.action).toBe('client.create');
	expect(createAudit?.actorType).toBe('human');

	await switchActiveClient(session, session.token, alpha.id, 'audit-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing after switch');
	const ctx = contextFor(actor, 'audit-member');
	const member = await addMembership(
		actor,
		ctx,
		{
			email: `member-${crypto.randomUUID().slice(0, 8)}@vector.test`,
			name: 'New Member',
			roleKey: 'read_only'
		},
		'audit-member'
	);
	const [memberAudit] = await db.select().from(auditLogs).where(eq(auditLogs.entityId, member.id));
	expect(memberAudit?.action).toBe('membership.create');
});

test('admin cannot update client B while scoped to client A', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.0.3'
	);
	await switchActiveClient(session, session.token, alpha.id, 'switch-a');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'admin-cross');
	await expect(
		updateClientSettings(actor, ctx, beta.id, { displayName: 'Nope' }, 'admin-cross')
	).rejects.toBeInstanceOf(TenantContextError);

	const res = await app.request(`/v1/clients/${beta.id}`, {
		method: 'PATCH',
		headers: {
			'content-type': 'application/json',
			cookie: cookieHeader(session.token),
			'x-csrf-token': actor.csrf
		},
		body: JSON.stringify({ displayName: 'Nope' })
	});
	expect(res.status).toBeGreaterThanOrEqual(400);
	expect(JSON.stringify(await res.json())).not.toContain(beta.name);
});
