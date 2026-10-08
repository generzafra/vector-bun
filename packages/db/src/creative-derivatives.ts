import { and, eq } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { creativeDerivatives } from './schema';

export async function listCreativeDerivativesForTenant(ctx: TenantContext, pageVersionId: string) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(creativeDerivatives)
		.where(
			and(
				eq(creativeDerivatives.clientId, required.clientId),
				eq(creativeDerivatives.pageVersionId, pageVersionId)
			)
		);
}

export async function clearCreativeDerivativesForTenant(ctx: TenantContext, pageVersionId: string) {
	const required = requireTenantContext(ctx);
	await db
		.delete(creativeDerivatives)
		.where(
			and(
				eq(creativeDerivatives.clientId, required.clientId),
				eq(creativeDerivatives.pageVersionId, pageVersionId)
			)
		);
}

export async function replaceCreativeDerivativesForTenant(
	ctx: TenantContext,
	pageVersionId: string,
	rows: Array<{
		sourceAssetId: string;
		slot: 'hero';
		widthPx: number;
		focalX: number;
		focalY: number;
		altText: string;
		status: 'planned';
	}>
) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		await tx
			.delete(creativeDerivatives)
			.where(
				and(
					eq(creativeDerivatives.clientId, required.clientId),
					eq(creativeDerivatives.pageVersionId, pageVersionId)
				)
			);
		if (rows.length === 0) return [];
		return tx
			.insert(creativeDerivatives)
			.values(
				rows.map((row) => ({
					organizationId: required.organizationId,
					clientId: required.clientId,
					pageVersionId,
					sourceAssetId: row.sourceAssetId,
					slot: row.slot,
					widthPx: row.widthPx,
					focalX: row.focalX,
					focalY: row.focalY,
					altText: row.altText,
					status: row.status
				}))
			)
			.returning();
	});
}
