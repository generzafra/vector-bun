import { afterEach, beforeEach, expect, test } from 'bun:test';
import { cookieName, resetRateLimits } from '@vector/auth';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	NotFoundError,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	db,
	deleteExperimentsForTenant,
	experiments,
	getExperimentAssignmentForVisitorForTenant,
	getPublishedPageVersionMetaForTenant,
	getRunningExperimentForPageForTenant,
	insertAnalyticsEventForTenant,
	insertExperimentAssignmentForTenant,
	listExperimentMetricsForTenant,
	listExperimentsForTenant,
	listLatestExperimentResultsForTenant,
	listOpenExperimentsForPageMetricForTenant,
	persistDeliveryVisit
} from '@vector/db';
import {
	assertCanChangePrimaryMetric,
	assertCanMutateExperimentDefinition,
	assertExperimentTransition,
	assertMetricsMatchPredetermined,
	assertNoConflictingExperiment,
	assertNotEarlyStop,
	assertPrimaryMetricAllowed,
	assignVariantKey,
	canChangeLockedFields,
	computeExperimentMeasurement,
	evaluateExperimentReadiness,
	isLikelyBotUserAgent,
	nextExperimentStatuses,
	sourceImbalanceDetected
} from '@vector/experiments';
import {
	composeFunnel,
	contextFor,
	assertExperimentDecisionReady,
	createExperimentProposal,
	exposeDeliveryPage,
	getExperimentOverview,
	login,
	measureExperiment,
	publishFunnel,
	resolveDeliveryPage,
	resolveSession,
	switchActiveClient,
	transitionExperiment
} from '@vector/domain';
import { previewHostname } from '@vector/funnel-engine';
import { app } from '../apps/api/src/app';

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
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

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function twoPublishedVersions(
	actor: Awaited<ReturnType<typeof adminOn>>,
	ctx: ReturnType<typeof contextFor>
) {
	let overview = await getExperimentOverview(actor, ctx);
	let page = overview.pages[0];
	if (!page) throw new Error('seed page missing');
	let versions = overview.versions.filter((row) => row.pageId === page.id);
	if (versions.length < 2) {
		await composeFunnel(actor, ctx, `${ctx.requestId}-compose`);
		await publishFunnel(actor, ctx, `${ctx.requestId}-publish`);
		overview = await getExperimentOverview(actor, ctx);
		page = overview.pages[0];
		if (!page) throw new Error('seed page missing');
		versions = overview.versions.filter((row) => row.pageId === page.id);
	}
	if (versions.length < 2) throw new Error('need two published versions');
	return { page, control: versions[1]!, challenger: versions[0]! };
}

function proposalInput(
	pageId: string,
	controlPageVersionId: string,
	challengerPageVersionId: string,
	overrides: Record<string, unknown> = {}
) {
	return {
		name: 'Shorter hero lede',
		problem: 'Too few visitors start the consult form.',
		evidence: 'form_started is low relative to page_viewed on the live homepage.',
		hypothesis: 'A shorter hero lede will raise form_started.',
		audience: 'New homepage visitors looking for an implant consult',
		pageId,
		controlPageVersionId,
		challengerPageVersionId,
		primaryMetric: 'form_started',
		guardrailMetrics: ['page_viewed'],
		minDurationDays: 14,
		minSamplePerVariant: 400,
		...overrides
	};
}

beforeEach(async () => {
	resetRateLimits();
	const { alpha, beta } = await seededClients();
	await deleteExperimentsForTenant({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		roleIds: [],
		requestId: 'reset-alpha'
	});
	await deleteExperimentsForTenant({
		organizationId: beta.organizationId,
		clientId: beta.id,
		roleIds: [],
		requestId: 'reset-beta'
	});
});

afterEach(async () => {
	const { alpha, beta } = await seededClients();
	await deleteExperimentsForTenant({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		roleIds: [],
		requestId: 'reset-alpha-after'
	});
	await deleteExperimentsForTenant({
		organizationId: beta.organizationId,
		clientId: beta.id,
		roleIds: [],
		requestId: 'reset-beta-after'
	});
});

test('missing TenantContext cannot list experiment rows', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listExperimentsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listExperimentMetricsForTenant(null as never, [])).rejects.toBeInstanceOf(
		TenantContextError
	);
	expect(listLatestExperimentResultsForTenant(null as never, ['x'])).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('revenue and qualified-lead metrics stay closed until coverage exists', () => {
	expect(() => assertPrimaryMetricAllowed('revenue')).toThrow(ValidationError);
	expect(() => assertPrimaryMetricAllowed('qualified_lead')).toThrow(ValidationError);
	expect(canChangeLockedFields('proposed')).toBe(false);
	expect(canChangeLockedFields('approved')).toBe(false);
	expect(() => assertCanChangePrimaryMetric('proposed')).toThrow(ValidationError);
	expect(() => assertCanMutateExperimentDefinition('proposed')).toThrow(ValidationError);
	expect(() => assertCanMutateExperimentDefinition('approved')).toThrow(ValidationError);
	expect(() => assertCanMutateExperimentDefinition('draft')).not.toThrow();
	expect(nextExperimentStatuses('proposed', null)).toEqual(['approved']);
	expect(nextExperimentStatuses('approved', null)).toEqual(['running', 'paused']);
	expect(nextExperimentStatuses('paused', null)).toEqual(['approved']);
	expect(nextExperimentStatuses('paused', new Date())).toEqual(['running']);
	expect(() => assertExperimentTransition('proposed', 'running', null)).toThrow(ValidationError);
	expect(() => assertExperimentTransition('approved', 'running', null)).not.toThrow();
	expect(() => assertExperimentTransition('paused', 'running', null)).toThrow(ValidationError);
	expect(() => assertExperimentTransition('proposed', 'approved', null)).not.toThrow();
	expect(() => assertNoConflictingExperiment(1)).toThrow(ValidationError);
	expect(() => assertNoConflictingExperiment(0)).not.toThrow();
	expect(isLikelyBotUserAgent('Mozilla/5.0 Chrome/120')).toBe(false);
	expect(isLikelyBotUserAgent('GPTBot/1.0')).toBe(true);
	expect(sourceImbalanceDetected([{ source: 'google', control: 6, challenger: 4 }])).toBe(false);
	expect(sourceImbalanceDetected([{ source: 'google', control: 18, challenger: 2 }])).toBe(true);
	expect(() =>
		assertMetricsMatchPredetermined(['revenue'], ['form_started', 'page_viewed'])
	).toThrow(ValidationError);
	expect(() =>
		assertMetricsMatchPredetermined(
			['form_started', 'page_viewed'],
			['form_started', 'page_viewed']
		)
	).not.toThrow();
	const early = evaluateExperimentReadiness({
		launchedAt: new Date('2026-08-20T00:00:00.000Z'),
		minDurationDays: 14,
		minSamplePerVariant: 400,
		now: new Date('2026-08-23T00:00:00.000Z'),
		controlSample: 12,
		challengerSample: 11,
		botShareBps: 0,
		sourceImbalance: false
	});
	expect(early.decisionReady).toBe(false);
	expect(early.earlyStopBlocked).toBe(true);
	expect(early.reasons).toContain('horizon_unmet');
	expect(early.reasons).toContain('sample_unmet');
	expect(() => assertNotEarlyStop(early)).toThrow(ValidationError);
	const readyAssignments = [
		...Array.from({ length: 100 }, (_, index) => ({
			visitorAnonymousId: `control-${index}`,
			variantKey: 'control' as const,
			isTest: false
		})),
		...Array.from({ length: 100 }, (_, index) => ({
			visitorAnonymousId: `challenger-${index}`,
			variantKey: 'challenger' as const,
			isTest: false
		}))
	];
	const ready = computeExperimentMeasurement({
		experimentId: '11111111-1111-4111-8111-111111111111',
		primaryMetric: 'form_started',
		metrics: ['form_started', 'page_viewed'],
		launchedAt: new Date('2026-01-01T00:00:00.000Z'),
		minDurationDays: 7,
		minSamplePerVariant: 100,
		now: new Date('2026-01-15T00:00:00.000Z'),
		assignments: readyAssignments,
		events: readyAssignments.map((row) => ({
			visitorAnonymousId: row.visitorAnonymousId,
			name: 'page_viewed',
			isTest: false,
			userAgent: 'Mozilla/5.0',
			utmSource: 'google',
			experimentId: '11111111-1111-4111-8111-111111111111',
			experimentVariant: row.variantKey
		}))
	});
	expect(ready.decisionReady).toBe(true);
	expect(ready.earlyStopBlocked).toBe(false);
	expect(() => assertNotEarlyStop(ready)).not.toThrow();
});

test(
	'Alpha cannot read Beta experiments or attach a Beta page version',
	async () => {
		const { alpha, beta } = await seededClients();
		const alphaActor = await adminOn(alpha.id, '10.7.0.1', 'exp-iso-a');
		const betaActor = await adminOn(beta.id, '10.7.0.2', 'exp-iso-b');
		const alphaCtx = contextFor(alphaActor, 'exp-iso-a');
		const betaCtx = contextFor(betaActor, 'exp-iso-b');
		const alphaVersions = await twoPublishedVersions(alphaActor, alphaCtx);
		const betaOverview = await getExperimentOverview(betaActor, betaCtx);
		const betaVersion = betaOverview.versions[0];
		if (!betaVersion) throw new Error('beta published version missing');

		const created = await createExperimentProposal(
			alphaActor,
			alphaCtx,
			proposalInput(alphaVersions.page.id, alphaVersions.control.id, alphaVersions.challenger.id),
			'exp-iso-create'
		);
		expect(created.status).toBe('proposed');
		expect(created.variants).toHaveLength(2);
		const open = await listOpenExperimentsForPageMetricForTenant(
			alphaCtx,
			created.pageId,
			'form_started'
		);
		expect(open).toHaveLength(1);
		expect(() => assertNoConflictingExperiment(open.length)).toThrow(ValidationError);

		const betaAfter = await getExperimentOverview(betaActor, betaCtx);
		expect(betaAfter.experiments.some((row) => row.id === created.id)).toBe(false);
		expect(betaAfter.experiments.every((row) => row.pageId !== alphaVersions.page.id)).toBe(true);
		expect(await getPublishedPageVersionMetaForTenant(alphaCtx, betaVersion.id)).toBeNull();

		await expect(
			createExperimentProposal(
				alphaActor,
				alphaCtx,
				proposalInput(alphaVersions.page.id, alphaVersions.control.id, betaVersion.id, {
					name: 'Cross-tenant variant'
				}),
				'exp-iso-cross'
			)
		).rejects.toBeInstanceOf(ValidationError);
	},
	{ timeout: 15_000 }
);

test('proposal rejects same version, revenue, and guardrail-primary mistakes', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.7.0.3', 'exp-rules');
	const ctx = contextFor(actor, 'exp-rules');
	const { page, control, challenger } = await twoPublishedVersions(actor, ctx);

	await expect(
		createExperimentProposal(
			actor,
			ctx,
			proposalInput(page.id, control.id, control.id),
			'exp-same-version'
		)
	).rejects.toBeInstanceOf(ValidationError);

	await expect(
		createExperimentProposal(
			actor,
			ctx,
			proposalInput(page.id, control.id, challenger.id, { primaryMetric: 'revenue' }),
			'exp-revenue'
		)
	).rejects.toBeInstanceOf(ValidationError);

	await expect(
		createExperimentProposal(
			actor,
			ctx,
			proposalInput(page.id, control.id, challenger.id, {
				guardrailMetrics: ['form_started']
			}),
			'exp-guardrail-primary'
		)
	).rejects.toBeInstanceOf(ValidationError);
});

test('a complete proposal is stored as proposed', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.7.0.8', 'exp-ok');
	const ctx = contextFor(actor, 'exp-ok');
	const { page, control, challenger } = await twoPublishedVersions(actor, ctx);
	const created = await createExperimentProposal(
		actor,
		ctx,
		proposalInput(page.id, control.id, challenger.id),
		'exp-ok'
	);
	expect(created.hypothesis?.hypothesis).toContain('form_started');
	expect(created.status).toBe('proposed');
});

test('a second open proposal on the same page and metric is rejected', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.7.0.6', 'exp-conflict');
	const ctx = contextFor(actor, 'exp-conflict');
	const { page, control, challenger } = await twoPublishedVersions(actor, ctx);
	await createExperimentProposal(
		actor,
		ctx,
		proposalInput(page.id, control.id, challenger.id, { name: 'First proposal' }),
		'exp-conflict-first'
	);
	await expect(
		createExperimentProposal(
			actor,
			ctx,
			proposalInput(page.id, control.id, challenger.id, { name: 'Second proposal' }),
			'exp-conflict-second'
		)
	).rejects.toBeInstanceOf(ValidationError);
});

test('experiments.manage is required to create and experiments.read is required to load', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.7.0.4', 'exp-caps');
	const ctx = contextFor(actor, 'exp-caps');
	const { page, control, challenger } = await twoPublishedVersions(actor, ctx);
	const reader = {
		...actor,
		permissions: actor.permissions.filter((cap) => cap !== 'experiments.manage')
	};
	const blind = {
		...actor,
		permissions: actor.permissions.filter((cap) => cap !== 'experiments.read')
	};

	await expect(
		createExperimentProposal(
			reader,
			ctx,
			proposalInput(page.id, control.id, challenger.id),
			'exp-no-manage'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(getExperimentOverview(blind, ctx)).rejects.toBeInstanceOf(ForbiddenError);
	const created = await createExperimentProposal(
		actor,
		ctx,
		proposalInput(page.id, control.id, challenger.id),
		'exp-caps-create'
	);
	await expect(
		transitionExperiment(reader, ctx, { id: created.id, to: 'approved' }, 'exp-no-approve')
	).rejects.toBeInstanceOf(ForbiddenError);
});

test(
	'approve and pause stay on this client and do not start assignment',
	async () => {
		const { alpha, beta } = await seededClients();
		const alphaActor = await adminOn(alpha.id, '10.7.0.9', 'exp-s1-a');
		const betaActor = await adminOn(beta.id, '10.7.0.10', 'exp-s1-b');
		const alphaCtx = contextFor(alphaActor, 'exp-s1-a');
		const betaCtx = contextFor(betaActor, 'exp-s1-b');
		const alphaVersions = await twoPublishedVersions(alphaActor, alphaCtx);
		const betaVersions = await twoPublishedVersions(betaActor, betaCtx);

		const created = await createExperimentProposal(
			alphaActor,
			alphaCtx,
			proposalInput(alphaVersions.page.id, alphaVersions.control.id, alphaVersions.challenger.id),
			'exp-s1-create'
		);
		expect(created.nextStatuses).toEqual(['approved']);
		await expect(
			transitionExperiment(
				alphaActor,
				alphaCtx,
				{ id: created.id, to: 'running' },
				'exp-s1-early-run'
			)
		).rejects.toBeInstanceOf(ValidationError);

		const approved = await transitionExperiment(
			alphaActor,
			alphaCtx,
			{ id: created.id, to: 'approved' },
			'exp-s1-approve'
		);
		expect(approved.status).toBe('approved');
		expect(approved.launchedAt).toBeNull();
		expect(approved.primaryMetric).toBe('form_started');
		expect(approved.nextStatuses).toEqual(['running', 'paused']);
		await expect(
			createExperimentProposal(
				alphaActor,
				alphaCtx,
				proposalInput(
					alphaVersions.page.id,
					alphaVersions.control.id,
					alphaVersions.challenger.id,
					{
						name: 'Conflict while approved'
					}
				),
				'exp-s1-conflict-approved'
			)
		).rejects.toBeInstanceOf(ValidationError);

		const betaCreated = await createExperimentProposal(
			betaActor,
			betaCtx,
			proposalInput(betaVersions.page.id, betaVersions.control.id, betaVersions.challenger.id),
			'exp-s1-beta-create'
		);
		await expect(
			transitionExperiment(
				alphaActor,
				alphaCtx,
				{ id: betaCreated.id, to: 'approved' },
				'exp-s1-cross'
			)
		).rejects.toBeInstanceOf(NotFoundError);
		expect((await getExperimentOverview(betaActor, betaCtx)).experiments[0]?.status).toBe(
			'proposed'
		);

		const paused = await transitionExperiment(
			alphaActor,
			alphaCtx,
			{ id: created.id, to: 'paused' },
			'exp-s1-pause'
		);
		expect(paused.status).toBe('paused');
		expect(paused.nextStatuses).toEqual(['approved']);
		await expect(
			transitionExperiment(
				alphaActor,
				alphaCtx,
				{ id: created.id, to: 'running' },
				'exp-s1-paused-run'
			)
		).rejects.toBeInstanceOf(ValidationError);
		await expect(
			createExperimentProposal(
				alphaActor,
				alphaCtx,
				proposalInput(
					alphaVersions.page.id,
					alphaVersions.control.id,
					alphaVersions.challenger.id,
					{
						name: 'Conflict while paused'
					}
				),
				'exp-s1-conflict-paused'
			)
		).rejects.toBeInstanceOf(ValidationError);

		const resumed = await transitionExperiment(
			alphaActor,
			alphaCtx,
			{ id: created.id, to: 'approved' },
			'exp-s1-resume'
		);
		expect(resumed.status).toBe('approved');
		expect(resumed.launchedAt).toBeNull();
	},
	{ timeout: 20_000 }
);

test(
	'a launched experiment resumes to running and stays tenant-scoped',
	async () => {
		const { alpha, beta } = await seededClients();
		const actor = await adminOn(alpha.id, '10.7.0.11', 'exp-s1-launch');
		const ctx = contextFor(actor, 'exp-s1-launch');
		const { page, control, challenger } = await twoPublishedVersions(actor, ctx);
		const created = await createExperimentProposal(
			actor,
			ctx,
			proposalInput(page.id, control.id, challenger.id),
			'exp-s1-launch-create'
		);
		await transitionExperiment(
			actor,
			ctx,
			{ id: created.id, to: 'approved' },
			'exp-s1-launch-approve'
		);
		await db
			.update(experiments)
			.set({ launchedAt: new Date(), status: 'running' })
			.where(eq(experiments.id, created.id));
		const paused = await transitionExperiment(
			actor,
			ctx,
			{ id: created.id, to: 'paused' },
			'exp-s1-launch-pause'
		);
		expect(paused.nextStatuses).toEqual(['running']);
		await expect(
			transitionExperiment(actor, ctx, { id: created.id, to: 'approved' }, 'exp-s1-launch-approved')
		).rejects.toBeInstanceOf(ValidationError);
		const resumed = await transitionExperiment(
			actor,
			ctx,
			{ id: created.id, to: 'running' },
			'exp-s1-launch-resume'
		);
		expect(resumed.status).toBe('running');
		const betaActor = await adminOn(beta.id, '10.7.0.12', 'exp-s1-launch-b');
		const betaAfter = await getExperimentOverview(
			betaActor,
			contextFor(betaActor, 'exp-s1-launch-b')
		);
		expect(betaAfter.experiments.some((row) => row.id === created.id)).toBe(false);
	},
	{ timeout: 20_000 }
);

test(
	'API rejects a Beta client id on an Alpha session',
	async () => {
		const { alpha, beta } = await seededClients();
		const alphaActor = await adminOn(alpha.id, '10.7.0.5', 'exp-api-a');
		const alphaCtx = contextFor(alphaActor, 'exp-api-a');
		await expect(getExperimentOverview(alphaActor, alphaCtx, beta.id)).rejects.toBeInstanceOf(
			TenantContextError
		);

		const loginRes = await app.request('/v1/auth/login', {
			method: 'POST',
			headers: { 'content-type': 'application/json' },
			body: JSON.stringify({ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD })
		});
		const cookie = sessionCookie(loginRes);
		const leaked = await app.request(`/v1/experiments/${beta.id}`, { headers: { cookie } });
		expect(leaked.status).toBeGreaterThanOrEqual(400);

		const betaActor = await adminOn(beta.id, '10.7.0.13', 'exp-api-b');
		const betaCtx = contextFor(betaActor, 'exp-api-b');
		const betaVersions = await twoPublishedVersions(betaActor, betaCtx);
		const betaCreated = await createExperimentProposal(
			betaActor,
			betaCtx,
			proposalInput(betaVersions.page.id, betaVersions.control.id, betaVersions.challenger.id),
			'exp-api-beta-create'
		);
		const stolen = await app.request('/v1/experiments/transition', {
			method: 'POST',
			headers: {
				cookie: `${cookieName()}=${alphaActor.token}`,
				'content-type': 'application/json',
				'x-csrf-token': alphaActor.csrf
			},
			body: JSON.stringify({ id: betaCreated.id, to: 'approved' })
		});
		expect(stolen.status).toBeGreaterThanOrEqual(400);
	},
	{ timeout: 20_000 }
);

test(
	'start assigns a sticky tenant-scoped variant and preview stays test',
	async () => {
		const { alpha, beta } = await seededClients();
		const alphaActor = await adminOn(alpha.id, '10.7.0.21', 'exp-s2-a');
		const betaActor = await adminOn(beta.id, '10.7.0.22', 'exp-s2-b');
		const alphaCtx = contextFor(alphaActor, 'exp-s2-a');
		const betaCtx = contextFor(betaActor, 'exp-s2-b');
		const alphaVersions = await twoPublishedVersions(alphaActor, alphaCtx);
		const betaVersions = await twoPublishedVersions(betaActor, betaCtx);
		expect(
			getRunningExperimentForPageForTenant(null as never, alphaVersions.page.id)
		).rejects.toBeInstanceOf(TenantContextError);

		const created = await createExperimentProposal(
			alphaActor,
			alphaCtx,
			proposalInput(alphaVersions.page.id, alphaVersions.control.id, alphaVersions.challenger.id),
			'exp-s2-create'
		);
		await transitionExperiment(
			alphaActor,
			alphaCtx,
			{ id: created.id, to: 'approved' },
			'exp-s2-approve'
		);
		const started = await transitionExperiment(
			alphaActor,
			alphaCtx,
			{ id: created.id, to: 'running' },
			'exp-s2-start'
		);
		expect(started.status).toBe('running');
		expect(started.launchedAt).not.toBeNull();

		const second = await createExperimentProposal(
			alphaActor,
			alphaCtx,
			proposalInput(alphaVersions.page.id, alphaVersions.control.id, alphaVersions.challenger.id, {
				name: 'Other metric on same page',
				primaryMetric: 'cta_clicked',
				guardrailMetrics: ['page_viewed']
			}),
			'exp-s2-second'
		);
		await transitionExperiment(
			alphaActor,
			alphaCtx,
			{ id: second.id, to: 'approved' },
			'exp-s2-second-approve'
		);
		await expect(
			transitionExperiment(
				alphaActor,
				alphaCtx,
				{ id: second.id, to: 'running' },
				'exp-s2-second-start'
			)
		).rejects.toBeInstanceOf(ValidationError);

		const visitorA = '11111111-1111-4111-8111-111111111111';
		const visitorB = '22222222-2222-4222-8222-222222222222';
		const alphaHost = previewHostname('alpha', env.DELIVERY_PREVIEW_PARENT_HOST);
		const resolved = await resolveDeliveryPage(alphaHost, '/', 'exp-s2-resolve');
		expect(resolved.kind).toBe('page');
		if (resolved.kind !== 'page') throw new Error('expected alpha page');
		expect(resolved.clientId).toBe(alpha.id);

		const first = await exposeDeliveryPage(resolved, visitorA, 'exp-s2-expose-a');
		const again = await exposeDeliveryPage(resolved, visitorA, 'exp-s2-expose-a2');
		expect(first.experiment?.experimentId).toBe(started.id);
		expect(first.experiment?.isTest).toBe(true);
		expect(again.experiment?.variantKey).toBe(first.experiment?.variantKey);
		expect(again.versionId).toBe(first.versionId);
		expect(first.experiment?.variantKey).toBe(assignVariantKey(started.id, visitorA));
		expect(JSON.stringify(first.document)).not.toContain('warehouse');

		const other = await exposeDeliveryPage(resolved, visitorB, 'exp-s2-expose-b');
		expect(other.experiment?.variantKey).toBe(assignVariantKey(started.id, visitorB));
		expect(other.experiment?.isTest).toBe(true);

		const stored = await getExperimentAssignmentForVisitorForTenant(alphaCtx, started.id, visitorA);
		expect(stored?.isTest).toBe(true);
		expect(stored?.variantKey).toBe(first.experiment?.variantKey);
		expect(
			await getExperimentAssignmentForVisitorForTenant(betaCtx, started.id, visitorA)
		).toBeNull();

		const betaHost = previewHostname('beta', env.DELIVERY_PREVIEW_PARENT_HOST);
		const betaPage = await resolveDeliveryPage(betaHost, '/', 'exp-s2-beta-resolve');
		if (betaPage.kind !== 'page') throw new Error('expected beta page');
		const betaExposed = await exposeDeliveryPage(betaPage, visitorA, 'exp-s2-beta-expose');
		expect(betaExposed.experiment).toBeUndefined();
		expect(betaExposed.clientId).toBe(beta.id);
		expect(JSON.stringify(betaExposed.document)).not.toContain('implant');

		await transitionExperiment(
			alphaActor,
			alphaCtx,
			{ id: created.id, to: 'paused' },
			'exp-s2-pause'
		);
		const paused = await exposeDeliveryPage(resolved, visitorA, 'exp-s2-paused');
		expect(paused.experiment).toBeUndefined();
		expect(paused.versionId).toBe(resolved.versionId);

		const betaCreated = await createExperimentProposal(
			betaActor,
			betaCtx,
			proposalInput(betaVersions.page.id, betaVersions.control.id, betaVersions.challenger.id),
			'exp-s2-beta-create'
		);
		await transitionExperiment(
			betaActor,
			betaCtx,
			{ id: betaCreated.id, to: 'approved' },
			'exp-s2-beta-approve'
		);
		await expect(
			transitionExperiment(
				alphaActor,
				alphaCtx,
				{ id: betaCreated.id, to: 'running' },
				'exp-s2-cross-start'
			)
		).rejects.toBeInstanceOf(NotFoundError);
	},
	{ timeout: 25_000 }
);

async function exposeProductionVisitor(
	ctx: ReturnType<typeof contextFor>,
	input: {
		experimentId: string;
		variant: { id: string; key: string; pageVersionId: string };
		pageId: string;
		visitorId: string;
		utmSource?: string | null;
		userAgent?: string;
		events?: string[];
		isTest?: boolean;
		tagExperiment?: boolean;
	}
) {
	const isTest = input.isTest ?? false;
	await insertExperimentAssignmentForTenant(ctx, {
		experimentId: input.experimentId,
		visitorAnonymousId: input.visitorId,
		variantId: input.variant.id,
		variantKey: input.variant.key,
		pageVersionId: input.variant.pageVersionId,
		isTest
	});
	const visit = await persistDeliveryVisit(ctx, {
		anonymousId: input.visitorId,
		sessionId: crypto.randomUUID(),
		utmSource: input.utmSource ?? null,
		isTest
	});
	for (const name of input.events ?? ['page_viewed']) {
		await insertAnalyticsEventForTenant(ctx, {
			eventId: crypto.randomUUID(),
			name,
			taxonomyVersion: 1,
			visitorId: visit.visitor.id,
			sessionId: visit.session.id,
			pageId: input.pageId,
			pageVersionId: input.variant.pageVersionId,
			properties: {
				...(input.tagExperiment === false
					? {}
					: {
							experimentId: input.experimentId,
							experimentVariant: input.variant.key
						}),
				userAgent: input.userAgent,
				domainKind: isTest ? 'preview' : 'production'
			},
			isTest
		});
	}
}

test(
	'measurement locks predetermined metrics, excludes bots, and blocks early stop',
	async () => {
		const { alpha, beta } = await seededClients();
		const alphaActor = await adminOn(alpha.id, '10.7.0.31', 'exp-s3-a');
		const betaActor = await adminOn(beta.id, '10.7.0.32', 'exp-s3-b');
		const alphaCtx = contextFor(alphaActor, 'exp-s3-a');
		const betaCtx = contextFor(betaActor, 'exp-s3-b');
		const alphaVersions = await twoPublishedVersions(alphaActor, alphaCtx);
		const betaVersions = await twoPublishedVersions(betaActor, betaCtx);

		const created = await createExperimentProposal(
			alphaActor,
			alphaCtx,
			proposalInput(alphaVersions.page.id, alphaVersions.control.id, alphaVersions.challenger.id),
			'exp-s3-create'
		);
		expect(created.metrics.map((row) => `${row.kind}:${row.eventName}`).sort()).toEqual([
			'guardrail:page_viewed',
			'primary:form_started'
		]);
		expect(listExperimentMetricsForTenant(null as never, [created.id])).rejects.toBeInstanceOf(
			TenantContextError
		);
		expect((await listExperimentMetricsForTenant(betaCtx, [created.id])).length).toBe(0);

		await transitionExperiment(
			alphaActor,
			alphaCtx,
			{ id: created.id, to: 'approved' },
			'exp-s3-approve'
		);
		await transitionExperiment(
			alphaActor,
			alphaCtx,
			{ id: created.id, to: 'running' },
			'exp-s3-start'
		);
		const control = created.variants.find((row) => row.role === 'control');
		const challenger = created.variants.find((row) => row.role === 'challenger');
		if (!control || !challenger) throw new Error('variants missing');

		for (let index = 0; index < 10; index += 1) {
			await exposeProductionVisitor(alphaCtx, {
				experimentId: created.id,
				variant: control,
				pageId: alphaVersions.page.id,
				visitorId: crypto.randomUUID(),
				utmSource: 'google',
				userAgent: 'Mozilla/5.0',
				events: index < 2 ? ['page_viewed', 'form_started'] : ['page_viewed']
			});
		}
		await exposeProductionVisitor(alphaCtx, {
			experimentId: created.id,
			variant: challenger,
			pageId: alphaVersions.page.id,
			visitorId: crypto.randomUUID(),
			utmSource: 'google',
			userAgent: 'Mozilla/5.0',
			events: ['page_viewed', 'form_started']
		});
		for (let index = 0; index < 4; index += 1) {
			await exposeProductionVisitor(alphaCtx, {
				experimentId: created.id,
				variant: challenger,
				pageId: alphaVersions.page.id,
				visitorId: crypto.randomUUID(),
				utmSource: 'direct',
				userAgent: 'Mozilla/5.0',
				events: ['page_viewed', 'form_started']
			});
		}
		for (let index = 0; index < 5; index += 1) {
			await exposeProductionVisitor(alphaCtx, {
				experimentId: created.id,
				variant: control,
				pageId: alphaVersions.page.id,
				visitorId: crypto.randomUUID(),
				utmSource: 'google',
				userAgent: 'GPTBot/1.0',
				events: ['page_viewed', 'form_started']
			});
		}
		await exposeProductionVisitor(alphaCtx, {
			experimentId: created.id,
			variant: control,
			pageId: alphaVersions.page.id,
			visitorId: crypto.randomUUID(),
			utmSource: 'newsletter',
			userAgent: 'Mozilla/5.0',
			events: ['page_viewed', 'form_started'],
			isTest: true
		});
		await exposeProductionVisitor(alphaCtx, {
			experimentId: created.id,
			variant: control,
			pageId: alphaVersions.page.id,
			visitorId: crypto.randomUUID(),
			utmSource: 'direct',
			userAgent: 'Mozilla/5.0',
			events: ['form_started'],
			tagExperiment: false
		});

		const reader = {
			...alphaActor,
			permissions: alphaActor.permissions.filter((cap) => cap !== 'experiments.read')
		};
		await expect(
			measureExperiment(reader, alphaCtx, created.id, 'exp-s3-no-read')
		).rejects.toBeInstanceOf(ForbiddenError);

		const measured = await measureExperiment(alphaActor, alphaCtx, created.id, 'exp-s3-measure');
		expect(measured.measurement?.decisionReady).toBe(false);
		expect(measured.measurement?.earlyStopBlocked).toBe(true);
		expect(measured.measurement?.horizonMet).toBe(false);
		expect(measured.measurement?.sampleMet).toBe(false);
		expect(measured.measurement?.botContamination).toBe(true);
		expect(measured.measurement?.sourceImbalance).toBe(true);
		expect(measured.measurement?.controlSample).toBe(11);
		expect(measured.measurement?.challengerSample).toBe(5);
		expect(measured.measurement?.controlPrimaryCount).toBe(2);
		expect(measured.measurement?.challengerPrimaryCount).toBe(5);
		expect(measured.measurement?.challengerPrimaryCount).toBeGreaterThan(
			measured.measurement?.controlPrimaryCount ?? 0
		);
		expect(measured.measurement?.reasons).toEqual(
			expect.arrayContaining([
				'horizon_unmet',
				'sample_unmet',
				'bot_contamination',
				'source_imbalance'
			])
		);

		const stored = await listLatestExperimentResultsForTenant(alphaCtx, [created.id]);
		expect(stored[0]?.decisionReady).toBe(false);
		expect(stored[0]?.earlyStopBlocked).toBe(true);
		expect(await listLatestExperimentResultsForTenant(betaCtx, [created.id])).toEqual([]);

		expect(() => assertNotEarlyStop(measured.measurement!)).toThrow(ValidationError);
		const manager = {
			...alphaActor,
			permissions: alphaActor.permissions.filter((cap) => cap !== 'experiments.manage')
		};
		await expect(
			assertExperimentDecisionReady(manager, alphaCtx, created.id, 'exp-s3-decide')
		).rejects.toBeInstanceOf(ForbiddenError);

		const betaCreated = await createExperimentProposal(
			betaActor,
			betaCtx,
			proposalInput(betaVersions.page.id, betaVersions.control.id, betaVersions.challenger.id),
			'exp-s3-beta-create'
		);
		await expect(
			measureExperiment(alphaActor, alphaCtx, betaCreated.id, 'exp-s3-cross')
		).rejects.toBeInstanceOf(NotFoundError);
		expect(
			(await getExperimentOverview(betaActor, betaCtx)).experiments[0]?.measurement?.controlSample
		).toBe(0);
	},
	{ timeout: 30_000 }
);
