import { consumeRateLimit, requireCapability } from '@vector/auth';
import { env } from '@vector/config';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	connectSearchPropertySchema,
	createSeoOpportunitySchema,
	parseContract,
	recordGeoObservationSchema,
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
	getGeoQueryForTenant,
	getGeoReferralForLeadForTenant,
	getLatestGeoVisibilitySnapshotForTenant,
	getSeoIssueForTenant,
	getSeoOpportunityForTenant,
	getSeoPropertyForTenant,
	getSeoQueryForTenant,
	insertGeoCitationForTenant,
	insertGeoFactRepresentationForTenant,
	insertGeoMeasurementRunForTenant,
	insertGeoReferralEventForTenant,
	insertGeoObservationForTenant,
	insertGeoVisibilitySnapshotForTenant,
	insertSeoAuditForTenant,
	insertSeoIssueForTenant,
	insertSeoOpportunityForTenant,
	listAnswerTargetsForTenant,
	listClaimsForTenant,
	listContentBriefsForTenant,
	listGeoCitationsForTenant,
	listGeoFactRepresentationsForTenant,
	listGeoObservationsForTenant,
	listGeoReferralEventsForTenant,
	listGeoQueriesForTenant,
	listGeoQuerySetsForTenant,
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
	upsertGeoQueryForTenant,
	upsertGeoQuerySetForTenant,
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
	buildGeoVisibilitySnapshot,
	canMarkPublishReady,
	classifySearchReferral,
	coverAnswerTarget,
	decryptSecret,
	detectTechnicalIssues,
	encryptSecret,
	isoDate,
	mentionIsNotCitation,
	memorySearchProvider,
	proposeAnswerTargets,
	proposeGeoQueries,
	proposeSchemaEntities,
	publicGeoObservationFreshness,
	resetSearchProvider,
	scoreOpportunity,
	searchProvider,
	setSearchProvider,
	generativeMeasurementOverview,
	geoVisibilityHeadline,
	parseGeoAttributionContent,
	searchOutcomeImpact,
	publicGeoReportFreshness,
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

function emptyGeoReport(monitoredQueries: number) {
	const headline = geoVisibilityHeadline({
		monitoredQueries,
		mentionedQueries: 0,
		observationCount: 0,
		mentionOnlyCount: 0,
		accurateNoCount: 0,
		sufficient: false,
		stale: false
	});
	return {
		status: headline.status,
		current: headline.current,
		headline: headline.headline,
		freshnessLabel: 'no snapshot',
		freshnessDetail: 'Refresh the visibility snapshot after recorded observations exist.',
		stale: false,
		sufficient: false,
		monitoredQueries,
		mentionedQueries: 0,
		observationCount: 0,
		ownedCitationQueries: 0,
		earnedCitationQueries: 0,
		representedQueries: 0,
		accurateYes: 0,
		accurateNo: 0,
		mentionOnly: 0,
		snapshotId: null as string | null,
		computedAt: null as Date | null,
		representations: [] as {
			id: string;
			observationId: string;
			claimId: string | null;
			status: string;
			evidenceClass: string;
			detail: string | null;
		}[]
	};
}

function publicGeoReport(
	snapshot: {
		id: string;
		queryCount: number;
		observationCount: number;
		mentionedQueryCount: number;
		ownedCitationQueryCount: number;
		earnedCitationQueryCount: number;
		representedQueryCount: number;
		accurateYesCount: number;
		accurateNoCount: number;
		mentionOnlyCount: number;
		sufficient: boolean;
		computedAt: Date;
	},
	representations: {
		id: string;
		observationId: string;
		claimId: string | null;
		status: string;
		evidenceClass: string;
		detail: string | null;
	}[],
	now = new Date()
) {
	const freshness = publicGeoReportFreshness(snapshot.computedAt, now);
	const headline = geoVisibilityHeadline({
		monitoredQueries: snapshot.queryCount,
		mentionedQueries: snapshot.mentionedQueryCount,
		observationCount: snapshot.observationCount,
		mentionOnlyCount: snapshot.mentionOnlyCount,
		accurateNoCount: snapshot.accurateNoCount,
		sufficient: snapshot.sufficient,
		stale: freshness.stale
	});
	return {
		status: headline.status,
		current: headline.current,
		headline: headline.headline,
		freshnessLabel: freshness.label,
		freshnessDetail: freshness.detail,
		stale: freshness.stale,
		sufficient: snapshot.sufficient,
		monitoredQueries: snapshot.queryCount,
		mentionedQueries: snapshot.mentionedQueryCount,
		observationCount: snapshot.observationCount,
		ownedCitationQueries: snapshot.ownedCitationQueryCount,
		earnedCitationQueries: snapshot.earnedCitationQueryCount,
		representedQueries: snapshot.representedQueryCount,
		accurateYes: snapshot.accurateYesCount,
		accurateNo: snapshot.accurateNoCount,
		mentionOnly: snapshot.mentionOnlyCount,
		snapshotId: snapshot.id,
		computedAt: snapshot.computedAt,
		representations: representations.map((row) => ({
			id: row.id,
			observationId: row.observationId,
			claimId: row.claimId,
			status: row.status,
			evidenceClass: row.evidenceClass,
			detail: row.detail
		}))
	};
}

function publicSearchImpact(
	report: ReturnType<typeof emptyGeoReport>,
	referrals: {
		id: string;
		leadId: string;
		queryId: string | null;
		channel: string;
		engine: string;
		leadStatus: string;
		createdAt: Date;
	}[]
) {
	const qualifiedCount = referrals.filter(
		(row) => row.leadStatus === 'qualified' || row.leadStatus === 'won'
	).length;
	const wonCount = referrals.filter((row) => row.leadStatus === 'won').length;
	const impact = searchOutcomeImpact({
		visibilityCurrent: report.current,
		mentionedQueries: report.mentionedQueries,
		referralCount: referrals.length,
		leadCount: referrals.length,
		qualifiedCount,
		wonCount
	});
	return {
		...impact,
		referralCount: referrals.length,
		leadCount: referrals.length,
		qualifiedCount,
		wonCount,
		leads: referrals.map((row) => ({
			id: row.leadId,
			status: row.leadStatus,
			channel: row.channel,
			engine: row.engine,
			queryId: row.queryId,
			createdAt: row.createdAt
		}))
	};
}

export async function recordObservableSearchReferral(
	ctx: TenantContext,
	input: {
		leadId: string;
		source?: string | null;
		medium?: string | null;
		campaign?: string | null;
		content?: string | null;
	}
) {
	const classified = classifySearchReferral(input);
	if (!classified) return null;
	const existing = await getGeoReferralForLeadForTenant(ctx, input.leadId);
	if (existing) return existing;
	const queryId = parseGeoAttributionContent(input.content);
	const query = queryId ? await getGeoQueryForTenant(ctx, queryId) : null;
	const row = await insertGeoReferralEventForTenant(ctx, {
		leadId: input.leadId,
		queryId: query?.id ?? null,
		channel: classified.channel,
		engine: classified.engine
	});
	logInfo('search.geo.referral.record', {
		channel: classified.channel,
		engine: classified.engine,
		queryBound: Boolean(query)
	});
	return row;
}

async function persistGeoVisibilitySnapshotForSet(
	required: TenantContext,
	setId: string,
	requestId: string,
	actorId: string
) {
	const [queries, observations, claims] = await Promise.all([
		listGeoQueriesForTenant(required),
		listGeoObservationsForTenant(required),
		listClaimsForTenant(required)
	]);
	const setQueries = queries.filter((row) => row.setId === setId);
	const queryIds = new Set(setQueries.map((row) => row.id));
	const draft = buildGeoVisibilitySnapshot({
		queries: setQueries,
		observations: observations.filter((row) => queryIds.has(row.queryId)),
		claims
	});
	const snapshot = await insertGeoVisibilitySnapshotForTenant(required, {
		setId,
		windowStart: draft.windowStart,
		windowEnd: draft.windowEnd,
		computedAt: draft.windowEnd,
		queryCount: draft.queryCount,
		observationCount: draft.observationCount,
		mentionedQueryCount: draft.mentionedQueryCount,
		ownedCitationQueryCount: draft.ownedCitationQueryCount,
		earnedCitationQueryCount: draft.earnedCitationQueryCount,
		representedQueryCount: draft.representedQueryCount,
		accurateYesCount: draft.accurateYesCount,
		accurateNoCount: draft.accurateNoCount,
		mentionOnlyCount: draft.mentionOnlyCount,
		sufficient: draft.sufficient,
		headline: draft.headline
	});
	const representations = [];
	for (const item of draft.representations) {
		representations.push(
			await insertGeoFactRepresentationForTenant(required, {
				snapshotId: snapshot.id,
				observationId: item.observationId,
				claimId: item.claimId,
				status: item.status,
				evidenceClass: item.evidenceClass,
				detail: item.detail
			})
		);
	}
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId,
		action: 'search.geo.snapshot.refresh',
		entityType: 'geo_visibility_snapshot',
		entityId: snapshot.id,
		requestId,
		reason: `${draft.observationCount} observations in snapshot`
	});
	logInfo('search.geo.snapshot.refresh', {
		observations: draft.observationCount,
		sufficient: draft.sufficient
	});
	return {
		snapshot,
		representations,
		report: publicGeoReport(snapshot, representations)
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
		geoSets,
		geoQueries,
		geoObservations,
		geoCitations,
		snapshot,
		referrals,
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
		listGeoQuerySetsForTenant(required),
		listGeoQueriesForTenant(required),
		listGeoObservationsForTenant(required),
		listGeoCitationsForTenant(required),
		getLatestGeoVisibilitySnapshotForTenant(required),
		listGeoReferralEventsForTenant(required),
		searchPropertyReadiness(required)
	]);
	const representations = snapshot
		? await listGeoFactRepresentationsForTenant(required, snapshot.id)
		: [];
	const geoReport = snapshot
		? publicGeoReport(snapshot, representations)
		: emptyGeoReport(geoQueries.length);
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
		geoQuerySets: geoSets,
		geoQueries,
		geoObservations: geoObservations.map((row) => {
			const freshness = publicGeoObservationFreshness(row.observedAt);
			return {
				id: row.id,
				queryId: row.queryId,
				engine: row.engine,
				method: row.method,
				mentioned: row.mentioned,
				ownedCitation: row.ownedCitation,
				earnedCitation: row.earnedCitation,
				represented: row.represented,
				accurate: row.accurate,
				prominence: row.prominence,
				confidence: row.confidence,
				detail: row.detail,
				observedAt: row.observedAt,
				mentionOnly: mentionIsNotCitation(row),
				stale: freshness.stale,
				freshnessLabel: freshness.label,
				freshnessDetail: freshness.detail,
				citations: geoCitations
					.filter((citation) => citation.observationId === row.id)
					.map((citation) => ({
						id: citation.id,
						kind: citation.kind,
						url: citation.url,
						domain: citation.domain
					}))
			};
		}),
		geoReadiness: {
			queries: geoQueries.length,
			observations: geoObservations.length,
			staleObservations: geoObservations.filter(
				(row) => publicGeoObservationFreshness(row.observedAt).stale
			).length
		},
		geoReport,
		geoImpact: publicSearchImpact(geoReport, referrals),
		generativeMeasurement: generativeMeasurementOverview()
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

export async function refreshGeoQuerySet(actor: Actor, ctx: TenantContext, requestId: string) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`search-geo:${required.clientId}`, 8, 60_000);
	const [brand, services, offers, claims] = await Promise.all([
		getBrandForTenant(required),
		listServicesForTenant(required),
		listOffersForTenant(required),
		listClaimsForTenant(required)
	]);
	const set = await upsertGeoQuerySetForTenant(required, {
		slug: 'commercial-baseline',
		name: 'Commercial baseline'
	});
	const proposed = proposeGeoQueries({
		brand: brand
			? {
					id: brand.id,
					displayName: brand.displayName,
					primaryConversion: brand.primaryConversion
				}
			: null,
		services,
		offers,
		claims
	});
	const queries = [];
	for (const item of proposed) {
		queries.push(
			await upsertGeoQueryForTenant(required, {
				setId: set.id,
				...item
			})
		);
	}
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'search.geo.query_set.refresh',
		entityType: 'geo_query_set',
		entityId: set.id,
		requestId,
		reason: `${queries.length} commercial GEO queries`
	});
	logInfo('search.geo.query_set.refresh', { queries: queries.length });
	return { set, queries };
}

export async function recordGeoObservation(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`search-geo-observe:${required.clientId}`, 10, 60_000);
	const parsed = parseContract(recordGeoObservationSchema, input);
	const query = await getGeoQueryForTenant(required, parsed.queryId);
	if (!query) throw new NotFoundError('GEO query not found');
	const measured = await getDomainSearchProvider('google').measureGenerativeVisibility({
		clientId: required.clientId,
		query: query.query,
		engine: parsed.engine,
		method: parsed.method,
		mentioned: parsed.mentioned,
		ownedCitation: parsed.ownedCitation,
		earnedCitation: parsed.earnedCitation,
		represented: parsed.represented,
		accurate: parsed.accurate,
		prominence: parsed.prominence,
		confidence: parsed.confidence,
		detail: parsed.detail,
		citations: parsed.citations
	});
	if (!measured.supported) {
		throw new ValidationError(measured.detail);
	}
	const startedAt = new Date();
	const run = await insertGeoMeasurementRunForTenant(required, {
		setId: query.setId,
		method: measured.method,
		costMinor: parsed.costMinor,
		currency: parsed.currency,
		startedAt,
		completedAt: new Date()
	});
	const observation = await insertGeoObservationForTenant(required, {
		runId: run.id,
		queryId: query.id,
		engine: parsed.engine,
		method: measured.method,
		mentioned: measured.mentioned,
		ownedCitation: measured.ownedCitation,
		earnedCitation: measured.earnedCitation,
		represented: measured.represented,
		accurate: measured.accurate,
		prominence: measured.prominence,
		confidence: measured.confidence,
		detail: measured.detail,
		observedAt: startedAt
	});
	const citations = [];
	for (const citation of measured.citations) {
		citations.push(
			await insertGeoCitationForTenant(required, {
				observationId: observation.id,
				kind: citation.kind,
				url: citation.url ?? null,
				domain: citation.domain ?? null
			})
		);
	}
	const freshness = publicGeoObservationFreshness(observation.observedAt);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'search.geo.observation.record',
		entityType: 'geo_engine_observation',
		entityId: observation.id,
		requestId,
		reason: `${parsed.method} ${parsed.engine} observation`
	});
	logInfo('search.geo.observation.record', {
		engine: parsed.engine,
		mentioned: parsed.mentioned,
		ownedCitation: parsed.ownedCitation
	});
	const snapshot = await persistGeoVisibilitySnapshotForSet(
		required,
		query.setId,
		requestId,
		actor.userId
	);
	return {
		run,
		observation: {
			...observation,
			mentionOnly: mentionIsNotCitation(measured),
			stale: freshness.stale,
			freshnessLabel: freshness.label,
			freshnessDetail: freshness.detail,
			citations
		},
		generativeMeasurement: measured,
		geoReport: snapshot.report
	};
}

export async function refreshGeoVisibilitySnapshot(
	actor: Actor,
	ctx: TenantContext,
	requestId: string
) {
	requireCapability(actor.permissions, 'seo.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`search-geo-snapshot:${required.clientId}`, 8, 60_000);
	const sets = await listGeoQuerySetsForTenant(required);
	const set = sets.find((row) => row.slug === 'commercial-baseline') ?? sets[0];
	if (!set) {
		return { report: emptyGeoReport(0) };
	}
	return persistGeoVisibilitySnapshotForSet(required, set.id, requestId, actor.userId);
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
