import { and, desc, eq, inArray } from 'drizzle-orm';
import {
	assertSameClient,
	requireTenantContext,
	type ExperimentAudience,
	type ExperimentDecisionRule,
	type ExperimentPrimaryMetric,
	type ExperimentRollbackRule,
	type ExperimentStatus,
	type ExperimentVariantRole,
	type TenantContext
} from '@vector/contracts';
import { db } from './client';
import { experimentHypotheses, experimentVariants, experiments } from './schema';

const OPEN_STATUSES: ExperimentStatus[] = ['draft', 'proposed', 'approved', 'running', 'paused'];

export function assertExperimentClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function insertExperimentProposalForTenant(
	ctx: TenantContext,
	input: {
		pageId: string;
		name: string;
		audienceKey: ExperimentAudience;
		primaryMetric: ExperimentPrimaryMetric;
		guardrailMetrics: string[];
		minDurationDays: number;
		minSamplePerVariant: number;
		decisionRule: ExperimentDecisionRule;
		rollbackRule: ExperimentRollbackRule;
		problem: string;
		evidence: string;
		hypothesis: string;
		audience: string;
		variants: Array<{
			key: string;
			name: string;
			role: ExperimentVariantRole;
			pageVersionId: string;
		}>;
	}
) {
	const required = requireTenantContext(ctx);
	const [experiment] = await db
		.insert(experiments)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			pageId: input.pageId,
			name: input.name,
			status: 'proposed',
			audienceKey: input.audienceKey,
			primaryMetric: input.primaryMetric,
			guardrailMetrics: input.guardrailMetrics,
			minDurationDays: input.minDurationDays,
			minSamplePerVariant: input.minSamplePerVariant,
			decisionRule: input.decisionRule,
			rollbackRule: input.rollbackRule
		})
		.returning();
	const [hypothesis] = await db
		.insert(experimentHypotheses)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			experimentId: experiment.id,
			problem: input.problem,
			evidence: input.evidence,
			hypothesis: input.hypothesis,
			audience: input.audience
		})
		.returning();
	const variants = await db
		.insert(experimentVariants)
		.values(
			input.variants.map((variant) => ({
				organizationId: required.organizationId,
				clientId: required.clientId,
				experimentId: experiment.id,
				key: variant.key,
				name: variant.name,
				role: variant.role,
				pageVersionId: variant.pageVersionId
			}))
		)
		.returning();
	return { experiment, hypothesis, variants };
}

export async function listExperimentsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(experiments)
		.where(eq(experiments.clientId, required.clientId))
		.orderBy(desc(experiments.createdAt));
}

export async function getExperimentForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(experiments)
		.where(and(eq(experiments.id, id), eq(experiments.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function updateExperimentStatusForTenant(
	ctx: TenantContext,
	id: string,
	status: ExperimentStatus
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(experiments)
		.set({ status, updatedAt: new Date() })
		.where(and(eq(experiments.id, id), eq(experiments.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function listExperimentHypothesesForTenant(
	ctx: TenantContext,
	experimentIds: string[]
) {
	const required = requireTenantContext(ctx);
	if (experimentIds.length === 0) return [];
	return db
		.select()
		.from(experimentHypotheses)
		.where(
			and(
				eq(experimentHypotheses.clientId, required.clientId),
				inArray(experimentHypotheses.experimentId, experimentIds)
			)
		);
}

export async function listExperimentVariantsForTenant(ctx: TenantContext, experimentIds: string[]) {
	const required = requireTenantContext(ctx);
	if (experimentIds.length === 0) return [];
	return db
		.select()
		.from(experimentVariants)
		.where(
			and(
				eq(experimentVariants.clientId, required.clientId),
				inArray(experimentVariants.experimentId, experimentIds)
			)
		);
}

export async function listOpenExperimentsForPageMetricForTenant(
	ctx: TenantContext,
	pageId: string,
	primaryMetric: ExperimentPrimaryMetric
) {
	const required = requireTenantContext(ctx);
	const rows = await db
		.select({
			id: experiments.id,
			status: experiments.status,
			pageId: experiments.pageId,
			primaryMetric: experiments.primaryMetric
		})
		.from(experiments)
		.where(
			and(
				eq(experiments.clientId, required.clientId),
				eq(experiments.pageId, pageId),
				eq(experiments.primaryMetric, primaryMetric)
			)
		);
	return rows.filter((row) => OPEN_STATUSES.includes(row.status));
}

export async function deleteExperimentsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const rows = await db
		.select({ id: experiments.id })
		.from(experiments)
		.where(eq(experiments.clientId, required.clientId));
	const ids = rows.map((row) => row.id);
	if (ids.length === 0) return;
	await db
		.delete(experimentVariants)
		.where(
			and(
				eq(experimentVariants.clientId, required.clientId),
				inArray(experimentVariants.experimentId, ids)
			)
		);
	await db
		.delete(experimentHypotheses)
		.where(
			and(
				eq(experimentHypotheses.clientId, required.clientId),
				inArray(experimentHypotheses.experimentId, ids)
			)
		);
	await db.delete(experiments).where(eq(experiments.clientId, required.clientId));
}
