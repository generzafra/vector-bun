import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import { MemoryAIProvider } from '@vector/ai';
import {
	CLIENT_DEFAULT_NAV_HREFS,
	LEAD_STATUSES,
	ProviderError,
	TenantContextError,
	askVectorExplanationIsSafe,
	askVectorSchema
} from '@vector/contracts';
import { contacts, db, leads } from '@vector/db';
import {
	askVector,
	contextFor,
	listAskVectorTurns,
	login,
	pauseIntelligence,
	recordRevenueEvent,
	resetDomainAIProvider,
	resolveSession,
	setDomainAIProvider,
	switchActiveClient
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
		{ name, slug: `o15-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o15-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o15-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'o15-ctx') };
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
			displayName: 'O15 Capture',
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
			hostname: 'o15.example.test',
			domainKind: 'custom',
			isTest
		})
		.returning();
	return { contact, lead };
}

test('Ask Vector stays a closed question and does not enable agent tools', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/overview/+page.svelte'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/ask.ts'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0047_o15_ask_vector.sql'),
		'utf8'
	);
	expect(page).toContain('Ask Vector');
	expect(page).toContain('does not add a figure');
	expect(page).not.toContain('<textarea');
	expect(page).not.toContain('ROI');
	expect(page).not.toContain('amountMinor');
	expect(domain).not.toContain('useTools');
	expect(domain).not.toContain('amountMinor');
	expect(domain).not.toContain('revenue_events');
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect([...CLIENT_DEFAULT_NAV_HREFS]).not.toContain('/ask');
	expect(askVectorSchema.safeParse({ intent: 'qualified_leads' }).success).toBe(true);
	expect(askVectorSchema.safeParse({ intent: 'why were leads down' }).success).toBe(false);
	expect(askVectorExplanationIsSafe('This note does not add a figure.')).toBe(true);
	expect(askVectorExplanationIsSafe('Revenue grew 17%')).toBe(false);
	expect(askVectorExplanationIsSafe('ROI is strong')).toBe(false);
});

test('a question runs only the tool the actor can use', async () => {
	const provider = new MemoryAIProvider();
	setDomainAIProvider(provider);
	try {
		const alpha = await scopedActor('O15 Alpha', '10.0.30.10');
		const beta = await scopedActor('O15 Beta', '10.0.30.11');
		const email = `o15-real-${crypto.randomUUID()}@o15.test`;
		await insertBareLead(alpha.ctx, 'qualified', email, false);
		await insertBareLead(alpha.ctx, 'qualified', `o15-test-${crypto.randomUUID()}@o15.test`, true);

		const leads = await askVector(
			alpha.actor,
			alpha.ctx,
			{ intent: 'qualified_leads' },
			'o15-leads'
		);
		expect(leads.authorized).toBe(true);
		expect(leads.evidenceClass).toBe('observed');
		expect(leads.answer).toBe('Qualified leads: 1 observed.');
		expect(leads.explanation).toBe('This note does not add a figure.');

		const source = await askVector(
			alpha.actor,
			alpha.ctx,
			{ intent: 'source_coverage' },
			'o15-source'
		);
		expect(source.answer).toBe('Source coverage is unknown.');
		expect(source.evidenceClass).toBe('unknown');
		expect(source.answer).not.toContain('measured');

		const goal = await askVector(alpha.actor, alpha.ctx, { intent: 'goal_blocker' }, 'o15-goal');
		expect(goal.answer).toBe('No primary goal yet.');
		expect(goal.evidenceClass).toBe('unknown');

		const health = await askVector(alpha.actor, alpha.ctx, { intent: 'data_health' }, 'o15-health');
		expect(health.evidenceClass).toBe('unknown');
		expect(health.answer).toContain('does not rank a channel');

		await recordRevenueEvent(
			alpha.actor,
			alpha.ctx,
			{ amountMinor: 7700, currency: 'USD', idempotencyKey: `o15-${crypto.randomUUID()}` },
			'o15-revenue'
		);
		const deniedActor = {
			...alpha.actor,
			permissions: alpha.actor.permissions.filter((cap) => cap !== 'outcomes.read')
		};
		const denied = await askVector(
			deniedActor,
			alpha.ctx,
			{ intent: 'recorded_revenue' },
			'o15-denied'
		);
		expect(denied.authorized).toBe(false);
		expect(denied.answer).toBe('That question is not available with your access.');
		expect(denied.explanation).toBeNull();
		expect(JSON.stringify(denied)).not.toContain('77.00');
		expect(JSON.stringify(denied)).not.toContain('7700');

		const revenue = await askVector(
			alpha.actor,
			alpha.ctx,
			{ intent: 'recorded_revenue' },
			'o15-revenue-ask'
		);
		expect(revenue.authorized).toBe(true);
		expect(revenue.evidenceClass).toBe('observed');
		expect(revenue.answer).toContain('USD 77.00');
		expect(JSON.stringify(revenue)).not.toContain('amountMinor');

		const own = await listAskVectorTurns(alpha.actor, alpha.ctx);
		const other = await listAskVectorTurns(beta.actor, beta.ctx);
		expect(own.some((row) => row.id === leads.id)).toBe(true);
		expect(JSON.stringify(other)).not.toContain(leads.id);
		expect(JSON.stringify(other)).not.toContain(email);
		let crossed: unknown;
		try {
			await listAskVectorTurns(alpha.actor, alpha.ctx, beta.created.id);
		} catch (error) {
			crossed = error;
		}
		expect(crossed).toBeInstanceOf(TenantContextError);
		expect(provider.toolCallCount).toBe(0);
		let tools: unknown;
		try {
			await provider.useTools({
				clientId: alpha.ctx.clientId,
				requestId: 'o15-tools',
				idempotencyKey: 'o15-tools',
				taskClass: 'tool_orchestration',
				system: 'no',
				prompt: 'no',
				tools: []
			});
		} catch (error) {
			tools = error;
		}
		expect(tools).toBeInstanceOf(ProviderError);
		expect((tools as ProviderError).code).toBe('AI_TOOLS_DISABLED');
	} finally {
		resetDomainAIProvider();
	}
});

test('a paused client cannot ask', async () => {
	const { actor, ctx } = await scopedActor('O15 Pause', '10.0.30.12');
	await pauseIntelligence(
		actor,
		ctx,
		{ paused: true, reason: 'Pause Ask Vector during review' },
		'o15-pause'
	);
	let caught: unknown;
	try {
		await askVector(actor, ctx, { intent: 'qualified_leads' }, 'o15-paused-ask');
	} catch (error) {
		caught = error;
	}
	expect(caught).toBeInstanceOf(ProviderError);
	expect((caught as ProviderError).code).toBe('AI_EXECUTION_PAUSED');
	const turns = await listAskVectorTurns(actor, ctx);
	expect(turns).toHaveLength(0);
});

test('missing tenant context cannot ask', async () => {
	const { actor } = await scopedActor('O15 Context', '10.0.30.13');
	let caught: unknown;
	try {
		await askVector(actor, null as never, { intent: 'qualified_leads' }, 'o15-missing');
	} catch (error) {
		caught = error;
	}
	expect(caught).toBeInstanceOf(TenantContextError);
});
