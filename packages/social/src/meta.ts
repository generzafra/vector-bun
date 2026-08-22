import { ProviderError } from '@vector/contracts';
import { logError, logInfo } from '@vector/observability';
import type {
	ConnectionHealth,
	MetricsRequest,
	PostMetrics,
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

	async publish(request: PublishRequest): Promise<PublishResult> {
		if (request.assetVersionId || this.platform === 'instagram') {
			throw new ProviderError(
				this.platform === 'instagram'
					? 'Instagram Graph publishing requires approved media in this slice'
					: 'Meta media upload is not enabled in this slice',
				'SOCIAL_MEDIA_UNSUPPORTED'
			);
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const response = await this.sendHttp(
				`${GRAPH_BASE}/${encodeURIComponent(request.externalAccountId)}/feed`,
				{
					method: 'POST',
					signal: controller.signal,
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
			const providerPostId = body.id ?? `facebook-${request.publicationId}`;
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
