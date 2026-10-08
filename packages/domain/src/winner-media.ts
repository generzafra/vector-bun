import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	parseAssetMediaStrategy,
	requireTenantContext,
	type TenantContext
} from '@vector/contracts';
import {
	attachImageJobDirectionForTenant,
	clearCreativeDerivativesForTenant,
	getAssetSufficiencyForVersionForTenant,
	getBrandForTenant,
	getBrandVisualProfileForTenant,
	getCreativeAssetForTenant,
	getCreativeAssetRightsForTenant,
	getCreativeAssetVersionForTenant,
	getLatestDraftForTenant,
	getPublishedHomeForTenant,
	listCreativeDerivativesForTenant,
	listImageJobsForDirectionForTenant,
	listVisualDirectionsForVersionForTenant,
	replaceCreativeDerivativesForTenant,
	updatePageVersionDocumentForTenant
} from '@vector/db';
import {
	parsePageDocument,
	placeWinnerMedia,
	responsiveDerivativePlan,
	winnerAssetGaps
} from '@vector/funnel-engine';
import { storageProvider } from '@vector/storage';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { hasBrandLogoForTenant } from './assets';
import { draftSupportingImage } from './images';

const PUBLISHABLE_RIGHTS = new Set(['client_owned', 'client_approved']);

/** FR6 spends one ImageProvider job on the selected direction. Other directions stay cheap. */

function winnerBrief(displayName: string, photography: string) {
	const place = photography.trim() || 'the real workplace';
	return `Supporting photograph for ${displayName}. ${place}. Natural light, no lettering.`;
}

export async function completeWinnerMedia(actor: Actor, ctx: TenantContext, requestId: string) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const draft = await getLatestDraftForTenant(required);
	if (!draft) throw new NotFoundError('Draft funnel not found');
	const directions = await listVisualDirectionsForVersionForTenant(required, draft.id);
	const selected = directions.find((row) => row.direction.status === 'selected');
	if (!selected) throw new ValidationError('Compose a funnel before adding a photo');
	const sufficiency = await getAssetSufficiencyForVersionForTenant(required, draft.id);
	const strategy = sufficiency?.mediaStrategy ?? 'typography_led';
	if (strategy !== 'hybrid') {
		return {
			generated: false as const,
			reason: strategy === 'authentic' ? 'authentic' : 'typography',
			directionName: selected.direction.name,
			job: null
		};
	}
	const brand = await getBrandForTenant(required);
	const profile = await getBrandVisualProfileForTenant(required);
	const brief = winnerBrief(
		brand?.displayName?.trim() || 'this business',
		profile?.photographyDirection ?? ''
	);
	const idempotencyKey = `fr6-${selected.direction.id}`;
	const drafted = await draftSupportingImage(
		actor,
		required,
		{
			title: `${selected.direction.name} photo`,
			brief,
			purpose: 'supporting',
			aspectRatio: '16:9',
			idempotencyKey
		},
		requestId
	);
	await attachImageJobDirectionForTenant(required, drafted.job.id, selected.direction.id);
	const linked = await listImageJobsForDirectionForTenant(required, selected.direction.id);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'pages.winner_media.complete',
		entityType: 'visual_direction',
		entityId: selected.direction.id,
		requestId
	});
	return {
		generated: true as const,
		reason: 'hybrid' as const,
		directionName: selected.direction.name,
		job: drafted.job,
		replayed: drafted.replayed,
		jobCount: linked.length
	};
}

function focalPoint(value: number | undefined, fallback: number) {
	if (value === undefined) return fallback;
	if (!Number.isInteger(value) || value < 0 || value > 10000) {
		throw new ValidationError('Focal point must be an integer from 0 to 10000');
	}
	return value;
}

export async function placeWinnerPhotography(
	actor: Actor,
	ctx: TenantContext,
	input: {
		assetId?: string | null;
		generationBlocked?: boolean;
		focalX?: number;
		focalY?: number;
	},
	requestId: string
) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const draft = await getLatestDraftForTenant(required);
	if (!draft) throw new NotFoundError('Draft funnel not found');
	const sufficiency = await getAssetSufficiencyForVersionForTenant(required, draft.id);
	const strategy = parseAssetMediaStrategy(sufficiency?.mediaStrategy ?? 'typography_led');
	const focalX = focalPoint(input.focalX, 5000);
	const focalY = focalPoint(input.focalY, 5000);
	const asset = input.assetId ? await getCreativeAssetForTenant(required, input.assetId) : null;
	const rights = asset ? await getCreativeAssetRightsForTenant(required, asset.id) : null;
	const publishable = Boolean(
		asset &&
		asset.kind === 'image' &&
		asset.status === 'approved' &&
		rights &&
		PUBLISHABLE_RIGHTS.has(rights.rightsStatus)
	);
	const alt = asset?.title.trim() ?? '';
	const canPlace = publishable && alt.length > 0;
	const document = placeWinnerMedia(
		parsePageDocument(draft.document),
		canPlace && asset
			? { kind: 'place', assetId: asset.id, alt, focalX, focalY }
			: { kind: 'typography' }
	);
	const updated = await updatePageVersionDocumentForTenant(required, draft.id, document);
	if (!updated) throw new NotFoundError('Draft funnel not found');
	const derivatives =
		canPlace && asset
			? await replaceCreativeDerivativesForTenant(
					required,
					draft.id,
					responsiveDerivativePlan({ focalX, focalY, alt }).map((row) => ({
						sourceAssetId: asset.id,
						slot: row.slot,
						widthPx: row.widthPx,
						focalX: row.focalX,
						focalY: row.focalY,
						altText: row.alt,
						status: row.status
					}))
				)
			: [];
	if (!canPlace) await clearCreativeDerivativesForTenant(required, draft.id);
	const gaps = winnerAssetGaps({
		mediaStrategy: strategy,
		hasLogo: await hasBrandLogoForTenant(required),
		approvedHeroAssetId: canPlace && asset ? asset.id : null,
		generationBlocked: input.generationBlocked === true
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'pages.winner_media.place',
		entityType: 'page_version',
		entityId: draft.id,
		requestId,
		reason: canPlace ? 'placed' : 'typography'
	});
	return {
		placed: canPlace,
		reason: canPlace ? ('approved_photo' as const) : ('typography' as const),
		gaps,
		derivatives,
		document
	};
}

export async function winnerDerivativesForTenant(ctx: TenantContext, pageVersionId: string) {
	return listCreativeDerivativesForTenant(ctx, pageVersionId);
}

export async function getDeliveryHeroImageBytes(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const published = await getPublishedHomeForTenant(required);
	if (!published) throw new NotFoundError('Hero image not found');
	const document = parsePageDocument(published.version.document);
	const hero = document.sections.find(
		(section) =>
			(section.type === 'hero-minimal' ||
				section.type === 'hero-split' ||
				section.type === 'hero-editorial') &&
			section.mediaAssetId
	);
	if (!hero || !('mediaAssetId' in hero) || !hero.mediaAssetId) {
		throw new NotFoundError('Hero image not found');
	}
	const asset = await getCreativeAssetForTenant(required, hero.mediaAssetId);
	if (!asset || asset.kind !== 'image' || asset.status !== 'approved') {
		throw new NotFoundError('Hero image not found');
	}
	const rights = await getCreativeAssetRightsForTenant(required, asset.id);
	if (!rights || !PUBLISHABLE_RIGHTS.has(rights.rightsStatus)) {
		throw new NotFoundError('Hero image not found');
	}
	const version = await getCreativeAssetVersionForTenant(required, asset.id, asset.currentVersion);
	if (!version) throw new NotFoundError('Hero image not found');
	const object = await storageProvider().getObject(required.clientId, version.storageKey);
	return { bytes: object.bytes, mimeType: version.mimeType };
}

export async function winnerMediaDirectionIds(ctx: TenantContext) {
	const draft = await getLatestDraftForTenant(ctx);
	if (!draft) return [];
	const directions = await listVisualDirectionsForVersionForTenant(ctx, draft.id);
	const ids = [];
	for (const row of directions) {
		const jobs = await listImageJobsForDirectionForTenant(ctx, row.direction.id);
		if (jobs.length > 0) ids.push(row.direction.id);
	}
	return ids;
}
