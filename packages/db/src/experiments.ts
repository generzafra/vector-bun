import { and, desc, eq, inArray, sql } from 'drizzle-orm';
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
import {
	analyticsEvents,
	analyticsSessions,
	experimentAssignments,
	experimentHypotheses,
	experimentMetrics,
	experimentResults,
	experimentVariants,
	experiments,
	visitors,
	type ExperimentMetricCounts,
	type ExperimentSourceShare
} from './schema';

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
	const metrics = await db
		.insert(experimentMetrics)
		.values([
			{
				organizationId: required.organizationId,
				clientId: required.clientId,
				experimentId: experiment.id,
				kind: 'primary' as const,
				eventName: input.primaryMetric
			},
			...input.guardrailMetrics.map((eventName) => ({
				organizationId: required.organizationId,
				clientId: required.clientId,
				experimentId: experiment.id,
				kind: 'guardrail' as const,
				eventName
			}))
		])
		.returning();
	return { experiment, hypothesis, variants, metrics };
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
	input: { status: ExperimentStatus; launchedAt?: Date }
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(experiments)
		.set({
			status: input.status,
			...(input.launchedAt ? { launchedAt: input.launchedAt } : {}),
			updatedAt: new Date()
		})
		.where(and(eq(experiments.id, id), eq(experiments.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function getRunningExperimentForPageForTenant(ctx: TenantContext, pageId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({
			id: experiments.id,
			pageId: experiments.pageId,
			status: experiments.status,
			launchedAt: experiments.launchedAt
		})
		.from(experiments)
		.where(
			and(
				eq(experiments.clientId, required.clientId),
				eq(experiments.pageId, pageId),
				eq(experiments.status, 'running')
			)
		)
		.limit(1);
	return row ?? null;
}

export async function listRunningExperimentsForPageForTenant(ctx: TenantContext, pageId: string) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			id: experiments.id,
			status: experiments.status
		})
		.from(experiments)
		.where(
			and(
				eq(experiments.clientId, required.clientId),
				eq(experiments.pageId, pageId),
				eq(experiments.status, 'running')
			)
		);
}

export async function getExperimentAssignmentForVisitorForTenant(
	ctx: TenantContext,
	experimentId: string,
	visitorAnonymousId: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(experimentAssignments)
		.where(
			and(
				eq(experimentAssignments.clientId, required.clientId),
				eq(experimentAssignments.experimentId, experimentId),
				eq(experimentAssignments.visitorAnonymousId, visitorAnonymousId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function insertExperimentAssignmentForTenant(
	ctx: TenantContext,
	input: {
		experimentId: string;
		visitorAnonymousId: string;
		variantId: string;
		variantKey: string;
		pageVersionId: string;
		isTest: boolean;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(experimentAssignments)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			experimentId: input.experimentId,
			visitorAnonymousId: input.visitorAnonymousId,
			variantId: input.variantId,
			variantKey: input.variantKey,
			pageVersionId: input.pageVersionId,
			isTest: input.isTest
		})
		.returning();
	return row;
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

export async function listExperimentMetricsForTenant(ctx: TenantContext, experimentIds: string[]) {
	const required = requireTenantContext(ctx);
	if (experimentIds.length === 0) return [];
	return db
		.select({
			id: experimentMetrics.id,
			experimentId: experimentMetrics.experimentId,
			kind: experimentMetrics.kind,
			eventName: experimentMetrics.eventName
		})
		.from(experimentMetrics)
		.where(
			and(
				eq(experimentMetrics.clientId, required.clientId),
				inArray(experimentMetrics.experimentId, experimentIds)
			)
		);
}

export async function listExperimentAssignmentsForExperimentsForTenant(
	ctx: TenantContext,
	experimentIds: string[]
) {
	const required = requireTenantContext(ctx);
	if (experimentIds.length === 0) return [];
	return db
		.select({
			experimentId: experimentAssignments.experimentId,
			visitorAnonymousId: experimentAssignments.visitorAnonymousId,
			variantKey: experimentAssignments.variantKey,
			isTest: experimentAssignments.isTest
		})
		.from(experimentAssignments)
		.where(
			and(
				eq(experimentAssignments.clientId, required.clientId),
				inArray(experimentAssignments.experimentId, experimentIds)
			)
		);
}

export async function listVisitorAnalyticsEventsForMeasurementForTenant(
	ctx: TenantContext,
	experimentIds: string[],
	visitorAnonymousIds: string[]
) {
	const required = requireTenantContext(ctx);
	if (experimentIds.length === 0 || visitorAnonymousIds.length === 0) return [];
	return db
		.select({
			name: analyticsEvents.name,
			isTest: analyticsEvents.isTest,
			experimentId: sql<string>`${analyticsEvents.properties}->>'experimentId'`,
			experimentVariant: sql<string | null>`${analyticsEvents.properties}->>'experimentVariant'`,
			userAgent: sql<string | null>`${analyticsEvents.properties}->>'userAgent'`,
			visitorAnonymousId: visitors.anonymousId,
			utmSource: analyticsSessions.utmSource
		})
		.from(analyticsEvents)
		.innerJoin(
			visitors,
			and(eq(visitors.id, analyticsEvents.visitorId), eq(visitors.clientId, required.clientId))
		)
		.leftJoin(
			analyticsSessions,
			and(
				eq(analyticsSessions.id, analyticsEvents.sessionId),
				eq(analyticsSessions.clientId, required.clientId)
			)
		)
		.where(
			and(
				eq(analyticsEvents.clientId, required.clientId),
				inArray(visitors.anonymousId, visitorAnonymousIds),
				inArray(sql`${analyticsEvents.properties}->>'experimentId'`, experimentIds)
			)
		);
}

export async function insertExperimentResultForTenant(
	ctx: TenantContext,
	input: {
		experimentId: string;
		horizonMet: boolean;
		sampleMet: boolean;
		botContamination: boolean;
		sourceImbalance: boolean;
		earlyStopBlocked: boolean;
		decisionReady: boolean;
		botShareBps: number;
		controlSample: number;
		challengerSample: number;
		controlPrimaryCount: number;
		challengerPrimaryCount: number;
		reasons: string[];
		metricCounts: ExperimentMetricCounts;
		sourceShares: ExperimentSourceShare[];
		computedAt: Date;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(experimentResults)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			experimentId: input.experimentId,
			horizonMet: input.horizonMet,
			sampleMet: input.sampleMet,
			botContamination: input.botContamination,
			sourceImbalance: input.sourceImbalance,
			earlyStopBlocked: input.earlyStopBlocked,
			decisionReady: input.decisionReady,
			botShareBps: input.botShareBps,
			controlSample: input.controlSample,
			challengerSample: input.challengerSample,
			controlPrimaryCount: input.controlPrimaryCount,
			challengerPrimaryCount: input.challengerPrimaryCount,
			reasons: input.reasons,
			metricCounts: input.metricCounts,
			sourceShares: input.sourceShares,
			computedAt: input.computedAt
		})
		.returning({
			id: experimentResults.id,
			experimentId: experimentResults.experimentId,
			decisionReady: experimentResults.decisionReady,
			earlyStopBlocked: experimentResults.earlyStopBlocked,
			clientId: experimentResults.clientId
		});
	return row;
}

export async function listLatestExperimentResultsForTenant(
	ctx: TenantContext,
	experimentIds: string[]
) {
	const required = requireTenantContext(ctx);
	if (experimentIds.length === 0) return [];
	return db
		.select({
			id: experimentResults.id,
			experimentId: experimentResults.experimentId,
			decisionReady: experimentResults.decisionReady,
			earlyStopBlocked: experimentResults.earlyStopBlocked,
			computedAt: experimentResults.computedAt
		})
		.from(experimentResults)
		.where(
			and(
				eq(experimentResults.clientId, required.clientId),
				inArray(experimentResults.experimentId, experimentIds)
			)
		)
		.orderBy(desc(experimentResults.computedAt));
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
		.delete(experimentResults)
		.where(
			and(
				eq(experimentResults.clientId, required.clientId),
				inArray(experimentResults.experimentId, ids)
			)
		);
	await db
		.delete(experimentAssignments)
		.where(
			and(
				eq(experimentAssignments.clientId, required.clientId),
				inArray(experimentAssignments.experimentId, ids)
			)
		);
	await db
		.delete(experimentMetrics)
		.where(
			and(
				eq(experimentMetrics.clientId, required.clientId),
				inArray(experimentMetrics.experimentId, ids)
			)
		);
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
