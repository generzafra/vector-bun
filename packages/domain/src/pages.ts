import { requireCapability } from '@vector/auth';
import { env } from '@vector/config';
import {
	NotFoundError,
	ValidationError,
	applyConfirmedBrandVisualToTokens,
	assertActorOwnsContext,
	assetMediaStrategyLabel,
	brandVisualProfileConfirmed,
	DEFAULT_PROHIBITED_STYLES,
	enumerateVisualDirectionCandidates,
	evaluateAssetSufficiency,
	parseAssetMediaStrategy,
	selectWinningCandidateIndex,
	visualDirectionFitCopy,
	visualDirectionFitLabel,
	VISUAL_DIRECTION_SCORING_VERSION,
	overrideFirstRevealGateSchema,
	parseContract,
	type TenantContext
} from '@vector/contracts';
import {
	assertPageClient,
	composeLeadFunnelForTenant,
	countPublishableCreativeImagesForTenant,
	countUnknownRightsCreativeImagesForTenant,
	getAssetSufficiencyForVersionForTenant,
	getBrandForTenant,
	getBrandVisualProfileForTenant,
	getClientForTenant,
	listLatestCreativeCompositionsForTenant,
	getFirstRevealGateForVersionForTenant,
	getFunnelAssetManifestForVersionForTenant,
	getHomePageForTenant,
	getLatestDraftForTenant,
	getLeadFunnelForTenant,
	getPreviewDomainForTenant,
	getProductionDomainForTenant,
	getPublishedHomeForTenant,
	getSiteForTenant,
	insertCandidateScoreForTenant,
	insertVisualDirectionForTenant,
	listClaimsForTenant,
	listOffersForTenant,
	listServicesForTenant,
	listVisualDirectionsForVersionForTenant,
	overrideFirstRevealGateForTenant,
	publishLatestDraftForTenant,
	updatePageVersionDocumentForTenant,
	upsertAssetSufficiencySnapshotForTenant,
	upsertFirstRevealGateForTenant,
	getAiRunForPageVersionForTenant
} from '@vector/db';
import {
	composeLeadPage,
	evaluateFirstRevealGate,
	parsePageDocument,
	previewHostname,
	previewOrigin,
	scoreVisualDirection
} from '@vector/funnel-engine';
import { recordAudit } from './audit';
import { publicComposition } from './compositions';
import { resolveBrandLogoForTenant } from './assets';
import type { Actor } from './auth-service';

export async function getFunnel(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'pages.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertPageClient(required, clientId);
	const [site, funnel, page, draft, published, domain, production] = await Promise.all([
		getSiteForTenant(required),
		getLeadFunnelForTenant(required),
		getHomePageForTenant(required),
		getLatestDraftForTenant(required),
		getPublishedHomeForTenant(required),
		getPreviewDomainForTenant(required),
		getProductionDomainForTenant(required)
	]);
	const hostname = domain?.hostname ?? null;
	const intelligenceRun = draft ? await getAiRunForPageVersionForTenant(required, draft.id) : null;
	const gate = draft ? await getFirstRevealGateForVersionForTenant(required, draft.id) : null;
	const sufficiency = draft
		? await getAssetSufficiencyForVersionForTenant(required, draft.id)
		: null;
	const directionRows = draft
		? await listVisualDirectionsForVersionForTenant(required, draft.id)
		: [];
	const selectedDirection = directionRows.find((row) => row.direction.status === 'selected');
	const shareRows = await listLatestCreativeCompositionsForTenant(required);
	const draftManifest = draft
		? await getFunnelAssetManifestForVersionForTenant(required, draft.id)
		: null;
	const publishedManifest = published
		? await getFunnelAssetManifestForVersionForTenant(required, published.version.id)
		: null;
	return {
		site,
		funnel,
		page,
		draft,
		published: published?.version ?? null,
		domain,
		production,
		previewHostname: hostname,
		previewUrl: hostname ? previewOrigin(hostname, env.DELIVERY_ORIGIN) : null,
		productionHostname: production?.hostname ?? null,
		productionUrl: production ? previewOrigin(production.hostname, env.DELIVERY_ORIGIN) : null,
		firstReveal: gate
			? {
					pageVersionId: gate.pageVersionId,
					passed: gate.passed,
					checks: gate.checks,
					overrideReason: gate.overrideReason,
					overriddenBy: gate.overriddenBy,
					effectivePass: gate.passed || Boolean(gate.overrideReason)
				}
			: null,
		assetSufficiency: sufficiency
			? {
					mediaStrategy: sufficiency.mediaStrategy,
					label: assetMediaStrategyLabel(parseAssetMediaStrategy(sufficiency.mediaStrategy)),
					summary: sufficiency.summaryClient,
					profileConfirmed: sufficiency.profileConfirmed,
					industryVisualDependency: sufficiency.industryVisualDependency
				}
			: null,
		visualDirections:
			directionRows.length > 0
				? {
						source: directionRows[0]?.direction.source ?? 'deterministic',
						selectedName: selectedDirection?.direction.name ?? null,
						items: directionRows.map((row) => ({
							name: row.direction.name,
							rationale: row.direction.rationale,
							selected: row.direction.status === 'selected',
							fit: visualDirectionFitCopy(visualDirectionFitLabel(row.score?.scoreTotal ?? 0))
						}))
					}
				: null,
		shareCards: shareRows.map(publicComposition),
		shareCardPlacement: {
			placed: Boolean(draftManifest?.ogCompositionId),
			live: Boolean(publishedManifest?.ogCompositionId),
			ogCompositionId: draftManifest?.ogCompositionId ?? publishedManifest?.ogCompositionId ?? null
		},
		intelligenceDraft:
			intelligenceRun && draft
				? {
						pageVersionId: draft.id,
						version: draft.version,
						agentKey: intelligenceRun.agentKey,
						runId: intelligenceRun.id,
						noindex: draft.document.seo.noindex
					}
				: null
	};
}

export async function composeFunnel(actor: Actor, ctx: TenantContext, requestId: string) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const client = await getClientForTenant(required, required.clientId);
	if (!client) throw new NotFoundError('Client not found');
	const [brand, services, offers, claims] = await Promise.all([
		getBrandForTenant(required),
		listServicesForTenant(required),
		listOffersForTenant(required),
		listClaimsForTenant(required)
	]);
	if (!brand) throw new ValidationError('Brand profile is required');
	const [profile, logo, publishableCreativeImages, unknownRightsCreative] = await Promise.all([
		getBrandVisualProfileForTenant(required),
		resolveBrandLogoForTenant(required),
		countPublishableCreativeImagesForTenant(required),
		countUnknownRightsCreativeImagesForTenant(required)
	]);
	const sufficiency = evaluateAssetSufficiency({
		profileConfirmed: brandVisualProfileConfirmed(profile),
		hasLogo: Boolean(logo),
		hasPrimaryColor: Boolean(profile?.primaryColor),
		hasVisualPersonality: Boolean(profile?.visualPersonality?.trim()),
		publishableCreativeImages,
		unknownRightsCreative
	});
	const knowledge = {
		clientSlug: client.slug,
		brand: {
			...brand,
			tokens: applyConfirmedBrandVisualToTokens(brand.tokens, profile)
		},
		services,
		offers,
		claims
	};
	const candidates = enumerateVisualDirectionCandidates({
		mediaStrategy: sufficiency.mediaStrategy,
		hasLogo: Boolean(logo),
		personality: brand.brandPersonality,
		hasApprovedClaims: claims.some((claim) => claim.kind === 'approved'),
		brief:
			brand.audience && brand.offer && brand.primaryConversion
				? {
						displayName: brand.displayName,
						audience: brand.audience,
						offer: brand.offer,
						primaryConversion: brand.primaryConversion,
						approvedClaims: claims
							.filter((claim) => claim.kind === 'approved')
							.map((claim) => claim.statement),
						prohibitedClaims: claims
							.filter((claim) => claim.kind === 'prohibited')
							.map((claim) => claim.statement),
						photographyDirection: profile?.photographyDirection ?? null,
						prohibitedStyles: profile?.prohibitedStyles?.length
							? profile.prohibitedStyles
							: [...DEFAULT_PROHIBITED_STYLES]
					}
				: undefined
	});
	const scored = candidates.map((manifest) => {
		const document = composeLeadPage(knowledge, {
			preview: true,
			mediaStrategy: sufficiency.mediaStrategy,
			direction: manifest
		});
		return {
			manifest,
			document,
			score: scoreVisualDirection({
				document,
				manifest,
				hasLogo: Boolean(logo),
				personality: brand.brandPersonality,
				preview: true
			})
		};
	});
	const winnerIndex = selectWinningCandidateIndex(
		scored.map((item) => ({
			candidateIndex: item.manifest.candidateIndex,
			total: item.score.total
		}))
	);
	const winner = scored.find((item) => item.manifest.candidateIndex === winnerIndex) ?? scored[0];
	if (!winner) throw new ValidationError('Could not select a layout direction');
	const document = winner.document;
	const composed = await composeLeadFunnelForTenant(required, {
		siteName: brand.displayName,
		title: document.seo.title,
		hostname: previewHostname(client.slug, env.DELIVERY_PREVIEW_PARENT_HOST),
		document
	});
	const hasLogo = Boolean(logo);
	const evaluation = evaluateFirstRevealGate({
		document,
		preview: true,
		hasLogo
	});
	await upsertFirstRevealGateForTenant(required, {
		pageVersionId: composed.draft.id,
		gateVersion: evaluation.version,
		passed: evaluation.passed,
		checks: evaluation.checks
	});
	await upsertAssetSufficiencySnapshotForTenant(required, {
		pageVersionId: composed.draft.id,
		dimensions: sufficiency.dimensions,
		overallScore: sufficiency.overallScore,
		mediaStrategy: sufficiency.mediaStrategy,
		industryVisualDependency: sufficiency.industryVisualDependency,
		profileConfirmed: sufficiency.profileConfirmed,
		logoAssetId: logo?.id ?? null,
		summaryClient: sufficiency.summary
	});
	const selectedAt = new Date();
	for (const item of scored) {
		const selected = item.manifest.candidateIndex === winner.manifest.candidateIndex;
		const direction = await insertVisualDirectionForTenant(required, {
			pageVersionId: composed.draft.id,
			candidateIndex: item.manifest.candidateIndex,
			name: item.manifest.name,
			status: selected ? 'selected' : 'scored',
			source: 'deterministic',
			manifest: { ...item.manifest } as Record<string, unknown>,
			rationale: item.manifest.rationale,
			selectedAt: selected ? selectedAt : null
		});
		await insertCandidateScoreForTenant(required, {
			visualDirectionId: direction.id,
			scoreTotal: item.score.total,
			dimensions: item.score.dimensions,
			scoringVersion: VISUAL_DIRECTION_SCORING_VERSION
		});
	}
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'pages.compose',
		entityType: 'page_version',
		entityId: composed.draft.id,
		requestId
	});
	return composed;
}

export async function publishFunnel(actor: Actor, ctx: TenantContext, requestId: string) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const published = await publishLatestDraftForTenant(required);
	if (!published) throw new NotFoundError('Draft funnel not found');
	parsePageDocument(published.published.document);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'pages.publish',
		entityType: 'page_version',
		entityId: published.published.id,
		requestId
	});
	return published;
}

export async function overrideFirstRevealGate(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(overrideFirstRevealGateSchema, input);
	const draft = await getLatestDraftForTenant(required);
	if (!draft) throw new NotFoundError('Draft funnel not found');
	let gate = await getFirstRevealGateForVersionForTenant(required, draft.id);
	if (!gate) {
		const hasLogo = Boolean(await resolveBrandLogoForTenant(required));
		const evaluation = evaluateFirstRevealGate({
			document: parsePageDocument(draft.document),
			preview: true,
			hasLogo
		});
		gate = await upsertFirstRevealGateForTenant(required, {
			pageVersionId: draft.id,
			gateVersion: evaluation.version,
			passed: evaluation.passed,
			checks: evaluation.checks
		});
	}
	const updated = await overrideFirstRevealGateForTenant(required, {
		pageVersionId: draft.id,
		reason: parsed.reason,
		overriddenBy: actor.userId
	});
	if (!updated) throw new NotFoundError('First Reveal Gate result not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'pages.first_reveal.override',
		entityType: 'first_reveal_gate_result',
		entityId: updated.id,
		requestId,
		reason: parsed.reason
	});
	return updated;
}

export async function tryUpdatePublishedDocument(
	actor: Actor,
	ctx: TenantContext,
	versionId: string,
	document: unknown
) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	return updatePageVersionDocumentForTenant(required, versionId, parsePageDocument(document));
}
