import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { LEAD_STATUSES, TenantContextError } from '@vector/contracts';
import { contacts, db, leads } from '@vector/db';
import {
	contextFor,
	getClientValueProof,
	login,
	recordSalesOutcome,
	resolveSession,
	switchActiveClient,
	upsertClientGoal
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';

const root = join(import.meta.dir, '..');

async function scopedActor(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `v1-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'v1-create'
	);
	await switchActiveClient(session, session.token, created.id, 'v1-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'v1-ctx') };
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
			displayName: 'V1 Capture',
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
			hostname: 'v1.example.test',
			domainKind: 'custom',
			isTest
		})
		.returning();
	return { contact, lead };
}

test('lead value copy does not claim ROI or add a ledger', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/value/+page.svelte'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/value.ts'), 'utf8');
	expect(page).toContain('Qualified leads this month');
	expect(page).toContain('Source coverage is');
	expect(page).toContain('Vector does not rank a channel from this.');
	expect(page).toContain('not ROI');
	expect(page).not.toContain('value_snapshots');
	expect(page).not.toContain('amountMinor');
	expect(domain).not.toContain('ROI');
	expect(domain).not.toContain('amountMinor');
	expect(domain).not.toContain('revenue_events');
	expect(domain).not.toContain('value_snapshots');
});

test('qualified leads join the primary goal without inventing progress', async () => {
	const alpha = await scopedActor('V1 Alpha', '10.0.29.10');
	const beta = await scopedActor('V1 Beta', '10.0.29.11');
	const empty = await getClientValueProof(alpha.actor, alpha.ctx);
	expect(empty.leadValue.goal).toBeNull();
	expect(empty.leadValue.attributionEvidence).toBe('unknown');
	expect(empty.leadValue.attributionEvidence).not.toBe('measured');

	await insertBareLead(alpha.ctx, 'new', `v1-new-${crypto.randomUUID()}@v1.test`, false);
	await insertBareLead(alpha.ctx, 'qualified', `v1-qualified-${crypto.randomUUID()}@v1.test`, true);
	await insertBareLead(alpha.ctx, 'qualified', `v1-real-${crypto.randomUUID()}@v1.test`, false);
	const counted = await getClientValueProof(alpha.actor, alpha.ctx);
	expect(counted.counts.leads).toBe(2);
	expect(counted.counts.qualifiedLeads).toBe(1);
	expect(counted.leadValue.qualifiedLeads).toBe(1);
	expect(counted.leadValue.attributionEvidence).toBe('unknown');

	await upsertClientGoal(
		alpha.actor,
		alpha.ctx,
		{
			name: 'V1 Alpha Qualified',
			goalType: 'qualified_leads',
			targetValue: 10,
			unit: 'leads',
			period: 'month',
			isPrimary: true
		},
		'v1-goal'
	);
	const joined = await getClientValueProof(alpha.actor, alpha.ctx);
	expect(joined.leadValue.goal?.evidenceClass).toBe('observed');
	expect(joined.leadValue.goal?.observedValue).toBe(1);
	expect(joined.leadValue.goal?.targetValue).toBe(10);
	expect(joined.leadValue.goal?.detail).not.toContain('%');
	expect(JSON.stringify(joined.leadValue)).not.toContain('amountMinor');

	await upsertClientGoal(
		alpha.actor,
		alpha.ctx,
		{
			name: 'V1 Alpha Bookings',
			goalType: 'bookings',
			targetValue: 4,
			unit: 'bookings',
			period: 'month',
			isPrimary: true
		},
		'v1-bookings'
	);
	const bookings = await getClientValueProof(alpha.actor, alpha.ctx);
	expect(bookings.leadValue.goal?.name).toBe('V1 Alpha Bookings');
	expect(bookings.leadValue.goal?.observedValue).toBeNull();
	expect(bookings.leadValue.goal?.evidenceClass).toBe('unknown');

	const won = await insertBareLead(
		alpha.ctx,
		'won',
		`v1-won-${crypto.randomUUID()}@v1.test`,
		false
	);
	await upsertClientGoal(
		alpha.actor,
		alpha.ctx,
		{
			name: 'V1 Alpha Sales',
			goalType: 'sales',
			targetValue: 4,
			unit: 'sales',
			period: 'month',
			isPrimary: true
		},
		'v1-sales-goal'
	);
	const unknownSale = await getClientValueProof(alpha.actor, alpha.ctx);
	expect(unknownSale.leadValue.goal?.observedValue).toBeNull();
	expect(unknownSale.leadValue.goal?.detail).toContain('no recorded sale');

	await recordSalesOutcome(
		alpha.actor,
		alpha.ctx,
		{ leadId: won.lead.id, outcomeType: 'won', amountMinor: 5000, currency: 'USD' },
		'v1-sale'
	);
	const sold = await getClientValueProof(alpha.actor, alpha.ctx);
	expect(sold.leadValue.goal?.evidenceClass).toBe('observed');
	expect(sold.leadValue.goal?.observedValue).toBe(1);
	expect(JSON.stringify(sold.leadValue)).not.toContain('5000');
	expect(JSON.stringify(sold)).not.toContain('ROI');

	await upsertClientGoal(
		alpha.actor,
		alpha.ctx,
		{
			name: 'V1 Alpha Revenue',
			goalType: 'revenue',
			targetValue: 20,
			unit: 'revenue',
			currency: 'USD',
			period: 'month',
			isPrimary: true
		},
		'v1-revenue-goal'
	);
	const revenueGoal = await getClientValueProof(alpha.actor, alpha.ctx);
	expect(revenueGoal.leadValue.goal?.observedValue).toBeNull();
	expect(revenueGoal.leadValue.goal?.evidenceClass).toBe('unknown');
	expect(revenueGoal.leadValue.goal?.detail).toBe('This goal has no progress figure.');

	const other = await getClientValueProof(beta.actor, beta.ctx);
	expect(JSON.stringify(other)).not.toContain('V1 Alpha Qualified');
	expect(JSON.stringify(other)).not.toContain('V1 Alpha Sales');
	expect(other.counts.qualifiedLeads).toBe(0);
	let caught: unknown;
	try {
		await getClientValueProof(alpha.actor, alpha.ctx, beta.created.id);
	} catch (error) {
		caught = error;
	}
	expect(caught).toBeInstanceOf(TenantContextError);
});

test('missing tenant context cannot read the lead value join', async () => {
	const { actor } = await scopedActor('V1 Context', '10.0.29.12');
	let caught: unknown;
	try {
		await getClientValueProof(actor, null as never);
	} catch (error) {
		caught = error;
	}
	expect(caught).toBeInstanceOf(TenantContextError);
	const [row] = await db.select().from(leads).where(eq(leads.clientId, actor.clientId!)).limit(1);
	expect(row).toBeUndefined();
});
