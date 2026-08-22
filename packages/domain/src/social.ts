import { consumeRateLimit, requireCapability } from '@vector/auth';
import {
	SOCIAL_PUBLISH_WORKFLOW,
	socialDueSweepInputSchema,
	socialPublishInputSchema,
	workflowRuntime
} from '@vector/automation';
import { env } from '@vector/config';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	createSocialPostSchema,
	parseContract,
	publishSocialPostSchema,
	refreshSocialConnectionSchema,
	scheduleSocialPostSchema,
	socialClientIdSchema,
	socialPostIdSchema,
	transitionSocialPostSchema,
	upsertSocialConnectionSchema,
	SOCIAL_PLATFORMS,
	type SocialPlatform,
	type SocialPostStatus,
	type TenantContext
} from '@vector/contracts';
import {
	assertSocialClient,
	countRecentPublicationsForPlatform,
	countSimilarPublishedPosts,
	getSocialAccountForTenant,
	getSocialConnectionForTenant,
	getSocialPostForTenant,
	getSocialPublicationByIdempotency,
	insertSocialMetricsForTenant,
	insertSocialPostForTenant,
	insertSocialPublicationForTenant,
	getCreativeAssetRightsForTenant,
	listCreativeAssetsForTenant,
	listDueScheduledPostsForTenant,
	listPublishedSocialPublicationsForTenant,
	listRequiredSocialAccountsForTenant,
	listSocialAccountsForTenant,
	listSocialAttributedLeadsForTenant,
	listSocialConnectionsForTenant,
	listSocialMetricsForTenant,
	listSocialPostsForTenant,
	listSocialPublicationsForTenant,
	patchSocialConnectionForTenant,
	updateSocialPostForTenant,
	updateSocialPublicationForTenant,
	upsertSocialAccountForTenant,
	upsertSocialConnectionForTenant
} from '@vector/db';
import { logError, logInfo } from '@vector/observability';
import {
	SOCIAL_SIMILARITY_WINDOW_DAYS,
	assertFrequencyAllowed,
	assertNotSimilar,
	decryptSecret,
	encryptSecret,
	memorySocialProvider,
	parseSocialAttributionContent,
	resetSocialProvider,
	setSocialProvider,
	similarityHash,
	socialAttributionParams,
	socialProvider,
	type SocialProvider
} from '@vector/social';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { publicCreativeAsset, resolveAttachableCreativeAsset } from './creative';
import { dispatchWorkflow } from './workflows';

const TOKEN_REFRESH_SKEW_MS = 5 * 60_000;

const ALLOWED_TRANSITIONS: Record<SocialPostStatus, SocialPostStatus[]> = {
	idea: ['draft', 'archived'],
	draft: ['reviewed', 'archived'],
	reviewed: ['approved', 'draft', 'archived'],
	approved: ['scheduled', 'archived'],
	scheduled: ['archived'],
	publishing: [],
	published: ['archived'],
	failed: ['approved', 'archived'],
	archived: []
};

const providerOverrides = new Map<SocialPlatform, SocialProvider>();

export function setDomainSocialProvider(platform: SocialPlatform, provider: SocialProvider) {
	providerOverrides.set(platform, provider);
	setSocialProvider(platform, provider);
}

export function getDomainSocialProvider(platform: SocialPlatform) {
	return providerOverrides.get(platform) ?? socialProvider(platform);
}

export function resetDomainSocialProvider() {
	providerOverrides.clear();
	resetSocialProvider();
}

export { memorySocialProvider };

function publicConnection(row: {
	id: string;
	platform: SocialPlatform;
	status: string;
	tokenExpiresAt?: Date | null;
	lastValidatedAt: Date | null;
	lastError: string | null;
	createdAt: Date;
	updatedAt: Date;
}) {
	return {
		id: row.id,
		platform: row.platform,
		status: row.status,
		tokenExpiresAt: row.tokenExpiresAt ?? null,
		lastValidatedAt: row.lastValidatedAt,
		lastError: row.lastError,
		createdAt: row.createdAt,
		updatedAt: row.updatedAt
	};
}

async function decryptAccessToken(ciphertext: string | null) {
	if (!ciphertext) throw new ValidationError('Social connection has no access token');
	return decryptSecret(env.TOKEN_ENCRYPTION_KEY, ciphertext);
}

function needsTokenRefresh(tokenExpiresAt: Date | null | undefined, now = new Date()) {
	return Boolean(
		tokenExpiresAt && tokenExpiresAt.getTime() <= now.getTime() + TOKEN_REFRESH_SKEW_MS
	);
}

async function persistRefreshResult(
	ctx: TenantContext,
	connection: NonNullable<Awaited<ReturnType<typeof getSocialConnectionForTenant>>>,
	result: Awaited<ReturnType<SocialProvider['refreshConnection']>>
) {
	if (!result.ok || !result.accessToken) {
		await patchSocialConnectionForTenant(ctx, connection.id, {
			status: 'expired',
			lastError: result.detail
		});
		return null;
	}
	return patchSocialConnectionForTenant(ctx, connection.id, {
		encryptedAccessToken: encryptSecret(env.TOKEN_ENCRYPTION_KEY, result.accessToken),
		encryptedRefreshToken: result.refreshToken
			? encryptSecret(env.TOKEN_ENCRYPTION_KEY, result.refreshToken)
			: connection.encryptedRefreshToken,
		status: 'active',
		tokenExpiresAt: result.expiresAt ?? null,
		lastValidatedAt: new Date(),
		lastError: null
	});
}

async function refreshStoredConnection(
	ctx: TenantContext,
	connection: NonNullable<Awaited<ReturnType<typeof getSocialConnectionForTenant>>>
) {
	if (!connection.encryptedRefreshToken) {
		await patchSocialConnectionForTenant(ctx, connection.id, {
			status: 'expired',
			lastError: 'Refresh token is missing'
		});
		throw new ValidationError(`${connection.platform} connection has no refresh token`);
	}
	const result = await getDomainSocialProvider(connection.platform).refreshConnection({
		clientId: ctx.clientId,
		platform: connection.platform,
		refreshToken: decryptSecret(env.TOKEN_ENCRYPTION_KEY, connection.encryptedRefreshToken)
	});
	const updated = await persistRefreshResult(ctx, connection, result);
	if (!updated) {
		throw new ValidationError(result.detail);
	}
	return updated;
}

async function ensureFreshAccessToken(
	ctx: TenantContext,
	connection: NonNullable<Awaited<ReturnType<typeof getSocialConnectionForTenant>>>
) {
	if (!needsTokenRefresh(connection.tokenExpiresAt)) return connection;
	return refreshStoredConnection(ctx, connection);
}

export async function socialAccessReadiness(ctx: TenantContext) {
	const required = await listRequiredSocialAccountsForTenant(ctx);
	if (required.length === 0) {
		return {
			complete: false,
			notApplicable: true,
			blocking: false,
			detail: 'Social is not in this package'
		};
	}
	const ready = required.every(
		(row) => row.account.status === 'active' && row.connection.status === 'active'
	);
	return {
		complete: ready,
		notApplicable: false,
		blocking: true,
		detail: ready
			? `${required.length} required social account(s) connected`
			: 'Required social connection is missing'
	};
}

export async function getSocialOverview(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'social.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(socialClientIdSchema, { clientId });
		assertSocialClient(required, clientId);
	}
	const [connections, accounts, posts, publications, readiness, assets, metrics, attributed] =
		await Promise.all([
			listSocialConnectionsForTenant(required),
			listSocialAccountsForTenant(required),
			listSocialPostsForTenant(required),
			listSocialPublicationsForTenant(required),
			socialAccessReadiness(required),
			listCreativeAssetsForTenant(required),
			listSocialMetricsForTenant(required),
			listSocialAttributedLeadsForTenant(required)
		]);
	const latestMetrics = new Map<string, (typeof metrics)[number]>();
	for (const row of metrics) {
		if (!latestMetrics.has(row.publicationId)) latestMetrics.set(row.publicationId, row);
	}
	const tenantPostIds = new Set(posts.map((post) => post.id));
	const attributedByPost = new Map<string, typeof attributed>();
	for (const row of attributed) {
		const postId = parseSocialAttributionContent(row.content);
		if (!postId || !tenantPostIds.has(postId)) continue;
		const list = attributedByPost.get(postId) ?? [];
		list.push(row);
		attributedByPost.set(postId, list);
	}
	const creative = await Promise.all(
		assets.map(async (asset) => {
			const rights = await getCreativeAssetRightsForTenant(required, asset.id);
			return {
				...publicCreativeAsset(asset),
				rights: rights
					? { status: rights.rightsStatus, usageNotes: rights.usageNotes }
					: { status: 'unknown', usageNotes: null }
			};
		})
	);
	return {
		readiness,
		provider: {
			adapter: env.SOCIAL_ADAPTER,
			platforms: SOCIAL_PLATFORMS,
			detail: env.SOCIAL_PUBLISHING_PAUSED
				? 'Outbound social publishing is paused'
				: 'LinkedIn, X, Facebook, and Instagram adapters are registered'
		},
		paused: env.SOCIAL_PUBLISHING_PAUSED,
		creative,
		workflows: workflowRuntime().health(),
		connections: connections.map(publicConnection),
		accounts: accounts.map((account) => ({
			id: account.id,
			connectionId: account.connectionId,
			platform: account.platform,
			handle: account.handle,
			displayName: account.displayName,
			required: account.required,
			status: account.status
		})),
		posts: posts.map((post) => ({
			...post,
			tracking: accounts.map((account) => socialAttributionParams(account.platform, post.id)),
			attributedLeadCount: attributedByPost.get(post.id)?.length ?? 0
		})),
		publications: publications.map((row) => {
			const latest = latestMetrics.get(row.id);
			return {
				id: row.id,
				postId: row.postId,
				accountId: row.accountId,
				platform: row.platform,
				status: row.status,
				providerPostId: row.providerPostId,
				contentVersion: row.contentVersion,
				assetVersionId: row.assetVersionId,
				error: row.error,
				publishedAt: row.publishedAt,
				metrics: latest
					? {
							impressions: latest.impressions,
							likes: latest.likes,
							comments: latest.comments,
							shares: latest.shares,
							clicks: latest.clicks,
							fetchedAt: latest.fetchedAt
						}
					: null
			};
		}),
		attributedLeads: attributed.flatMap((row) => {
			const postId = parseSocialAttributionContent(row.content);
			if (!postId || !tenantPostIds.has(postId)) return [];
			return [{ leadId: row.leadId, postId, source: row.source, createdAt: row.createdAt }];
		})
	};
}

export async function upsertSocialConnection(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(upsertSocialConnectionSchema, input);
	const health = await getDomainSocialProvider(parsed.platform).validateConnection({
		accessToken: parsed.accessToken,
		externalAccountId: parsed.externalAccountId
	});
	const connection = await upsertSocialConnectionForTenant(required, {
		platform: parsed.platform,
		encryptedAccessToken: encryptSecret(env.TOKEN_ENCRYPTION_KEY, parsed.accessToken),
		encryptedRefreshToken: parsed.refreshToken
			? encryptSecret(env.TOKEN_ENCRYPTION_KEY, parsed.refreshToken)
			: null,
		status: health.ok ? 'active' : 'pending',
		lastValidatedAt: health.ok ? new Date() : null,
		lastError: health.ok ? null : health.detail
	});
	const account = await upsertSocialAccountForTenant(required, {
		connectionId: connection.id,
		platform: parsed.platform,
		externalAccountId: parsed.externalAccountId,
		handle: parsed.handle,
		displayName: parsed.displayName,
		required: parsed.required
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'social.connection.upsert',
		entityType: 'social_connection',
		entityId: connection.id,
		requestId,
		reason: parsed.platform
	});
	return { connection: publicConnection(connection), account, health };
}

export async function refreshSocialConnection(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(refreshSocialConnectionSchema, input);
	const connection = await getSocialConnectionForTenant(required, parsed.id);
	if (!connection) throw new NotFoundError('Social connection not found');
	const updated = await refreshStoredConnection(required, connection);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'social.connection.refresh',
		entityType: 'social_connection',
		entityId: updated.id,
		requestId
	});
	return { connection: publicConnection(updated) };
}

export async function createSocialPost(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(createSocialPostSchema, input);
	let assetId: string | null = null;
	let assetVersionId: string | null = null;
	if (parsed.assetId) {
		const attached = await resolveAttachableCreativeAsset(required, parsed.assetId);
		assetId = attached.asset.id;
		assetVersionId = attached.version.id;
	}
	const row = await insertSocialPostForTenant(required, {
		status: parsed.status,
		body: parsed.body,
		assetId,
		assetVersionId,
		similarityHash: similarityHash(parsed.body),
		createdBy: actor.userId
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'social.post.create',
		entityType: 'social_post',
		entityId: row.id,
		requestId
	});
	return row;
}

export async function transitionSocialPost(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(transitionSocialPostSchema, input);
	const post = await getSocialPostForTenant(required, parsed.id);
	if (!post) throw new NotFoundError('Social post not found');
	if (!ALLOWED_TRANSITIONS[post.status].includes(parsed.to)) {
		throw new ValidationError(`Cannot move a ${post.status} post to ${parsed.to}`);
	}
	const patch: Parameters<typeof updateSocialPostForTenant>[2] = { status: parsed.to };
	if (parsed.to === 'approved') {
		patch.approvedBy = actor.userId;
		patch.approvedAt = new Date();
	}
	const updated = await updateSocialPostForTenant(required, post.id, patch);
	if (!updated) throw new NotFoundError('Social post not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'social.post.transition',
		entityType: 'social_post',
		entityId: post.id,
		requestId,
		reason: `${post.status}->${parsed.to}`
	});
	return updated;
}

export async function scheduleSocialPost(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(scheduleSocialPostSchema, input);
	const post = await getSocialPostForTenant(required, parsed.id);
	if (!post) throw new NotFoundError('Social post not found');
	if (post.status !== 'approved') {
		throw new ValidationError('Only approved posts can be scheduled');
	}
	if (parsed.scheduledAt.getTime() <= Date.now()) {
		throw new ValidationError('Scheduled time must be in the future');
	}
	const updated = await updateSocialPostForTenant(required, post.id, {
		status: 'scheduled',
		scheduledAt: parsed.scheduledAt
	});
	if (!updated) throw new NotFoundError('Social post not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'social.post.schedule',
		entityType: 'social_post',
		entityId: post.id,
		requestId
	});
	return updated;
}

async function assertPublishablePost(ctx: TenantContext, postId: string) {
	const post = await getSocialPostForTenant(ctx, postId);
	if (!post) throw new NotFoundError('Social post not found');
	if (post.status !== 'approved' && post.status !== 'scheduled') {
		throw new ValidationError('Only approved or scheduled posts can publish');
	}
	if (post.assetId) {
		await resolveAttachableCreativeAsset(ctx, post.assetId);
	}
	const similarSince = new Date(Date.now() - SOCIAL_SIMILARITY_WINDOW_DAYS * 86_400_000);
	assertNotSimilar(await countSimilarPublishedPosts(ctx, post.similarityHash, similarSince));
	return post;
}

async function publishToAccount(
	ctx: TenantContext,
	post: NonNullable<Awaited<ReturnType<typeof getSocialPostForTenant>>>,
	accountId: string
) {
	const account = await getSocialAccountForTenant(ctx, accountId);
	if (!account) throw new NotFoundError('Social account not found');
	const connection = await getSocialConnectionForTenant(ctx, account.connectionId);
	if (!connection || connection.status !== 'active') {
		throw new ValidationError(`${account.platform} connection is not active`);
	}
	const fresh = await ensureFreshAccessToken(ctx, connection);
	if (fresh.status !== 'active') {
		throw new ValidationError(`${account.platform} connection is not active`);
	}
	const since = new Date(Date.now() - 86_400_000);
	assertFrequencyAllowed(await countRecentPublicationsForPlatform(ctx, account.platform, since));
	const idempotencyKey = `${post.id}:${account.id}`;
	const existing = await getSocialPublicationByIdempotency(ctx, idempotencyKey);
	if (existing?.status === 'published') return existing;
	const publication =
		existing ??
		(await insertSocialPublicationForTenant(ctx, {
			postId: post.id,
			accountId: account.id,
			connectionId: fresh.id,
			platform: account.platform,
			status: 'publishing',
			contentVersion: 1,
			assetVersionId: post.assetVersionId,
			idempotencyKey
		}));
	try {
		const accessToken = await decryptAccessToken(fresh.encryptedAccessToken);
		const result = await getDomainSocialProvider(account.platform).publish({
			clientId: ctx.clientId,
			publicationId: publication.id,
			idempotencyKey,
			platform: account.platform,
			accessToken,
			externalAccountId: account.externalAccountId,
			body: post.body,
			assetVersionId: post.assetVersionId
		});
		const published = await updateSocialPublicationForTenant(ctx, publication.id, {
			status: 'published',
			providerPostId: result.providerPostId,
			error: null,
			publishedAt: new Date()
		});
		if (published) {
			const metrics = await getDomainSocialProvider(account.platform).fetchPostMetrics({
				clientId: ctx.clientId,
				platform: account.platform,
				accessToken,
				providerPostId: result.providerPostId
			});
			await insertSocialMetricsForTenant(ctx, {
				publicationId: published.id,
				...metrics
			});
		}
		logInfo('social.publish', {
			clientId: ctx.clientId,
			postId: post.id,
			platform: account.platform
		});
		return published ?? publication;
	} catch (error) {
		const message = error instanceof Error ? error.message : 'Publish failed';
		await updateSocialPublicationForTenant(ctx, publication.id, {
			status: 'failed',
			error: message
		});
		logError('social.publish', error, { clientId: ctx.clientId, postId: post.id });
		throw error;
	}
}

export async function publishSocialPostNow(
	ctx: TenantContext,
	postId: string,
	accountIds: string[]
) {
	if (accountIds.length === 0) {
		throw new ValidationError('At least one social account is required to publish');
	}
	const post = await assertPublishablePost(ctx, postId);
	await updateSocialPostForTenant(ctx, post.id, { status: 'publishing' });
	const publications = [];
	let failed = false;
	try {
		for (const accountId of accountIds) {
			try {
				publications.push(await publishToAccount(ctx, post, accountId));
			} catch (error) {
				if (error instanceof ValidationError) throw error;
				failed = true;
			}
		}
	} catch (error) {
		await updateSocialPostForTenant(ctx, post.id, { status: post.status });
		throw error;
	}
	const nextStatus = failed
		? publications.some((row) => row.status === 'published')
			? 'published'
			: 'failed'
		: 'published';
	const updated = await updateSocialPostForTenant(ctx, post.id, { status: nextStatus });
	return { post: updated ?? post, publications };
}

export async function publishSocialPost(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	consumeRateLimit(`social-publish:${ctx.clientId}`, 20, 60_000);
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(publishSocialPostSchema, input);
	await assertPublishablePost(required, parsed.id);
	const dispatched = await dispatchWorkflow(SOCIAL_PUBLISH_WORKFLOW.name, {
		organizationId: required.organizationId,
		clientId: required.clientId,
		postId: parsed.id,
		accountIds: parsed.accountIds,
		requestId
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'social.post.publish',
		entityType: 'social_post',
		entityId: parsed.id,
		requestId
	});
	if (dispatched.adapter === 'in-process') {
		return dispatched.result as Awaited<ReturnType<typeof publishSocialPostNow>>;
	}
	return { queued: true, runId: dispatched.runId };
}

export async function processSocialPublishWorkflow(input: unknown) {
	const parsed = parseContract(socialPublishInputSchema, input);
	const ctx: TenantContext = {
		organizationId: parsed.organizationId,
		clientId: parsed.clientId,
		roleIds: [],
		requestId: parsed.requestId
	};
	return publishSocialPostNow(ctx, parsed.postId, parsed.accountIds);
}

export async function processDueSocialPublishes(ctx: TenantContext) {
	const due = await listDueScheduledPostsForTenant(ctx);
	const accounts = (await listSocialAccountsForTenant(ctx))
		.filter((account) => account.status === 'active')
		.map((account) => account.id);
	const results = [];
	for (const post of due) {
		if (accounts.length === 0) continue;
		results.push(await publishSocialPostNow(ctx, post.id, accounts));
	}
	return { processed: results.length, results };
}

export async function processDueSocialPublishesForOperator(
	actor: Actor,
	ctx: TenantContext,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const result = await processDueSocialPublishes(required);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'social.publish.process_due',
		entityType: 'social_post',
		entityId: required.clientId,
		requestId
	});
	return result;
}

export async function syncSocialMetrics(ctx: TenantContext) {
	const publications = await listPublishedSocialPublicationsForTenant(ctx);
	const synced = [];
	for (const publication of publications) {
		if (!publication.providerPostId) continue;
		const account = await getSocialAccountForTenant(ctx, publication.accountId);
		if (!account) continue;
		const connection = await getSocialConnectionForTenant(ctx, publication.connectionId);
		if (!connection || connection.status !== 'active') continue;
		const fresh = await ensureFreshAccessToken(ctx, connection);
		const metrics = await getDomainSocialProvider(publication.platform).fetchPostMetrics({
			clientId: ctx.clientId,
			platform: publication.platform,
			accessToken: await decryptAccessToken(fresh.encryptedAccessToken),
			providerPostId: publication.providerPostId
		});
		synced.push(
			await insertSocialMetricsForTenant(ctx, {
				publicationId: publication.id,
				...metrics
			})
		);
	}
	return { synced: synced.length, metrics: synced };
}

export async function syncSocialMetricsForOperator(
	actor: Actor,
	ctx: TenantContext,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const result = await syncSocialMetrics(required);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'social.metrics.sync',
		entityType: 'social_publication',
		entityId: required.clientId,
		requestId
	});
	return result;
}

export async function processSocialDueSweepWorkflow(input: unknown) {
	const parsed = parseContract(socialDueSweepInputSchema, input);
	return processDueSocialPublishes({
		organizationId: parsed.organizationId,
		clientId: parsed.clientId,
		roleIds: [],
		requestId: parsed.requestId
	});
}

export async function getSocialPost(actor: Actor, ctx: TenantContext, id: string) {
	requireCapability(actor.permissions, 'social.read');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(socialPostIdSchema, { id });
	const post = await getSocialPostForTenant(required, parsed.id);
	if (!post) throw new NotFoundError('Social post not found');
	return post;
}
