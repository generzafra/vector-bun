import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	createExperimentProposalSchema,
	experimentClientIdSchema,
	parseContract,
	transitionExperimentSchema,
	type ExperimentPrimaryMetric,
	type ExperimentStatus,
	type TenantContext
} from '@vector/contracts';
import {
	assertExperimentClient,
	getExperimentForTenant,
	getPageForTenant,
	listPublishedPageVersionMetaForTenant,
	insertExperimentProposalForTenant,
	listExperimentHypothesesForTenant,
	listExperimentVariantsForTenant,
	listExperimentsForTenant,
	listOpenExperimentsForPageMetricForTenant,
	listPublishedPageVersionsForTenant,
	listPublishedPagesForTenant,
	updateExperimentStatusForTenant
} from '@vector/db';
import {
	assertDistinctVariants,
	assertExperimentTransition,
	assertGuardrailMetrics,
	assertNoConflictingExperiment,
	assertPrimaryMetricAllowed,
	nextExperimentStatuses
} from '@vector/experiments';
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
}) {
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
		variants: input.variants
	};
}

async function assembledExperiments(ctx: TenantContext) {
	const rows = await listExperimentsForTenant(ctx);
	const ids = rows.map((row) => row.id);
	const [hypotheses, variants] = await Promise.all([
		listExperimentHypothesesForTenant(ctx, ids),
		listExperimentVariantsForTenant(ctx, ids)
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
				}))
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
		canLaunch: false
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
		}))
	});
}

export async function getExperiment(actor: Actor, ctx: TenantContext, id: string) {
	requireCapability(actor.permissions, 'experiments.read');
	const required = assertActorOwnsContext(actor, ctx);
	const experiment = await getExperimentForTenant(required, id);
	if (!experiment) throw new NotFoundError('Experiment not found');
	const [hypotheses, variants] = await Promise.all([
		listExperimentHypothesesForTenant(required, [experiment.id]),
		listExperimentVariantsForTenant(required, [experiment.id])
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
		}))
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
	const updated = await updateExperimentStatusForTenant(required, experiment.id, parsed.to);
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
	const [hypotheses, variants] = await Promise.all([
		listExperimentHypothesesForTenant(required, [updated.id]),
		listExperimentVariantsForTenant(required, [updated.id])
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
		}))
	});
}
