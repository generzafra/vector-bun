import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	LEAD_STATUSES,
	NotFoundError,
	TenantContextError,
	formatMinorUnits,
	leadStatusForSalesOutcome,
	parseContract,
	recordSalesOutcomeSchema,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	contacts,
	db,
	getLeadForTenant,
	getSalesOutcomeCoverageForTenant,
	leadStatusHistory,
	leads,
	listSalesOutcomesForTenant
} from '@vector/db';
import {
	contextFor,
	getSalesOutcomeCoverage,
	listSalesOutcomes,
	login,
	recordSalesOutcome,
	resolveSession,
	switchActiveClient,
	updateLeadStatus
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
		{ name, slug: `o3-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o3-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o3-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'o3-ctx') };
}

async function insertBareLead(
	ctx: { organizationId: string; clientId: string },
	status: (typeof LEAD_STATUSES)[number],
	email: string,
	isTest = false,
	hostname = 'o3.example.test'
) {
	const [contact] = await db
		.insert(contacts)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			displayName: 'O3 Capture',
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

test('sales outcomes stay off lead_status and do not invent a CRM', () => {
	expect(LEAD_STATUSES).toEqual(['new', 'working', 'qualified', 'won', 'lost', 'spam']);
	expect(leadStatusForSalesOutcome('appointment', 'new')).toBeNull();
	expect(leadStatusForSalesOutcome('contacted', 'new')).toBe('working');
	expect(formatMinorUnits(8500000, 'PHP')).toBe('PHP 85000.00');
	expect(
		recordSalesOutcomeSchema.safeParse({ leadId: crypto.randomUUID(), outcomeType: 'won' }).success
	).toBe(true);
	expect(
		recordSalesOutcomeSchema.safeParse({
			leadId: crypto.randomUUID(),
			outcomeType: 'won',
			amountMinor: 12.5,
			currency: 'USD'
		}).success
	).toBe(false);
	const page = readFileSync(join(root, 'apps/control/src/routes/leads/+page.svelte'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/outcomes.ts'), 'utf8');
	const schema = readFileSync(join(root, 'packages/db/src/schema.ts'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0032_o3_sales_outcomes.sql'),
		'utf8'
	);
	const appliedLeads = readFileSync(
		join(root, 'packages/db/migrations/0006_phase2_leads.sql'),
		'utf8'
	);
	expect(page).toContain('Contacted');
	expect(page).toContain('Qualified');
	expect(page).toContain('Appointment');
	expect(page).toContain('Won');
	expect(page).toContain('Lost');
	expect(page).toContain(
		'Mark what happened, or connect a CRM later. Vector will not invent sales.'
	);
	expect(domain).not.toContain('CRMProvider');
	expect(domain).not.toContain('AIProvider');
	expect(schema).toContain("pgEnum('lead_status', [");
	expect(schema).not.toMatch(/pgEnum\('lead_status', \[[^\]]*appointment/);
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect(appliedLeads).not.toContain('appointment');
});

test('missing TenantContext cannot read sales outcomes', async () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(listSalesOutcomesForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(getSalesOutcomeCoverageForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('user on client A cannot read or write client B sales outcomes', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.9.10'
	);
	const ctx = contextFor(session, 'o3-read');
	expect(ctx.clientId).toBe(alpha.id);

	const { session: adminSession } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.9.11'
	);
	await switchActiveClient(adminSession, adminSession.token, beta.id, 'o3-beta-switch');
	const betaActor = await resolveSession(adminSession.token);
	if (!betaActor) throw new Error('beta session missing');
	const betaCtx = contextFor(betaActor, 'o3-beta');
	const { lead: betaLead } = await insertBareLead(
		betaCtx,
		'qualified',
		`o3-beta-${crypto.randomUUID()}@beta.test`,
		false,
		'o3-beta.example.test'
	);
	await recordSalesOutcome(
		betaActor,
		betaCtx,
		{ leadId: betaLead.id, outcomeType: 'won', amountMinor: 12500, currency: 'USD' },
		'o3-beta-won'
	);

	const own = await listSalesOutcomes(session, ctx);
	expect(JSON.stringify(own)).not.toContain(beta.id);
	expect(JSON.stringify(own)).not.toContain(betaLead.id);

	await expect(listSalesOutcomes(session, ctx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		recordSalesOutcome(
			session,
			{ ...ctx, clientId: beta.id },
			{ leadId: betaLead.id, outcomeType: 'lost' },
			'o3-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		recordSalesOutcome(session, ctx, { leadId: betaLead.id, outcomeType: 'won' }, 'o3-cross-lead')
	).rejects.toBeInstanceOf(NotFoundError);
});

test('route client id cannot leak the other tenant sales outcomes through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.9.16'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/outcomes/sales/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
});

test('won amount is optional integer minor units and floats are rejected', async () => {
	const { actor, ctx } = await scopedActor('O3 Amount Client', '10.0.9.12');
	const { lead } = await insertBareLead(ctx, 'qualified', `o3-amt-${crypto.randomUUID()}@o3.test`);
	const withoutAmount = await recordSalesOutcome(
		actor,
		ctx,
		{ leadId: lead.id, outcomeType: 'won' },
		'o3-won-no-amount'
	);
	expect(withoutAmount.outcome.amountMinor).toBeNull();
	expect(withoutAmount.outcome.currency).toBeNull();
	expect(withoutAmount.lead.status).toBe('won');
	expect(
		typeof withoutAmount.outcome.amountMinor === 'number'
			? withoutAmount.outcome.amountMinor % 1
			: 0
	).toBe(0);

	const { lead: paid } = await insertBareLead(
		ctx,
		'qualified',
		`o3-paid-${crypto.randomUUID()}@o3.test`
	);
	const withAmount = await recordSalesOutcome(
		actor,
		ctx,
		{ leadId: paid.id, outcomeType: 'won', amountMinor: 12500, currency: 'USD' },
		'o3-won-amount'
	);
	expect(withAmount.outcome.amountMinor).toBe(12500);
	expect(withAmount.outcome.currency).toBe('USD');
	expect(Number.isInteger(withAmount.outcome.amountMinor)).toBe(true);

	expect(() =>
		parseContract(recordSalesOutcomeSchema, {
			leadId: lead.id,
			outcomeType: 'won',
			amountMinor: 99.99,
			currency: 'USD'
		})
	).toThrow();
});

test('appointment does not change lead_status', async () => {
	const { actor, ctx } = await scopedActor('O3 Appointment Client', '10.0.9.13');
	const { lead } = await insertBareLead(ctx, 'new', `o3-appt-${crypto.randomUUID()}@o3.test`);
	const recorded = await recordSalesOutcome(
		actor,
		ctx,
		{ leadId: lead.id, outcomeType: 'appointment' },
		'o3-appt'
	);
	expect(recorded.outcome.outcomeType).toBe('appointment');
	expect(recorded.lead.status).toBe('new');
	const stored = await getLeadForTenant(ctx, lead.id);
	expect(stored?.status).toBe('new');
});

test('won lead without a sales_outcome is valid and coverage stays observable', async () => {
	const { actor, ctx } = await scopedActor('O3 Coverage Client', '10.0.9.14');
	const { lead } = await insertBareLead(ctx, 'qualified', `o3-cov-${crypto.randomUUID()}@o3.test`);
	await updateLeadStatus(
		actor,
		ctx,
		{ id: lead.id, status: 'won', reason: 'Closed without recording a sale row' },
		'o3-status-won'
	);
	const before = await getSalesOutcomeCoverage(actor, ctx);
	expect(before.qualifiedCount).toBe(1);
	expect(before.knownCount).toBe(0);
	expect(before.coveragePercent).toBe(0);
	expect(before.evidenceClass).toBe('observed');

	const historyBefore = await db
		.select()
		.from(leadStatusHistory)
		.where(eq(leadStatusHistory.leadId, lead.id));
	expect(historyBefore).toHaveLength(1);
	expect(historyBefore[0]?.fromStatus).toBe('qualified');
	expect(historyBefore[0]?.toStatus).toBe('won');

	await recordSalesOutcome(
		actor,
		ctx,
		{ leadId: lead.id, outcomeType: 'won', amountMinor: 5000, currency: 'USD' },
		'o3-record-won'
	);
	const after = await getSalesOutcomeCoverage(actor, ctx);
	expect(after.knownCount).toBe(1);
	expect(after.coveragePercent).toBe(100);

	const historyAfter = await db
		.select()
		.from(leadStatusHistory)
		.where(eq(leadStatusHistory.leadId, lead.id));
	expect(historyAfter).toHaveLength(1);
	expect(historyAfter[0]?.fromStatus).toBe('qualified');
	expect(historyAfter[0]?.toStatus).toBe('won');
});

test('missing capability cannot record a sales outcome', async () => {
	const { actor, ctx } = await scopedActor('O3 Cap Client', '10.0.9.15');
	const { lead } = await insertBareLead(ctx, 'new', `o3-cap-${crypto.randomUUID()}@o3.test`);
	const reader = {
		...actor,
		permissions: actor.permissions.filter((cap) => cap !== 'leads.manage')
	};
	await expect(
		recordSalesOutcome(reader, ctx, { leadId: lead.id, outcomeType: 'contacted' }, 'o3-cap')
	).rejects.toBeInstanceOf(ForbiddenError);
});
