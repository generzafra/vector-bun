import { and, eq } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { pageCandidateScores, visualDirections } from './schema';

export async function listVisualDirectionsForVersionForTenant(
	ctx: TenantContext,
	pageVersionId: string
) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			direction: visualDirections,
			score: pageCandidateScores
		})
		.from(visualDirections)
		.leftJoin(
			pageCandidateScores,
			and(
				eq(pageCandidateScores.visualDirectionId, visualDirections.id),
				eq(pageCandidateScores.clientId, required.clientId)
			)
		)
		.where(
			and(
				eq(visualDirections.clientId, required.clientId),
				eq(visualDirections.pageVersionId, pageVersionId)
			)
		)
		.orderBy(visualDirections.candidateIndex);
}

export async function insertVisualDirectionForTenant(
	ctx: TenantContext,
	input: {
		pageVersionId: string;
		candidateIndex: number;
		name: string;
		status: string;
		source: string;
		manifest: Record<string, unknown>;
		rationale: string;
		selectedAt?: Date | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(visualDirections)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			pageVersionId: input.pageVersionId,
			candidateIndex: input.candidateIndex,
			name: input.name,
			status: input.status,
			source: input.source,
			manifest: input.manifest,
			rationale: input.rationale,
			selectedAt: input.selectedAt ?? null
		})
		.returning();
	return row;
}

export async function insertCandidateScoreForTenant(
	ctx: TenantContext,
	input: {
		visualDirectionId: string;
		scoreTotal: number;
		dimensions: Record<string, number>;
		scoringVersion: number;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(pageCandidateScores)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			visualDirectionId: input.visualDirectionId,
			scoreTotal: input.scoreTotal,
			dimensions: input.dimensions,
			scoringVersion: input.scoringVersion
		})
		.returning();
	return row;
}
