import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	NotFoundError,
	ProviderError,
	TenantContextError
} from '@vector/contracts';
import { contacts, db, leads } from '@vector/db';
import {
	DisabledCrmProvider,
	MemoryCrmProvider,
	createCrmProvider,
	resetCrmProvider,
	setCrmProvider,
	withCrmRetry
} from '@vector/crm';
import {
	contextFor,
	getCrmStatus,
	login,
	pullCrmLead,
	pushLeadToCrm,
	recordSalesOutcome,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

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
		{ name, slug: `o10-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o10-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o10-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'o10-ctx') };
}

async function insertLead(ctx: { organizationId: string; clientId: string }, email: string) {
	const [contact] = await db
		.insert(contacts)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			displayName: 'O10 Lead',
			email
		})
		.returning();
	const [lead] = await db
		.insert(leads)
		.values({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			contactId: contact!.id,
			status: 'qualified',
			hostname: 'o10.example.test',
			domainKind: 'custom',
			isTest: false
		})
		.returning();
	return { contact: contact!, lead: lead! };
}

test('the CRM adapter is memory by default and does not name a vendor', async () => {
	const factory = readFileSync(join(root, 'packages/crm/src/factory.ts'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/crm.ts'), 'utf8');
	const page = readFileSync(join(root, 'apps/control/src/routes/leads/+page.svelte'), 'utf8');
	const combined = `${factory}\n${domain}`.toLowerCase();
	expect(factory).toContain('MemoryCrmProvider');
	expect(combined).not.toContain('hubspot');
	expect(combined).not.toContain('salesforce');
	expect(combined).not.toContain('pipedrive');
	expect(combined).not.toContain('zoho');
	expect(page).toContain('data.crm.detail');
	expect(page).toContain(
		'Mark what happened, or connect a CRM later. Vector will not invent sales.'
	);

	const provider = createCrmProvider();
	expect(provider).toBeInstanceOf(MemoryCrmProvider);
	const health = await provider.health();
	expect(health.external).toBe(false);
	expect(health.detail).toBe('No external CRM is connected. Sales stay recorded here.');

	let attempts = 0;
	const retried = await withCrmRetry(async () => {
		attempts += 1;
		if (attempts === 1) throw new ProviderError('again', 'CRM_TEMPORARY');
		return 'stored';
	});
	expect(retried).toBe('stored');
	expect(attempts).toBe(2);
	await expect(
		withCrmRetry(async () => {
			throw new ProviderError('bad money', 'CRM_MONEY');
		})
	).rejects.toBeInstanceOf(ProviderError);

	const memory = new MemoryCrmProvider();
	const push = {
		clientId: 'client-a',
		leadId: 'lead-a',
		contactId: 'contact-a',
		idempotencyKey: 'same-key',
		displayName: 'A',
		email: 'a@o10.test',
		stage: 'qualified'
	};
	const first = await memory.pushLead(push);
	const second = await memory.pushLead(push);
	expect(second.externalId).toBe(first.externalId);
	const otherClient = await memory.pushLead({ ...push, clientId: 'client-b', leadId: 'lead-b' });
	expect(otherClient.externalId).not.toBe(first.externalId);
	memory.seedDeal({
		clientId: 'client-b',
		leadId: 'lead-b',
		externalId: 'deal-b',
		name: 'Other deal',
		amountMinor: 7700,
		currency: 'USD'
	});
	expect(await memory.pullDeals({ clientId: 'client-a', leadId: 'lead-a' })).toHaveLength(0);
	expect(await memory.pullRevenue({ clientId: 'client-b', leadId: 'lead-b' })).toEqual([
		{
			clientId: 'client-b',
			leadId: 'lead-b',
			externalId: 'deal-b',
			amountMinor: 7700,
			currency: 'USD'
		}
	]);
	expect(() =>
		memory.seedDeal({
			clientId: 'client-a',
			leadId: 'lead-a',
			externalId: 'bad',
			name: 'Float',
			amountMinor: 1.5,
			currency: 'USD'
		})
	).toThrow(ProviderError);
	await expect(memory.pushLead({ ...push, timeoutMs: 0 })).rejects.toBeInstanceOf(ProviderError);
	expect(memory.metrics.calls).toBeGreaterThan(0);
});

test('a CRM pull does not replace a recorded sale', async () => {
	const memory = new MemoryCrmProvider();
	setCrmProvider(memory);
	const { actor, ctx, created } = await scopedActor('O10 CRM', '10.0.24.10');
	const { lead } = await insertLead(ctx, `o10-${crypto.randomUUID()}@o10.test`);
	const status = await getCrmStatus(actor, ctx);
	expect(status.external).toBe(false);

	const pushed = await pushLeadToCrm(actor, ctx, lead.id, 'o10-push');
	const again = await pushLeadToCrm(actor, ctx, lead.id, 'o10-push-again');
	expect(again.externalId).toBe(pushed.externalId);
	expect(again.status).toBe('stored');

	memory.seedDeal({
		clientId: created.id,
		leadId: lead.id,
		externalId: 'deal-1',
		name: 'CRM deal',
		amountMinor: 7700,
		currency: 'USD'
	});
	const outcome = await recordSalesOutcome(
		actor,
		ctx,
		{
			leadId: lead.id,
			outcomeType: 'won',
			amountMinor: 8800,
			currency: 'USD',
			note: 'Recorded here'
		},
		'o10-sale'
	);
	const pull = await pullCrmLead(actor, ctx, lead.id, 'o10-pull');
	expect(pull.conflict.authority).toBe('vector');
	expect(pull.conflict.applyCrmStage).toBe(false);
	expect(pull.conflict.applyCrmAmount).toBe(false);
	expect(pull.revenue[0]?.amountMinor).toBe(7700);
	expect(pull.vectorOutcomeCount).toBe(1);
	expect(outcome.outcome.amountMinor).toBe(8800);
	const [leadAfter] = await db.select().from(leads).where(eq(leads.id, lead.id)).limit(1);
	expect(leadAfter?.status).toBe('won');

	await expect(getCrmStatus(actor, ctx, crypto.randomUUID())).rejects.toBeInstanceOf(
		TenantContextError
	);
	const limited = {
		...actor,
		permissions: actor.permissions.filter((permission) => !permission.startsWith('leads.'))
	};
	await expect(pushLeadToCrm(limited, ctx, lead.id, 'o10-cap')).rejects.toBeInstanceOf(
		ForbiddenError
	);
	await expect(
		getCrmStatus(actor, { organizationId: ctx.organizationId, clientId: '', requestId: 'missing' })
	).rejects.toBeInstanceOf(TenantContextError);

	setCrmProvider(new DisabledCrmProvider());
	const { lead: second } = await insertLead(ctx, `o10-off-${crypto.randomUUID()}@o10.test`);
	const skipped = await pushLeadToCrm(actor, ctx, second.id, 'o10-disabled');
	expect(skipped.status).toBe('unsupported');
	expect(skipped.externalId).toBeNull();
	const manual = await recordSalesOutcome(
		actor,
		ctx,
		{ leadId: second.id, outcomeType: 'appointment', note: 'Booked by phone' },
		'o10-manual'
	);
	expect(manual.outcome.outcomeType).toBe('appointment');
	resetCrmProvider();
}, 20_000);

test('another client cannot pull this lead through the CRM adapter', async () => {
	resetCrmProvider();
	const { ctx, created } = await scopedActor('O10 Isolation', '10.0.24.14');
	const { lead } = await insertLead(ctx, `o10-iso-${crypto.randomUUID()}@o10.test`);
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.24.15'
	);
	let caught: unknown = null;
	try {
		await pullCrmLead(session, contextFor(session, 'o10-alpha'), lead.id, 'o10-alpha');
		caught = 'resolved';
	} catch (error) {
		caught = error;
	}
	expect(caught).toBeInstanceOf(NotFoundError);
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.24.16' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const body = (await loginRes.json()) as { data: { csrf: string } };
	const res = await app.request(`/v1/crm/leads/${lead.id}`, {
		headers: { cookie: sessionCookie(loginRes), 'x-csrf-token': body.data.csrf }
	});
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text).not.toContain(created.name);
	expect(text).not.toContain('o10.test');
	resetCrmProvider();
}, 20_000);
