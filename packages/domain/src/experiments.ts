import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	createExperimentProposalSchema,
	decideExperimentSchema,
	experimentClientIdSchema,
	experimentIdSchema,
	parseContract,
	requireTenantContext,
	transitionExperimentSchema,
	type ExperimentPrimaryMetric,
	type ExperimentStatus,
	type TenantContext
} from '@vector/contracts';
import {
	assertExperimentClient,
	getBrandLabelForTenant,
	getExperimentAssignmentForVisitorForTenant,
	getExperimentForTenant,
	getPageForTenant,
	getPageVersionForTenant,
	getPublishedPageVersionMetaForTenant,
	getRunningExperimentForPageForTenant,
	insertExperimentAssignmentForTenant,
	insertExperimentResultForTenant,
	listPublishedPageVersionMetaForTenant,
	insertExperimentProposalForTenant,
	listExperimentAssignmentsForExperimentsForTenant,
	listExperimentDecisionsForTenant,
	listExperimentHypothesesForTenant,
	listExperimentLearningObjectsForTenant,
	listExperimentMetricsForTenant,
	listExperimentVariantsForTenant,
	listExperimentsForTenant,
	listOpenExperimentsForPageMetricForTenant,
	listVisitorAnalyticsEventsForMeasurementForTenant,
	listPublishedPageVersionsForTenant,
	listPublishedPagesForTenant,
	listRunningExperimentsForPageForTenant,
	persistExperimentDecisionForTenant,
	updateExperimentStatusForTenant
} from '@vector/db';
import {
	assertCanDecideExperiment,
	assertDistinctVariants,
	assertExperimentDecisionOutcome,
	assertExperimentTransition,
	assertGuardrailMetrics,
	assertNoConflictingExperiment,
	assertNoRunningExperimentOnPage,
	assertNotEarlyStop,
	assertPrimaryMetricAllowed,
	assertMetricsMatchPredetermined,
	assignVariantKey,
	computeExperimentMeasurement,
	decisionWinnerVariantKey,
	formatLearningResult,
	learningConfidence,
	nextExperimentStatuses,
	predeterminedMetricNames,
	type ExperimentMeasurement
} from '@vector/experiments';
import { parsePageDocument } from '@vector/funnel-engine';
import type { DeliveryResolution } from './delivery';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

function publicExperiment(input: {
	experiment: {
		id: string;
		pageId: string;
		name: string;
		status: string;
		audienceKey: string;
		primaryMetric: string;
		guardrailMetrics: string[];
		minDurationDays: number;
		minSamplePerVariant: number;
		decisionRule: string;
		rollbackRule: string;
		launchedAt: Date | null;
		decidedAt: Date | null;
		createdAt: Date;
		updatedAt: Date;
	};
	hypothesis: {
		problem: string;
		evidence: string;
		hypothesis: string;
		audience: string;
	} | null;
	variants: Array<{
		id: string;
		key: string;
		name: string;
		role: string;
		pageVersionId: string;
	}>;
	metrics?: Array<{ kind: string; eventName: string }>;
	measurement?: ExperimentMeasurement | null;
	decision?: {
		id: string;
		outcome: string;
		winnerVariantKey: string | null;
		promotedPageVersionId: string | null;
		notes: string;
		createdAt: Date;
	} | null;
	learning?: {
		id: string;
		clientLabel: string;
		industry: string;
		audience: string;
		hypothesis: string;
		change: string;
		result: string;
		confidence: string;
		decision: string;
		notes: string;
		createdAt: Date;
	} | null;
}) {
	const measurement = input.measurement ?? null;
	const status = input.experiment.status as ExperimentStatus;
	return {
		id: input.experiment.id,
		pageId: input.experiment.pageId,
		name: input.experiment.name,
		status: input.experiment.status,
		audienceKey: input.experiment.audienceKey,
		primaryMetric: input.experiment.primaryMetric,
		guardrailMetrics: input.experiment.guardrailMetrics,
		minDurationDays: input.experiment.minDurationDays,
		minSamplePerVariant: input.experiment.minSamplePerVariant,
		decisionRule: input.experiment.decisionRule,
		rollbackRule: input.experiment.rollbackRule,
		launchedAt: input.experiment.launchedAt,
		decidedAt: input.experiment.decidedAt,
		createdAt: input.experiment.createdAt,
		updatedAt: input.experiment.updatedAt,
		nextStatuses: nextExperimentStatuses(
			input.experiment.status as ExperimentStatus,
			input.experiment.launchedAt
		),
		hypothesis: input.hypothesis,
		variants: input.variants,
		metrics: input.metrics ?? [],
		measurement,
		decision: input.decision ?? null,
		learning: input.learning ?? null,
		canDecide:
			!input.decision &&
			Boolean(measurement?.decisionReady) &&
			(status === 'running' || (status === 'paused' && Boolean(input.experiment.launchedAt)))
	};
}

function measurementEvents(
	rows: Array<{
		name: string;
		isTest: boolean;
		experimentId: string | null;
		experimentVariant: string | null;
		userAgent: string | null;
		visitorAnonymousId: string;
		utmSource: string | null;
	}>
) {
	return rows.map((row) => ({
		visitorAnonymousId: row.visitorAnonymousId,
		name: row.name,
		isTest: row.isTest,
		userAgent: row.userAgent,
		utmSource: row.utmSource,
		experimentId: row.experimentId,
		experimentVariant: row.experimentVariant
	}));
}

async function measureRows(
	ctx: TenantContext,
	experiments: Array<{
		id: string;
		pageId: string;
		primaryMetric: string;
		guardrailMetrics: string[];
		minDurationDays: number;
		minSamplePerVariant: number;
		launchedAt: Date | null;
	}>
) {
	const ids = experiments.map((row) => row.id);
	const [metrics, assignments] = await Promise.all([
		listExperimentMetricsForTenant(ctx, ids),
		listExperimentAssignmentsForExperimentsForTenant(ctx, ids)
	]);
	const launchedIds = experiments.filter((row) => row.launchedAt).map((row) => row.id);
	const visitorIds = assignments.map((row) => row.visitorAnonymousId);
	const events =
		launchedIds.length > 0 && visitorIds.length > 0
			? await listVisitorAnalyticsEventsForMeasurementForTenant(ctx, launchedIds, visitorIds)
			: [];
	return { metrics, assignments, events };
}

function measurementFor(
	experiment: {
		id: string;
		primaryMetric: string;
		guardrailMetrics: string[];
		minDurationDays: number;
		minSamplePerVariant: number;
		launchedAt: Date | null;
	},
	metrics: Array<{ experimentId: string; eventName: string }>,
	assignments: Array<{
		experimentId: string;
		visitorAnonymousId: string;
		variantKey: string;
		isTest: boolean;
	}>,
	events: Array<{
		name: string;
		isTest: boolean;
		experimentId: string | null;
		experimentVariant: string | null;
		userAgent: string | null;
		visitorAnonymousId: string;
		utmSource: string | null;
	}>,
	now: Date
) {
	const predetermined = metrics
		.filter((row) => row.experimentId === experiment.id)
		.map((row) => row.eventName);
	const names =
		predetermined.length > 0
			? predetermined
			: predeterminedMetricNames({
					primaryMetric: experiment.primaryMetric,
					guardrailMetrics: experiment.guardrailMetrics
				});
	return computeExperimentMeasurement({
		experimentId: experiment.id,
		primaryMetric: experiment.primaryMetric,
		metrics: names,
		launchedAt: experiment.launchedAt,
		minDurationDays: experiment.minDurationDays,
		minSamplePerVariant: experiment.minSamplePerVariant,
		now,
		assignments: assignments.filter((row) => row.experimentId === experiment.id),
		events: measurementEvents(events)
	});
}

async function assembledExperiments(ctx: TenantContext, now = new Date()) {
	const rows = await listExperimentsForTenant(ctx);
	const ids = rows.map((row) => row.id);
	const [hypotheses, variants, measured, decisions, learnings] = await Promise.all([
		listExperimentHypothesesForTenant(ctx, ids),
		listExperimentVariantsForTenant(ctx, ids),
		measureRows(ctx, rows),
		listExperimentDecisionsForTenant(ctx, ids),
		listExperimentLearningObjectsForTenant(ctx, ids)
	]);
	return rows.map((experiment) =>
		publicExperiment({
			experiment,
			hypothesis: hypotheses.find((row) => row.experimentId === experiment.id) ?? null,
			variants: variants
				.filter((row) => row.experimentId === experiment.id)
				.map((row) => ({
					id: row.id,
					key: row.key,
					name: row.name,
					role: row.role,
					pageVersionId: row.pageVersionId
				})),
			metrics: measured.metrics
				.filter((row) => row.experimentId === experiment.id)
				.map((row) => ({ kind: row.kind, eventName: row.eventName })),
			measurement: measurementFor(
				experiment,
				measured.metrics,
				measured.assignments,
				measured.events,
				now
			),
			decision: decisions.find((row) => row.experimentId === experiment.id) ?? null,
			learning: learnings.find((row) => row.experimentId === experiment.id) ?? null
		})
	);
}

export async function getExperimentOverview(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'experiments.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(experimentClientIdSchema, { clientId });
		assertExperimentClient(required, clientId);
	}
	const [experiments, pages, versions] = await Promise.all([
		assembledExperiments(required),
		listPublishedPagesForTenant(required),
		listPublishedPageVersionsForTenant(required)
	]);
	return {
		experiments,
		pages,
		versions,
		canLaunch: experiments.some((row) => row.status === 'approved')
	};
}

export async function createExperimentProposal(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'experiments.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(createExperimentProposalSchema, input);
	assertPrimaryMetricAllowed(parsed.primaryMetric);
	assertGuardrailMetrics(parsed.primaryMetric, parsed.guardrailMetrics);
	assertDistinctVariants(parsed.controlPageVersionId, parsed.challengerPageVersionId);

	const open = await listOpenExperimentsForPageMetricForTenant(
		required,
		parsed.pageId,
		parsed.primaryMetric as ExperimentPrimaryMetric
	);
	assertNoConflictingExperiment(open.length);

	const page = await getPageForTenant(required, parsed.pageId);
	if (!page) throw new ValidationError('Page not found for this client');

	const versionRows = await listPublishedPageVersionMetaForTenant(required, [
		parsed.controlPageVersionId,
		parsed.challengerPageVersionId
	]);
	const control = versionRows.find((row) => row.id === parsed.controlPageVersionId) ?? null;
	const challenger = versionRows.find((row) => row.id === parsed.challengerPageVersionId) ?? null;
	if (!control || control.status !== 'published' || control.pageId !== page.id) {
		throw new ValidationError('Control must be a published page version of the selected page');
	}
	if (!challenger || challenger.status !== 'published' || challenger.pageId !== page.id) {
		throw new ValidationError('Challenger must be a published page version of the selected page');
	}

	const created = await insertExperimentProposalForTenant(required, {
		pageId: page.id,
		name: parsed.name,
		audienceKey: parsed.audienceKey,
		primaryMetric: parsed.primaryMetric,
		guardrailMetrics: parsed.guardrailMetrics,
		minDurationDays: parsed.minDurationDays,
		minSamplePerVariant: parsed.minSamplePerVariant,
		decisionRule: parsed.decisionRule,
		rollbackRule: parsed.rollbackRule,
		problem: parsed.problem,
		evidence: parsed.evidence,
		hypothesis: parsed.hypothesis,
		audience: parsed.audience,
		variants: [
			{
				key: 'control',
				name: 'Control',
				role: 'control',
				pageVersionId: control.id
			},
			{
				key: 'challenger',
				name: parsed.challengerName,
				role: 'challenger',
				pageVersionId: challenger.id
			}
		]
	});

	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'experiments.proposal.create',
		entityType: 'experiment',
		entityId: created.experiment.id,
		requestId,
		reason: parsed.name
	});

	return publicExperiment({
		experiment: created.experiment,
		hypothesis: created.hypothesis,
		variants: created.variants.map((row) => ({
			id: row.id,
			key: row.key,
			name: row.name,
			role: row.role,
			pageVersionId: row.pageVersionId
		})),
		metrics: created.metrics.map((row) => ({ kind: row.kind, eventName: row.eventName }))
	});
}

export async function getExperiment(actor: Actor, ctx: TenantContext, id: string) {
	requireCapability(actor.permissions, 'experiments.read');
	const required = assertActorOwnsContext(actor, ctx);
	const experiment = await getExperimentForTenant(required, id);
	if (!experiment) throw new NotFoundError('Experiment not found');
	const now = new Date();
	const [hypotheses, variants, measured] = await Promise.all([
		listExperimentHypothesesForTenant(required, [experiment.id]),
		listExperimentVariantsForTenant(required, [experiment.id]),
		measureRows(required, [experiment])
	]);
	return publicExperiment({
		experiment,
		hypothesis: hypotheses[0] ?? null,
		variants: variants.map((row) => ({
			id: row.id,
			key: row.key,
			name: row.name,
			role: row.role,
			pageVersionId: row.pageVersionId
		})),
		metrics: measured.metrics.map((row) => ({ kind: row.kind, eventName: row.eventName })),
		measurement: measurementFor(
			experiment,
			measured.metrics,
			measured.assignments,
			measured.events,
			now
		)
	});
}

export async function measureExperiment(
	actor: Actor,
	ctx: TenantContext,
	id: string,
	requestId: string,
	now = new Date()
) {
	requireCapability(actor.permissions, 'experiments.read');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(experimentIdSchema, { id });
	const experiment = await getExperimentForTenant(required, parsed.id);
	if (!experiment) throw new NotFoundError('Experiment not found');
	const [hypotheses, variants, measured] = await Promise.all([
		listExperimentHypothesesForTenant(required, [experiment.id]),
		listExperimentVariantsForTenant(required, [experiment.id]),
		measureRows(required, [experiment])
	]);
	const predetermined = measured.metrics.map((row) => row.eventName);
	assertMetricsMatchPredetermined(
		predetermined,
		predeterminedMetricNames({
			primaryMetric: experiment.primaryMetric,
			guardrailMetrics: experiment.guardrailMetrics
		})
	);
	const measurement = measurementFor(
		experiment,
		measured.metrics,
		measured.assignments,
		measured.events,
		now
	);
	await insertExperimentResultForTenant(required, {
		experimentId: experiment.id,
		...measurement,
		computedAt: now
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'experiments.measure',
		entityType: 'experiment',
		entityId: experiment.id,
		requestId,
		reason: measurement.decisionReady ? 'decision_ready' : measurement.reasons.join(',')
	});
	return publicExperiment({
		experiment,
		hypothesis: hypotheses[0] ?? null,
		variants: variants.map((row) => ({
			id: row.id,
			key: row.key,
			name: row.name,
			role: row.role,
			pageVersionId: row.pageVersionId
		})),
		metrics: measured.metrics.map((row) => ({ kind: row.kind, eventName: row.eventName })),
		measurement
	});
}

export async function assertExperimentDecisionReady(
	actor: Actor,
	ctx: TenantContext,
	id: string,
	requestId: string,
	now = new Date()
) {
	requireCapability(actor.permissions, 'experiments.manage');
	const measured = await measureExperiment(actor, ctx, id, requestId, now);
	if (!measured.measurement) throw new ValidationError('Experiment measurement is missing');
	assertNotEarlyStop(measured.measurement);
	return measured;
}

export async function decideExperiment(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string,
	now = new Date()
) {
	requireCapability(actor.permissions, 'experiments.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(decideExperimentSchema, input);
	const experiment = await getExperimentForTenant(required, parsed.id);
	if (!experiment) throw new NotFoundError('Experiment not found');
	assertCanDecideExperiment(experiment.status as ExperimentStatus, experiment.launchedAt);
	const existing = await listExperimentDecisionsForTenant(required, [experiment.id]);
	if (existing.length > 0) throw new ValidationError('Experiment is already decided');

	const [hypotheses, variants, measured] = await Promise.all([
		listExperimentHypothesesForTenant(required, [experiment.id]),
		listExperimentVariantsForTenant(required, [experiment.id]),
		measureRows(required, [experiment])
	]);
	const predetermined = measured.metrics.map((row) => row.eventName);
	assertMetricsMatchPredetermined(
		predetermined,
		predeterminedMetricNames({
			primaryMetric: experiment.primaryMetric,
			guardrailMetrics: experiment.guardrailMetrics
		})
	);
	const measurement = measurementFor(
		experiment,
		measured.metrics,
		measured.assignments,
		measured.events,
		now
	);
	assertExperimentDecisionOutcome(parsed.outcome, measurement);
	const control = variants.find((row) => row.role === 'control');
	const challenger = variants.find((row) => row.role === 'challenger');
	if (!control || !challenger) throw new ValidationError('Experiment variants are missing');
	const brand = await getBrandLabelForTenant(required);

	let promotedPageVersionId: string | null = null;
	if (parsed.outcome === 'promote_challenger') {
		promotedPageVersionId = challenger.pageVersionId;
	} else if (parsed.outcome === 'keep_control' && experiment.rollbackRule === 'revert_to_control') {
		promotedPageVersionId = control.pageVersionId;
	}
	if (promotedPageVersionId) {
		const version = await getPublishedPageVersionMetaForTenant(required, promotedPageVersionId);
		if (!version || version.status !== 'published' || version.pageId !== experiment.pageId) {
			throw new ValidationError('Promotion target must be a published page version of this page');
		}
	}

	const storedResult = await insertExperimentResultForTenant(required, {
		experimentId: experiment.id,
		...measurement,
		computedAt: now
	});
	const persisted = await persistExperimentDecisionForTenant(required, {
		experimentId: experiment.id,
		pageId: experiment.pageId,
		resultId: storedResult.id,
		outcome: parsed.outcome,
		winnerVariantKey: decisionWinnerVariantKey(parsed.outcome),
		promotedPageVersionId,
		notes: parsed.notes,
		actorId: actor.userId,
		clientLabel: brand?.displayName || 'unknown',
		industry: 'unknown',
		audience: hypotheses[0]?.audience || brand?.audience || 'unknown',
		hypothesis: hypotheses[0]?.hypothesis || experiment.name,
		change: `${challenger.name} versus ${control.name} on published page versions`,
		result: formatLearningResult(experiment.primaryMetric, measurement),
		confidence: learningConfidence(),
		conditions: {
			horizonMet: measurement.horizonMet,
			sampleMet: measurement.sampleMet,
			botContamination: measurement.botContamination,
			sourceImbalance: measurement.sourceImbalance,
			controlSample: measurement.controlSample,
			challengerSample: measurement.challengerSample,
			botShareBps: measurement.botShareBps
		},
		decidedAt: now
	});
	if (!persisted.experiment) throw new NotFoundError('Experiment not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'experiments.decide',
		entityType: 'experiment',
		entityId: persisted.experiment.id,
		requestId,
		reason: parsed.outcome
	});
	return publicExperiment({
		experiment: persisted.experiment,
		hypothesis: hypotheses[0] ?? null,
		variants: variants.map((row) => ({
			id: row.id,
			key: row.key,
			name: row.name,
			role: row.role,
			pageVersionId: row.pageVersionId
		})),
		metrics: measured.metrics.map((row) => ({ kind: row.kind, eventName: row.eventName })),
		measurement,
		decision: persisted.decision,
		learning: persisted.learning
	});
}

export async function transitionExperiment(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'experiments.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(transitionExperimentSchema, input);
	const experiment = await getExperimentForTenant(required, parsed.id);
	if (!experiment) throw new NotFoundError('Experiment not found');
	assertExperimentTransition(experiment.status, parsed.to, experiment.launchedAt);
	if (parsed.to === 'running' && experiment.status === 'approved') {
		const running = await listRunningExperimentsForPageForTenant(required, experiment.pageId);
		assertNoRunningExperimentOnPage(running.filter((row) => row.id !== experiment.id).length);
	}
	const updated = await updateExperimentStatusForTenant(required, experiment.id, {
		status: parsed.to,
		...(parsed.to === 'running' && !experiment.launchedAt ? { launchedAt: new Date() } : {})
	});
	if (!updated) throw new NotFoundError('Experiment not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'experiments.transition',
		entityType: 'experiment',
		entityId: updated.id,
		requestId,
		reason: `${experiment.status}->${parsed.to}`
	});
	const now = new Date();
	const [hypotheses, variants, measured] = await Promise.all([
		listExperimentHypothesesForTenant(required, [updated.id]),
		listExperimentVariantsForTenant(required, [updated.id]),
		measureRows(required, [updated])
	]);
	return publicExperiment({
		experiment: updated,
		hypothesis: hypotheses[0] ?? null,
		variants: variants.map((row) => ({
			id: row.id,
			key: row.key,
			name: row.name,
			role: row.role,
			pageVersionId: row.pageVersionId
		})),
		metrics: measured.metrics.map((row) => ({ kind: row.kind, eventName: row.eventName })),
		measurement: measurementFor(
			updated,
			measured.metrics,
			measured.assignments,
			measured.events,
			now
		)
	});
}

export async function exposeDeliveryPage(
	page: Extract<DeliveryResolution, { kind: 'page' }>,
	visitorId: string,
	requestId: string
): Promise<Extract<DeliveryResolution, { kind: 'page' }>> {
	const ctx = requireTenantContext({
		organizationId: page.organizationId,
		clientId: page.clientId,
		roleIds: [],
		requestId
	});
	const running = await getRunningExperimentForPageForTenant(ctx, page.pageId);
	if (!running) return page;
	const variants = await listExperimentVariantsForTenant(ctx, [running.id]);
	const control = variants.find((row) => row.role === 'control');
	const challenger = variants.find((row) => row.role === 'challenger');
	if (!control || !challenger) return page;

	const isTest = page.domainKind === 'preview';
	let assignment = await getExperimentAssignmentForVisitorForTenant(ctx, running.id, visitorId);
	if (!assignment) {
		const variantKey = assignVariantKey(running.id, visitorId);
		const variant = variantKey === 'challenger' ? challenger : control;
		try {
			assignment = await insertExperimentAssignmentForTenant(ctx, {
				experimentId: running.id,
				visitorAnonymousId: visitorId,
				variantId: variant.id,
				variantKey,
				pageVersionId: variant.pageVersionId,
				isTest
			});
		} catch {
			assignment = await getExperimentAssignmentForVisitorForTenant(ctx, running.id, visitorId);
		}
	}
	if (!assignment) return page;

	const version = await getPageVersionForTenant(ctx, assignment.pageVersionId);
	if (!version || version.status !== 'published' || version.pageId !== page.pageId) {
		return page;
	}
	return {
		...page,
		versionId: version.id,
		document: version.id === page.versionId ? page.document : parsePageDocument(version.document),
		experiment: {
			experimentId: running.id,
			variantKey: assignment.variantKey,
			variantRole: assignment.variantKey === 'challenger' ? 'challenger' : 'control',
			isTest
		}
	};
}
