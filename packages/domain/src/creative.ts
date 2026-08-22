import { createHash } from 'node:crypto';
import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	confirmCreativeRightsSchema,
	creativeAssetIdSchema,
	parseContract,
	uploadCreativeAssetSchema,
	type TenantContext
} from '@vector/contracts';
import {
	assertCreativeClient,
	getCreativeAssetForTenant,
	getCreativeAssetRightsForTenant,
	getCreativeAssetVersionForTenant,
	insertCreativeAssetForTenant,
	listCreativeAssetsForTenant,
	updateCreativeAssetRightsForTenant,
	updateCreativeAssetStatusForTenant
} from '@vector/db';
import { buildStorageKey, inspectCreativeUpload, storageProvider } from '@vector/storage';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

const PUBLISHABLE_RIGHTS = new Set(['client_owned', 'client_approved']);

export function publicCreativeAsset(row: {
	id: string;
	title: string;
	kind: string;
	status: string;
	sourceType: string;
	currentVersion: number;
	createdAt: Date;
	updatedAt: Date;
}) {
	return {
		id: row.id,
		title: row.title,
		kind: row.kind,
		status: row.status,
		sourceType: row.sourceType,
		currentVersion: row.currentVersion,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

export async function listCreativeAssets(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'social.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertCreativeClient(required, clientId);
	const rows = await listCreativeAssetsForTenant(required);
	return rows.map(publicCreativeAsset);
}

export async function uploadCreativeAsset(
	actor: Actor,
	ctx: TenantContext,
	input: {
		title: unknown;
		kind?: unknown;
		filename: string;
		declaredType: string;
		bytes: Uint8Array;
	},
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(uploadCreativeAssetSchema, { title: input.title, kind: input.kind });
	const inspected = inspectCreativeUpload({
		filename: input.filename,
		declaredType: input.declaredType,
		bytes: input.bytes
	});
	const key = buildStorageKey(required.clientId, 'creative', parsed.kind, input.filename);
	const checksum = createHash('sha256').update(input.bytes).digest('hex');
	await storageProvider().putObject({
		clientId: required.clientId,
		key,
		bytes: input.bytes,
		contentType: inspected.mime
	});
	try {
		const created = await insertCreativeAssetForTenant(required, {
			title: parsed.title,
			kind: parsed.kind,
			storageKey: key,
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
			action: 'creative.asset.upload',
			entityType: 'creative_asset',
			entityId: created.asset.id,
			requestId,
			reason: parsed.kind
		});
		return {
			asset: publicCreativeAsset(created.asset),
			rights: {
				status: created.rights.rightsStatus,
				usageNotes: created.rights.usageNotes
			}
		};
	} catch (error) {
		await storageProvider().deleteObject(required.clientId, key);
		throw error;
	}
}

export async function getCreativeAssetBytes(actor: Actor, ctx: TenantContext, id: string) {
	requireCapability(actor.permissions, 'social.read');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(creativeAssetIdSchema, { id });
	const asset = await getCreativeAssetForTenant(required, parsed.id);
	if (!asset) throw new NotFoundError('Creative asset not found');
	const version = await getCreativeAssetVersionForTenant(required, asset.id, asset.currentVersion);
	if (!version) throw new NotFoundError('Creative asset version not found');
	const object = await storageProvider().getObject(required.clientId, version.storageKey);
	return {
		asset: publicCreativeAsset(asset),
		bytes: object.bytes,
		mimeType: version.mimeType
	};
}

export async function confirmCreativeRights(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(confirmCreativeRightsSchema, input);
	const asset = await getCreativeAssetForTenant(required, parsed.id);
	if (!asset) throw new NotFoundError('Creative asset not found');
	const rights = await updateCreativeAssetRightsForTenant(required, asset.id, {
		rightsStatus: parsed.rightsStatus,
		usageNotes: parsed.usageNotes,
		confirmedBy: actor.userId
	});
	if (!rights) throw new NotFoundError('Creative rights not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'creative.asset.rights',
		entityType: 'creative_asset',
		entityId: asset.id,
		requestId,
		reason: parsed.rightsStatus
	});
	return { asset: publicCreativeAsset(asset), rights };
}

export async function approveCreativeAsset(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(creativeAssetIdSchema, input);
	const asset = await getCreativeAssetForTenant(required, parsed.id);
	if (!asset) throw new NotFoundError('Creative asset not found');
	const rights = await getCreativeAssetRightsForTenant(required, asset.id);
	if (!rights || !PUBLISHABLE_RIGHTS.has(rights.rightsStatus)) {
		throw new ValidationError('Creative rights must be confirmed before approval');
	}
	const updated = await updateCreativeAssetStatusForTenant(required, asset.id, 'approved');
	if (!updated) throw new NotFoundError('Creative asset not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'creative.asset.approve',
		entityType: 'creative_asset',
		entityId: asset.id,
		requestId
	});
	return publicCreativeAsset(updated);
}

export async function resolveAttachableCreativeAsset(ctx: TenantContext, assetId: string) {
	const asset = await getCreativeAssetForTenant(ctx, assetId);
	if (!asset) throw new NotFoundError('Creative asset not found');
	if (asset.status !== 'approved') {
		throw new ValidationError('Only approved creative assets can be attached');
	}
	const rights = await getCreativeAssetRightsForTenant(ctx, asset.id);
	if (!rights || !PUBLISHABLE_RIGHTS.has(rights.rightsStatus)) {
		throw new ValidationError('Creative rights are not confirmed for this asset');
	}
	const version = await getCreativeAssetVersionForTenant(ctx, asset.id, asset.currentVersion);
	if (!version) throw new NotFoundError('Creative asset version not found');
	return { asset, version, rights };
}
