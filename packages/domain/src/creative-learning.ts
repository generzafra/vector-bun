import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	creativeLearningHypothesis,
	type TenantContext
} from '@vector/contracts';
import {
	getCreativeLearningForExperimentForTenant,
	getExperimentForTenant,
	getExperimentResultForTenant,
	insertCreativeLearningForTenant,
	listExperimentDecisionsForTenant,
	listExperimentLearningObjectsForTenant,
	listExperimentVariantsForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

export async function recordCreativeLearning(
	actor: Actor,
	ctx: TenantContext,
	experimentId: string,
	requestId: string
) {
	requireCapability(actor.permissions, 'experiments.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const experiment = await getExperimentForTenant(required, experimentId);
	if (!experiment) throw new NotFoundError('Experiment not found');
	const existing = await getCreativeLearningForExperimentForTenant(required, experiment.id);
	if (existing) {
		return {
			id: existing.id,
			experimentId: existing.experimentId,
			status: existing.status === 'hypothesis' ? 'hypothesis' : 'insufficient',
			evidence: existing.evidence === 'observed' ? 'observed' : 'unknown',
			statement: existing.statement,
			autoApply: false as const,
			controlPageVersionId: existing.controlPageVersionId,
			challengerPageVersionId: existing.challengerPageVersionId
		};
	}
	const learnings = await listExperimentLearningObjectsForTenant(required, [experiment.id]);
	const learning = learnings[0];
	if (!learning) {
		throw new ValidationError('Decide the experiment before recording a design learning');
	}
	const decisions = await listExperimentDecisionsForTenant(required, [experiment.id]);
	const decision = decisions.find((row) => row.id === learning.decisionId);
	if (!decision) throw new ValidationError('Measured result is missing');
	const result = await getExperimentResultForTenant(required, decision.resultId);
	if (!result || result.experimentId !== experiment.id) {
		throw new ValidationError('Measured result is missing');
	}
	const variants = await listExperimentVariantsForTenant(required, [experiment.id]);
	const control = variants.find((row) => row.role === 'control');
	const challenger = variants.find((row) => row.role === 'challenger');
	const hypothesis = creativeLearningHypothesis({
		primaryMetric: experiment.primaryMetric,
		sampleMet: result.sampleMet,
		horizonMet: result.horizonMet,
		botContamination: result.botContamination,
		sourceImbalance: result.sourceImbalance,
		controlPrimaryCount: result.controlPrimaryCount,
		challengerPrimaryCount: result.challengerPrimaryCount,
		qualifiedLeads: null,
		sales: null
	});
	const row = await insertCreativeLearningForTenant(required, {
		experimentId: experiment.id,
		experimentLearningId: learning.id,
		controlPageVersionId: control?.pageVersionId ?? null,
		challengerPageVersionId: challenger?.pageVersionId ?? null,
		status: hypothesis.status,
		evidence: hypothesis.evidence,
		statement: hypothesis.statement
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'creative.learning.record',
		entityType: 'creative_learning',
		entityId: row.id,
		requestId,
		reason: hypothesis.status
	});
	return {
		id: row.id,
		experimentId: row.experimentId,
		status: hypothesis.status,
		evidence: hypothesis.evidence,
		statement: row.statement,
		autoApply: false as const,
		controlPageVersionId: row.controlPageVersionId,
		challengerPageVersionId: row.challengerPageVersionId
	};
}
