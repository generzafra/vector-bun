import { and, eq } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { creativeLearningObjects } from './schema';

export async function listCreativeLearningsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			id: creativeLearningObjects.id,
			experimentId: creativeLearningObjects.experimentId,
			experimentLearningId: creativeLearningObjects.experimentLearningId,
			controlPageVersionId: creativeLearningObjects.controlPageVersionId,
			challengerPageVersionId: creativeLearningObjects.challengerPageVersionId,
			status: creativeLearningObjects.status,
			evidence: creativeLearningObjects.evidence,
			statement: creativeLearningObjects.statement,
			autoApply: creativeLearningObjects.autoApply,
			createdAt: creativeLearningObjects.createdAt
		})
		.from(creativeLearningObjects)
		.where(eq(creativeLearningObjects.clientId, required.clientId));
}

export async function getCreativeLearningForExperimentForTenant(
	ctx: TenantContext,
	experimentId: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({
			id: creativeLearningObjects.id,
			experimentId: creativeLearningObjects.experimentId,
			experimentLearningId: creativeLearningObjects.experimentLearningId,
			controlPageVersionId: creativeLearningObjects.controlPageVersionId,
			challengerPageVersionId: creativeLearningObjects.challengerPageVersionId,
			status: creativeLearningObjects.status,
			evidence: creativeLearningObjects.evidence,
			statement: creativeLearningObjects.statement,
			autoApply: creativeLearningObjects.autoApply,
			createdAt: creativeLearningObjects.createdAt
		})
		.from(creativeLearningObjects)
		.where(
			and(
				eq(creativeLearningObjects.clientId, required.clientId),
				eq(creativeLearningObjects.experimentId, experimentId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function insertCreativeLearningForTenant(
	ctx: TenantContext,
	input: {
		experimentId: string;
		experimentLearningId: string;
		controlPageVersionId: string | null;
		challengerPageVersionId: string | null;
		status: 'insufficient' | 'hypothesis';
		evidence: 'observed' | 'unknown';
		statement: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(creativeLearningObjects)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			experimentId: input.experimentId,
			experimentLearningId: input.experimentLearningId,
			controlPageVersionId: input.controlPageVersionId,
			challengerPageVersionId: input.challengerPageVersionId,
			status: input.status,
			evidence: input.evidence,
			statement: input.statement,
			autoApply: false
		})
		.onConflictDoNothing({ target: creativeLearningObjects.experimentId })
		.returning({
			id: creativeLearningObjects.id,
			experimentId: creativeLearningObjects.experimentId,
			experimentLearningId: creativeLearningObjects.experimentLearningId,
			controlPageVersionId: creativeLearningObjects.controlPageVersionId,
			challengerPageVersionId: creativeLearningObjects.challengerPageVersionId,
			status: creativeLearningObjects.status,
			evidence: creativeLearningObjects.evidence,
			statement: creativeLearningObjects.statement,
			autoApply: creativeLearningObjects.autoApply,
			createdAt: creativeLearningObjects.createdAt
		});
	if (row) return row;
	const existing = await getCreativeLearningForExperimentForTenant(required, input.experimentId);
	if (!existing) throw new Error('Creative learning was not stored');
	return existing;
}
