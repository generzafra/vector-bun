import { afterEach, beforeEach, expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { cookieName } from '@vector/auth';
import { env } from '@vector/config';
import {
	ForbiddenError,
	NotFoundError,
	SOCIAL_PLATFORMS,
	TenantContextError,
	ValidationError,
	requireTenantContext,
	type SocialPlatform
} from '@vector/contracts';
import {
	clients,
	db,
	getPublishedHomeForTenant,
	getSiteForTenant,
	insertSocialPublicationForTenant,
	listCreativeAssetsForTenant,
	listSocialPostsForTenant,
	listSocialPublicationsForTenant,
	socialAccounts,
	socialConnections,
	socialMetrics,
	socialPosts,
	socialPublications,
	updateSocialPostForTenant
} from '@vector/db';
import {
	approveCreativeAsset,
	captureLead,
	confirmCreativeRights,
	contextFor,
	createSocialPost,
	deliveryTenantContext,
	getCreativeAssetBytes,
	getLaunch,
	getSocialOverview,
	login,
	processDueSocialPublishes,
	processPlatformDueSocialSweep,
	publishSocialPost,
	recalculateReadiness,
	refreshSocialConnection,
	resetDomainSocialProvider,
	serveSocialMediaGrant,
	setDomainSocialProvider,
	memorySocialProvider,
	resolveSession,
	startSocialOAuth,
	selectSocialOAuthPage,
	switchActiveClient,
	syncSocialMetrics,
	transitionSocialPost,
	uploadCreativeAsset,
	upsertSocialConnection,
	completeSocialOAuth
} from '@vector/domain';
import {
	assertFrequencyAllowed,
	assertNotSimilar,
	createSocialMediaGrant,
	createSocialOAuthState,
	decryptSecret,
	parseSocialMediaGrant,
	similarityHash,
	socialAttributionParams
} from '@vector/social';
import { buildStorageKey, inspectCreativeUpload } from '@vector/storage';
import { app } from '../apps/api/src/app';

const PNG_1X1 = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
	0x42, 0x60, 0x82
]);

function useMemorySocial() {
	resetDomainSocialProvider();
	for (const platform of SOCIAL_PLATFORMS) {
		setDomainSocialProvider(platform, memorySocialProvider(platform));
	}
}

async function resetSocialOutbound(clientId: string) {
	await db.delete(socialMetrics).where(eq(socialMetrics.clientId, clientId));
	await db.delete(socialPublications).where(eq(socialPublications.clientId, clientId));
	await db
		.update(socialPosts)
		.set({ status: 'archived', scheduledAt: null, updatedAt: new Date() })
		.where(and(eq(socialPosts.clientId, clientId), eq(socialPosts.status, 'scheduled')));
}

beforeEach(async () => {
	useMemorySocial();
	const { alpha, beta } = await seededClients();
	await resetSocialOutbound(alpha.id);
	await resetSocialOutbound(beta.id);
});

afterEach(() => {
	useMemorySocial();
});

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

async function adminOn(clientId: string, ip: string, requestId: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	await switchActiveClient(session, session.token, clientId, `${requestId}-switch`);
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return actor;
}

async function connectPlatform(
	actor: Awaited<ReturnType<typeof adminOn>>,
	ctx: ReturnType<typeof contextFor>,
	platform: SocialPlatform,
	suffix: string
) {
	return upsertSocialConnection(
		actor,
		ctx,
		{
			platform,
			accessToken: `memory-token-${platform}-${suffix}`,
			refreshToken: `memory-refresh-${platform}-${suffix}`,
			externalAccountId: `acct-${platform}-${suffix}`,
			handle: `${platform}-${suffix}`,
			displayName: `${platform} ${suffix}`,
			required: true
		},
		`connect-${platform}-${suffix}`
	);
}

async function approveImage(
	actor: Awaited<ReturnType<typeof adminOn>>,
	ctx: ReturnType<typeof contextFor>,
	title: string
) {
	const uploaded = await uploadCreativeAsset(
		actor,
		ctx,
		{
			title,
			kind: 'image',
			filename: 'social.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		`social-asset-${title}`
	);
	await confirmCreativeRights(
		actor,
		ctx,
		{ id: uploaded.asset.id, rightsStatus: 'client_owned' },
		`social-rights-${title}`
	);
	await approveCreativeAsset(
		actor,
		ctx,
		{ id: uploaded.asset.id },
		`social-asset-approve-${title}`
	);
	return uploaded.asset;
}

async function approvePost(
	actor: Awaited<ReturnType<typeof adminOn>>,
	ctx: ReturnType<typeof contextFor>,
	body: string
) {
	const post = await createSocialPost(actor, ctx, { body, status: 'draft' }, 'social-create');
	await transitionSocialPost(actor, ctx, { id: post.id, to: 'reviewed' }, 'social-review');
	return transitionSocialPost(actor, ctx, { id: post.id, to: 'approved' }, 'social-approve');
}

test('missing TenantContext cannot read social or creative rows', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listSocialPostsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listCreativeAssetsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('creative storage keys stay under the tenant creative prefix', () => {
	const alpha = '11111111-1111-4111-8111-111111111111';
	const beta = '22222222-2222-4222-8222-222222222222';
	const key = buildStorageKey(alpha, 'creative', 'image', 'hero.PNG');
	expect(key.startsWith(`clients/${alpha}/creative/`)).toBe(true);
	expect(key.includes(beta)).toBe(false);
	expect(() =>
		inspectCreativeUpload({
			filename: 'hero.svg',
			declaredType: 'image/svg+xml',
			bytes: PNG_1X1
		})
	).toThrow(ValidationError);
});

test('user on client A cannot read client B social or creative', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '127.0.0.51', 'social-iso-a');
	const betaActor = await adminOn(beta.id, '127.0.0.52', 'social-iso-b');
	const alphaCtx = contextFor(alphaActor, 'social-iso-a');
	const betaCtx = contextFor(betaActor, 'social-iso-b');
	const body = `Isolation post ${crypto.randomUUID()}`;
	await createSocialPost(alphaActor, alphaCtx, { body }, 'social-iso-create');
	const uploaded = await uploadCreativeAsset(
		alphaActor,
		alphaCtx,
		{
			title: 'Alpha graphic',
			kind: 'image',
			filename: 'alpha.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'social-iso-upload'
	);
	const alphaOverview = await getSocialOverview(alphaActor, alphaCtx);
	const betaOverview = await getSocialOverview(betaActor, betaCtx);
	expect(alphaOverview.posts.some((post) => post.body === body)).toBe(true);
	expect(betaOverview.posts.some((post) => post.body === body)).toBe(false);
	expect(alphaOverview.creative.some((asset) => asset.id === uploaded.asset.id)).toBe(true);
	expect(betaOverview.creative.some((asset) => asset.id === uploaded.asset.id)).toBe(false);
	await expect(getCreativeAssetBytes(betaActor, betaCtx, uploaded.asset.id)).rejects.toBeInstanceOf(
		NotFoundError
	);
	await expect(getSocialOverview(alphaActor, alphaCtx, beta.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('API overview never returns social tokens', async () => {
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '127.0.0.53', 'social-token');
	const ctx = contextFor(actor, 'social-token');
	const suffix = `token-${crypto.randomUUID().slice(0, 8)}`;
	await connectPlatform(actor, ctx, 'linkedin', suffix);
	const overview = await getSocialOverview(actor, ctx);
	const payload = JSON.stringify(overview);
	expect(payload.includes('encryptedAccessToken')).toBe(false);
	expect(payload.includes(`memory-token-linkedin-${suffix}`)).toBe(false);
	const cookie = `${cookieName()}=${actor.token}`;
	const res = await app.request('/v1/social', { headers: { cookie } });
	expect(res.status).toBe(200);
	const apiPayload = await res.text();
	expect(apiPayload.includes('encryptedAccessToken')).toBe(false);
	expect(apiPayload.includes(`memory-token-linkedin-${suffix}`)).toBe(false);
	const leaked = await app.request(`/v1/social/${beta.id}`, { headers: { cookie } });
	expect(leaked.status).toBeGreaterThanOrEqual(400);
	expect((await leaked.text()).includes(`memory-token-linkedin-${suffix}`)).toBe(false);
	const [row] = await db
		.select()
		.from(socialConnections)
		.where(eq(socialConnections.clientId, alpha.id))
		.limit(1);
	expect(row?.encryptedAccessToken?.startsWith('v1:')).toBe(true);
	expect(row?.encryptedAccessToken?.includes('memory-token')).toBe(false);
});

test('unapproved posts and assets cannot publish', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '127.0.0.54', 'social-approve');
	const ctx = contextFor(actor, 'social-approve');
	const suffix = crypto.randomUUID().slice(0, 8);
	const linkedin = await connectPlatform(actor, ctx, 'linkedin', suffix);
	const draft = await createSocialPost(
		actor,
		ctx,
		{ body: `Unapproved ${suffix}`, status: 'draft' },
		'social-unapproved'
	);
	await expect(
		publishSocialPost(
			actor,
			ctx,
			{ id: draft.id, accountIds: [linkedin.account.id] },
			'social-unapproved-pub'
		)
	).rejects.toBeInstanceOf(ValidationError);
	const uploaded = await uploadCreativeAsset(
		actor,
		ctx,
		{
			title: 'Unapproved graphic',
			kind: 'image',
			filename: 'draft.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'social-asset-draft'
	);
	await expect(
		createSocialPost(
			actor,
			ctx,
			{ body: `Needs asset ${suffix}`, assetId: uploaded.asset.id },
			'social-attach-draft'
		)
	).rejects.toBeInstanceOf(ValidationError);
	await confirmCreativeRights(
		actor,
		ctx,
		{ id: uploaded.asset.id, rightsStatus: 'client_owned' },
		'social-rights'
	);
	await approveCreativeAsset(actor, ctx, { id: uploaded.asset.id }, 'social-asset-approve');
	const attached = await createSocialPost(
		actor,
		ctx,
		{ body: `Approved asset ${suffix}`, assetId: uploaded.asset.id },
		'social-attach-ok'
	);
	expect(attached.assetId).toBe(uploaded.asset.id);
});

test('approved content publishes to LinkedIn and X', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '127.0.0.55', 'social-two');
	const ctx = contextFor(actor, 'social-two');
	const suffix = crypto.randomUUID().slice(0, 8);
	const linkedin = await connectPlatform(actor, ctx, 'linkedin', suffix);
	const x = await connectPlatform(actor, ctx, 'x', suffix);
	const post = await approvePost(actor, ctx, `Two platform ${suffix}`);
	const result = await publishSocialPost(
		actor,
		ctx,
		{ id: post.id, accountIds: [linkedin.account.id, x.account.id] },
		'social-two-pub'
	);
	if (!('publications' in result)) throw new Error('expected in-process publish');
	expect(result.publications.filter((row) => row.status === 'published')).toHaveLength(2);
	expect(result.post.status).toBe('published');
	const overview = await getSocialOverview(actor, ctx);
	expect(overview.publications.filter((row) => row.postId === post.id)).toHaveLength(2);
});

test('approved content publishes to Facebook and Instagram', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '127.0.0.73', 'social-meta');
	const ctx = contextFor(actor, 'social-meta');
	const suffix = crypto.randomUUID().slice(0, 8);
	const facebook = await connectPlatform(actor, ctx, 'facebook', suffix);
	const instagram = await connectPlatform(actor, ctx, 'instagram', suffix);
	const post = await approvePost(actor, ctx, `Meta platforms ${suffix}`);
	const result = await publishSocialPost(
		actor,
		ctx,
		{ id: post.id, accountIds: [facebook.account.id, instagram.account.id] },
		'social-meta-pub'
	);
	if (!('publications' in result)) throw new Error('expected in-process publish');
	expect(result.publications.filter((row) => row.status === 'published')).toHaveLength(2);
	expect(result.post.status).toBe('published');
	const overview = await getSocialOverview(actor, ctx);
	expect(overview.provider.platforms).toEqual([...SOCIAL_PLATFORMS]);
	expect(overview.publications.filter((row) => row.postId === post.id)).toHaveLength(2);
	expect(memorySocialProvider('facebook').published).toHaveLength(1);
	expect(memorySocialProvider('instagram').published).toHaveLength(1);
});

test('approved C0 images publish through LinkedIn and Instagram', async () => {
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '127.0.0.74', 'social-media');
	const ctx = contextFor(actor, 'social-media');
	const suffix = crypto.randomUUID().slice(0, 8);
	const asset = await approveImage(actor, ctx, `Graphic ${suffix}`);
	const linkedin = await connectPlatform(actor, ctx, 'linkedin', suffix);
	const instagram = await connectPlatform(actor, ctx, 'instagram', `ig-${suffix}`);
	const post = await createSocialPost(
		actor,
		ctx,
		{ body: `Media post ${suffix}`, assetId: asset.id, status: 'draft' },
		'social-media-create'
	);
	await transitionSocialPost(actor, ctx, { id: post.id, to: 'reviewed' }, 'social-media-review');
	await transitionSocialPost(actor, ctx, { id: post.id, to: 'approved' }, 'social-media-approve');
	const result = await publishSocialPost(
		actor,
		ctx,
		{ id: post.id, accountIds: [linkedin.account.id, instagram.account.id] },
		'social-media-pub'
	);
	if (!('publications' in result)) throw new Error('expected in-process publish');
	expect(result.publications.filter((row) => row.status === 'published')).toHaveLength(2);
	const linkedinReq = memorySocialProvider('linkedin').published.at(-1);
	const instagramReq = memorySocialProvider('instagram').published.at(-1);
	expect(linkedinReq?.media?.assetVersionId).toBe(post.assetVersionId);
	expect(linkedinReq?.media?.bytes).toEqual(PNG_1X1);
	expect(instagramReq?.media?.publicUrl?.includes('/v1/public/social-media?token=')).toBe(true);
	const overview = await getSocialOverview(actor, ctx);
	const payload = JSON.stringify(overview);
	expect(payload.includes('/v1/public/social-media')).toBe(false);
	expect(payload.includes('TOKEN_ENCRYPTION_KEY')).toBe(false);
	const cookie = `${cookieName()}=${actor.token}`;
	const apiRes = await app.request('/v1/social', { headers: { cookie } });
	expect(apiRes.status).toBe(200);
	const apiPayload = await apiRes.text();
	expect(apiPayload.includes('/v1/public/social-media')).toBe(false);
	const grantUrl = instagramReq?.media?.publicUrl ?? '';
	const served = await app.request(grantUrl.replace(env.API_ORIGIN, ''));
	expect(served.status).toBe(200);
	expect(served.headers.get('content-type')).toBe('image/png');
	expect(new Uint8Array(await served.arrayBuffer())).toEqual(PNG_1X1);
	const forged = await app.request('/v1/public/social-media?token=not-a-grant');
	expect(forged.status).toBe(404);
	const expired = createSocialMediaGrant(env.TOKEN_ENCRYPTION_KEY, {
		clientId: alpha.id,
		storageKey: buildStorageKey(alpha.id, 'creative', 'image', 'social.png'),
		mimeType: 'image/png',
		exp: Date.now() - 1000
	});
	expect(parseSocialMediaGrant(env.TOKEN_ENCRYPTION_KEY, expired)).toBeNull();
	const mismatched = createSocialMediaGrant(env.TOKEN_ENCRYPTION_KEY, {
		clientId: beta.id,
		storageKey: buildStorageKey(alpha.id, 'creative', 'image', 'social.png'),
		mimeType: 'image/png',
		exp: Date.now() + 60_000
	});
	await expect(serveSocialMediaGrant(mismatched)).rejects.toBeInstanceOf(ForbiddenError);
});

test('frequency and similarity helpers fail closed', () => {
	expect(similarityHash('Hello   World')).toBe(similarityHash('hello world'));
	expect(() => assertFrequencyAllowed(4)).toThrow(ValidationError);
	expect(() => assertNotSimilar(1)).toThrow(ValidationError);
	expect(() => assertFrequencyAllowed(3)).not.toThrow();
	expect(() => assertNotSimilar(0)).not.toThrow();
});

test('similarity guardrail blocks a repeated post', async () => {
	const { beta } = await seededClients();
	const actor = await adminOn(beta.id, '127.0.0.56', 'social-similar');
	const ctx = contextFor(actor, 'social-similar');
	const suffix = crypto.randomUUID().slice(0, 8);
	await db.delete(socialMetrics).where(eq(socialMetrics.clientId, beta.id));
	await db.delete(socialPublications).where(eq(socialPublications.clientId, beta.id));
	const linkedin = await connectPlatform(actor, ctx, 'linkedin', suffix);
	const first = await approvePost(actor, ctx, `Unique launch ${suffix}`);
	await publishSocialPost(
		actor,
		ctx,
		{ id: first.id, accountIds: [linkedin.account.id] },
		'social-similar-first'
	);
	const similar = await approvePost(actor, ctx, `Unique launch ${suffix}`);
	let similarError: unknown;
	try {
		await publishSocialPost(
			actor,
			ctx,
			{ id: similar.id, accountIds: [linkedin.account.id] },
			'social-similar-dup'
		);
	} catch (error) {
		similarError = error;
	}
	expect(similarError).toBeInstanceOf(ValidationError);
});

test('frequency guardrail blocks a fourth same-day publish', async () => {
	const { beta } = await seededClients();
	const actor = await adminOn(beta.id, '127.0.0.58', 'social-freq');
	const ctx = contextFor(actor, 'social-freq');
	const suffix = crypto.randomUUID().slice(0, 8);
	await db.delete(socialMetrics).where(eq(socialMetrics.clientId, beta.id));
	await db.delete(socialPublications).where(eq(socialPublications.clientId, beta.id));
	const linkedin = await connectPlatform(actor, ctx, 'x', suffix);
	const holder = await approvePost(actor, ctx, `Frequency holder ${suffix}`);
	for (let i = 0; i < 4; i++) {
		await insertSocialPublicationForTenant(ctx, {
			postId: holder.id,
			accountId: linkedin.account.id,
			connectionId: linkedin.connection.id,
			platform: 'x',
			status: 'published',
			contentVersion: 1,
			idempotencyKey: `freq-${suffix}-${i}`
		});
	}
	const seeded = await listSocialPublicationsForTenant(ctx);
	expect(
		seeded.filter((row) => row.platform === 'x' && row.status === 'published').length
	).toBeGreaterThanOrEqual(4);
	const extra = await approvePost(actor, ctx, `Frequency extra ${suffix}`);
	let frequencyError: unknown;
	try {
		await publishSocialPost(
			actor,
			ctx,
			{ id: extra.id, accountIds: [linkedin.account.id] },
			'social-freq-extra'
		);
	} catch (error) {
		frequencyError = error;
	}
	expect(frequencyError).toBeInstanceOf(ValidationError);
});

test('required social connections become blocking readiness items', async () => {
	const { beta } = await seededClients();
	const actor = await adminOn(beta.id, '127.0.0.57', 'social-ready');
	const ctx = contextFor(actor, 'social-ready');
	await db
		.update(socialAccounts)
		.set({ required: false, updatedAt: new Date() })
		.where(eq(socialAccounts.clientId, beta.id));
	const before = await recalculateReadiness(actor, ctx, 'social-ready-before');
	const socialBefore = before.items.find((item) => item.key === 'social.access');
	expect(socialBefore?.status).toBe('not_applicable');
	expect(socialBefore?.blocking).toBe(false);
	const suffix = crypto.randomUUID().slice(0, 8);
	const linkedin = await connectPlatform(actor, ctx, 'linkedin', suffix);
	const ready = await getLaunch(actor, ctx);
	const socialReady = ready.items.find((item) => item.key === 'social.access');
	expect(socialReady?.blocking).toBe(true);
	expect(socialReady?.status).toBe('complete');
	await db
		.update(socialConnections)
		.set({ status: 'expired', updatedAt: new Date() })
		.where(eq(socialConnections.id, linkedin.connection.id));
	const pending = await recalculateReadiness(actor, ctx, 'social-ready-expired');
	const socialPending = pending.items.find((item) => item.key === 'social.access');
	expect(socialPending?.blocking).toBe(true);
	expect(socialPending?.status).toBe('pending');
});

async function pageIds(ctx: ReturnType<typeof contextFor>) {
	const [published, site] = await Promise.all([
		getPublishedHomeForTenant(ctx),
		getSiteForTenant(ctx)
	]);
	if (!published || !site) throw new Error('Published home missing. Seed and publish first.');
	return {
		siteId: site.id,
		funnelId: published.page.funnelId,
		pageId: published.page.id,
		pageVersionId: published.version.id
	};
}

test('expired tokens refresh before publish and never appear in JSON', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '127.0.0.61', 'social-refresh');
	const ctx = contextFor(actor, 'social-refresh');
	const suffix = crypto.randomUUID().slice(0, 8);
	const linkedin = await connectPlatform(actor, ctx, 'linkedin', suffix);
	await db
		.update(socialConnections)
		.set({ tokenExpiresAt: new Date(Date.now() - 60_000), updatedAt: new Date() })
		.where(eq(socialConnections.id, linkedin.connection.id));
	const before = await db
		.select()
		.from(socialConnections)
		.where(eq(socialConnections.id, linkedin.connection.id))
		.limit(1);
	const post = await approvePost(actor, ctx, `Refresh publish ${suffix}`);
	const result = await publishSocialPost(
		actor,
		ctx,
		{ id: post.id, accountIds: [linkedin.account.id] },
		'social-refresh-pub'
	);
	if (!('publications' in result)) throw new Error('expected in-process publish');
	expect(result.publications[0]?.status).toBe('published');
	expect(memorySocialProvider('linkedin').refreshed.length).toBeGreaterThan(0);
	expect(
		memorySocialProvider('linkedin').published.some((row) =>
			row.accessToken.startsWith('memory-refreshed-linkedin-')
		)
	).toBe(true);
	const overview = await getSocialOverview(actor, ctx);
	const payload = JSON.stringify(overview);
	expect(payload.includes('memory-refreshed')).toBe(false);
	expect(payload.includes('memory-token-linkedin')).toBe(false);
	expect(payload.includes('encryptedAccessToken')).toBe(false);
	const [after] = await db
		.select()
		.from(socialConnections)
		.where(eq(socialConnections.id, linkedin.connection.id))
		.limit(1);
	expect(after?.encryptedAccessToken?.startsWith('v1:')).toBe(true);
	expect(after?.encryptedAccessToken).not.toBe(before[0]?.encryptedAccessToken);
	expect(after?.status).toBe('active');
});

test('failed refresh expires the connection and does not publish', async () => {
	const { beta } = await seededClients();
	const actor = await adminOn(beta.id, '127.0.0.62', 'social-refresh-fail');
	const ctx = contextFor(actor, 'social-refresh-fail');
	const suffix = crypto.randomUUID().slice(0, 8);
	const linkedin = await connectPlatform(actor, ctx, 'linkedin', suffix);
	memorySocialProvider('linkedin').refreshFail = true;
	await db
		.update(socialConnections)
		.set({ tokenExpiresAt: new Date(Date.now() - 60_000), updatedAt: new Date() })
		.where(eq(socialConnections.id, linkedin.connection.id));
	const post = await approvePost(actor, ctx, `Refresh fail ${suffix}`);
	let refreshError: unknown;
	try {
		await publishSocialPost(
			actor,
			ctx,
			{ id: post.id, accountIds: [linkedin.account.id] },
			'social-refresh-fail-pub'
		);
	} catch (error) {
		refreshError = error;
	}
	expect(refreshError).toBeInstanceOf(ValidationError);
	const [row] = await db
		.select()
		.from(socialConnections)
		.where(eq(socialConnections.id, linkedin.connection.id))
		.limit(1);
	expect(row?.status).toBe('expired');
	const publications = await listSocialPublicationsForTenant(ctx, post.id);
	expect(publications).toHaveLength(0);
});

test('operator refresh rotates tokens without returning them', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '127.0.0.63', 'social-refresh-op');
	const ctx = contextFor(actor, 'social-refresh-op');
	const suffix = crypto.randomUUID().slice(0, 8);
	const linkedin = await connectPlatform(actor, ctx, 'x', suffix);
	const refreshed = await refreshSocialConnection(
		actor,
		ctx,
		{ id: linkedin.connection.id },
		'social-refresh-op'
	);
	expect(refreshed.connection.status).toBe('active');
	expect(JSON.stringify(refreshed).includes('memory-refreshed')).toBe(false);
	const betaActor = await adminOn(
		(await seededClients()).beta.id,
		'127.0.0.64',
		'social-refresh-x'
	);
	let leaked: unknown;
	try {
		await refreshSocialConnection(
			betaActor,
			contextFor(betaActor, 'social-refresh-x'),
			{ id: linkedin.connection.id },
			'social-refresh-x'
		);
	} catch (error) {
		leaked = error;
	}
	expect(leaked).toBeInstanceOf(NotFoundError);
});

test('due scheduled posts publish only for the requesting tenant', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '127.0.0.65', 'social-due-a');
	const betaActor = await adminOn(beta.id, '127.0.0.66', 'social-due-b');
	const alphaCtx = contextFor(alphaActor, 'social-due-a');
	const betaCtx = contextFor(betaActor, 'social-due-b');
	const suffix = crypto.randomUUID().slice(0, 8);
	const alphaAccount = await connectPlatform(alphaActor, alphaCtx, 'linkedin', `a-${suffix}`);
	const betaAccount = await connectPlatform(betaActor, betaCtx, 'linkedin', `b-${suffix}`);
	const alphaPost = await approvePost(alphaActor, alphaCtx, `Due alpha ${suffix}`);
	const betaPost = await approvePost(betaActor, betaCtx, `Due beta ${suffix}`);
	const past = new Date(Date.now() - 60_000);
	await updateSocialPostForTenant(alphaCtx, alphaPost.id, {
		status: 'scheduled',
		scheduledAt: past
	});
	await updateSocialPostForTenant(betaCtx, betaPost.id, { status: 'scheduled', scheduledAt: past });
	const processed = await processDueSocialPublishes(alphaCtx);
	expect(processed.processed).toBeGreaterThanOrEqual(1);
	expect(
		processed.results.some((row) => row.post.id === alphaPost.id && row.post.status === 'published')
	).toBe(true);
	const betaStill = await listSocialPostsForTenant(betaCtx);
	expect(betaStill.find((row) => row.id === betaPost.id)?.status).toBe('scheduled');
	const future = await approvePost(alphaActor, alphaCtx, `Future ${suffix}`);
	await updateSocialPostForTenant(alphaCtx, future.id, {
		status: 'scheduled',
		scheduledAt: new Date(Date.now() + 3_600_000)
	});
	const later = await processDueSocialPublishes(alphaCtx);
	expect(later.results.some((row) => row.post.id === future.id)).toBe(false);
	void alphaAccount;
	void betaAccount;
});

test('platform social due sweep fans out tenant jobs without mixing clients', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '127.0.0.67', 'social-plat-a');
	const betaActor = await adminOn(beta.id, '127.0.0.68', 'social-plat-b');
	const alphaCtx = contextFor(alphaActor, 'social-plat-a');
	const betaCtx = contextFor(betaActor, 'social-plat-b');
	const suffix = crypto.randomUUID().slice(0, 8);
	await connectPlatform(alphaActor, alphaCtx, 'x', `pa-${suffix}`);
	await connectPlatform(betaActor, betaCtx, 'x', `pb-${suffix}`);
	const alphaPost = await approvePost(alphaActor, alphaCtx, `Platform due alpha ${suffix}`);
	const betaPost = await approvePost(betaActor, betaCtx, `Platform due beta ${suffix}`);
	const past = new Date(Date.now() - 30_000);
	await updateSocialPostForTenant(alphaCtx, alphaPost.id, {
		status: 'scheduled',
		scheduledAt: past
	});
	await updateSocialPostForTenant(betaCtx, betaPost.id, { status: 'scheduled', scheduledAt: past });
	const sweep = await processPlatformDueSocialSweep({ requestId: 'social-platform-due' });
	expect(sweep.tenants).toBeGreaterThanOrEqual(2);
	expect(sweep.results.every((row) => row.organizationId && row.clientId)).toBe(true);
	expect(sweep.results.some((row) => row.clientId === alpha.id)).toBe(true);
	expect(sweep.results.some((row) => row.clientId === beta.id)).toBe(true);
	const alphaPublished = await listSocialPostsForTenant(alphaCtx);
	const betaPublished = await listSocialPostsForTenant(betaCtx);
	expect(alphaPublished.find((row) => row.id === alphaPost.id)?.status).toBe('published');
	expect(betaPublished.find((row) => row.id === betaPost.id)?.status).toBe('published');
});

test('metrics sync stays tenant scoped', async () => {
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '127.0.0.69', 'social-metrics');
	const ctx = contextFor(actor, 'social-metrics');
	const suffix = crypto.randomUUID().slice(0, 8);
	const linkedin = await connectPlatform(actor, ctx, 'linkedin', suffix);
	const post = await approvePost(actor, ctx, `Metrics ${suffix}`);
	const published = await publishSocialPost(
		actor,
		ctx,
		{ id: post.id, accountIds: [linkedin.account.id] },
		'social-metrics-pub'
	);
	if (!('publications' in published)) throw new Error('expected in-process publish');
	const providerPostId = published.publications[0]?.providerPostId;
	if (!providerPostId) throw new Error('provider post id missing');
	memorySocialProvider('linkedin').setMetrics(providerPostId, {
		impressions: 12,
		likes: 3,
		comments: 1,
		shares: 0,
		clicks: 4
	});
	await syncSocialMetrics(ctx);
	const overview = await getSocialOverview(actor, ctx);
	const row = overview.publications.find((item) => item.postId === post.id);
	expect(row?.metrics?.impressions).toBe(12);
	expect(row?.metrics?.clicks).toBe(4);
	const betaActor = await adminOn(beta.id, '127.0.0.70', 'social-metrics-b');
	const betaOverview = await getSocialOverview(
		betaActor,
		contextFor(betaActor, 'social-metrics-b')
	);
	expect(betaOverview.publications.some((item) => item.postId === post.id)).toBe(false);
	expect(betaOverview.publications.some((item) => item.metrics?.impressions === 12)).toBe(false);
});

test('social UTMs persist leads on the existing attribution path', async () => {
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '127.0.0.71', 'social-lead');
	const ctx = contextFor(actor, 'social-lead');
	const suffix = crypto.randomUUID().slice(0, 8);
	const linkedin = await connectPlatform(actor, ctx, 'linkedin', suffix);
	const post = await approvePost(actor, ctx, `Lead track ${suffix}`);
	await publishSocialPost(
		actor,
		ctx,
		{ id: post.id, accountIds: [linkedin.account.id] },
		'social-lead-pub'
	);
	const tracking = socialAttributionParams('linkedin', post.id);
	await captureLead(
		deliveryTenantContext(ctx),
		{
			name: 'Social Lead',
			email: `social-${suffix}@alpha.test`,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...tracking,
			...(await pageIds(ctx))
		},
		'social-lead-capture'
	);
	const overview = await getSocialOverview(actor, ctx);
	const tracked = overview.posts.find((row) => row.id === post.id);
	expect(tracked?.attributedLeadCount).toBe(1);
	expect(overview.attributedLeads.some((row) => row.postId === post.id)).toBe(true);
	expect(JSON.stringify(overview).includes(`social-${suffix}@alpha.test`)).toBe(false);
	const betaActor = await adminOn(beta.id, '127.0.0.72', 'social-lead-b');
	const betaCtx = contextFor(betaActor, 'social-lead-b');
	await captureLead(
		deliveryTenantContext(betaCtx),
		{
			name: 'Beta Social Lead',
			email: `social-${suffix}@beta.test`,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'preview-beta.localhost',
			domainKind: 'preview',
			...tracking,
			...(await pageIds(betaCtx))
		},
		'social-lead-beta'
	);
	const alphaAfter = await getSocialOverview(actor, ctx);
	const betaOverview = await getSocialOverview(betaActor, betaCtx);
	expect(alphaAfter.posts.find((row) => row.id === post.id)?.attributedLeadCount).toBe(1);
	expect(betaOverview.attributedLeads.some((row) => row.postId === post.id)).toBe(false);
});

function assertNoSocialOAuthSecrets(payload: string, extras: string[] = []) {
	expect(payload.includes('encryptedAccessToken')).toBe(false);
	expect(payload.includes('codeVerifier')).toBe(false);
	expect(payload.includes('TOKEN_ENCRYPTION_KEY')).toBe(false);
	expect(payload.includes('memory-oauth-')).toBe(false);
	for (const extra of extras) expect(payload.includes(extra)).toBe(false);
}

test('official OAuth start and complete store encrypted tokens without leaking them', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '127.0.0.75', 'social-oauth');
	const ctx = contextFor(actor, 'social-oauth');
	const code = `oauth-code-${crypto.randomUUID().slice(0, 8)}`;
	const started = await startSocialOAuth(
		actor,
		ctx,
		{ platform: 'linkedin', required: true },
		'social-oauth-start'
	);
	const authorize = new URL(started.authorizeUrl);
	expect(authorize.origin).toBe('https://social.test');
	expect(authorize.pathname).toBe('/oauth/linkedin');
	expect(authorize.searchParams.get('code_challenge_method')).toBe('S256');
	expect(authorize.searchParams.get('redirect_uri')?.endsWith('/social/oauth/callback')).toBe(true);
	const startJson = JSON.stringify(started);
	assertNoSocialOAuthSecrets(startJson, [code, env.TOKEN_ENCRYPTION_KEY]);
	expect(startJson.includes('authorizeUrl')).toBe(true);
	const completed = await completeSocialOAuth(
		actor,
		ctx,
		{ code, state: authorize.searchParams.get('state') ?? '' },
		'social-oauth-complete'
	);
	if (completed.status !== 'connected') throw new Error('expected connected LinkedIn OAuth');
	expect(completed.account.platform).toBe('linkedin');
	expect(completed.account.handle).toBe('linkedin-oauth');
	expect(completed.connection.status).toBe('active');
	expect(completed.connection.tokenExpiresAt).toBeTruthy();
	assertNoSocialOAuthSecrets(JSON.stringify(completed), [code]);
	const exchanged = memorySocialProvider('linkedin').exchanged.at(-1);
	expect(exchanged?.code).toBe(code);
	expect(exchanged?.codeVerifier?.length).toBeGreaterThan(10);
	const [row] = await db
		.select()
		.from(socialConnections)
		.where(
			and(eq(socialConnections.clientId, alpha.id), eq(socialConnections.platform, 'linkedin'))
		)
		.limit(1);
	expect(row?.encryptedAccessToken?.startsWith('v1:')).toBe(true);
	expect(decryptSecret(env.TOKEN_ENCRYPTION_KEY, row?.encryptedAccessToken ?? '')).toContain(
		'memory-oauth-linkedin'
	);
	const overview = await getSocialOverview(actor, ctx);
	expect(overview.oauth.redirectUri).toContain('/social/oauth/callback');
	expect(overview.oauth.configured.linkedin).toBe(true);
	assertNoSocialOAuthSecrets(JSON.stringify(overview), [code, exchanged?.codeVerifier ?? '']);
	const cookie = `${cookieName()}=${actor.token}`;
	const apiStart = await app.request('/v1/social/oauth/start', {
		method: 'POST',
		headers: {
			cookie,
			'content-type': 'application/json',
			'x-csrf-token': actor.csrf
		},
		body: JSON.stringify({ platform: 'x', required: true })
	});
	expect(apiStart.status).toBe(200);
	const apiStartBody = await apiStart.json();
	const apiAuthorize = new URL(apiStartBody.data.authorizeUrl);
	assertNoSocialOAuthSecrets(JSON.stringify(apiStartBody));
	const apiComplete = await app.request('/v1/social/oauth/complete', {
		method: 'POST',
		headers: {
			cookie,
			'content-type': 'application/json',
			'x-csrf-token': actor.csrf
		},
		body: JSON.stringify({
			code: `api-${code}`,
			state: apiAuthorize.searchParams.get('state')
		})
	});
	expect(apiComplete.status).toBe(200);
	const apiCompleteText = await apiComplete.text();
	assertNoSocialOAuthSecrets(apiCompleteText, [`api-${code}`]);
	const apiOverview = await app.request('/v1/social', { headers: { cookie } });
	expect(apiOverview.status).toBe(200);
	assertNoSocialOAuthSecrets(await apiOverview.text(), [`api-${code}`]);
});

test('Alpha OAuth state cannot complete as Beta and forged state fails closed', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '127.0.0.76', 'social-oauth-a');
	const betaActor = await adminOn(beta.id, '127.0.0.77', 'social-oauth-b');
	const alphaCtx = contextFor(alphaActor, 'social-oauth-a');
	const betaCtx = contextFor(betaActor, 'social-oauth-b');
	const started = await startSocialOAuth(
		alphaActor,
		alphaCtx,
		{ platform: 'facebook', required: true },
		'social-oauth-a-start'
	);
	const state = new URL(started.authorizeUrl).searchParams.get('state') ?? '';
	let stolen: unknown;
	try {
		await completeSocialOAuth(
			betaActor,
			betaCtx,
			{ code: 'stolen-code-value', state },
			'social-oauth-stolen'
		);
	} catch (error) {
		stolen = error;
	}
	expect(stolen).toBeInstanceOf(ForbiddenError);
	let forged: unknown;
	try {
		await completeSocialOAuth(
			alphaActor,
			alphaCtx,
			{ code: 'forged-code-value', state: 'not-a-valid-oauth-state' },
			'social-oauth-forged'
		);
	} catch (error) {
		forged = error;
	}
	expect(forged).toBeInstanceOf(ValidationError);
	let expired: unknown;
	try {
		await completeSocialOAuth(
			alphaActor,
			alphaCtx,
			{
				code: 'expired-code-value',
				state: createSocialOAuthState(env.TOKEN_ENCRYPTION_KEY, {
					clientId: alpha.id,
					organizationId: alphaActor.organizationId,
					userId: alphaActor.userId,
					platform: 'facebook',
					redirectUri: 'http://localhost:5183/social/oauth/callback',
					codeVerifier: 'expired-verifier-value',
					required: true,
					exp: Date.now() - 1000
				})
			},
			'social-oauth-expired'
		);
	} catch (error) {
		expired = error;
	}
	expect(expired).toBeInstanceOf(ValidationError);
	const betaOverview = await getSocialOverview(betaActor, betaCtx);
	expect(betaOverview.accounts.some((account) => account.handle === 'facebook-oauth')).toBe(false);
	expect(JSON.stringify(betaOverview).includes('stolen-code-value')).toBe(false);
});

test('Meta OAuth page picker stores only the selected Page and stays tenant bound', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '127.0.0.78', 'social-page-a');
	const betaActor = await adminOn(beta.id, '127.0.0.79', 'social-page-b');
	const alphaCtx = contextFor(alphaActor, 'social-page-a');
	const betaCtx = contextFor(betaActor, 'social-page-b');
	memorySocialProvider('facebook').oauthPages = [
		{ pageId: 'page-a', name: 'Page A', accessToken: 'memory-page-a-token-value' },
		{ pageId: 'page-b', name: 'Page B', accessToken: 'memory-page-b-token-value' }
	];
	const started = await startSocialOAuth(
		alphaActor,
		alphaCtx,
		{ platform: 'facebook', required: true },
		'social-page-start'
	);
	const pending = await completeSocialOAuth(
		alphaActor,
		alphaCtx,
		{
			code: `page-code-${crypto.randomUUID().slice(0, 8)}`,
			state: new URL(started.authorizeUrl).searchParams.get('state') ?? ''
		},
		'social-page-complete'
	);
	if (pending.status !== 'select_page') throw new Error('expected page selection');
	expect(pending.pages.map((page) => page.pageId)).toEqual(['page-a', 'page-b']);
	assertNoSocialOAuthSecrets(JSON.stringify(pending), [
		'memory-page-a-token-value',
		'memory-page-b-token-value',
		'memory-oauth-user-facebook'
	]);
	let stolen: unknown;
	try {
		await selectSocialOAuthPage(
			betaActor,
			betaCtx,
			{ pageId: 'page-b', selectionToken: pending.selectionToken },
			'social-page-stolen'
		);
	} catch (error) {
		stolen = error;
	}
	expect(stolen).toBeInstanceOf(ForbiddenError);
	const selected = await selectSocialOAuthPage(
		alphaActor,
		alphaCtx,
		{ pageId: 'page-b', selectionToken: pending.selectionToken },
		'social-page-select'
	);
	if (selected.status !== 'connected') throw new Error('expected connected page');
	expect(selected.account.handle).toBe('Page B');
	assertNoSocialOAuthSecrets(JSON.stringify(selected), [
		'memory-page-a-token-value',
		'memory-page-b-token-value'
	]);
	const [row] = await db
		.select()
		.from(socialConnections)
		.where(
			and(eq(socialConnections.clientId, alpha.id), eq(socialConnections.platform, 'facebook'))
		)
		.limit(1);
	expect(decryptSecret(env.TOKEN_ENCRYPTION_KEY, row?.encryptedAccessToken ?? '')).toBe(
		'memory-page-b-token-value'
	);
	expect(memorySocialProvider('facebook').resolvedPages.at(-1)).toBe('page-b');
	const cookie = `${cookieName()}=${alphaActor.token}`;
	const apiSelect = await app.request('/v1/social/oauth/select', {
		method: 'POST',
		headers: {
			cookie,
			'content-type': 'application/json',
			'x-csrf-token': alphaActor.csrf
		},
		body: JSON.stringify({ pageId: 'page-a', selectionToken: pending.selectionToken })
	});
	expect(apiSelect.status).toBe(200);
	assertNoSocialOAuthSecrets(await apiSelect.text(), ['memory-page-a-token-value']);
	const betaOverview = await getSocialOverview(betaActor, betaCtx);
	expect(betaOverview.accounts.some((account) => account.handle === 'Page B')).toBe(false);
});
