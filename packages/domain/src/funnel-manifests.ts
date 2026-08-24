import { consumeRateLimit, requireCapability } from '@vector/auth';
import {
	FUNNEL_ASSET_MANIFEST_SCHEMA_VERSION,
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	requireTenantContext,
	type CompositionKind,
	type TenantContext
} from '@vector/contracts';
import {
	assertFunnelManifestClient,
	getCreativeCompositionForTenant,
	getFunnelAssetManifestForVersionForTenant,
	getLatestDraftForTenant,
	getPublishedHomeForTenant,
	listLatestCreativeCompositionsForTenant,
	upsertFunnelAssetManifestForTenant
} from '@vector/db';
import { storageProvider } from '@vector/storage';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { publicComposition } from './compositions';

/** C5 authorizes funnel placement with pages.read / pages.manage. Raw object-store keys are not authorization. */

function publicSlots(
	row: {
		ogCompositionId: string | null;
		socialCompositionId: string | null;
		emailCompositionId: string | null;
	} | null
) {
	return {
		og: row?.ogCompositionId ? { compositionId: row.ogCompositionId } : null,
		social: row?.socialCompositionId ? { compositionId: row.socialCompositionId } : null,
		email: row?.emailCompositionId ? { compositionId: row.emailCompositionId } : null
	};
}

function publicManifest(input: {
	pageVersionId: string | null;
	schemaVersion: string | null;
	row: {
		ogCompositionId: string | null;
		socialCompositionId: string | null;
		emailCompositionId: string | null;
	} | null;
	placed: boolean;
	live: boolean;
}) {
	return {
		pageVersionId: input.pageVersionId,
		schemaVersion: input.schemaVersion,
		placed: input.placed,
		live: input.live,
		slots: publicSlots(input.row)
	};
}

export async function getFunnelAssetManifest(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'pages.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertFunnelManifestClient(required, clientId);
	const draft = await getLatestDraftForTenant(required);
	const published = await getPublishedHomeForTenant(required);
	const draftRow = draft
		? await getFunnelAssetManifestForVersionForTenant(required, draft.id)
		: null;
	const publishedRow = published
		? await getFunnelAssetManifestForVersionForTenant(required, published.version.id)
		: null;
	return publicManifest({
		pageVersionId: draft?.id ?? published?.version.id ?? null,
		schemaVersion: draftRow?.schemaVersion ?? publishedRow?.schemaVersion ?? null,
		row: draftRow ?? publishedRow,
		placed: Boolean(draftRow?.ogCompositionId),
		live: Boolean(publishedRow?.ogCompositionId)
	});
}

export async function hasPlacedOgImageForTenant(ctx: TenantContext) {
	const published = await getPublishedHomeForTenant(ctx);
	if (!published) return false;
	const row = await getFunnelAssetManifestForVersionForTenant(ctx, published.version.id);
	if (!row?.ogCompositionId) return false;
	const composition = await getCreativeCompositionForTenant(ctx, row.ogCompositionId);
	return composition?.kind === 'og';
}

export async function getDeliveryOgImageBytes(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const published = await getPublishedHomeForTenant(required);
	if (!published) throw new NotFoundError('Share card not found');
	const row = await getFunnelAssetManifestForVersionForTenant(required, published.version.id);
	if (!row?.ogCompositionId) throw new NotFoundError('Share card not found');
	const composition = await getCreativeCompositionForTenant(required, row.ogCompositionId);
	if (!composition || composition.kind !== 'og') {
		throw new NotFoundError('Share card not found');
	}
	const object = await storageProvider().getObject(required.clientId, composition.storageKey);
	return {
		composition: publicComposition(composition),
		bytes: object.bytes,
		mimeType: composition.mimeType
	};
}

export async function placeFunnelShareCards(actor: Actor, ctx: TenantContext, requestId: string) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`funnel-manifest:${required.clientId}`, 6, 60_000);
	const draft = await getLatestDraftForTenant(required);
	if (!draft) throw new ValidationError('Compose a funnel first');
	const rows = await listLatestCreativeCompositionsForTenant(required);
	const byKind = new Map(rows.map((row) => [row.kind as CompositionKind, row]));
	const og = byKind.get('og');
	if (!og) throw new ValidationError('Compose share cards first');
	const social = byKind.get('social') ?? null;
	const email = byKind.get('email') ?? null;
	const row = await upsertFunnelAssetManifestForTenant(required, {
		pageVersionId: draft.id,
		schemaVersion: FUNNEL_ASSET_MANIFEST_SCHEMA_VERSION,
		ogCompositionId: og.id,
		socialCompositionId: social?.id ?? null,
		emailCompositionId: email?.id ?? null,
		placedBy: actor.userId
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'pages.composition.place',
		entityType: 'funnel_asset_manifest',
		entityId: row.id,
		requestId
	});
	const published = await getPublishedHomeForTenant(required);
	const publishedRow = published
		? await getFunnelAssetManifestForVersionForTenant(required, published.version.id)
		: null;
	return publicManifest({
		pageVersionId: draft.id,
		schemaVersion: row.schemaVersion,
		row,
		placed: Boolean(row.ogCompositionId),
		live: Boolean(publishedRow?.ogCompositionId)
	});
}
