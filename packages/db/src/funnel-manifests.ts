import { and, eq } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { funnelAssetManifests } from './schema';

export function assertFunnelManifestClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function getFunnelAssetManifestForVersionForTenant(
	ctx: TenantContext,
	pageVersionId: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(funnelAssetManifests)
		.where(
			and(
				eq(funnelAssetManifests.clientId, required.clientId),
				eq(funnelAssetManifests.pageVersionId, pageVersionId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function upsertFunnelAssetManifestForTenant(
	ctx: TenantContext,
	input: {
		pageVersionId: string;
		schemaVersion: string;
		ogCompositionId: string | null;
		socialCompositionId: string | null;
		emailCompositionId: string | null;
		placedBy?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const placedAt = new Date();
	const [row] = await db
		.insert(funnelAssetManifests)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			pageVersionId: input.pageVersionId,
			schemaVersion: input.schemaVersion,
			ogCompositionId: input.ogCompositionId,
			socialCompositionId: input.socialCompositionId,
			emailCompositionId: input.emailCompositionId,
			placedAt,
			placedBy: input.placedBy ?? null
		})
		.onConflictDoUpdate({
			target: [funnelAssetManifests.clientId, funnelAssetManifests.pageVersionId],
			set: {
				schemaVersion: input.schemaVersion,
				ogCompositionId: input.ogCompositionId,
				socialCompositionId: input.socialCompositionId,
				emailCompositionId: input.emailCompositionId,
				placedAt,
				placedBy: input.placedBy ?? null,
				updatedAt: placedAt
			}
		})
		.returning();
	return row;
}
