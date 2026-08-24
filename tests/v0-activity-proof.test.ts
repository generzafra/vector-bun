import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	CLIENT_DEFAULT_NAV_HREFS,
	ForbiddenError,
	LEAD_STATUSES,
	TenantContextError,
	parseContract,
	requireTenantContext,
	saveClientValueProfileSchema,
	utcMonthWindow
} from '@vector/contracts';
import {
	clients,
	contacts,
	countObservedWorkForTenant,
	db,
	getClientValueProfileForTenant,
	insertValueActivityForTenant,
	leads
} from '@vector/db';
import {
	contextFor,
	createClient,
	getClientValueProof,
	login,
	recordValueActivity,
	resolveSession,
	saveClientValueProfile,
	switchActiveClient
} from '@vector/domain';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function scopedActor(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `v0-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'v0-create'
	);
	await switchActiveClient(session, session.token, created.id, 'v0-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'v0-ctx') };
}

async function insertBareLead(
	ctx: { organizationId: string; clientId: string },
	status: (typeof LEAD_STATUSES)[number],
	email: string,
	isTest = false,
	hostname = 'v0.example.test'
) {
	const [contact] = await db
		.insert(contacts)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			displayName: 'V0 Capture',
			email
		})
		.returning();
	const [lead] = await db
		.insert(leads)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			contactId: contact.id,
			status,
			hostname,
			domainKind: 'custom',
			isTest
		})
		.returning();
	return { contact, lead };
}

test('activity proof is not ROI and stays off default client nav', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/value/+page.svelte'), 'utf8');
	const overview = readFileSync(
		join(root, 'apps/control/src/routes/overview/+page.svelte'),
		'utf8'
	);
	const domain = readFileSync(join(root, 'packages/domain/src/value.ts'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0033_v0_activity_proof.sql'),
		'utf8'
	);
	expect(page).toContain('not ROI');
	expect(page).toContain('Vector will not invent a fee, hours saved, or ROI');
	expect(page).toContain('They are not replacement cost or time saved');
	expect(page).not.toContain('operator_minutes');
	expect(page).not.toContain('value_snapshots');
	expect(overview).toContain('See what Vector did this month');
	expect([...CLIENT_DEFAULT_NAV_HREFS]).not.toContain('/value');
	expect(domain).toContain('goals.read');
	expect(domain).toContain('goals.manage');
	expect(domain).not.toContain('value.read');
	expect(domain).not.toContain('AIProvider');
	expect(domain).not.toContain('CRMProvider');
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect(
		saveClientValueProfileSchema.safeParse({
			packageName: 'Growth',
			feeMinor: 12500,
			currency: 'USD'
		}).success
	).toBe(true);
	expect(
		saveClientValueProfileSchema.safeParse({
			packageName: 'Growth',
			feeMinor: 12.5,
			currency: 'USD'
		}).success
	).toBe(false);
	expect(
		saveClientValueProfileSchema.safeParse({
			packageName: 'Growth',
			feeMinor: 0,
			currency: 'USD'
		}).success
	).toBe(false);
	const window = utcMonthWindow(new Date('2026-08-24T12:00:00.000Z'));
	expect(window.start.toISOString()).toBe('2026-08-01T00:00:00.000Z');
	expect(window.end.toISOString()).toBe('2026-09-01T00:00:00.000Z');
});

test('missing TenantContext cannot read or write activity proof', async () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(getClientValueProfileForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(countObservedWorkForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(
		insertValueActivityForTenant(null as never, {
			activityType: 'website',
			description: 'Must not write',
			quantity: 1,
			automated: false,
			recordedBy: null
		})
	).rejects.toBeInstanceOf(TenantContextError);
});

test('user on client A cannot read or write client B activity proof', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.10.10'
	);
	const ctx = contextFor(session, 'v0-read');
	expect(ctx.clientId).toBe(alpha.id);

	const { session: adminSession } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.10.11'
	);
	await switchActiveClient(adminSession, adminSession.token, beta.id, 'v0-beta-switch');
	const betaActor = await resolveSession(adminSession.token);
	if (!betaActor) throw new Error('beta session missing');
	const betaCtx = contextFor(betaActor, 'v0-beta');
	const packageName = `Beta V0 ${crypto.randomUUID().slice(0, 8)}`;
	const note = `beta-note-${crypto.randomUUID()}`;
	const { lead: betaLead } = await insertBareLead(
		betaCtx,
		'new',
		`v0-beta-${crypto.randomUUID()}@beta.test`,
		false,
		'v0-beta.example.test'
	);
	await saveClientValueProfile(
		betaActor,
		betaCtx,
		{ packageName, feeMinor: 3500000, currency: 'PHP' },
		'v0-beta-fee'
	);
	await recordValueActivity(
		betaActor,
		betaCtx,
		{ activityType: 'website', description: note },
		'v0-beta-note'
	);

	const own = await getClientValueProof(session, ctx);
	const serialized = JSON.stringify(own);
	expect(serialized).not.toContain(beta.id);
	expect(serialized).not.toContain(betaLead.id);
	expect(serialized).not.toContain(packageName);
	expect(serialized).not.toContain(note);
	expect(own.profile?.clientId ?? alpha.id).toBe(alpha.id);

	await expect(getClientValueProof(session, ctx, beta.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(
		saveClientValueProfile(
			session,
			{ ...ctx, clientId: beta.id },
			{ packageName: 'Hijack', feeMinor: 100, currency: 'USD' },
			'v0-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		recordValueActivity(
			session,
			{ ...ctx, clientId: beta.id },
			{ activityType: 'other', description: 'Hijack note' },
			'v0-hijack-note'
		)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant activity proof through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.10.16'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/value/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
});

test('package fee is integer minor units and floats or zero are rejected', async () => {
	const { actor, ctx } = await scopedActor('V0 Fee Client', '10.0.10.12');
	const empty = await getClientValueProof(actor, ctx);
	expect(empty.profile).toBeNull();
	expect(empty.feeKnown).toBe(false);
	expect(empty.evidenceClass).toBe('unknown');

	const saved = await saveClientValueProfile(
		actor,
		ctx,
		{ packageName: 'Growth', feeMinor: 12500, currency: 'USD' },
		'v0-fee'
	);
	expect(saved.feeMinor).toBe(12500);
	expect(saved.currency).toBe('USD');
	expect(Number.isInteger(saved.feeMinor)).toBe(true);

	const proof = await getClientValueProof(actor, ctx);
	expect(proof.feeKnown).toBe(true);
	expect(proof.evidenceClass).toBe('observed');
	expect(proof.profile?.feeMinor).toBe(12500);

	expect(() =>
		parseContract(saveClientValueProfileSchema, {
			packageName: 'Growth',
			feeMinor: 99.99,
			currency: 'USD'
		})
	).toThrow();
	expect(() =>
		parseContract(saveClientValueProfileSchema, {
			packageName: 'Growth',
			feeMinor: 0,
			currency: 'USD'
		})
	).toThrow();
});

test('Beta production leads do not appear in Alpha monthly observed counts', async () => {
	const alpha = await scopedActor('V0 Count Alpha', '10.0.10.13');
	const beta = await scopedActor('V0 Count Beta', '10.0.10.14');
	await insertBareLead(
		alpha.ctx,
		'new',
		`v0-alpha-${crypto.randomUUID()}@v0.test`,
		false,
		'v0-alpha.example.test'
	);
	await insertBareLead(
		alpha.ctx,
		'new',
		`v0-alpha-test-${crypto.randomUUID()}@v0.test`,
		true,
		'v0-alpha-test.example.test'
	);
	await insertBareLead(
		beta.ctx,
		'new',
		`v0-beta-${crypto.randomUUID()}@v0.test`,
		false,
		'v0-beta-count.example.test'
	);
	const alphaProof = await getClientValueProof(alpha.actor, alpha.ctx);
	const betaProof = await getClientValueProof(beta.actor, beta.ctx);
	expect(alphaProof.counts.leads).toBe(1);
	expect(betaProof.counts.leads).toBe(1);
	expect(JSON.stringify(alphaProof)).not.toContain(beta.created.id);
	expect(alphaProof.counts).not.toHaveProperty('amountMinor');
	expect(alphaProof.counts).not.toHaveProperty('revenueMinor');
});

test('missing capability cannot record a fee or activity note', async () => {
	const { actor, ctx } = await scopedActor('V0 Cap Client', '10.0.10.15');
	const reader = {
		...actor,
		permissions: actor.permissions.filter((cap) => cap !== 'goals.manage')
	};
	await expect(
		saveClientValueProfile(
			reader,
			ctx,
			{ packageName: 'Growth', feeMinor: 100, currency: 'USD' },
			'v0-cap-fee'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		recordValueActivity(
			reader,
			ctx,
			{ activityType: 'reporting', description: 'Monthly note' },
			'v0-cap-note'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
	const proof = await getClientValueProof(reader, ctx);
	expect(proof.feeKnown).toBe(false);
});
