import { consumeRateLimit, requireCapability } from '@vector/auth';
import { composeShell } from '@vector/compose';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	buildCompositionCopy,
	COMPOSITION_KINDS,
	COMPOSITION_SCHEMA_VERSION,
	compositionIdSchema,
	compositionKindLabel,
	compositionSvgHitsProhibitedStyle,
	parseContract,
	resolveCompositionTokens,
	resolvedProhibitedStyles,
	type CompositionKind,
	type TenantContext
} from '@vector/contracts';
import {
	assertCompositionClient,
	getBrandForTenant,
	getBrandVisualProfileForTenant,
	getCreativeCompositionForTenant,
	insertCreativeCompositionForTenant,
	listLatestCreativeCompositionsForTenant,
	nextCompositionVersionForTenant
} from '@vector/db';
import { buildStorageKey, inspectComposedSvg, storageProvider } from '@vector/storage';
import { recordAudit } from './audit';
import { resolveBrandLogoForTenant } from './assets';
import type { Actor } from './auth-service';
import { consumeTenantUsage } from './scale';

/** C3 authorizes share/email cards with pages.read / pages.manage. Logos and copy stay off image models. */

function publicComposition(row: {
	id: string;
	kind: string;
	version: number;
	status: string;
	headline: string;
	hasLogo: boolean;
	width: number;
	height: number;
	createdAt: Date;
}) {
	const kind = row.kind as CompositionKind;
	return {
		id: row.id,
		kind,
		label: compositionKindLabel(kind),
		version: row.version,
		status: row.status,
		headline: row.headline,
		hasLogo: row.hasLogo,
		width: row.width,
		height: row.height,
		createdAt: row.createdAt
	};
}

export async function listCreativeCompositions(
	actor: Actor,
	ctx: TenantContext,
	clientId?: string
) {
	requireCapability(actor.permissions, 'pages.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertCompositionClient(required, clientId);
	const rows = await listLatestCreativeCompositionsForTenant(required);
	return rows.map(publicComposition);
}

export async function getCreativeCompositionBytes(actor: Actor, ctx: TenantContext, id: string) {
	requireCapability(actor.permissions, 'pages.read');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(compositionIdSchema, { id });
	const row = await getCreativeCompositionForTenant(required, parsed.id);
	if (!row) throw new NotFoundError('Composition not found');
	const object = await storageProvider().getObject(required.clientId, row.storageKey);
	return {
		composition: publicComposition(row),
		bytes: object.bytes,
		mimeType: row.mimeType
	};
}

export async function composeCreativeShells(actor: Actor, ctx: TenantContext, requestId: string) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`composition:${required.clientId}`, 6, 60_000);
	const brand = await getBrandForTenant(required);
	if (!brand) throw new ValidationError('Brand profile is required');
	const profile = await getBrandVisualProfileForTenant(required);
	const logoAsset = await resolveBrandLogoForTenant(required);
	let logo: {
		id: string;
		mimeType: string;
		bytes: Uint8Array;
	} | null = null;
	if (logoAsset) {
		try {
			const object = await storageProvider().getObject(required.clientId, logoAsset.storageKey);
			logo = { id: logoAsset.id, mimeType: logoAsset.mimeType, bytes: object.bytes };
		} catch (error) {
			if (!(error instanceof NotFoundError)) throw error;
		}
	}
	const copy = buildCompositionCopy(brand);
	const tokens = resolveCompositionTokens({
		brandTokens: brand.tokens,
		profile
	});
	const prohibited = resolvedProhibitedStyles(profile?.prohibitedStyles);
	const planned = [];
	for (const kind of COMPOSITION_KINDS) {
		const composed = composeShell({
			kind,
			copy,
			tokens,
			logo: logo ? { mimeType: logo.mimeType, bytes: logo.bytes } : null
		});
		const hit = compositionSvgHitsProhibitedStyle(composed.svg, prohibited);
		if (hit) {
			throw new ValidationError('That visual style is blocked for this client');
		}
		const bytes = new TextEncoder().encode(composed.svg);
		inspectComposedSvg(bytes);
		const version = await nextCompositionVersionForTenant(required, kind);
		const key = buildStorageKey(required.clientId, 'creative', `composed-${kind}`, `${kind}.svg`);
		planned.push({ kind, composed, bytes, version, key });
	}
	await consumeTenantUsage(
		{ ...required, requestId },
		{ resourceFamily: 'upload', actorId: actor.userId }
	);
	const written: string[] = [];
	const rows = [];
	try {
		for (const item of planned) {
			await storageProvider().putObject({
				clientId: required.clientId,
				key: item.key,
				bytes: item.bytes,
				contentType: 'image/svg+xml'
			});
			written.push(item.key);
			const row = await insertCreativeCompositionForTenant(required, {
				kind: item.kind,
				templateKey: item.composed.templateKey,
				schemaVersion: COMPOSITION_SCHEMA_VERSION,
				status: 'draft',
				version: item.version,
				width: item.composed.width,
				height: item.composed.height,
				headline: copy.headline,
				copySnapshot: copy,
				tokenSnapshot: tokens,
				hasLogo: item.composed.hasLogo,
				sourceLogoAssetId: logo?.id ?? null,
				storageKey: item.key,
				createdBy: actor.userId
			});
			rows.push(row);
		}
	} catch (error) {
		for (const key of written) {
			await storageProvider().deleteObject(required.clientId, key);
		}
		throw error;
	}
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'pages.composition.compose',
		entityType: 'creative_composition',
		entityId: rows[0]?.id,
		requestId
	});
	return { items: rows.map(publicComposition) };
}

export { publicComposition };
