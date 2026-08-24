import { requireCapability } from '@vector/auth';
import {
	ValidationError,
	assertActorOwnsContext,
	brandStyleIsProhibited,
	brandVisualClientIdSchema,
	brandVisualProfileConfirmed,
	confirmBrandVisualProfileSchema,
	draftBrandVisualFromIntake,
	parseContract,
	saveBrandVisualProfileSchema,
	type BrandVisualFields,
	type TenantContext
} from '@vector/contracts';
import {
	assertBrandVisualClient,
	confirmBrandVisualProfileForTenant,
	getBrandAssetForTenant,
	getBrandForTenant,
	getBrandVisualProfileForTenant,
	getLatestLogoAssetForTenant,
	listBrandAssetsForTenant,
	listBrandVisualVersionsForTenant,
	saveBrandVisualDraftForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

/** C1 reuses knowledge.read / knowledge.manage. Do not add creative.* until roles are migrated. */

const IDENTITY_PURPOSES = new Set(['logo', 'mark']);

export { brandStyleIsProhibited, brandVisualProfileConfirmed };

function publicFields(row: {
	primaryLogoAssetId: string | null;
	primaryColor: string | null;
	accentColor: string | null;
	primaryFont: string | null;
	visualPersonality: string;
	photographyDirection: string;
	prohibitedStyles: string[];
}): BrandVisualFields {
	return {
		primaryLogoAssetId: row.primaryLogoAssetId,
		primaryColor: row.primaryColor,
		accentColor: row.accentColor,
		primaryFont: row.primaryFont,
		visualPersonality: row.visualPersonality,
		photographyDirection: row.photographyDirection,
		prohibitedStyles: row.prohibitedStyles
	};
}

function publicProfile(row: {
	id: string;
	clientId: string;
	status: string;
	source: string;
	currentVersion: number;
	primaryLogoAssetId: string | null;
	primaryColor: string | null;
	accentColor: string | null;
	primaryFont: string | null;
	visualPersonality: string;
	photographyDirection: string;
	prohibitedStyles: string[];
	confirmedBy: string | null;
	confirmedAt: Date | null;
	createdAt: Date;
	updatedAt: Date;
}) {
	return {
		id: row.id,
		clientId: row.clientId,
		status: row.status,
		source: row.source,
		currentVersion: row.currentVersion,
		confirmed: brandVisualProfileConfirmed(row),
		confirmedAt: row.confirmedAt,
		...publicFields(row)
	};
}

function proposalReady(fields: BrandVisualFields) {
	return Boolean(
		fields.primaryColor &&
		fields.visualPersonality.trim() &&
		fields.photographyDirection.trim() &&
		fields.prohibitedStyles.length > 0
	);
}

async function resolveLogoAsset(ctx: TenantContext, assetId: string | null) {
	if (!assetId) return null;
	const asset = await getBrandAssetForTenant(ctx, assetId);
	if (!asset || !IDENTITY_PURPOSES.has(asset.purpose)) {
		throw new ValidationError('Choose a logo uploaded for this business');
	}
	return asset.id;
}

async function intakeDraft(ctx: TenantContext) {
	const [brand, logo] = await Promise.all([
		getBrandForTenant(ctx),
		getLatestLogoAssetForTenant(ctx)
	]);
	return draftBrandVisualFromIntake({
		brand: brand ? { brandPersonality: brand.brandPersonality, tokens: brand.tokens } : null,
		logoAssetId: logo?.id ?? null
	});
}

export async function getBrandVisualProfile(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'knowledge.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(brandVisualClientIdSchema, { clientId });
		assertBrandVisualClient(required, clientId);
	}
	const [stored, assets, draft] = await Promise.all([
		getBrandVisualProfileForTenant(required),
		listBrandAssetsForTenant(required),
		intakeDraft(required)
	]);
	const proposal = stored ? publicFields(stored) : publicFields(draft);
	return {
		profile: stored ? publicProfile(stored) : null,
		proposal,
		confirmed: brandVisualProfileConfirmed(stored),
		readyToConfirm: proposalReady(proposal),
		source: stored?.source ?? draft.source,
		logos: assets
			.filter((asset) => IDENTITY_PURPOSES.has(asset.purpose))
			.map((asset) => ({
				id: asset.id,
				purpose: asset.purpose,
				originalFilename: asset.originalFilename
			}))
	};
}

export async function saveBrandVisualProfile(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(saveBrandVisualProfileSchema, input);
	const logoId = await resolveLogoAsset(required, parsed.primaryLogoAssetId);
	const row = await saveBrandVisualDraftForTenant(required, {
		...parsed,
		primaryLogoAssetId: logoId,
		source: 'edited'
	});
	if (!row) throw new Error('brand visual profile write failed');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'brand_visual.profile.save',
		entityType: 'brand_visual_profile',
		entityId: row.id,
		requestId,
		reason: 'draft'
	});
	return publicProfile(row);
}

export async function confirmBrandVisualProfile(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(confirmBrandVisualProfileSchema, input);
	const logoId = await resolveLogoAsset(required, parsed.primaryLogoAssetId);
	const existing = await getBrandVisualProfileForTenant(required);
	const source = parsed.source ?? (existing?.source === 'edited' ? 'edited' : 'intake');
	const result = await confirmBrandVisualProfileForTenant(required, {
		...parsed,
		primaryLogoAssetId: logoId,
		source,
		confirmedBy: actor.userId
	});
	if (!result?.profile) throw new Error('brand visual profile confirm failed');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'brand_visual.profile.confirm',
		entityType: 'brand_visual_profile',
		entityId: result.profile.id,
		requestId,
		reason: `v${result.version.version}`
	});
	return {
		profile: publicProfile(result.profile),
		version: result.version.version
	};
}

export async function listBrandVisualVersions(actor: Actor, ctx: TenantContext) {
	requireCapability(actor.permissions, 'knowledge.read');
	const required = assertActorOwnsContext(actor, ctx);
	const rows = await listBrandVisualVersionsForTenant(required);
	return rows.map((row) => ({
		id: row.id,
		clientId: row.clientId,
		version: row.version,
		snapshot: row.snapshot,
		confirmedBy: row.confirmedBy,
		createdAt: row.createdAt
	}));
}

export async function requireConfirmedBrandVisualProfile(ctx: TenantContext) {
	const profile = await getBrandVisualProfileForTenant(ctx);
	if (!profile || !brandVisualProfileConfirmed(profile)) {
		throw new ValidationError('Brand look must be confirmed before First Reveal');
	}
	return publicProfile(profile);
}
