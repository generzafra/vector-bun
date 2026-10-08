import { and, desc, eq } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { aiDecisions, recommendationEvidence } from './schema';

export async function listRecommendationEvidenceForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			id: recommendationEvidence.id,
			recommendationId: recommendationEvidence.recommendationId,
			evidenceType: recommendationEvidence.evidenceType,
			sourceReference: recommendationEvidence.sourceReference,
			metricName: recommendationEvidence.metricName,
			metricValue: recommendationEvidence.metricValue,
			comparisonValue: recommendationEvidence.comparisonValue,
			confidence: recommendationEvidence.confidence,
			description: recommendationEvidence.description,
			createdAt: recommendationEvidence.createdAt
		})
		.from(recommendationEvidence)
		.where(eq(recommendationEvidence.clientId, required.clientId))
		.orderBy(desc(recommendationEvidence.createdAt))
		.limit(200);
}

export async function insertRecommendationEvidenceForTenant(
	ctx: TenantContext,
	recommendationId: string,
	rows: Array<{
		evidenceType: string;
		sourceReference: string;
		metricName: string;
		metricValue?: string | null;
		comparisonValue?: string | null;
		confidence: number;
		description: string;
	}>
) {
	const required = requireTenantContext(ctx);
	const [decision] = await db
		.select({ id: aiDecisions.id })
		.from(aiDecisions)
		.where(and(eq(aiDecisions.id, recommendationId), eq(aiDecisions.clientId, required.clientId)))
		.limit(1);
	if (!decision) return { missingRecommendation: true as const, rows: [] };
	if (rows.length === 0) return { missingRecommendation: false as const, rows: [] };
	const inserted = await db
		.insert(recommendationEvidence)
		.values(
			rows.map((row) => ({
				organizationId: required.organizationId,
				clientId: required.clientId,
				recommendationId,
				evidenceType: row.evidenceType,
				sourceReference: row.sourceReference,
				metricName: row.metricName,
				metricValue: row.metricValue ?? null,
				comparisonValue: row.comparisonValue ?? null,
				confidence: row.confidence,
				description: row.description.slice(0, 400)
			}))
		)
		.returning({
			id: recommendationEvidence.id,
			recommendationId: recommendationEvidence.recommendationId,
			evidenceType: recommendationEvidence.evidenceType,
			metricName: recommendationEvidence.metricName
		});
	return { missingRecommendation: false as const, rows: inserted };
}
