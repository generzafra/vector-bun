import { and, eq } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { assetSufficiencySnapshots, type AssetSufficiencyDimensionScores } from './schema';

export async function getAssetSufficiencyForVersionForTenant(
	ctx: TenantContext,
	pageVersionId: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(assetSufficiencySnapshots)
		.where(
			and(
				eq(assetSufficiencySnapshots.clientId, required.clientId),
				eq(assetSufficiencySnapshots.pageVersionId, pageVersionId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function upsertAssetSufficiencySnapshotForTenant(
	ctx: TenantContext,
	input: {
		pageVersionId: string;
		dimensions: AssetSufficiencyDimensionScores;
		overallScore: number;
		mediaStrategy: string;
		industryVisualDependency: string;
		profileConfirmed: boolean;
		logoAssetId: string | null;
		summaryClient: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(assetSufficiencySnapshots)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			pageVersionId: input.pageVersionId,
			dimensions: input.dimensions,
			overallScore: input.overallScore,
			mediaStrategy: input.mediaStrategy,
			industryVisualDependency: input.industryVisualDependency,
			profileConfirmed: input.profileConfirmed,
			logoAssetId: input.logoAssetId,
			summaryClient: input.summaryClient
		})
		.onConflictDoUpdate({
			target: [assetSufficiencySnapshots.clientId, assetSufficiencySnapshots.pageVersionId],
			set: {
				dimensions: input.dimensions,
				overallScore: input.overallScore,
				mediaStrategy: input.mediaStrategy,
				industryVisualDependency: input.industryVisualDependency,
				profileConfirmed: input.profileConfirmed,
				logoAssetId: input.logoAssetId,
				summaryClient: input.summaryClient,
				updatedAt: new Date()
			}
		})
		.returning();
	return row;
}
