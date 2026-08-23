import { consumeRateLimit, requireCapability } from '@vector/auth';
import { env } from '@vector/config';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	connectSearchPropertySchema,
	createSeoOpportunitySchema,
	parseContract,
	searchClientIdSchema,
	searchPropertyIdSchema,
	seoOpportunityIdSchema,
	submitSearchSitemapSchema,
	type SearchEngine,
	type TenantContext
} from '@vector/contracts';
import {
	assertSearchClient,
	getBrandForTenant,
	getSeoIssueForTenant,
	getSeoOpportunityForTenant,
	getSeoPropertyForTenant,
	getSeoQueryForTenant,
	insertSeoAuditForTenant,
	insertSeoIssueForTenant,
	insertSeoOpportunityForTenant,
	listAnswerTargetsForTenant,
	listClaimsForTenant,
	listContentBriefsForTenant,
	listOffersForTenant,
	listPublishedPageDocumentsForTenant,
	listSchemaEntitiesForTenant,
	listSeoIssuesForTenant,
	listSeoKeywordsForTenant,
	listSeoOpportunitiesForTenant,
	listSeoPagesForTenant,
	listSeoPropertiesForTenant,
	listSeoQueriesForTenant,
	listServicesForTenant,
	markMissingSchemaEntitiesStaleForTenant,
	patchSeoPropertyForTenant,
	updateSeoOpportunityForTenant,
	upsertAnswerTargetForTenant,
	upsertContentBriefForTenant,
	upsertSchemaEntityForTenant,
	upsertSeoKeywordForTenant,
	upsertSeoPageForTenant,
	upsertSeoPropertyForTenant,
	upsertSeoQueryForTenant
} from '@vector/db';
import { logInfo } from '@vector/observability';
import {
	canMarkPublishReady,
	coverAnswerTarget,
	decryptSecret,
	detectTechnicalIssues,
	encryptSecret,
	isoDate,
	memorySearchProvider,
	proposeAnswerTargets,
	proposeSchemaEntities,
	resetSearchProvider,
	scoreOpportunity,
	searchProvider,
	setSearchProvider,
	unsupportedGenerativeVisibility,
	type PublishedFaq,
	type SearchProvider
} from '@vector/search';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

const providerOverrides = new Map<SearchEngine, SearchProvider>();

export function setDomainSearchProvider(engine: SearchEngine, provider: SearchProvider) {
	providerOverrides.set(engine, provider);
	setSearchProvider(engine, provider);
}

export function getDomainSearchProvider(engine: SearchEngine) {
	return providerOverrides.get(engine) ?? searchProvider(engine);
}

export function resetDomainSearchProvider() {
	providerOverrides.clear();
	resetSearchProvider();
}

export { memorySearchProvider };

function publicProperty(row: {
	id: string;
	engine: SearchEngine;
	siteUrl: string;
	status: string;
	lastValidatedAt: Date | null;
	lastSyncedAt: Date | null;
	lastError: string | null;
	createdAt: Date;
	updatedAt: Date;
}) {
	return {
		id: row.id,
		engine: row.engine,
		siteUrl: row.siteUrl,
		status: row.status,
		lastValidatedAt: row.lastValidatedAt,
		lastSyncedAt: row.lastSyncedAt,
		lastError: row.lastError,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

function publicOpportunity(row: {
	id: string;
	channel: string;
	title: string;
	problem: string;
	proposedAction: string;
	evidenceClass: string;
	sourceKind: string;
	sourceId: string;
	pageId: string | null;
	queryId: string | null;
	priority: number;
	effort: string;
	status: string;
	createdAt: Date;
	updatedAt: Date;
}) {
	return {
		id: row.id,
		channel: row.channel,
		title: row.title,
		problem: row.problem,
		proposedAction: row.proposedAction,
		evidenceClass: row.evidenceClass,
		sourceKind: row.sourceKind,
		sourceId: row.sourceId,
		pageId: row.pageId,
		queryId: row.queryId,
		priority: row.priority,
		effort: row.effort,
		status: row.status,
		publishReadyAllowed: canMarkPublishReady(
			row.sourceKind as 'knowledge_claim' | 'official_query' | 'technical_audit' | 'page'
		),
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

async function decryptPropertyCredential(ciphertext: string | null) {
	if (!ciphertext) throw new ValidationError('Search property has no credential');
	return decryptSecret(env.TOKEN_ENCRYPTION_KEY, ciphertext);
}

export async function searchPropertyReadiness(ctx: TenantContext) {
	const properties = await listSeoPropertiesForTenant(ctx);
	const active = properties.filter((row) => row.status === 'active');
	return {
		complete: active.length > 0,
		detail:
			active.length > 0
				? `${active.length} official search property(ies) connected`
				: 'Official Search Console or Bing property is not connected'
	};
}

export async function getSearchOverview(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'seo.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(searchClientIdSchema, { clientId });
		assertSearchClient(required, clientId);
	}
	const [
		properties,
		issues,
		opportunities,
		queries,
		pages,
		keywords,
		claims,
		entities,
		targets,
		briefs,
		readiness
	] = await Promise.all([
		listSeoPropertiesForTenant(required),
		listSeoIssuesForTenant(required),
		listSeoOpportunitiesForTenant(required),
		listSeoQueriesForTenant(required),
		listSeoPagesForTenant(required),
		listSeoKeywordsForTenant(required),
		listClaimsForTenant(required),
		listSchemaEntitiesForTenant(required),
		listAnswerTargetsForTenant(required),
		listContentBriefsForTenant(required),
		searchPropertyReadiness(required)
	]);
	const overview = {
		properties: properties.map(publicProperty),
		issues,
		opportunities: opportunities.map(publicOpportunity),
		queries,
		pages,
		keywords,
		entities,
		answerTargets: targets,
		briefs,
		answerReadiness: {
			targets: targets.length,
			mapped: targets.filter((row) => row.status === 'mapped').length,
			gaps: targets.filter((row) => row.status === 'gap').length
		},
		claims: claims
			.filter((claim) => claim.kind === 'approved')
			.map((claim) => ({ id: claim.id, statement: claim.statement })),
		readiness,
		provider: {
			adapter: env.SEARCH_ADAPTER === 'official' ? 'official' : 'memory',
			detail:
				env.SEARCH_ADAPTER === 'official'
					? 'Official Search Console / Bing adapters are selected'
					: 'Memory search adapter is selected'
		},
		generativeMeasurement: unsupportedGenerativeVisibility()
	};
	const serialized = JSON.stringify(overview);
	for (const row of properties) {
		if (row.encryptedCredential && serialized.includes(row.encryptedCredential)) {
			throw new ValidationError('Search overview refused to include a credential');
		}
	}
	return overview;
}

export async function connectSearchProperty(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`search-connect:${required.clientId}`, 10, 60_000);
	const parsed = parseContract(connectSearchPropertySchema, input);
	const provider = getDomainSearchProvider(parsed.engine);
	const health = await provider.validateProperty({
		clientId: required.clientId,
		engine: parsed.engine,
		siteUrl: parsed.siteUrl,
		credential: parsed.credential
	});
	const row = await upsertSeoPropertyForTenant(required, {
		engine: parsed.engine,
		siteUrl: parsed.siteUrl,
		encryptedCredential: encryptSecret(env.TOKEN_ENCRYPTION_KEY, parsed.credential),
		status: health.ok ? 'active' : 'pending',
		lastValidatedAt: health.ok ? new Date() : null,
		lastError: health.ok ? null : health.detail
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'search.property.connect',
		entityType: 'seo_property',
		entityId: row.id,
		requestId,
		reason: health.ok ? 'Search property connected' : 'Search property stored pending validation'
	});
	logInfo('search.property.connect', { engine: parsed.engine, ok: health.ok });
	return { property: publicProperty(row), health };
}

export async function validateSearchProperty(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(searchPropertyIdSchema, input);
	const property = await getSeoPropertyForTenant(required, parsed.id);
	if (!property) throw new NotFoundError('Search property not found');
	const credential = await decryptPropertyCredential(property.encryptedCredential);
	const health = await getDomainSearchProvider(property.engine).validateProperty({
		clientId: required.clientId,
		engine: property.engine,
		siteUrl: property.siteUrl,
		credential
	});
	const updated = await patchSeoPropertyForTenant(required, property.id, {
		status: health.ok ? 'active' : 'expired',
		lastValidatedAt: new Date(),
		lastError: health.ok ? null : health.detail
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'search.property.validate',
		entityType: 'seo_property',
		entityId: property.id,
		requestId,
		reason: health.detail
	});
	return { property: publicProperty(updated ?? property), health };
}

export async function syncSearchProperty(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`search-sync:${required.clientId}`, 8, 60_000);
	const parsed = parseContract(searchPropertyIdSchema, input);
	const property = await getSeoPropertyForTenant(required, parsed.id);
	if (!property) throw new NotFoundError('Search property not found');
	const credential = await decryptPropertyCredential(property.encryptedCredential);
	const end = new Date();
	const start = new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);
	const result = await getDomainSearchProvider(property.engine).syncPerformance({
		clientId: required.clientId,
		engine: property.engine,
		siteUrl: property.siteUrl,
		credential,
		startDate: isoDate(start),
		endDate: isoDate(end)
	});
	for (const row of result.queries) {
		const keyword = await upsertSeoKeywordForTenant(required, { phrase: row.query });
		await upsertSeoQueryForTenant(required, {
			propertyId: property.id,
			keywordId: keyword.id,
			query: row.query,
			pageUrl: row.pageUrl ?? '',
			clicks: row.clicks,
			impressions: row.impressions,
			ctrBps: row.ctrBps,
			positionMilli: row.positionMilli,
			date: row.date,
			country: row.country ?? '',
			device: row.device ?? ''
		});
	}
	for (const row of result.pages) {
		const path = pathFromUrl(row.url, property.siteUrl);
		await upsertSeoPageForTenant(required, {
			path,
			propertyId: property.id,
			url: row.url,
			clicks: row.clicks,
			impressions: row.impressions,
			ctrBps: row.ctrBps,
			positionMilli: row.positionMilli,
			lastSeenAt: new Date()
		});
	}
	await patchSeoPropertyForTenant(required, property.id, {
		status: 'active',
		lastSyncedAt: new Date(),
		lastError: null
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'search.property.sync',
		entityType: 'seo_property',
		entityId: property.id,
		requestId,
		reason: `Synced ${result.queries.length} official queries`
	});
	return { queries: result.queries.length, pages: result.pages.length };
}

export async function submitSearchSitemap(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(submitSearchSitemapSchema, input);
	const property = await getSeoPropertyForTenant(required, parsed.id);
	if (!property) throw new NotFoundError('Search property not found');
	const credential = await decryptPropertyCredential(property.encryptedCredential);
	const result = await getDomainSearchProvider(property.engine).submitSitemap({
		clientId: required.clientId,
		engine: property.engine,
		siteUrl: property.siteUrl,
		credential,
		sitemapUrl: parsed.sitemapUrl
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'search.property.sitemap',
		entityType: 'seo_property',
		entityId: property.id,
		requestId,
		reason: result.detail
	});
	return result;
}

export async function runTechnicalSearchAudit(actor: Actor, ctx: TenantContext, requestId: string) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const startedAt = new Date();
	const published = await listPublishedPageDocumentsForTenant(required);
	const detected = detectTechnicalIssues(
		published.map((page) => ({
			id: page.id,
			path: page.path,
			title: page.title,
			seoTitle: page.document.seo.title,
			seoDescription: page.document.seo.description
		}))
	);
	const audit = await insertSeoAuditForTenant(required, {
		status: 'completed',
		summary: `${detected.length} technical issue(s) on ${published.length} published page(s)`,
		startedAt,
		completedAt: new Date()
	});
	const issues = [];
	for (const issue of detected) {
		issues.push(
			await insertSeoIssueForTenant(required, {
				auditId: audit.id,
				pageId: issue.pageId,
				path: issue.path,
				code: issue.code,
				severity: issue.severity,
				evidenceClass: issue.evidenceClass,
				detail: issue.detail
			})
		);
	}
	for (const page of published) {
		await upsertSeoPageForTenant(required, {
			path: page.path,
			pageId: page.id,
			title: page.document.seo.title || page.title,
			lastSeenAt: new Date()
		});
	}
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'search.audit.technical',
		entityType: 'seo_audit',
		entityId: audit.id,
		requestId,
		reason: audit.summary
	});
	return { audit, issues };
}

function publishedFaqsFromPages(
	pages: { id: string; path: string; document: { sections: { type: string; items?: unknown }[] } }[]
): PublishedFaq[] {
	const faqs: PublishedFaq[] = [];
	for (const page of pages) {
		for (const section of page.document.sections) {
			if (section.type !== 'faq' || !Array.isArray(section.items)) continue;
			for (const item of section.items) {
				if (!item || typeof item !== 'object') continue;
				const question = 'question' in item ? String(item.question ?? '') : '';
				const answer = 'answer' in item ? String(item.answer ?? '') : '';
				if (!question.trim() || !answer.trim()) continue;
				faqs.push({ pageId: page.id, path: page.path, question, answer });
			}
		}
	}
	return faqs;
}

export async function refreshAnswerReadiness(actor: Actor, ctx: TenantContext, requestId: string) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`search-aeo:${required.clientId}`, 8, 60_000);
	const [brand, services, offers, claims, published, existingOpportunities] = await Promise.all([
		getBrandForTenant(required),
		listServicesForTenant(required),
		listOffersForTenant(required),
		listClaimsForTenant(required),
		listPublishedPageDocumentsForTenant(required),
		listSeoOpportunitiesForTenant(required)
	]);
	const knowledge = {
		brand: brand
			? {
					id: brand.id,
					displayName: brand.displayName,
					tagline: brand.tagline,
					offer: brand.offer
				}
			: null,
		services,
		offers,
		claims
	};
	const proposedEntities = proposeSchemaEntities(knowledge);
	const proposedTargets = proposeAnswerTargets(knowledge);
	const faqs = publishedFaqsFromPages(published);
	const homePage = published.find((page) => page.path === '/') ?? published[0] ?? null;

	const entityRows = [];
	for (const entity of proposedEntities) {
		entityRows.push(await upsertSchemaEntityForTenant(required, entity));
	}
	await markMissingSchemaEntitiesStaleForTenant(
		required,
		entityRows.map((row) => row.id)
	);

	const targetRows = [];
	const briefRows = [];
	const opportunityRows = [];
	for (const proposed of proposedTargets) {
		const coverage = coverAnswerTarget(proposed, faqs);
		const target = await upsertAnswerTargetForTenant(required, {
			...proposed,
			pageId: coverage.pageId,
			status: coverage.status
		});
		targetRows.push(target);
		if (coverage.status !== 'gap') continue;
		const brief = await upsertContentBriefForTenant(required, {
			answerTargetId: target.id,
			claimId: proposed.sourceKind === 'knowledge_claim' ? proposed.sourceId : null,
			pageId: homePage?.id ?? null,
			title: `Answer gap: ${proposed.question}`.slice(0, 160),
			problem: 'Published FAQs do not include this approved fact.',
			proposedAction:
				'Add a source-backed FAQ on an existing page. Do not create a page only for this question.'
		});
		briefRows.push(brief);
		if (proposed.sourceKind !== 'knowledge_claim') continue;
		const already = existingOpportunities.some(
			(row) =>
				row.channel === 'aeo' &&
				row.sourceKind === 'knowledge_claim' &&
				row.sourceId === proposed.sourceId &&
				row.status !== 'rejected' &&
				row.status !== 'done'
		);
		if (already) continue;
		const created = await insertSeoOpportunityForTenant(required, {
			channel: 'aeo',
			title: `Answer gap: ${proposed.question}`.slice(0, 160),
			problem: 'Published FAQs do not include this approved fact.',
			proposedAction:
				'Add a source-backed FAQ on an existing page. Do not create a page only for this question.',
			evidenceClass: 'source_verified',
			sourceKind: 'knowledge_claim',
			sourceId: proposed.sourceId,
			pageId: homePage?.id ?? null,
			priority: scoreOpportunity({
				channel: 'aeo',
				evidenceClass: 'source_verified',
				effort: 'low'
			}),
			effort: 'low'
		});
		opportunityRows.push(created);
		existingOpportunities.push(created);
	}

	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'search.answer_readiness.refresh',
		entityType: 'answer_target',
		entityId: required.clientId,
		requestId,
		reason: `${targetRows.filter((row) => row.status === 'gap').length} FAQ gap(s) from approved knowledge`
	});
	logInfo('search.answer_readiness.refresh', {
		entities: entityRows.length,
		targets: targetRows.length,
		gaps: targetRows.filter((row) => row.status === 'gap').length
	});
	return {
		entities: entityRows,
		answerTargets: targetRows,
		briefs: briefRows,
		opportunities: opportunityRows.map(publicOpportunity),
		summary: {
			targets: targetRows.length,
			mapped: targetRows.filter((row) => row.status === 'mapped').length,
			gaps: targetRows.filter((row) => row.status === 'gap').length
		}
	};
}

export async function createSeoOpportunity(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(createSeoOpportunitySchema, input);
	await assertOpportunitySource(required, parsed);
	const priority = scoreOpportunity({
		channel: parsed.channel,
		evidenceClass: parsed.evidenceClass,
		effort: parsed.effort
	});
	const row = await insertSeoOpportunityForTenant(required, {
		...parsed,
		priority
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'search.opportunity.create',
		entityType: 'seo_opportunity',
		entityId: row.id,
		requestId,
		reason: parsed.title
	});
	return publicOpportunity(row);
}

export async function markSeoOpportunityPublishReady(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(seoOpportunityIdSchema, input);
	const row = await getSeoOpportunityForTenant(required, parsed.id);
	if (!row) throw new NotFoundError('Search opportunity not found');
	if (!canMarkPublishReady(row.sourceKind)) {
		throw new ValidationError(
			'Backlog items without a knowledge or official-query source cannot be marked publish-ready'
		);
	}
	await assertOpportunitySource(required, {
		sourceKind: row.sourceKind,
		sourceId: row.sourceId,
		queryId: row.queryId,
		pageId: row.pageId
	});
	const updated = await updateSeoOpportunityForTenant(required, row.id, {
		status: 'publish_ready'
	});
	if (!updated) throw new NotFoundError('Search opportunity not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'search.opportunity.publish_ready',
		entityType: 'seo_opportunity',
		entityId: row.id,
		requestId,
		reason: row.title
	});
	return publicOpportunity(updated);
}

async function assertOpportunitySource(
	ctx: TenantContext,
	input: {
		sourceKind: 'knowledge_claim' | 'official_query' | 'technical_audit' | 'page';
		sourceId: string;
		queryId?: string | null;
		pageId?: string | null;
	}
) {
	if (input.sourceKind === 'knowledge_claim') {
		const claims = await listClaimsForTenant(ctx);
		const claim = claims.find((row) => row.id === input.sourceId && row.kind === 'approved');
		if (!claim) throw new ValidationError('Approved knowledge claim is required');
		return;
	}
	if (input.sourceKind === 'official_query') {
		const query = await getSeoQueryForTenant(ctx, input.queryId ?? input.sourceId);
		if (!query) throw new ValidationError('Official search query is required');
		return;
	}
	if (input.sourceKind === 'technical_audit') {
		const issue = await getSeoIssueForTenant(ctx, input.sourceId);
		if (!issue) throw new ValidationError('Technical audit issue is required');
		return;
	}
	const pages = await listPublishedPageDocumentsForTenant(ctx);
	if (!pages.some((page) => page.id === (input.pageId ?? input.sourceId))) {
		throw new ValidationError('Published page is required');
	}
}

function pathFromUrl(url: string, siteUrl: string) {
	try {
		const parsed = new URL(url);
		return parsed.pathname || '/';
	} catch {
		if (url.startsWith(siteUrl)) {
			const rest = url.slice(siteUrl.replace(/\/$/, '').length);
			return rest.startsWith('/') ? rest : `/${rest}`;
		}
		return '/';
	}
}
