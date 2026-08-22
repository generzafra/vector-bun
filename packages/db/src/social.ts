import { and, desc, eq, lte } from 'drizzle-orm';
import {
	assertSameClient,
	requireTenantContext,
	type SocialPlatform,
	type SocialPostStatus,
	type TenantContext
} from '@vector/contracts';
import { db } from './client';
import {
	leadSources,
	leads,
	socialAccounts,
	socialConnections,
	socialMetrics,
	socialPosts,
	socialPublications
} from './schema';

type SocialPublicationStatus = 'queued' | 'publishing' | 'published' | 'failed';

export function assertSocialClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function listSocialConnectionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(socialConnections)
		.where(eq(socialConnections.clientId, required.clientId))
		.orderBy(desc(socialConnections.createdAt));
}

export async function getSocialConnectionForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(socialConnections)
		.where(and(eq(socialConnections.id, id), eq(socialConnections.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function getSocialConnectionByPlatformForTenant(
	ctx: TenantContext,
	platform: SocialPlatform
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(socialConnections)
		.where(
			and(
				eq(socialConnections.clientId, required.clientId),
				eq(socialConnections.platform, platform)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function upsertSocialConnectionForTenant(
	ctx: TenantContext,
	input: {
		platform: SocialPlatform;
		encryptedAccessToken: string;
		encryptedRefreshToken?: string | null;
		status: 'pending' | 'active' | 'expired' | 'revoked';
		tokenExpiresAt?: Date | null;
		lastValidatedAt?: Date | null;
		lastError?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const existing = await getSocialConnectionByPlatformForTenant(required, input.platform);
	if (existing) {
		const [row] = await db
			.update(socialConnections)
			.set({
				encryptedAccessToken: input.encryptedAccessToken,
				encryptedRefreshToken: input.encryptedRefreshToken ?? existing.encryptedRefreshToken,
				status: input.status,
				tokenExpiresAt:
					input.tokenExpiresAt !== undefined ? input.tokenExpiresAt : existing.tokenExpiresAt,
				lastValidatedAt: input.lastValidatedAt ?? existing.lastValidatedAt,
				lastError: input.lastError ?? null,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(socialConnections.id, existing.id),
					eq(socialConnections.clientId, required.clientId)
				)
			)
			.returning();
		return row;
	}
	const [row] = await db
		.insert(socialConnections)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			platform: input.platform,
			encryptedAccessToken: input.encryptedAccessToken,
			encryptedRefreshToken: input.encryptedRefreshToken ?? null,
			status: input.status,
			tokenExpiresAt: input.tokenExpiresAt ?? null,
			lastValidatedAt: input.lastValidatedAt ?? null,
			lastError: input.lastError ?? null
		})
		.returning();
	return row;
}

export async function listSocialAccountsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(socialAccounts)
		.where(eq(socialAccounts.clientId, required.clientId))
		.orderBy(desc(socialAccounts.createdAt));
}

export async function listRequiredSocialAccountsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			account: socialAccounts,
			connection: socialConnections
		})
		.from(socialAccounts)
		.innerJoin(socialConnections, eq(socialConnections.id, socialAccounts.connectionId))
		.where(and(eq(socialAccounts.clientId, required.clientId), eq(socialAccounts.required, true)));
}

export async function getSocialAccountForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(socialAccounts)
		.where(and(eq(socialAccounts.id, id), eq(socialAccounts.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function upsertSocialAccountForTenant(
	ctx: TenantContext,
	input: {
		connectionId: string;
		platform: SocialPlatform;
		externalAccountId: string;
		handle: string;
		displayName: string;
		required: boolean;
	}
) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(socialAccounts)
		.where(
			and(
				eq(socialAccounts.connectionId, input.connectionId),
				eq(socialAccounts.clientId, required.clientId)
			)
		)
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(socialAccounts)
			.set({
				externalAccountId: input.externalAccountId,
				handle: input.handle,
				displayName: input.displayName,
				required: input.required,
				status: 'active',
				updatedAt: new Date()
			})
			.where(
				and(eq(socialAccounts.id, existing.id), eq(socialAccounts.clientId, required.clientId))
			)
			.returning();
		return row;
	}
	const [row] = await db
		.insert(socialAccounts)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function listSocialPostsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(socialPosts)
		.where(eq(socialPosts.clientId, required.clientId))
		.orderBy(desc(socialPosts.createdAt));
}

export async function getSocialPostForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(socialPosts)
		.where(and(eq(socialPosts.id, id), eq(socialPosts.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function insertSocialPostForTenant(
	ctx: TenantContext,
	input: {
		status: 'idea' | 'draft';
		body: string;
		assetId?: string | null;
		assetVersionId?: string | null;
		similarityHash: string;
		createdBy?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(socialPosts)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			status: input.status,
			body: input.body,
			assetId: input.assetId ?? null,
			assetVersionId: input.assetVersionId ?? null,
			similarityHash: input.similarityHash,
			createdBy: input.createdBy ?? null
		})
		.returning();
	return row;
}

export async function updateSocialPostForTenant(
	ctx: TenantContext,
	id: string,
	input: Partial<{
		status: SocialPostStatus;
		scheduledAt: Date | null;
		approvedBy: string | null;
		approvedAt: Date | null;
	}>
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(socialPosts)
		.set({ ...input, updatedAt: new Date() })
		.where(and(eq(socialPosts.id, id), eq(socialPosts.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function countRecentPublicationsForPlatform(
	ctx: TenantContext,
	platform: SocialPlatform,
	since: Date
) {
	const required = requireTenantContext(ctx);
	const rows = await db
		.select({
			id: socialPublications.id,
			createdAt: socialPublications.createdAt,
			status: socialPublications.status
		})
		.from(socialPublications)
		.where(
			and(
				eq(socialPublications.clientId, required.clientId),
				eq(socialPublications.platform, platform)
			)
		);
	return rows.filter(
		(row) => (row.status === 'published' || row.status === 'publishing') && row.createdAt >= since
	).length;
}

export async function countSimilarPublishedPosts(ctx: TenantContext, hash: string, since: Date) {
	const required = requireTenantContext(ctx);
	const rows = await db
		.select({
			id: socialPosts.id,
			status: socialPosts.status,
			createdAt: socialPosts.createdAt,
			similarityHash: socialPosts.similarityHash
		})
		.from(socialPosts)
		.where(and(eq(socialPosts.clientId, required.clientId), eq(socialPosts.similarityHash, hash)));
	return rows.filter(
		(row) => (row.status === 'published' || row.status === 'publishing') && row.createdAt >= since
	).length;
}

export async function listSocialPublicationsForTenant(ctx: TenantContext, postId?: string) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(socialPublications)
		.where(
			postId
				? and(
						eq(socialPublications.clientId, required.clientId),
						eq(socialPublications.postId, postId)
					)
				: eq(socialPublications.clientId, required.clientId)
		)
		.orderBy(desc(socialPublications.createdAt));
}

export async function getSocialPublicationByIdempotency(ctx: TenantContext, key: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(socialPublications)
		.where(
			and(
				eq(socialPublications.clientId, required.clientId),
				eq(socialPublications.idempotencyKey, key)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function insertSocialPublicationForTenant(
	ctx: TenantContext,
	input: {
		postId: string;
		accountId: string;
		connectionId: string;
		platform: SocialPlatform;
		status: SocialPublicationStatus;
		contentVersion: number;
		assetVersionId?: string | null;
		idempotencyKey: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(socialPublications)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function updateSocialPublicationForTenant(
	ctx: TenantContext,
	id: string,
	input: Partial<{
		status: SocialPublicationStatus;
		providerPostId: string | null;
		error: string | null;
		publishedAt: Date | null;
	}>
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(socialPublications)
		.set({ ...input, updatedAt: new Date() })
		.where(and(eq(socialPublications.id, id), eq(socialPublications.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function insertSocialMetricsForTenant(
	ctx: TenantContext,
	input: {
		publicationId: string;
		impressions: number;
		likes: number;
		comments: number;
		shares: number;
		clicks: number;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(socialMetrics)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function patchSocialConnectionForTenant(
	ctx: TenantContext,
	id: string,
	input: Partial<{
		encryptedAccessToken: string | null;
		encryptedRefreshToken: string | null;
		status: 'pending' | 'active' | 'expired' | 'revoked';
		tokenExpiresAt: Date | null;
		lastValidatedAt: Date | null;
		lastError: string | null;
	}>
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(socialConnections)
		.set({ ...input, updatedAt: new Date() })
		.where(and(eq(socialConnections.id, id), eq(socialConnections.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function listDueScheduledPosts(now = new Date()) {
	return db
		.select({
			organizationId: socialPosts.organizationId,
			clientId: socialPosts.clientId,
			id: socialPosts.id
		})
		.from(socialPosts)
		.where(and(eq(socialPosts.status, 'scheduled'), lte(socialPosts.scheduledAt, now)));
}

export async function listDueScheduledPostsForTenant(ctx: TenantContext, now = new Date()) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(socialPosts)
		.where(
			and(
				eq(socialPosts.clientId, required.clientId),
				eq(socialPosts.status, 'scheduled'),
				lte(socialPosts.scheduledAt, now)
			)
		);
}

export async function listTenantsWithDueSocialPosts(now = new Date()) {
	return db
		.selectDistinct({
			organizationId: socialPosts.organizationId,
			clientId: socialPosts.clientId
		})
		.from(socialPosts)
		.where(and(eq(socialPosts.status, 'scheduled'), lte(socialPosts.scheduledAt, now)));
}

export async function listPublishedSocialPublicationsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(socialPublications)
		.where(
			and(
				eq(socialPublications.clientId, required.clientId),
				eq(socialPublications.status, 'published')
			)
		)
		.orderBy(desc(socialPublications.publishedAt));
}

export async function listSocialMetricsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(socialMetrics)
		.where(eq(socialMetrics.clientId, required.clientId))
		.orderBy(desc(socialMetrics.fetchedAt));
}

export async function listLeadsAttributedToSocialContent(ctx: TenantContext, utmContent: string) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			leadId: leads.id,
			source: leadSources.utmSource,
			medium: leadSources.utmMedium,
			content: leadSources.utmContent,
			createdAt: leads.createdAt
		})
		.from(leads)
		.innerJoin(leadSources, eq(leadSources.id, leads.sourceId))
		.where(
			and(
				eq(leads.clientId, required.clientId),
				eq(leadSources.utmMedium, 'social'),
				eq(leadSources.utmContent, utmContent)
			)
		)
		.orderBy(desc(leads.createdAt));
}

export async function listSocialAttributedLeadsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			leadId: leads.id,
			source: leadSources.utmSource,
			medium: leadSources.utmMedium,
			content: leadSources.utmContent,
			createdAt: leads.createdAt
		})
		.from(leads)
		.innerJoin(leadSources, eq(leadSources.id, leads.sourceId))
		.where(and(eq(leads.clientId, required.clientId), eq(leadSources.utmMedium, 'social')))
		.orderBy(desc(leads.createdAt));
}
