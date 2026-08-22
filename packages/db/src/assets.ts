import { and, desc, eq } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { brandAssets } from './schema';

export function assertAssetClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function listBrandAssetsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(brandAssets)
		.where(eq(brandAssets.clientId, required.clientId))
		.orderBy(desc(brandAssets.createdAt));
}

export async function getBrandAssetForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(brandAssets)
		.where(and(eq(brandAssets.id, id), eq(brandAssets.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function insertBrandAssetForTenant(
	ctx: TenantContext,
	input: {
		storageKey: string;
		purpose: 'logo' | 'mark' | 'og' | 'favicon' | 'other';
		originalFilename: string;
		mimeType: string;
		sizeBytes: number;
		checksum: string;
		createdBy?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(brandAssets)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			storageKey: input.storageKey,
			purpose: input.purpose,
			originalFilename: input.originalFilename,
			mimeType: input.mimeType,
			sizeBytes: input.sizeBytes,
			checksum: input.checksum,
			createdBy: input.createdBy ?? null
		})
		.returning();
	return row;
}

export async function deleteBrandAssetForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.delete(brandAssets)
		.where(and(eq(brandAssets.id, id), eq(brandAssets.clientId, required.clientId)))
		.returning();
	return row ?? null;
}
