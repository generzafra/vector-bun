import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	LEAD_STATUSES,
	TenantContextError,
	requireTenantContext
} from '@vector/contracts';
import { clients, contacts, db, getOverviewFactsForTenant, leads } from '@vector/db';
import {
	contextFor,
	getClientOverview,
	login,
	recordSalesOutcome,
	resolveSession,
	switchActiveClient,
	upsertClientGoal
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
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
		{ name, slug: `o4-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o4-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o4-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'o4-ctx') };
}

async function insertBareLead(
	ctx: { organizationId: string; clientId: string },
	status: (typeof LEAD_STATUSES)[number],
	email: string,
	isTest = false
) {
	const [contact] = await db
		.insert(contacts)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			displayName: 'O4 Lead',
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
			hostname: 'o4.example.test',
			domainKind: 'custom',
			isTest
		})
		.returning();
	return lead;
}

test('overview copy stays at level 1 and does not invent revenue', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/overview/+page.svelte'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/outcomes.ts'), 'utf8');
	expect(page).toContain('Qualified leads');
	expect(page).toContain('Sales');
	expect(page).toContain('overview.revenue.detail');
	expect(page).toContain('Observed');
	expect(page).toContain('Record revenue');
	expect(page).not.toContain('amountMinor');
	expect(page).not.toContain('ROI');
	const ledger = readFileSync(join(root, 'packages/domain/src/revenue.ts'), 'utf8');
	const ledgerDb = readFileSync(join(root, 'packages/db/src/revenue.ts'), 'utf8');
	expect(ledger).toContain('Revenue is not recorded yet.');
	expect(ledgerDb).toContain("source: 'manual'");
	expect(domain).toContain("evidenceClass: 'unknown' as const");
	expect(domain).not.toContain('revenue_events');
});

test('missing TenantContext cannot read overview facts', async () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(getOverviewFactsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('overview counts observed leads and sales and leaves revenue unlabeled', async () => {
	const { actor, ctx } = await scopedActor('O4 Picture', '10.0.21.10');
	await insertBareLead(ctx, 'qualified', `o4-q-${crypto.randomUUID()}@o4.test`);
	const won = await insertBareLead(ctx, 'new', `o4-w-${crypto.randomUUID()}@o4.test`);
	await insertBareLead(ctx, 'qualified', `o4-test-${crypto.randomUUID()}@o4.test`, true);
	await recordSalesOutcome(
		actor,
		ctx,
		{ leadId: won.id, outcomeType: 'won', amountMinor: 12500, currency: 'USD' },
		'o4-won'
	);
	await upsertClientGoal(
		actor,
		ctx,
		{
			name: 'Qualified leads this month',
			goalType: 'qualified_leads',
			targetValue: 4,
			unit: 'qualified leads',
			period: 'month',
			isPrimary: true
		},
		'o4-goal'
	);

	const overview = await getClientOverview(actor, ctx);
	expect(overview.qualified).toEqual({
		evidenceClass: 'observed',
		count: 2,
		detail: '2 qualified leads recorded.'
	});
	expect(overview.sales).toEqual({
		evidenceClass: 'observed',
		count: 1,
		detail: '1 recorded sale.'
	});
	expect(overview.revenue).toEqual({
		evidenceClass: 'unknown',
		amountMinor: null,
		currency: null,
		count: 0,
		detail: 'Revenue is not recorded yet.'
	});
	expect(overview.goal?.evidenceClass).toBe('observed');
	expect(overview.goal?.observedValue).toBe(2);
	expect(overview.goal?.detail).toBe('2 of 4 qualified leads recorded.');
	expect(JSON.stringify(overview)).not.toContain('12500');
	expect(JSON.stringify(overview)).not.toContain('USD');
});

test('a revenue goal and a won lead without a sale stay unknown', async () => {
	const { actor, ctx } = await scopedActor('O4 Unknown', '10.0.21.11');
	await insertBareLead(ctx, 'won', `o4-bare-${crypto.randomUUID()}@o4.test`);
	const sold = await insertBareLead(ctx, 'new', `o4-sold-${crypto.randomUUID()}@o4.test`);
	await recordSalesOutcome(
		actor,
		ctx,
		{ leadId: sold.id, outcomeType: 'won', amountMinor: 9900, currency: 'PHP' },
		'o4-sold'
	);
	await upsertClientGoal(
		actor,
		ctx,
		{
			name: 'Revenue this month',
			goalType: 'revenue',
			targetValue: 100000,
			unit: 'minor units',
			currency: 'PHP',
			period: 'month',
			isPrimary: true
		},
		'o4-revenue-goal'
	);

	const overview = await getClientOverview(actor, ctx);
	expect(overview.qualified.evidenceClass).toBe('observed');
	expect(overview.qualified.count).toBe(2);
	expect(overview.sales.evidenceClass).toBe('unknown');
	expect(overview.sales.count).toBeNull();
	expect(overview.goal?.evidenceClass).toBe('unknown');
	expect(overview.goal?.observedValue).toBeNull();
	expect(overview.goal?.currency).toBe('PHP');
	expect(overview.goal?.targetValue).toBe(100000);
	expect(overview.goal?.observedValue).toBeNull();
	expect(JSON.stringify(overview)).not.toContain('9900');
});

test('missing lead access does not invent sales, and another tenant cannot read this overview', async () => {
	const { actor, ctx, created } = await scopedActor('O4 Isolation', '10.0.21.12');
	await insertBareLead(ctx, 'qualified', `o4-iso-${crypto.randomUUID()}@o4.test`);
	const limited = {
		...actor,
		permissions: actor.permissions.filter((permission) => !permission.startsWith('leads.'))
	};
	const hidden = await getClientOverview(limited, ctx);
	expect(hidden.qualified.evidenceClass).toBe('unknown');
	expect(hidden.sales.evidenceClass).toBe('unknown');
	expect(hidden.qualified.count).toBeNull();

	const stripped = {
		...actor,
		permissions: actor.permissions.filter(
			(permission) => permission !== 'goals.read' && !permission.startsWith('leads.')
		)
	};
	await expect(getClientOverview(stripped, ctx)).rejects.toBeInstanceOf(ForbiddenError);

	const { beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.21.13'
	);
	const alphaCtx = contextFor(session, 'o4-alpha');
	await expect(getClientOverview(session, alphaCtx, created.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	const own = await getClientOverview(session, alphaCtx);
	expect(JSON.stringify(own)).not.toContain(created.id);
	expect(JSON.stringify(own)).not.toContain(beta.id);

	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.21.14'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/overview/${created.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text).not.toContain(created.name);
	expect(text.toLowerCase()).not.toContain('beta logistics');
});
