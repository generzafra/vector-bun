import { afterEach, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import {
	DisabledAIProvider,
	GrokProvider,
	MemoryAIProvider,
	copyContainsMarkup,
	evaluateAiGate,
	researchOutputSchema
} from '@vector/ai';
import { env } from '@vector/config';
import {
	ForbiddenError,
	ProviderError,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	countPublishedPageVersionsForTenant,
	db,
	emailMessages,
	listAiCostEventsForTenant,
	listAiRunsForTenant,
	listApprovalRequestsForTenant
} from '@vector/db';
import {
	contextFor,
	decideIntelligenceApproval,
	getIntelligenceOverview,
	login,
	pauseIntelligence,
	resetDomainAIProvider,
	resolveSession,
	runIntelligence,
	setDomainAIProvider,
	switchActiveClient
} from '@vector/domain';
import { app } from '../apps/api/src/app';

const memory = new MemoryAIProvider();

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function adminOn(clientId: string, ip: string, requestId: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	await switchActiveClient(session, session.token, clientId, `${requestId}-switch`);
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return actor;
}

afterEach(() => {
	resetDomainAIProvider();
	memory.reset();
});

test('AI gate blocks pauses and level 3; confidence cannot authorize', () => {
	const base = {
		pausedGlobal: false,
		pausedClient: false,
		autonomyCeiling: 2,
		requestedAutonomy: 1,
		confidence: 99
	};
	expect(evaluateAiGate(base).allowed).toBe(true);
	expect(evaluateAiGate({ ...base, pausedGlobal: true, confidence: 100 })).toEqual({
		allowed: false,
		blockedBy: 'global_pause'
	});
	expect(evaluateAiGate({ ...base, pausedClient: true, confidence: 100 })).toEqual({
		allowed: false,
		blockedBy: 'client_pause'
	});
	expect(evaluateAiGate({ ...base, requestedAutonomy: 3, confidence: 100 })).toEqual({
		allowed: false,
		blockedBy: 'phase4_autonomy'
	});
});

test('copy policy rejects markup', () => {
	expect(copyContainsMarkup([{ text: 'Consults include a written treatment plan' }])).toBe(false);
	expect(copyContainsMarkup([{ text: '<h1>Guaranteed implants</h1>' }])).toBe(true);
});

test('missing TenantContext cannot read AI records', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listAiRunsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listAiCostEventsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listApprovalRequestsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('research run is typed, versioned, costed, and never executes', async () => {
	setDomainAIProvider(memory);
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.2', 'ai-research');
	const ctx = contextFor(actor, 'ai-research');
	const pagesBefore = await countPublishedPageVersionsForTenant(ctx);
	const result = await runIntelligence(actor, ctx, { agentKey: 'research' }, 'ai-research');
	expect(result.run.status).toBe('succeeded');
	expect(result.run.schemaName).toBe('research.v1');
	expect(result.run.promptVersionId).toBeTruthy();
	expect(result.run.agentVersionId).toBeTruthy();
	expect(result.decision?.status).toBe('proposed');
	expect(result.approval?.status).toBe('pending');
	expect(result.approval?.required).toBe(true);
	expect(result.cost?.costMicros).toBe(1000);
	expect(result.decision?.confidence).toBeGreaterThan(0);
	expect(memory.toolCallCount).toBe(0);
	const output = researchOutputSchema.parse(result.run.output);
	expect(output.claimsUsed.join(' ')).toContain('written treatment plan');
	expect(JSON.stringify(result)).not.toContain('Guaranteed 50 percent');
	expect(JSON.stringify(result)).not.toContain('warehouse');
	expect(await countPublishedPageVersionsForTenant(ctx)).toBe(pagesBefore);
});

test('user on client A cannot read client B intelligence', async () => {
	setDomainAIProvider(memory);
	const { alpha, beta } = await seededClients();
	const admin = await adminOn(beta.id, '10.0.4.3', 'ai-beta-seed');
	await runIntelligence(
		admin,
		contextFor(admin, 'ai-beta-seed'),
		{ agentKey: 'copy' },
		'ai-beta-seed'
	);
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.4.4'
	);
	const ctx = contextFor(session, 'ai-iso');
	expect(ctx.clientId).toBe(alpha.id);
	const own = await getIntelligenceOverview(session, ctx);
	expect(JSON.stringify(own)).not.toContain(beta.id);
	expect(own.runs.every((run) => run.clientId === alpha.id)).toBe(true);
	await expect(getIntelligenceOverview(session, ctx, beta.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('route client id cannot leak the other tenant intelligence through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/intelligence/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('warehouse');
});

test('missing ai.manage cannot run or decide', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.4.5'
	);
	const ctx = contextFor(session, 'ai-cap');
	const actor = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'ai.manage')
	};
	await expect(
		runIntelligence(actor, ctx, { agentKey: 'analytics' }, 'ai-cap')
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		decideIntelligenceApproval(
			actor,
			ctx,
			{ id: '00000000-0000-4000-8000-000000000001', decision: 'approved' },
			'ai-cap-decide'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
});

test('invalid structured output fails closed without an approval', async () => {
	setDomainAIProvider(memory);
	memory.nextStructured = { summary: 'not a valid research object' };
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.6', 'ai-invalid');
	const ctx = contextFor(actor, 'ai-invalid');
	let error: unknown;
	try {
		await runIntelligence(actor, ctx, { agentKey: 'research' }, 'ai-invalid');
	} catch (caught) {
		error = caught;
	}
	expect(error).toBeInstanceOf(ValidationError);
	const overview = await getIntelligenceOverview(actor, ctx);
	const failed = overview.runs.find((run) => run.requestId === 'ai-invalid');
	expect(failed?.status).toBe('failed');
	expect(overview.approvals.some((row) => row.runId === failed?.id)).toBe(false);
});

test('copy agent cannot emit HTML', async () => {
	setDomainAIProvider(memory);
	memory.nextStructured = {
		kind: 'headline',
		variants: [{ label: 'Bad', text: '<script>alert(1)</script>' }],
		prohibitedClaimHits: [],
		usesApprovedClaims: false,
		finding: 'Bad copy',
		proposedAction: 'Do not use',
		expectedImpact: 'None',
		riskClass: 'content',
		confidence: 90,
		recommendedAutonomy: 1
	};
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.7', 'ai-html');
	const ctx = contextFor(actor, 'ai-html');
	let error: unknown;
	try {
		await runIntelligence(actor, ctx, { agentKey: 'copy' }, 'ai-html');
	} catch (caught) {
		error = caught;
	}
	expect(error).toBeInstanceOf(ValidationError);
});

test('funnel strategist rejects unapproved section types', async () => {
	setDomainAIProvider(memory);
	memory.nextStructured = {
		audience: 'Patients',
		primaryConversion: 'Book',
		narrative: 'Outcome then proof',
		sections: [{ type: 'custom-html', purpose: 'Arbitrary markup' }],
		experimentHypotheses: [],
		finding: 'Bad plan',
		proposedAction: 'Do not compose',
		expectedImpact: 'None',
		riskClass: 'content',
		confidence: 40,
		recommendedAutonomy: 1
	};
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.8', 'ai-funnel');
	const ctx = contextFor(actor, 'ai-funnel');
	let error: unknown;
	try {
		await runIntelligence(actor, ctx, { agentKey: 'funnel_strategist' }, 'ai-funnel');
	} catch (caught) {
		error = caught;
	}
	expect(error).toBeInstanceOf(ValidationError);
});

test('client kill switch pauses runs even when a memory provider is injected', async () => {
	setDomainAIProvider(memory);
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.9', 'ai-pause');
	const ctx = contextFor(actor, 'ai-pause');
	await pauseIntelligence(actor, ctx, { paused: true }, 'ai-pause-on');
	try {
		let error: unknown;
		try {
			await runIntelligence(actor, ctx, { agentKey: 'analytics' }, 'ai-paused-run');
		} catch (caught) {
			error = caught;
		}
		expect(error).toBeInstanceOf(ProviderError);
		const overview = await getIntelligenceOverview(actor, ctx);
		expect(
			overview.runs.some((run) => run.status === 'paused' && run.blockedBy === 'client_pause')
		).toBe(true);
		expect(memory.structuredRequests.length).toBe(0);
	} finally {
		await pauseIntelligence(actor, ctx, { paused: false }, 'ai-pause-off');
	}
});

test('approval records a decision and does not publish or send', async () => {
	setDomainAIProvider(memory);
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.10', 'ai-approve');
	const ctx = contextFor(actor, 'ai-approve');
	const pagesBefore = await countPublishedPageVersionsForTenant(ctx);
	const sentBefore = await db
		.select()
		.from(emailMessages)
		.where(eq(emailMessages.clientId, alpha.id));
	const result = await runIntelligence(actor, ctx, { agentKey: 'analytics' }, 'ai-approve');
	const decided = await decideIntelligenceApproval(
		actor,
		ctx,
		{ id: result.approval!.id, decision: 'approved', note: 'Looks useful' },
		'ai-approve-decide'
	);
	expect(decided.executed).toBe(false);
	expect(decided.recorded.confidenceIgnored).toBe(true);
	expect(await countPublishedPageVersionsForTenant(ctx)).toBe(pagesBefore);
	const sentAfter = await db
		.select()
		.from(emailMessages)
		.where(eq(emailMessages.clientId, alpha.id));
	expect(sentAfter.length).toBe(sentBefore.length);
	const overview = await getIntelligenceOverview(actor, ctx);
	expect(overview.approvals.find((row) => row.id === result.approval!.id)?.status).toBe('approved');
});

test('idempotent run keys do not double-charge', async () => {
	setDomainAIProvider(memory);
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.11', 'ai-idem');
	const ctx = contextFor(actor, 'ai-idem');
	const key = crypto.randomUUID();
	const first = await runIntelligence(
		actor,
		ctx,
		{ agentKey: 'research', idempotencyKey: key },
		'ai-idem-1'
	);
	const second = await runIntelligence(
		actor,
		ctx,
		{ agentKey: 'research', idempotencyKey: key },
		'ai-idem-2'
	);
	expect(second.replayed).toBe(true);
	expect(second.run.id).toBe(first.run.id);
	expect(memory.structuredRequests.length).toBe(1);
});

test('Disabled provider and Grok adapter stay behind AIProvider', async () => {
	const disabled = new DisabledAIProvider();
	await expect(disabled.health()).resolves.toMatchObject({ adapter: 'disabled', ok: false });
	await expect(
		disabled.generateStructured({
			clientId: '00000000-0000-4000-8000-000000000001',
			requestId: 'x',
			idempotencyKey: crypto.randomUUID(),
			taskClass: 'copy_generation',
			schemaName: 'copy.v1',
			schemaVersion: 'v1',
			schema: researchOutputSchema,
			system: 'test',
			prompt: 'test',
			facts: {
				knowledge: {
					brandName: null,
					audience: null,
					offer: null,
					primaryConversion: null,
					services: [],
					approvedClaims: [],
					prohibitedClaims: []
				},
				analytics: {
					pageViewed: 0,
					ctaClicked: 0,
					formStarted: 0,
					formSubmitted: 0,
					leadCreated: 0
				}
			}
		})
	).rejects.toBeInstanceOf(ProviderError);

	const grok = new GrokProvider('test-key', 'https://api.x.ai/v1', async () => {
		return new Response(
			JSON.stringify({
				id: 'grok-1',
				model: 'grok-3-mini',
				choices: [
					{
						message: {
							content: JSON.stringify({
								summary: 'Grok structured draft',
								audienceInsights: ['Patients'],
								competitorObservations: ['Hypothesis only'],
								opportunities: [
									{ title: 'Clarify offer', evidence: 'Approved knowledge', priority: 'low' }
								],
								claimsUsed: ['Consults include a written treatment plan'],
								knowledgeAuthority: 'approved_knowledge',
								finding: 'Structured output from Grok',
								proposedAction: 'Review only',
								expectedImpact: 'None until approved',
								riskClass: 'low',
								confidence: 40,
								recommendedAutonomy: 1
							})
						}
					}
				],
				usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 }
			}),
			{ status: 200 }
		);
	});
	const parsed = await grok.generateStructured({
		clientId: '00000000-0000-4000-8000-000000000001',
		requestId: 'grok',
		idempotencyKey: crypto.randomUUID(),
		taskClass: 'deep_research',
		schemaName: 'research.v1',
		schemaVersion: 'v1',
		schema: researchOutputSchema,
		system: 'test',
		prompt: 'test',
		facts: {
			knowledge: {
				brandName: 'Alpha',
				audience: null,
				offer: null,
				primaryConversion: null,
				services: [],
				approvedClaims: [],
				prohibitedClaims: []
			},
			analytics: {
				pageViewed: 0,
				ctaClicked: 0,
				formStarted: 0,
				formSubmitted: 0,
				leadCreated: 0
			}
		}
	});
	expect(parsed.provider).toBe('grok');
	expect(parsed.output.finding).toContain('Structured output');
	expect(parsed.costMicros).toBeGreaterThan(0);
});
