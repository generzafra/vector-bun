import { afterAll, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { ForbiddenError, TenantContextError, requireTenantContext } from '@vector/contracts';
import { auditLogs, clients, closeDb, db, getBrandForTenant } from '@vector/db';
import {
	contextFor,
	getKnowledge,
	login,
	resolveSession,
	saveBrand,
	switchActiveClient
} from '@vector/domain';
import { app } from '../apps/api/src/app';

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

afterAll(async () => {
	await closeDb();
});

test('missing TenantContext cannot read knowledge', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(getBrandForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('user on client A cannot read or update client B knowledge', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.10'
	);
	const ctx = contextFor(session, 'knowledge-read');
	expect(ctx.clientId).toBe(alpha.id);
	const own = await getKnowledge(session, ctx);
	expect(own.brand?.displayName).toContain('Alpha');
	expect(own.services.some((row) => row.slug === 'implant-consult')).toBe(true);
	expect(JSON.stringify(own)).not.toContain('Beta Logistics');
	expect(JSON.stringify(own)).not.toContain('warehouse-assessment');

	await expect(getKnowledge(session, ctx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		saveBrand(
			session,
			{ ...ctx, clientId: beta.id },
			{ displayName: 'Hijacked Beta', tokens: {} },
			'knowledge-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant knowledge through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/knowledge/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('warehouse');
});

test('missing knowledge.manage returns 403', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.11'
	);
	const ctx = contextFor(session, 'knowledge-cap');
	const actor = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'knowledge.manage')
	};
	await expect(
		saveBrand(actor, ctx, { displayName: 'Nope', tokens: {} }, 'knowledge-cap')
	).rejects.toBeInstanceOf(ForbiddenError);
});

test('brand save writes an audit row for the active client only', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.0.21'
	);
	await switchActiveClient(session, session.token, alpha.id, 'knowledge-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'knowledge-audit');
	const row = await saveBrand(
		actor,
		ctx,
		{
			displayName: 'Client Alpha Dental',
			audience: 'Local patients who need implant consults',
			offer: 'Guided implant consults with a clear treatment plan',
			primaryConversion: 'Book an implant consult',
			brandPersonality: 'corporate',
			tokens: { accent: '#3b6fd9' }
		},
		'knowledge-audit'
	);
	const [audit] = await db.select().from(auditLogs).where(eq(auditLogs.entityId, row.id));
	expect(audit?.action).toBe('knowledge.brand.upsert');
	expect(audit?.clientId).toBe(alpha.id);
	expect(audit?.clientId).not.toBe(beta.id);
});
