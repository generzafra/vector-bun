import { and, desc, eq } from 'drizzle-orm';
import {
	assertSameClient,
	requireTenantContext,
	type AnswerTargetIntent,
	type AnswerTargetSourceKind,
	type AnswerTargetStatus,
	type GeoAccuracy,
	type GeoCitationKind,
	type GeoMeasurementMethod,
	type GeoProminence,
	type GeoQueryGroup,
	type GeoQuerySourceKind,
	type GeoSurface,
	type SchemaEntityKind,
	type SchemaEntitySourceKind,
	type SchemaEntityStatus,
	type SearchEngine,
	type SeoEffort,
	type SeoEvidenceClass,
	type SeoOpportunityChannel,
	type SeoOpportunityStatus,
	type SeoSourceKind,
	type TenantContext
} from '@vector/contracts';
import { db } from './client';
import {
	answerTargets,
	contentBriefs,
	geoCitations,
	geoEngineObservations,
	geoMeasurementRuns,
	geoQueries,
	geoQuerySets,
	schemaEntities,
	seoAudits,
	seoIssues,
	seoKeywords,
	seoOpportunities,
	seoPages,
	seoProperties,
	seoQueries
} from './schema';

export function assertSearchClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function listSeoPropertiesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(seoProperties)
		.where(eq(seoProperties.clientId, required.clientId))
		.orderBy(desc(seoProperties.createdAt));
}

export async function getSeoPropertyForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(seoProperties)
		.where(and(eq(seoProperties.id, id), eq(seoProperties.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function getSeoPropertyByEngineSiteForTenant(
	ctx: TenantContext,
	engine: SearchEngine,
	siteUrl: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(seoProperties)
		.where(
			and(
				eq(seoProperties.clientId, required.clientId),
				eq(seoProperties.engine, engine),
				eq(seoProperties.siteUrl, siteUrl)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function upsertSeoPropertyForTenant(
	ctx: TenantContext,
	input: {
		engine: SearchEngine;
		siteUrl: string;
		encryptedCredential: string;
		status: 'pending' | 'active' | 'expired' | 'revoked';
		lastValidatedAt?: Date | null;
		lastError?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const existing = await getSeoPropertyByEngineSiteForTenant(required, input.engine, input.siteUrl);
	if (existing) {
		const [row] = await db
			.update(seoProperties)
			.set({
				encryptedCredential: input.encryptedCredential,
				status: input.status,
				lastValidatedAt:
					input.lastValidatedAt !== undefined ? input.lastValidatedAt : existing.lastValidatedAt,
				lastError: input.lastError ?? null,
				updatedAt: new Date()
			})
			.where(and(eq(seoProperties.id, existing.id), eq(seoProperties.clientId, required.clientId)))
			.returning();
		return row;
	}
	const [row] = await db
		.insert(seoProperties)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			engine: input.engine,
			siteUrl: input.siteUrl,
			encryptedCredential: input.encryptedCredential,
			status: input.status,
			lastValidatedAt: input.lastValidatedAt ?? null,
			lastError: input.lastError ?? null
		})
		.returning();
	return row;
}

export async function patchSeoPropertyForTenant(
	ctx: TenantContext,
	id: string,
	input: {
		status?: 'pending' | 'active' | 'expired' | 'revoked';
		lastValidatedAt?: Date | null;
		lastSyncedAt?: Date | null;
		lastError?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(seoProperties)
		.set({
			...input,
			updatedAt: new Date()
		})
		.where(and(eq(seoProperties.id, id), eq(seoProperties.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function listSeoPagesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(seoPages)
		.where(eq(seoPages.clientId, required.clientId))
		.orderBy(seoPages.path);
}

export async function upsertSeoPageForTenant(
	ctx: TenantContext,
	input: {
		path: string;
		pageId?: string | null;
		propertyId?: string | null;
		url?: string | null;
		title?: string | null;
		clicks?: number;
		impressions?: number;
		ctrBps?: number;
		positionMilli?: number;
		lastSeenAt?: Date | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(seoPages)
		.where(and(eq(seoPages.clientId, required.clientId), eq(seoPages.path, input.path)))
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(seoPages)
			.set({
				pageId: input.pageId ?? existing.pageId,
				propertyId: input.propertyId ?? existing.propertyId,
				url: input.url ?? existing.url,
				title: input.title ?? existing.title,
				clicks: input.clicks ?? existing.clicks,
				impressions: input.impressions ?? existing.impressions,
				ctrBps: input.ctrBps ?? existing.ctrBps,
				positionMilli: input.positionMilli ?? existing.positionMilli,
				lastSeenAt: input.lastSeenAt ?? existing.lastSeenAt,
				updatedAt: new Date()
			})
			.where(and(eq(seoPages.id, existing.id), eq(seoPages.clientId, required.clientId)))
			.returning();
		return row;
	}
	const [row] = await db
		.insert(seoPages)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			path: input.path,
			pageId: input.pageId ?? null,
			propertyId: input.propertyId ?? null,
			url: input.url ?? null,
			title: input.title ?? null,
			clicks: input.clicks ?? 0,
			impressions: input.impressions ?? 0,
			ctrBps: input.ctrBps ?? 0,
			positionMilli: input.positionMilli ?? 0,
			lastSeenAt: input.lastSeenAt ?? null
		})
		.returning();
	return row;
}

export async function listSeoKeywordsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(seoKeywords)
		.where(eq(seoKeywords.clientId, required.clientId))
		.orderBy(seoKeywords.phrase);
}

export async function upsertSeoKeywordForTenant(
	ctx: TenantContext,
	input: { phrase: string; locale?: string }
) {
	const required = requireTenantContext(ctx);
	const locale = input.locale ?? 'en';
	const [existing] = await db
		.select()
		.from(seoKeywords)
		.where(
			and(
				eq(seoKeywords.clientId, required.clientId),
				eq(seoKeywords.phrase, input.phrase),
				eq(seoKeywords.locale, locale)
			)
		)
		.limit(1);
	if (existing) return existing;
	const [row] = await db
		.insert(seoKeywords)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			phrase: input.phrase,
			locale
		})
		.returning();
	return row;
}

export async function listSeoQueriesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(seoQueries)
		.where(eq(seoQueries.clientId, required.clientId))
		.orderBy(desc(seoQueries.impressions));
}

export async function getSeoQueryForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(seoQueries)
		.where(and(eq(seoQueries.id, id), eq(seoQueries.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function upsertSeoQueryForTenant(
	ctx: TenantContext,
	input: {
		propertyId: string;
		keywordId?: string | null;
		query: string;
		pageUrl?: string;
		clicks: number;
		impressions: number;
		ctrBps: number;
		positionMilli: number;
		date: string;
		country?: string;
		device?: string;
	}
) {
	const required = requireTenantContext(ctx);
	const pageUrl = input.pageUrl ?? '';
	const country = input.country ?? '';
	const device = input.device ?? '';
	const [existing] = await db
		.select()
		.from(seoQueries)
		.where(
			and(
				eq(seoQueries.clientId, required.clientId),
				eq(seoQueries.propertyId, input.propertyId),
				eq(seoQueries.query, input.query),
				eq(seoQueries.pageUrl, pageUrl),
				eq(seoQueries.date, input.date),
				eq(seoQueries.country, country),
				eq(seoQueries.device, device)
			)
		)
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(seoQueries)
			.set({
				keywordId: input.keywordId ?? existing.keywordId,
				clicks: input.clicks,
				impressions: input.impressions,
				ctrBps: input.ctrBps,
				positionMilli: input.positionMilli,
				updatedAt: new Date()
			})
			.where(and(eq(seoQueries.id, existing.id), eq(seoQueries.clientId, required.clientId)))
			.returning();
		return row;
	}
	const [row] = await db
		.insert(seoQueries)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			propertyId: input.propertyId,
			keywordId: input.keywordId ?? null,
			query: input.query,
			pageUrl,
			clicks: input.clicks,
			impressions: input.impressions,
			ctrBps: input.ctrBps,
			positionMilli: input.positionMilli,
			date: input.date,
			country,
			device
		})
		.returning();
	return row;
}

export async function insertSeoAuditForTenant(
	ctx: TenantContext,
	input: {
		kind?: 'technical';
		status: 'completed' | 'failed';
		summary: string;
		startedAt: Date;
		completedAt?: Date | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(seoAudits)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			kind: input.kind ?? 'technical',
			status: input.status,
			summary: input.summary,
			startedAt: input.startedAt,
			completedAt: input.completedAt ?? null
		})
		.returning();
	return row;
}

export async function listSeoAuditsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(seoAudits)
		.where(eq(seoAudits.clientId, required.clientId))
		.orderBy(desc(seoAudits.createdAt));
}

export async function insertSeoIssueForTenant(
	ctx: TenantContext,
	input: {
		auditId: string;
		pageId?: string | null;
		path?: string | null;
		code: string;
		severity: 'low' | 'medium' | 'high';
		evidenceClass: SeoEvidenceClass;
		detail: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(seoIssues)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			auditId: input.auditId,
			pageId: input.pageId ?? null,
			path: input.path ?? null,
			code: input.code,
			severity: input.severity,
			evidenceClass: input.evidenceClass,
			detail: input.detail
		})
		.returning();
	return row;
}

export async function listSeoIssuesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(seoIssues)
		.where(eq(seoIssues.clientId, required.clientId))
		.orderBy(desc(seoIssues.createdAt));
}

export async function getSeoIssueForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(seoIssues)
		.where(and(eq(seoIssues.id, id), eq(seoIssues.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function listSeoOpportunitiesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(seoOpportunities)
		.where(eq(seoOpportunities.clientId, required.clientId))
		.orderBy(desc(seoOpportunities.priority), desc(seoOpportunities.createdAt));
}

export async function getSeoOpportunityForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(seoOpportunities)
		.where(and(eq(seoOpportunities.id, id), eq(seoOpportunities.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function insertSeoOpportunityForTenant(
	ctx: TenantContext,
	input: {
		channel: SeoOpportunityChannel;
		title: string;
		problem: string;
		proposedAction: string;
		evidenceClass: SeoEvidenceClass;
		sourceKind: SeoSourceKind;
		sourceId: string;
		pageId?: string | null;
		queryId?: string | null;
		priority: number;
		effort: SeoEffort;
		status?: SeoOpportunityStatus;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(seoOpportunities)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			channel: input.channel,
			title: input.title,
			problem: input.problem,
			proposedAction: input.proposedAction,
			evidenceClass: input.evidenceClass,
			sourceKind: input.sourceKind,
			sourceId: input.sourceId,
			pageId: input.pageId ?? null,
			queryId: input.queryId ?? null,
			priority: input.priority,
			effort: input.effort,
			status: input.status ?? 'proposed'
		})
		.returning();
	return row;
}

export async function updateSeoOpportunityForTenant(
	ctx: TenantContext,
	id: string,
	input: { status: SeoOpportunityStatus }
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(seoOpportunities)
		.set({ status: input.status, updatedAt: new Date() })
		.where(and(eq(seoOpportunities.id, id), eq(seoOpportunities.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function listSchemaEntitiesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(schemaEntities)
		.where(eq(schemaEntities.clientId, required.clientId))
		.orderBy(schemaEntities.name);
}

export async function upsertSchemaEntityForTenant(
	ctx: TenantContext,
	input: {
		kind: SchemaEntityKind;
		sourceKind: SchemaEntitySourceKind;
		sourceId: string;
		name: string;
		fact: string;
		status?: SchemaEntityStatus;
	}
) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(schemaEntities)
		.where(
			and(
				eq(schemaEntities.clientId, required.clientId),
				eq(schemaEntities.kind, input.kind),
				eq(schemaEntities.sourceKind, input.sourceKind),
				eq(schemaEntities.sourceId, input.sourceId)
			)
		)
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(schemaEntities)
			.set({
				name: input.name,
				fact: input.fact,
				status: input.status ?? 'current',
				updatedAt: new Date()
			})
			.where(
				and(eq(schemaEntities.id, existing.id), eq(schemaEntities.clientId, required.clientId))
			)
			.returning();
		return row;
	}
	const [row] = await db
		.insert(schemaEntities)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			kind: input.kind,
			sourceKind: input.sourceKind,
			sourceId: input.sourceId,
			name: input.name,
			fact: input.fact,
			status: input.status ?? 'current'
		})
		.returning();
	return row;
}

export async function markMissingSchemaEntitiesStaleForTenant(
	ctx: TenantContext,
	keepIds: string[]
) {
	const required = requireTenantContext(ctx);
	const rows = await listSchemaEntitiesForTenant(required);
	const kept = new Set(keepIds);
	const stale = [];
	for (const row of rows) {
		if (kept.has(row.id) || row.status === 'stale') continue;
		const [updated] = await db
			.update(schemaEntities)
			.set({ status: 'stale', updatedAt: new Date() })
			.where(and(eq(schemaEntities.id, row.id), eq(schemaEntities.clientId, required.clientId)))
			.returning();
		if (updated) stale.push(updated);
	}
	return stale;
}

export async function listAnswerTargetsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(answerTargets)
		.where(eq(answerTargets.clientId, required.clientId))
		.orderBy(answerTargets.question);
}

export async function upsertAnswerTargetForTenant(
	ctx: TenantContext,
	input: {
		sourceKind: AnswerTargetSourceKind;
		sourceId: string;
		intent: AnswerTargetIntent;
		question: string;
		answer: string;
		pageId?: string | null;
		status: AnswerTargetStatus;
	}
) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(answerTargets)
		.where(
			and(
				eq(answerTargets.clientId, required.clientId),
				eq(answerTargets.sourceKind, input.sourceKind),
				eq(answerTargets.sourceId, input.sourceId),
				eq(answerTargets.intent, input.intent)
			)
		)
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(answerTargets)
			.set({
				question: input.question,
				answer: input.answer,
				pageId: input.pageId ?? null,
				status: input.status,
				updatedAt: new Date()
			})
			.where(and(eq(answerTargets.id, existing.id), eq(answerTargets.clientId, required.clientId)))
			.returning();
		return row;
	}
	const [row] = await db
		.insert(answerTargets)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			sourceKind: input.sourceKind,
			sourceId: input.sourceId,
			intent: input.intent,
			question: input.question,
			answer: input.answer,
			pageId: input.pageId ?? null,
			status: input.status
		})
		.returning();
	return row;
}

export async function listContentBriefsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(contentBriefs)
		.where(eq(contentBriefs.clientId, required.clientId))
		.orderBy(desc(contentBriefs.createdAt));
}

export async function upsertContentBriefForTenant(
	ctx: TenantContext,
	input: {
		answerTargetId: string;
		claimId?: string | null;
		pageId?: string | null;
		title: string;
		problem: string;
		proposedAction: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(contentBriefs)
		.where(
			and(
				eq(contentBriefs.clientId, required.clientId),
				eq(contentBriefs.answerTargetId, input.answerTargetId)
			)
		)
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(contentBriefs)
			.set({
				claimId: input.claimId ?? null,
				pageId: input.pageId ?? null,
				title: input.title,
				problem: input.problem,
				proposedAction: input.proposedAction,
				updatedAt: new Date()
			})
			.where(and(eq(contentBriefs.id, existing.id), eq(contentBriefs.clientId, required.clientId)))
			.returning();
		return row;
	}
	const [row] = await db
		.insert(contentBriefs)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			answerTargetId: input.answerTargetId,
			claimId: input.claimId ?? null,
			pageId: input.pageId ?? null,
			title: input.title,
			problem: input.problem,
			proposedAction: input.proposedAction
		})
		.returning();
	return row;
}

export async function listGeoQuerySetsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(geoQuerySets)
		.where(eq(geoQuerySets.clientId, required.clientId))
		.orderBy(desc(geoQuerySets.createdAt));
}

export async function upsertGeoQuerySetForTenant(
	ctx: TenantContext,
	input: { slug: string; name: string; purpose?: string; language?: string }
) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(geoQuerySets)
		.where(and(eq(geoQuerySets.clientId, required.clientId), eq(geoQuerySets.slug, input.slug)))
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(geoQuerySets)
			.set({
				name: input.name,
				purpose: input.purpose ?? existing.purpose,
				language: input.language ?? existing.language,
				status: 'active',
				updatedAt: new Date()
			})
			.where(and(eq(geoQuerySets.id, existing.id), eq(geoQuerySets.clientId, required.clientId)))
			.returning();
		return row;
	}
	const [row] = await db
		.insert(geoQuerySets)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			slug: input.slug,
			name: input.name,
			purpose: input.purpose ?? 'commercial_baseline',
			language: input.language ?? 'en'
		})
		.returning();
	return row;
}

export async function listGeoQueriesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(geoQueries)
		.where(eq(geoQueries.clientId, required.clientId))
		.orderBy(geoQueries.priority, geoQueries.query);
}

export async function getGeoQueryForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(geoQueries)
		.where(and(eq(geoQueries.id, id), eq(geoQueries.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function upsertGeoQueryForTenant(
	ctx: TenantContext,
	input: {
		setId: string;
		query: string;
		group: GeoQueryGroup;
		sourceKind: GeoQuerySourceKind;
		sourceId: string;
		locale?: string;
		country?: string;
		language?: string;
		priority: number;
	}
) {
	const required = requireTenantContext(ctx);
	const locale = input.locale ?? 'en';
	const [existing] = await db
		.select()
		.from(geoQueries)
		.where(
			and(
				eq(geoQueries.clientId, required.clientId),
				eq(geoQueries.setId, input.setId),
				eq(geoQueries.query, input.query),
				eq(geoQueries.locale, locale)
			)
		)
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(geoQueries)
			.set({
				group: input.group,
				sourceKind: input.sourceKind,
				sourceId: input.sourceId,
				country: input.country ?? existing.country,
				language: input.language ?? existing.language,
				priority: input.priority,
				updatedAt: new Date()
			})
			.where(and(eq(geoQueries.id, existing.id), eq(geoQueries.clientId, required.clientId)))
			.returning();
		return row;
	}
	const [row] = await db
		.insert(geoQueries)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			setId: input.setId,
			query: input.query,
			group: input.group,
			sourceKind: input.sourceKind,
			sourceId: input.sourceId,
			locale,
			country: input.country ?? '',
			language: input.language ?? 'en',
			priority: input.priority
		})
		.returning();
	return row;
}

export async function insertGeoMeasurementRunForTenant(
	ctx: TenantContext,
	input: {
		setId: string;
		method: GeoMeasurementMethod;
		costMinor: number;
		currency: string;
		startedAt: Date;
		completedAt?: Date | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(geoMeasurementRuns)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			setId: input.setId,
			method: input.method,
			costMinor: input.costMinor,
			currency: input.currency,
			startedAt: input.startedAt,
			completedAt: input.completedAt ?? null
		})
		.returning();
	return row;
}

export async function listGeoObservationsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(geoEngineObservations)
		.where(eq(geoEngineObservations.clientId, required.clientId))
		.orderBy(desc(geoEngineObservations.observedAt));
}

export async function insertGeoObservationForTenant(
	ctx: TenantContext,
	input: {
		runId: string;
		queryId: string;
		engine: GeoSurface;
		method: GeoMeasurementMethod;
		evidenceClass?: SeoEvidenceClass;
		mentioned: boolean;
		ownedCitation: boolean;
		earnedCitation: boolean;
		represented: boolean;
		accurate: GeoAccuracy;
		prominence: GeoProminence;
		confidence: number;
		detail?: string | null;
		observedAt?: Date;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(geoEngineObservations)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			runId: input.runId,
			queryId: input.queryId,
			engine: input.engine,
			method: input.method,
			evidenceClass: input.evidenceClass ?? 'observed',
			mentioned: input.mentioned,
			ownedCitation: input.ownedCitation,
			earnedCitation: input.earnedCitation,
			represented: input.represented,
			accurate: input.accurate,
			prominence: input.prominence,
			confidence: input.confidence,
			detail: input.detail ?? null,
			observedAt: input.observedAt ?? new Date()
		})
		.returning();
	return row;
}

export async function listGeoCitationsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(geoCitations)
		.where(eq(geoCitations.clientId, required.clientId))
		.orderBy(desc(geoCitations.createdAt));
}

export async function insertGeoCitationForTenant(
	ctx: TenantContext,
	input: {
		observationId: string;
		kind: GeoCitationKind;
		url?: string | null;
		domain?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(geoCitations)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			observationId: input.observationId,
			kind: input.kind,
			url: input.url ?? null,
			domain: input.domain ?? null
		})
		.returning();
	return row;
}
