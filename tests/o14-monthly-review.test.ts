import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import {
	ForbiddenError,
	TenantContextError,
	monthlyGrowthNarrative,
	requireTenantContext
} from '@vector/contracts';
import { contacts, db, leads, listMonthlyGrowthReportsForTenant } from '@vector/db';
import {
	contextFor,
	listMonthlyGrowthReports,
	login,
	previousCompletedMonth,
	recordMonthlyGrowthReport,
	recordRevenueEvent,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

test('a monthly review states recorded facts and does not rank a channel', () => {
	const month = previousCompletedMonth('UTC', new Date('2026-10-08T12:00:00.000Z'));
	expect(month.periodKey).toBe('2026-09');
	expect(month.end.getTime()).toBeGreaterThan(month.start.getTime());
	const text = monthlyGrowthNarrative({
		label: month.label,
		qualifiedLeads: 1,
		salesCount: null,
		revenueDetail: 'USD 50.00 recorded across 1 payment.',
		handledCount: 0,
		attributionEvidence: 'unknown',
		dataHealthEvidence: 'unknown'
	});
	expect(text).toContain('Qualified leads: 1 observed.');
	expect(text).toContain('Sales are unknown because a won lead has no recorded sale.');
	expect(text).toContain('USD 50.00');
	expect(text).toContain('nurture sends and published posts');
	expect(text).toContain('Source coverage is unknown.');
	expect(text).toContain('does not rank a channel');
	expect(text).not.toContain('%');
	expect(text).not.toContain('Ask Vector');
	expect(text).not.toContain('ROI');
	const page = readFileSync(join(root, 'apps/control/src/routes/overview/+page.svelte'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0046_o14_monthly_growth_reports.sql'),
		'utf8'
	);
	expect(page).toContain('Monthly review');
	expect(page).toContain('report.narrative');
	expect(page).not.toContain('amountMinor');
	expect(page).not.toContain('ROI');
	const reviewStart = page.indexOf('<h2>Monthly review</h2>');
	const reviewEnd = page.indexOf('</section>', reviewStart);
	const review = page.slice(reviewStart, reviewEnd);
	expect(review).not.toContain('Ask Vector');
	expect(review).not.toContain('%');
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect(migration).toContain('client_id');
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
});

async function scopedActor(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `o14-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o14-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o14-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'o14-ctx') };
}

async function insertLead(
	ctx: { organizationId: string; clientId: string },
	input: { email: string; status: 'won' | 'qualified'; isTest: boolean }
) {
	const [contact] = await db
		.insert(contacts)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			displayName: 'O14 Lead',
			email: input.email
		})
		.returning();
	const [lead] = await db
		.insert(leads)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			contactId: contact!.id,
			status: input.status,
			hostname: 'o14.example.test',
			domainKind: 'custom',
			isTest: input.isTest,
			createdAt: new Date('2026-09-15T12:00:00.000Z')
		})
		.returning();
	return lead!;
}

test('a recorded month stays fixed and another client cannot read it', async () => {
	const { actor, ctx, created } = await scopedActor('O14 Review', '10.0.28.10');
	await insertLead(ctx, {
		email: `o14-won-${crypto.randomUUID()}@o14.test`,
		status: 'won',
		isTest: false
	});
	await insertLead(ctx, {
		email: `o14-test-${crypto.randomUUID()}@o14.test`,
		status: 'qualified',
		isTest: true
	});
	await recordRevenueEvent(
		actor,
		ctx,
		{
			amountMinor: 5000,
			currency: 'USD',
			occurredAt: '2026-09-15T12:00:00.000Z',
			idempotencyKey: 'o14-payment-1'
		},
		'o14-revenue'
	);
	const first = await recordMonthlyGrowthReport(actor, ctx, 'o14-record');
	expect(first.replayed).toBe(false);
	expect(first.periodKey).toBe('2026-09');
	expect(first.narrative).toContain('Qualified leads: 1 observed.');
	expect(first.narrative).toContain('USD 50.00');
	expect(first.narrative).toContain('Sales are unknown because a won lead has no recorded sale.');
	expect(first.narrative).not.toContain('%');
	expect(first.salesCount).toBeNull();

	await recordRevenueEvent(
		actor,
		ctx,
		{
			amountMinor: 7700,
			currency: 'USD',
			occurredAt: '2026-09-20T12:00:00.000Z',
			idempotencyKey: 'o14-payment-2'
		},
		'o14-revenue-2'
	);
	const again = await recordMonthlyGrowthReport(actor, ctx, 'o14-record-again');
	expect(again.replayed).toBe(true);
	expect(again.id).toBe(first.id);
	expect(again.narrative).toContain('USD 50.00');
	expect(again.narrative).not.toContain('77.00');

	const other = await scopedActor('O14 Other', '10.0.28.11');
	const otherRows = await listMonthlyGrowthReports(other.actor, other.ctx);
	expect(JSON.stringify(otherRows)).not.toContain('USD 50.00');
	expect(otherRows.some((row) => row.id === first.id)).toBe(false);
	let crossed: unknown = null;
	try {
		await listMonthlyGrowthReports(other.actor, other.ctx, created.id);
	} catch (error) {
		crossed = error;
	}
	expect(crossed).toBeInstanceOf(TenantContextError);
	const hidden = await listMonthlyGrowthReports(
		{ ...actor, permissions: actor.permissions.filter((cap) => cap !== 'outcomes.read') },
		ctx
	).catch((error: unknown) => error);
	expect(hidden).toBeInstanceOf(ForbiddenError);
	const noLeads = await recordMonthlyGrowthReport(
		{ ...other.actor, permissions: other.actor.permissions.filter((cap) => cap !== 'leads.read') },
		other.ctx,
		'o14-no-leads'
	).catch((error: unknown) => error);
	expect(noLeads).toBeInstanceOf(ForbiddenError);
	await expect(listMonthlyGrowthReportsForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);

	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.28.13' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const body = (await loginRes.json()) as { data: { csrf: string } };
	const res = await app.request(`/v1/reviews/${created.id}`, {
		headers: { cookie: sessionCookie(loginRes), 'x-csrf-token': body.data.csrf }
	});
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text).not.toContain('USD 50.00');
	expect(text).not.toContain('77.00');
	expect(text).not.toContain(created.name);
}, 20_000);
