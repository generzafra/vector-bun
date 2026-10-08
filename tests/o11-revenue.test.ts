import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	NotFoundError,
	TenantContextError,
	ValidationError
} from '@vector/contracts';
import { contacts, db, leads, salesOutcomes } from '@vector/db';
import {
	contextFor,
	getClientOverview,
	listRevenueEvents,
	login,
	recordRevenueEvent,
	recordSalesOutcome,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
import { app } from '../apps/api/src/app';

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
		{ name, slug: `o11-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o11-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o11-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'o11-ctx') };
}

async function insertLead(ctx: { organizationId: string; clientId: string }, email: string) {
	const [contact] = await db
		.insert(contacts)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			displayName: 'O11 Lead',
			email
		})
		.returning();
	const [lead] = await db
		.insert(leads)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			contactId: contact!.id,
			status: 'won',
			hostname: 'o11.example.test',
			domainKind: 'custom',
			isTest: false
		})
		.returning();
	return lead!;
}

test('a sale amount is not revenue, and a recorded payment is the ledger total', async () => {
	const { actor, ctx, created } = await scopedActor('O11 Revenue', '10.0.25.10');
	const lead = await insertLead(ctx, `o11-${crypto.randomUUID()}@o11.test`);
	const sale = await recordSalesOutcome(
		actor,
		ctx,
		{ leadId: lead.id, outcomeType: 'won', amountMinor: 8800, currency: 'USD', note: 'A sale' },
		'o11-sale'
	);
	const before = await getClientOverview(actor, ctx);
	expect(before.revenue.evidenceClass).toBe('unknown');
	expect(before.revenue.detail).toBe('Revenue is not recorded yet.');
	expect(JSON.stringify(before)).not.toContain('8800');

	const recorded = await recordRevenueEvent(
		actor,
		ctx,
		{
			amountMinor: 5000,
			currency: 'usd',
			leadId: lead.id,
			salesOutcomeId: sale.outcome.id,
			note: 'Paid invoice',
			idempotencyKey: 'o11-payment-1'
		},
		'o11-record'
	);
	expect(recorded.amountMinor).toBe(5000);
	expect(recorded.currency).toBe('USD');
	expect(recorded.source).toBe('manual');
	expect(recorded.evidenceClass).toBe('observed');
	const again = await recordRevenueEvent(
		actor,
		ctx,
		{
			amountMinor: 5000,
			currency: 'USD',
			idempotencyKey: 'o11-payment-1'
		},
		'o11-again'
	);
	expect(again.id).toBe(recorded.id);

	const after = await getClientOverview(actor, ctx);
	expect(after.revenue.evidenceClass).toBe('observed');
	expect(after.revenue.amountMinor).toBe(5000);
	expect(after.revenue.currency).toBe('USD');
	expect(after.revenue.detail).toContain('USD 50.00');
	expect(JSON.stringify(after)).not.toContain('8800');
	const [saleRow] = await db
		.select()
		.from(salesOutcomes)
		.where(eq(salesOutcomes.id, sale.outcome.id))
		.limit(1);
	expect(saleRow?.amountMinor).toBe(8800);

	await recordRevenueEvent(
		actor,
		ctx,
		{ amountMinor: 2500, currency: 'PHP', idempotencyKey: 'o11-php-1' },
		'o11-php'
	);
	const mixed = await getClientOverview(actor, ctx);
	expect(mixed.revenue.evidenceClass).toBe('unknown');
	expect(mixed.revenue.amountMinor).toBeNull();
	expect(mixed.revenue.detail).toBe(
		'Revenue is in more than one currency, so there is no single total.'
	);

	await expect(
		recordRevenueEvent(actor, ctx, { amountMinor: 1.5, currency: 'USD' }, 'o11-float')
	).rejects.toBeInstanceOf(ValidationError);
	const other = await scopedActor('O11 Other', '10.0.25.11');
	await expect(
		recordRevenueEvent(
			actor,
			ctx,
			{
				amountMinor: 100,
				currency: 'USD',
				leadId: (await insertLead(other.ctx, `o11-other-${crypto.randomUUID()}@o11.test`)).id
			},
			'o11-cross-lead'
		)
	).rejects.toBeInstanceOf(NotFoundError);
	await expect(listRevenueEvents(other.actor, other.ctx, created.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	const hidden = await listRevenueEvents(
		{
			...other.actor,
			permissions: other.actor.permissions.filter((cap) => cap !== 'outcomes.read')
		},
		other.ctx
	).catch((error: unknown) => error);
	expect(hidden).toBeInstanceOf(ForbiddenError);
	const stripped = {
		...actor,
		permissions: actor.permissions.filter((cap) => cap !== 'outcomes.manage')
	};
	await expect(
		recordRevenueEvent(stripped, ctx, { amountMinor: 100, currency: 'USD' }, 'o11-cap')
	).rejects.toBeInstanceOf(ForbiddenError);

	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.25.12'
	);
	let caught: unknown = null;
	try {
		await listRevenueEvents(session, contextFor(session, 'o11-alpha'), created.id);
	} catch (error) {
		caught = error;
	}
	expect(caught).toBeInstanceOf(TenantContextError);
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.25.13' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const body = (await loginRes.json()) as { data: { csrf: string } };
	const res = await app.request(`/v1/revenue/${created.id}`, {
		headers: { cookie: sessionCookie(loginRes), 'x-csrf-token': body.data.csrf }
	});
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text).not.toContain('5000');
	expect(text).not.toContain('8800');
	expect(text).not.toContain(created.name);
}, 20_000);
