import { and, desc, eq } from 'drizzle-orm';
import {
	assertSameClient,
	requireTenantContext,
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
