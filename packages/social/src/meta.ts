import { ProviderError } from '@vector/contracts';
import { logError, logInfo } from '@vector/observability';
import { asBody } from './bytes';
import type {
	AuthorizationRequest,
	ConnectionHealth,
	ExchangeAuthorizationCodeInput,
	MetricsRequest,
	OAuthTokenSet,
	PostMetrics,
	PublishMedia,
	PublishRequest,
	PublishResult,
	RefreshRequest,
	RefreshResult,
	SocialProvider
} from './types';

const TIMEOUT_MS = 10_000;
const GRAPH_VERSION = 'v21.0';
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_VERSION}`;
const EMPTY_METRICS: PostMetrics = {
	impressions: 0,
	likes: 0,
	comments: 0,
	shares: 0,
	clicks: 0
};

export class MetaSocialProvider implements SocialProvider {
	constructor(
		readonly platform: 'facebook' | 'instagram',
		private readonly sendHttp: typeof fetch = fetch,
		private readonly oauth: { appId?: string; appSecret?: string } = {}
	) {}

	async validateConnection(input: {
		accessToken: string;
		externalAccountId: string;
	}): Promise<ConnectionHealth> {
		if (!input.accessToken || !input.externalAccountId) {
			return {
				ok: false,
				adapter: 'meta',
				platform: this.platform,
				detail: 'Meta token or account id is missing'
			};
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const url = `${GRAPH_BASE}/${encodeURIComponent(input.externalAccountId)}?fields=id`;
			const response = await this.sendHttp(url, {
				method: 'GET',
				signal: controller.signal,
				headers: { authorization: `Bearer ${input.accessToken}` }
			});
			if (!response.ok) {
				return {
					ok: false,
					adapter: 'meta',
					platform: this.platform,
					detail: `Meta rejected the connection (${response.status})`
				};
			}
			return {
				ok: true,
				adapter: 'meta',
				platform: this.platform,
				detail: 'Meta connection is valid',
				externalAccountId: input.externalAccountId
			};
		} catch (error) {
			logError('social.meta.validate', error, {
				platform: this.platform,
				accountId: input.externalAccountId
			});
			return {
				ok: false,
				adapter: 'meta',
				platform: this.platform,
				detail: 'Meta connection check failed'
			};
		} finally {
			clearTimeout(timer);
		}
	}

	createAuthorizationUrl(request: AuthorizationRequest) {
		if (!this.oauth.appId) {
			throw new ProviderError('Meta app is not configured', 'SOCIAL_OAUTH_UNCONFIGURED');
		}
		const scopes =
			this.platform === 'instagram'
				? 'pages_show_list,pages_read_engagement,pages_manage_posts,instagram_basic,instagram_content_publish,business_management'
				: 'pages_show_list,pages_read_engagement,pages_manage_posts,business_management';
		const url = new URL(`https://www.facebook.com/${GRAPH_VERSION}/dialog/oauth`);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('client_id', this.oauth.appId);
		url.searchParams.set('redirect_uri', request.redirectUri);
		url.searchParams.set('state', request.state);
		url.searchParams.set('scope', scopes);
		return url.toString();
	}

	async exchangeAuthorizationCode(input: ExchangeAuthorizationCodeInput): Promise<OAuthTokenSet> {
		const appId = this.oauth.appId;
		const appSecret = this.oauth.appSecret;
		if (!appId || !appSecret) {
			throw new ProviderError('Meta app is not configured', 'SOCIAL_OAUTH_UNCONFIGURED');
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const shortLived = await this.sendHttp(
				`${GRAPH_BASE}/oauth/access_token?${new URLSearchParams({
					client_id: appId,
					client_secret: appSecret,
					redirect_uri: input.redirectUri,
					code: input.code
				})}`,
				{ method: 'GET', signal: controller.signal }
			);
			if (!shortLived.ok) {
				throw new ProviderError(
					`Meta OAuth exchange failed (${shortLived.status})`,
					'PROVIDER_TEMPORARY_FAILURE'
				);
			}
			const shortBody = (await shortLived.json()) as { access_token?: string };
			if (!shortBody.access_token) {
				throw new ProviderError(
					'Meta OAuth exchange returned no access token',
					'PROVIDER_INVALID_PAYLOAD'
				);
			}
			const longLived = await this.sendHttp(
				`${GRAPH_BASE}/oauth/access_token?${new URLSearchParams({
					grant_type: 'fb_exchange_token',
					client_id: appId,
					client_secret: appSecret,
					fb_exchange_token: shortBody.access_token
				})}`,
				{ method: 'GET', signal: controller.signal }
			);
			const longBody = longLived.ok
				? ((await longLived.json()) as { access_token?: string; expires_in?: number })
				: {};
			const userToken = longBody.access_token ?? shortBody.access_token;
			const pagesResponse = await this.sendHttp(`${GRAPH_BASE}/me/accounts`, {
				method: 'GET',
				signal: controller.signal,
				headers: { authorization: `Bearer ${userToken}` }
			});
			if (!pagesResponse.ok) {
				throw new ProviderError(
					`Meta page lookup failed (${pagesResponse.status})`,
					'PROVIDER_TEMPORARY_FAILURE'
				);
			}
			const pages = (await pagesResponse.json()) as {
				data?: Array<{ id?: string; name?: string; access_token?: string }>;
			};
			const page = (pages.data ?? []).find((row) => row.id && row.access_token);
			if (!page?.id || !page.access_token) {
				throw new ProviderError(
					'Meta OAuth found no Page with a publish token',
					'PROVIDER_INVALID_PAYLOAD'
				);
			}
			if (this.platform === 'facebook') {
				return {
					accessToken: page.access_token,
					refreshToken: page.access_token,
					expiresAt: longBody.expires_in
						? new Date(Date.now() + longBody.expires_in * 1000)
						: undefined,
					externalAccountId: page.id,
					handle: page.name ?? 'facebook',
					displayName: page.name ?? 'Facebook'
				};
			}
			const igLookup = await this.sendHttp(
				`${GRAPH_BASE}/${encodeURIComponent(page.id)}?fields=instagram_business_account`,
				{
					method: 'GET',
					signal: controller.signal,
					headers: { authorization: `Bearer ${page.access_token}` }
				}
			);
			if (!igLookup.ok) {
				throw new ProviderError(
					`Instagram account lookup failed (${igLookup.status})`,
					'PROVIDER_TEMPORARY_FAILURE'
				);
			}
			const igBody = (await igLookup.json()) as {
				instagram_business_account?: { id?: string };
			};
			const igUserId = igBody.instagram_business_account?.id;
			if (!igUserId) {
				throw new ProviderError(
					'Meta OAuth found no Instagram professional account on the Page',
					'PROVIDER_INVALID_PAYLOAD'
				);
			}
			const igProfile = await this.sendHttp(
				`${GRAPH_BASE}/${encodeURIComponent(igUserId)}?fields=id,username`,
				{
					method: 'GET',
					signal: controller.signal,
					headers: { authorization: `Bearer ${page.access_token}` }
				}
			);
			const ig = igProfile.ok ? ((await igProfile.json()) as { username?: string }) : {};
			return {
				accessToken: page.access_token,
				refreshToken: page.access_token,
				expiresAt: longBody.expires_in
					? new Date(Date.now() + longBody.expires_in * 1000)
					: undefined,
				externalAccountId: igUserId,
				handle: ig.username ?? 'instagram',
				displayName: ig.username ?? page.name ?? 'Instagram'
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			logError('social.meta.oauth', error, { platform: this.platform });
			throw new ProviderError('Meta OAuth exchange failed', 'PROVIDER_TEMPORARY_FAILURE');
		} finally {
			clearTimeout(timer);
		}
	}

	async publish(request: PublishRequest): Promise<PublishResult> {
		if (this.platform === 'instagram' && (!request.media || !request.media.publicUrl)) {
			throw new ProviderError(
				'Instagram Graph publishing requires approved media with a fetchable image URL',
				'SOCIAL_MEDIA_UNSUPPORTED'
			);
		}
		if (request.assetVersionId && !request.media) {
			throw new ProviderError(
				'Meta media bytes were not loaded for the approved asset',
				'SOCIAL_MEDIA_UNSUPPORTED'
			);
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const providerPostId =
				this.platform === 'instagram'
					? await this.publishInstagram(request, controller.signal)
					: request.media
						? await this.publishFacebookPhoto(request, request.media, controller.signal)
						: await this.publishFacebookText(request, controller.signal);
			logInfo('social.meta.publish', {
				clientId: request.clientId,
				publicationId: request.publicationId,
				platform: this.platform
			});
			return {
				accepted: true,
				providerPostId,
				detail: 'Published through the Meta Graph API'
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			logError('social.meta.publish', error, { publicationId: request.publicationId });
			throw new ProviderError('Meta publish failed', 'PROVIDER_TEMPORARY_FAILURE');
		} finally {
			clearTimeout(timer);
		}
	}

	private async publishFacebookText(request: PublishRequest, signal: AbortSignal) {
		const response = await this.sendHttp(
			`${GRAPH_BASE}/${encodeURIComponent(request.externalAccountId)}/feed`,
			{
				method: 'POST',
				signal,
				headers: {
					authorization: `Bearer ${request.accessToken}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify({ message: request.body })
			}
		);
		if (!response.ok) {
			throw new ProviderError(
				`Meta publish failed (${response.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		const body = (await response.json()) as { id?: string };
		return body.id ?? `facebook-${request.publicationId}`;
	}

	private async publishFacebookPhoto(
		request: PublishRequest,
		media: PublishMedia,
		signal: AbortSignal
	) {
		const form = new FormData();
		form.append(
			'source',
			new Blob([asBody(media.bytes)], { type: media.mimeType }),
			media.filename
		);
		form.append('message', request.body);
		form.append('published', 'true');
		const response = await this.sendHttp(
			`${GRAPH_BASE}/${encodeURIComponent(request.externalAccountId)}/photos`,
			{
				method: 'POST',
				signal,
				headers: { authorization: `Bearer ${request.accessToken}` },
				body: form
			}
		);
		if (!response.ok) {
			throw new ProviderError(
				`Meta photo publish failed (${response.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		const body = (await response.json()) as { id?: string; post_id?: string };
		return body.post_id ?? body.id ?? `facebook-${request.publicationId}`;
	}

	private async publishInstagram(request: PublishRequest, signal: AbortSignal) {
		const imageUrl = request.media?.publicUrl;
		if (!imageUrl) {
			throw new ProviderError(
				'Instagram Graph publishing requires approved media with a fetchable image URL',
				'SOCIAL_MEDIA_UNSUPPORTED'
			);
		}
		const container = await this.sendHttp(
			`${GRAPH_BASE}/${encodeURIComponent(request.externalAccountId)}/media`,
			{
				method: 'POST',
				signal,
				headers: {
					authorization: `Bearer ${request.accessToken}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify({ image_url: imageUrl, caption: request.body })
			}
		);
		if (!container.ok) {
			throw new ProviderError(
				`Instagram media container failed (${container.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		const created = (await container.json()) as { id?: string };
		if (!created.id) {
			throw new ProviderError(
				'Instagram media container returned no creation id',
				'PROVIDER_INVALID_PAYLOAD'
			);
		}
		const published = await this.sendHttp(
			`${GRAPH_BASE}/${encodeURIComponent(request.externalAccountId)}/media_publish`,
			{
				method: 'POST',
				signal,
				headers: {
					authorization: `Bearer ${request.accessToken}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify({ creation_id: created.id })
			}
		);
		if (!published.ok) {
			throw new ProviderError(
				`Instagram media publish failed (${published.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		const body = (await published.json()) as { id?: string };
		return body.id ?? created.id;
	}

	async fetchPostMetrics(request: MetricsRequest): Promise<PostMetrics> {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const url =
				this.platform === 'instagram'
					? `${GRAPH_BASE}/${encodeURIComponent(request.providerPostId)}/insights?metric=impressions,reach,likes,comments`
					: `${GRAPH_BASE}/${encodeURIComponent(request.providerPostId)}?fields=shares,reactions.summary(true),comments.summary(true)`;
			const response = await this.sendHttp(url, {
				method: 'GET',
				signal: controller.signal,
				headers: { authorization: `Bearer ${request.accessToken}` }
			});
			if (!response.ok) return { ...EMPTY_METRICS };
			if (this.platform === 'instagram') {
				const body = (await response.json()) as {
					data?: Array<{ name?: string; values?: Array<{ value?: number }> }>;
				};
				const byName = new Map(
					(body.data ?? []).map((row) => [row.name ?? '', row.values?.[0]?.value ?? 0])
				);
				return {
					impressions: byName.get('impressions') ?? byName.get('reach') ?? 0,
					likes: byName.get('likes') ?? 0,
					comments: byName.get('comments') ?? 0,
					shares: 0,
					clicks: 0
				};
			}
			const body = (await response.json()) as {
				shares?: { count?: number };
				reactions?: { summary?: { total_count?: number } };
				comments?: { summary?: { total_count?: number } };
			};
			return {
				impressions: 0,
				likes: body.reactions?.summary?.total_count ?? 0,
				comments: body.comments?.summary?.total_count ?? 0,
				shares: body.shares?.count ?? 0,
				clicks: 0
			};
		} catch (error) {
			logError('social.meta.metrics', error, { providerPostId: request.providerPostId });
			return { ...EMPTY_METRICS };
		} finally {
			clearTimeout(timer);
		}
	}

	async refreshConnection(input: RefreshRequest): Promise<RefreshResult> {
		const appId = this.oauth.appId;
		const appSecret = this.oauth.appSecret;
		if (!appId || !appSecret) {
			return {
				ok: false,
				adapter: 'meta',
				platform: this.platform,
				detail: 'Meta app is not configured'
			};
		}
		if (!input.refreshToken) {
			return {
				ok: false,
				adapter: 'meta',
				platform: this.platform,
				detail: 'Refresh token is missing'
			};
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const params = new URLSearchParams({
				grant_type: 'fb_exchange_token',
				client_id: appId,
				client_secret: appSecret,
				fb_exchange_token: input.refreshToken
			});
			const response = await this.sendHttp(`${GRAPH_BASE}/oauth/access_token?${params}`, {
				method: 'GET',
				signal: controller.signal
			});
			if (!response.ok) {
				return {
					ok: false,
					adapter: 'meta',
					platform: this.platform,
					detail: `Meta token refresh failed (${response.status})`
				};
			}
			const body = (await response.json()) as {
				access_token?: string;
				expires_in?: number;
			};
			if (!body.access_token) {
				return {
					ok: false,
					adapter: 'meta',
					platform: this.platform,
					detail: 'Meta token refresh returned no access token'
				};
			}
			logInfo('social.meta.refresh', { clientId: input.clientId, platform: this.platform });
			return {
				ok: true,
				adapter: 'meta',
				platform: this.platform,
				detail: 'Meta token refreshed',
				accessToken: body.access_token,
				refreshToken: body.access_token,
				expiresAt: body.expires_in ? new Date(Date.now() + body.expires_in * 1000) : undefined
			};
		} catch (error) {
			logError('social.meta.refresh', error, { clientId: input.clientId });
			return {
				ok: false,
				adapter: 'meta',
				platform: this.platform,
				detail: 'Meta token refresh failed'
			};
		} finally {
			clearTimeout(timer);
		}
	}
}
