import { and, desc, eq } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { creativeAssetRights, creativeAssetVersions, creativeAssets } from './schema';

export function assertCreativeClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function listCreativeAssetsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(creativeAssets)
		.where(eq(creativeAssets.clientId, required.clientId))
		.orderBy(desc(creativeAssets.createdAt));
}

export async function getCreativeAssetForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(creativeAssets)
		.where(and(eq(creativeAssets.id, id), eq(creativeAssets.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function getCreativeAssetVersionByIdForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(creativeAssetVersions)
		.where(
			and(eq(creativeAssetVersions.id, id), eq(creativeAssetVersions.clientId, required.clientId))
		)
		.limit(1);
	return row ?? null;
}

export async function getCreativeAssetVersionForTenant(
	ctx: TenantContext,
	assetId: string,
	version: number
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(creativeAssetVersions)
		.where(
			and(
				eq(creativeAssetVersions.assetId, assetId),
				eq(creativeAssetVersions.version, version),
				eq(creativeAssetVersions.clientId, required.clientId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function getCreativeAssetRightsForTenant(ctx: TenantContext, assetId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(creativeAssetRights)
		.where(
			and(
				eq(creativeAssetRights.assetId, assetId),
				eq(creativeAssetRights.clientId, required.clientId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function insertCreativeAssetForTenant(
	ctx: TenantContext,
	input: {
		title: string;
		kind: 'image' | 'graphic' | 'other';
		storageKey: string;
		originalFilename: string;
		mimeType: string;
		sizeBytes: number;
		checksum: string;
		createdBy?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		const [asset] = await tx
			.insert(creativeAssets)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				title: input.title,
				kind: input.kind,
				status: 'draft',
				sourceType: 'operator_upload',
				currentVersion: 1,
				createdBy: input.createdBy ?? null
			})
			.returning();
		const [version] = await tx
			.insert(creativeAssetVersions)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				assetId: asset.id,
				version: 1,
				storageKey: input.storageKey,
				originalFilename: input.originalFilename,
				mimeType: input.mimeType,
				sizeBytes: input.sizeBytes,
				checksum: input.checksum,
				createdBy: input.createdBy ?? null
			})
			.returning();
		const [rights] = await tx
			.insert(creativeAssetRights)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				assetId: asset.id,
				rightsStatus: 'unknown'
			})
			.returning();
		return { asset, version, rights };
	});
}

export async function updateCreativeAssetStatusForTenant(
	ctx: TenantContext,
	id: string,
	status: 'draft' | 'approved' | 'archived'
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(creativeAssets)
		.set({ status, updatedAt: new Date() })
		.where(and(eq(creativeAssets.id, id), eq(creativeAssets.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function updateCreativeAssetRightsForTenant(
	ctx: TenantContext,
	assetId: string,
	input: {
		rightsStatus: 'unknown' | 'client_owned' | 'client_approved' | 'restricted' | 'prohibited';
		usageNotes?: string | null;
		confirmedBy?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const confirmed =
		input.rightsStatus === 'client_owned' || input.rightsStatus === 'client_approved';
	const [row] = await db
		.update(creativeAssetRights)
		.set({
			rightsStatus: input.rightsStatus,
			usageNotes: input.usageNotes ?? null,
			confirmedBy: confirmed ? (input.confirmedBy ?? null) : null,
			confirmedAt: confirmed ? new Date() : null,
			updatedAt: new Date()
		})
		.where(
			and(
				eq(creativeAssetRights.assetId, assetId),
				eq(creativeAssetRights.clientId, required.clientId)
			)
		)
		.returning();
	return row ?? null;
}
