import { ProviderError } from '@vector/contracts';
import { logError, logInfo } from '@vector/observability';
import { asBody } from './bytes';
import type {
	ConnectionHealth,
	MetricsRequest,
	PostMetrics,
	PublishMedia,
	PublishRequest,
	PublishResult,
	RefreshRequest,
	RefreshResult,
	SocialProvider
} from './types';

const TIMEOUT_MS = 10_000;

export class XSocialProvider implements SocialProvider {
	readonly platform = 'x' as const;

	constructor(
		private readonly sendHttp: typeof fetch = fetch,
		private readonly oauth: { clientId?: string; clientSecret?: string } = {}
	) {}

	async validateConnection(input: {
		accessToken: string;
		externalAccountId: string;
	}): Promise<ConnectionHealth> {
		if (!input.accessToken || !input.externalAccountId) {
			return {
				ok: false,
				adapter: 'x',
				platform: this.platform,
				detail: 'X token or account id is missing'
			};
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const response = await this.sendHttp('https://api.x.com/2/users/me', {
				method: 'GET',
				signal: controller.signal,
				headers: { authorization: `Bearer ${input.accessToken}` }
			});
			if (!response.ok) {
				return {
					ok: false,
					adapter: 'x',
					platform: this.platform,
					detail: `X rejected the connection (${response.status})`
				};
			}
			return {
				ok: true,
				adapter: 'x',
				platform: this.platform,
				detail: 'X connection is valid',
				externalAccountId: input.externalAccountId
			};
		} catch (error) {
			logError('social.x.validate', error, { accountId: input.externalAccountId });
			return {
				ok: false,
				adapter: 'x',
				platform: this.platform,
				detail: 'X connection check failed'
			};
		} finally {
			clearTimeout(timer);
		}
	}

	async publish(request: PublishRequest): Promise<PublishResult> {
		if (request.assetVersionId && !request.media) {
			throw new ProviderError(
				'X media bytes were not loaded for the approved asset',
				'SOCIAL_MEDIA_UNSUPPORTED'
			);
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const mediaId =
				request.media &&
				(await this.uploadImage(request.accessToken, request.media, controller.signal));
			const payload: Record<string, unknown> = { text: request.body };
			if (mediaId) payload.media = { media_ids: [mediaId] };
			const response = await this.sendHttp('https://api.x.com/2/tweets', {
				method: 'POST',
				signal: controller.signal,
				headers: {
					authorization: `Bearer ${request.accessToken}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify(payload)
			});
			if (!response.ok) {
				throw new ProviderError(
					`X publish failed (${response.status})`,
					'PROVIDER_TEMPORARY_FAILURE'
				);
			}
			const body = (await response.json()) as { data?: { id?: string } };
			const providerPostId = body.data?.id ?? `x-${request.publicationId}`;
			logInfo('social.x.publish', {
				clientId: request.clientId,
				publicationId: request.publicationId
			});
			return {
				accepted: true,
				providerPostId,
				detail: 'Published through the X official API'
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			logError('social.x.publish', error, { publicationId: request.publicationId });
			throw new ProviderError('X publish failed', 'PROVIDER_TEMPORARY_FAILURE');
		} finally {
			clearTimeout(timer);
		}
	}

	private async uploadImage(accessToken: string, media: PublishMedia, signal: AbortSignal) {
		const form = new FormData();
		form.append('media', new Blob([asBody(media.bytes)], { type: media.mimeType }), media.filename);
		form.append('media_category', 'tweet_image');
		const response = await this.sendHttp('https://api.x.com/2/media/upload', {
			method: 'POST',
			signal,
			headers: { authorization: `Bearer ${accessToken}` },
			body: form
		});
		if (!response.ok) {
			throw new ProviderError(
				`X media upload failed (${response.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		const body = (await response.json()) as {
			data?: { id?: string };
			media_id_string?: string;
			id?: string;
		};
		const mediaId = body.data?.id ?? body.media_id_string ?? body.id;
		if (!mediaId) {
			throw new ProviderError('X media upload returned no media id', 'PROVIDER_INVALID_PAYLOAD');
		}
		return mediaId;
	}

	async fetchPostMetrics(request: MetricsRequest): Promise<PostMetrics> {
		const empty = { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const response = await this.sendHttp(
				`https://api.x.com/2/tweets/${encodeURIComponent(request.providerPostId)}?tweet.fields=public_metrics`,
				{
					method: 'GET',
					signal: controller.signal,
					headers: { authorization: `Bearer ${request.accessToken}` }
				}
			);
			if (!response.ok) return empty;
			const body = (await response.json()) as {
				data?: {
					public_metrics?: {
						impression_count?: number;
						like_count?: number;
						reply_count?: number;
						retweet_count?: number;
					};
				};
			};
			const metrics = body.data?.public_metrics;
			return {
				impressions: metrics?.impression_count ?? 0,
				likes: metrics?.like_count ?? 0,
				comments: metrics?.reply_count ?? 0,
				shares: metrics?.retweet_count ?? 0,
				clicks: 0
			};
		} catch (error) {
			logError('social.x.metrics', error, { providerPostId: request.providerPostId });
			return empty;
		} finally {
			clearTimeout(timer);
		}
	}

	async refreshConnection(input: RefreshRequest): Promise<RefreshResult> {
		const clientId = this.oauth.clientId;
		const clientSecret = this.oauth.clientSecret;
		if (!clientId || !clientSecret) {
			return {
				ok: false,
				adapter: 'x',
				platform: this.platform,
				detail: 'X OAuth client is not configured'
			};
		}
		if (!input.refreshToken) {
			return {
				ok: false,
				adapter: 'x',
				platform: this.platform,
				detail: 'Refresh token is missing'
			};
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
			const response = await this.sendHttp('https://api.x.com/2/oauth2/token', {
				method: 'POST',
				signal: controller.signal,
				headers: {
					authorization: `Basic ${basic}`,
					'content-type': 'application/x-www-form-urlencoded'
				},
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: input.refreshToken,
					client_id: clientId
				})
			});
			if (!response.ok) {
				return {
					ok: false,
					adapter: 'x',
					platform: this.platform,
					detail: `X token refresh failed (${response.status})`
				};
			}
			const body = (await response.json()) as {
				access_token?: string;
				refresh_token?: string;
				expires_in?: number;
			};
			if (!body.access_token) {
				return {
					ok: false,
					adapter: 'x',
					platform: this.platform,
					detail: 'X token refresh returned no access token'
				};
			}
			logInfo('social.x.refresh', { clientId: input.clientId });
			return {
				ok: true,
				adapter: 'x',
				platform: this.platform,
				detail: 'X token refreshed',
				accessToken: body.access_token,
				refreshToken: body.refresh_token ?? input.refreshToken,
				expiresAt: body.expires_in ? new Date(Date.now() + body.expires_in * 1000) : undefined
			};
		} catch (error) {
			logError('social.x.refresh', error, { clientId: input.clientId });
			return {
				ok: false,
				adapter: 'x',
				platform: this.platform,
				detail: 'X token refresh failed'
			};
		} finally {
			clearTimeout(timer);
		}
	}
}
