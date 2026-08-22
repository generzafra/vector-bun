import { requireCapability } from '@vector/auth';
import { env } from '@vector/config';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	type TenantContext
} from '@vector/contracts';
import {
	assertPageClient,
	composeLeadFunnelForTenant,
	getClientForTenant,
	getHomePageForTenant,
	getLatestDraftForTenant,
	getLeadFunnelForTenant,
	getPreviewDomainForTenant,
	getProductionDomainForTenant,
	getPublishedHomeForTenant,
	getSiteForTenant,
	listClaimsForTenant,
	listOffersForTenant,
	listServicesForTenant,
	publishLatestDraftForTenant,
	updatePageVersionDocumentForTenant,
	getAiRunForPageVersionForTenant,
	getBrandForTenant
} from '@vector/db';
import {
	composeLeadPage,
	parsePageDocument,
	previewHostname,
	previewOrigin
} from '@vector/funnel-engine';
import { recordAudit } from './audit';
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
	const document = composeLeadPage(
		{
			clientSlug: client.slug,
			brand,
			services,
			offers,
			claims
		},
		{ preview: true }
	);
	const composed = await composeLeadFunnelForTenant(required, {
		siteName: brand.displayName,
		title: document.seo.title,
		hostname: previewHostname(client.slug, env.DELIVERY_PREVIEW_PARENT_HOST),
		document
	});
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
