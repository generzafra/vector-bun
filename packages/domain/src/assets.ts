import { createHash } from 'node:crypto';
import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	assertActorOwnsContext,
	brandAssetIdSchema,
	parseContract,
	uploadBrandAssetSchema,
	type TenantContext
} from '@vector/contracts';
import {
	assertAssetClient,
	deleteBrandAssetForTenant,
	getBrandAssetForTenant,
	insertBrandAssetForTenant,
	listBrandAssetsForTenant
} from '@vector/db';
import { buildStorageKey, inspectUpload, storageProvider } from '@vector/storage';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { consumeTenantUsage } from './scale';

export async function listBrandAssets(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'knowledge.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertAssetClient(required, clientId);
	return listBrandAssetsForTenant(required);
}

export async function uploadBrandAsset(
	actor: Actor,
	ctx: TenantContext,
	input: { purpose: unknown; filename: string; declaredType: string; bytes: Uint8Array },
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(uploadBrandAssetSchema, { purpose: input.purpose });
	const inspected = inspectUpload({
		filename: input.filename,
		declaredType: input.declaredType,
		bytes: input.bytes
	});
	const key = buildStorageKey(required.clientId, 'brand', parsed.purpose, input.filename);
	const checksum = createHash('sha256').update(input.bytes).digest('hex');
	await consumeTenantUsage(
		{ ...required, requestId },
		{ resourceFamily: 'upload', actorId: actor.userId }
	);
	await storageProvider().putObject({
		clientId: required.clientId,
		key,
		bytes: input.bytes,
		contentType: inspected.mime
	});
	try {
		const row = await insertBrandAssetForTenant(required, {
			storageKey: key,
			purpose: parsed.purpose,
			originalFilename: input.filename.slice(0, 180),
			mimeType: inspected.mime,
			sizeBytes: inspected.sizeBytes,
			checksum,
			createdBy: actor.userId
		});
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'human',
			actorId: actor.userId,
			action: 'knowledge.asset.upload',
			entityType: 'brand_asset',
			entityId: row.id,
			requestId,
			reason: parsed.purpose
		});
		return row;
	} catch (error) {
		await storageProvider().deleteObject(required.clientId, key);
		throw error;
	}
}

export async function getBrandAssetBytes(actor: Actor, ctx: TenantContext, id: string) {
	requireCapability(actor.permissions, 'knowledge.read');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(brandAssetIdSchema, { id });
	const row = await getBrandAssetForTenant(required, parsed.id);
	if (!row) throw new NotFoundError('Asset not found');
	const object = await storageProvider().getObject(required.clientId, row.storageKey);
	return {
		asset: row,
		bytes: object.bytes,
		mimeType: row.mimeType
	};
}

export async function removeBrandAsset(
	actor: Actor,
	ctx: TenantContext,
	id: string,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(brandAssetIdSchema, { id });
	const row = await getBrandAssetForTenant(required, parsed.id);
	if (!row) throw new NotFoundError('Asset not found');
	await storageProvider().deleteObject(required.clientId, row.storageKey);
	const deleted = await deleteBrandAssetForTenant(required, row.id);
	if (!deleted) throw new NotFoundError('Asset not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'knowledge.asset.delete',
		entityType: 'brand_asset',
		entityId: row.id,
		requestId
	});
	return deleted;
}
