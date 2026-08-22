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
const VERSION = '202401';

export class LinkedInSocialProvider implements SocialProvider {
	readonly platform = 'linkedin' as const;

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
				adapter: 'linkedin',
				platform: this.platform,
				detail: 'LinkedIn token or account id is missing'
			};
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const response = await this.sendHttp('https://api.linkedin.com/v2/userinfo', {
				method: 'GET',
				signal: controller.signal,
				headers: { authorization: `Bearer ${input.accessToken}` }
			});
			if (!response.ok) {
				return {
					ok: false,
					adapter: 'linkedin',
					platform: this.platform,
					detail: `LinkedIn rejected the connection (${response.status})`
				};
			}
			return {
				ok: true,
				adapter: 'linkedin',
				platform: this.platform,
				detail: 'LinkedIn connection is valid',
				externalAccountId: input.externalAccountId
			};
		} catch (error) {
			logError('social.linkedin.validate', error, { accountId: input.externalAccountId });
			return {
				ok: false,
				adapter: 'linkedin',
				platform: this.platform,
				detail: 'LinkedIn connection check failed'
			};
		} finally {
			clearTimeout(timer);
		}
	}

	async publish(request: PublishRequest): Promise<PublishResult> {
		if (request.assetVersionId && !request.media) {
			throw new ProviderError(
				'LinkedIn media bytes were not loaded for the approved asset',
				'SOCIAL_MEDIA_UNSUPPORTED'
			);
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const image =
				request.media &&
				(await this.uploadImage(
					request.accessToken,
					request.externalAccountId,
					request.media,
					controller.signal
				));
			const payload: Record<string, unknown> = {
				author: request.externalAccountId,
				commentary: request.body,
				visibility: 'PUBLIC',
				distribution: { feedDistribution: 'MAIN_FEED' },
				lifecycleState: 'PUBLISHED'
			};
			if (image) payload.content = { media: { id: image } };
			const response = await this.sendHttp('https://api.linkedin.com/rest/posts', {
				method: 'POST',
				signal: controller.signal,
				headers: {
					authorization: `Bearer ${request.accessToken}`,
					'content-type': 'application/json',
					'linkedin-version': VERSION,
					'x-restli-protocol-version': '2.0.0',
					'x-restli-idempotency-key': request.idempotencyKey
				},
				body: JSON.stringify(payload)
			});
			if (!response.ok) {
				throw new ProviderError(
					`LinkedIn publish failed (${response.status})`,
					'PROVIDER_TEMPORARY_FAILURE'
				);
			}
			const providerPostId =
				response.headers.get('x-restli-id') ?? `linkedin-${request.publicationId}`;
			logInfo('social.linkedin.publish', {
				clientId: request.clientId,
				publicationId: request.publicationId
			});
			return {
				accepted: true,
				providerPostId,
				detail: 'Published through the LinkedIn official API'
			};
		} catch (error) {
			if (error instanceof ProviderError) throw error;
			logError('social.linkedin.publish', error, { publicationId: request.publicationId });
			throw new ProviderError('LinkedIn publish failed', 'PROVIDER_TEMPORARY_FAILURE');
		} finally {
			clearTimeout(timer);
		}
	}

	private async uploadImage(
		accessToken: string,
		owner: string,
		media: PublishMedia,
		signal: AbortSignal
	) {
		const initialized = await this.sendHttp(
			'https://api.linkedin.com/rest/images?action=initializeUpload',
			{
				method: 'POST',
				signal,
				headers: {
					authorization: `Bearer ${accessToken}`,
					'content-type': 'application/json',
					'linkedin-version': VERSION,
					'x-restli-protocol-version': '2.0.0'
				},
				body: JSON.stringify({ initializeUploadRequest: { owner } })
			}
		);
		if (!initialized.ok) {
			throw new ProviderError(
				`LinkedIn media initialize failed (${initialized.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		const body = (await initialized.json()) as {
			value?: { uploadUrl?: string; image?: string };
		};
		const uploadUrl = body.value?.uploadUrl;
		const image = body.value?.image;
		if (!uploadUrl || !image) {
			throw new ProviderError(
				'LinkedIn media initialize returned no upload target',
				'PROVIDER_INVALID_PAYLOAD'
			);
		}
		const uploaded = await this.sendHttp(uploadUrl, {
			method: 'PUT',
			signal,
			headers: {
				authorization: `Bearer ${accessToken}`,
				'content-type': media.mimeType
			},
			body: asBody(media.bytes)
		});
		if (!uploaded.ok) {
			throw new ProviderError(
				`LinkedIn media upload failed (${uploaded.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		return image;
	}

	async fetchPostMetrics(_request: MetricsRequest): Promise<PostMetrics> {
		return { impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 };
	}

	async refreshConnection(input: RefreshRequest): Promise<RefreshResult> {
		const clientId = this.oauth.clientId;
		const clientSecret = this.oauth.clientSecret;
		if (!clientId || !clientSecret) {
			return {
				ok: false,
				adapter: 'linkedin',
				platform: this.platform,
				detail: 'LinkedIn OAuth client is not configured'
			};
		}
		if (!input.refreshToken) {
			return {
				ok: false,
				adapter: 'linkedin',
				platform: this.platform,
				detail: 'Refresh token is missing'
			};
		}
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const response = await this.sendHttp('https://www.linkedin.com/oauth/v2/accessToken', {
				method: 'POST',
				signal: controller.signal,
				headers: { 'content-type': 'application/x-www-form-urlencoded' },
				body: new URLSearchParams({
					grant_type: 'refresh_token',
					refresh_token: input.refreshToken,
					client_id: clientId,
					client_secret: clientSecret
				})
			});
			if (!response.ok) {
				return {
					ok: false,
					adapter: 'linkedin',
					platform: this.platform,
					detail: `LinkedIn token refresh failed (${response.status})`
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
					adapter: 'linkedin',
					platform: this.platform,
					detail: 'LinkedIn token refresh returned no access token'
				};
			}
			logInfo('social.linkedin.refresh', { clientId: input.clientId });
			return {
				ok: true,
				adapter: 'linkedin',
				platform: this.platform,
				detail: 'LinkedIn token refreshed',
				accessToken: body.access_token,
				refreshToken: body.refresh_token ?? input.refreshToken,
				expiresAt: body.expires_in ? new Date(Date.now() + body.expires_in * 1000) : undefined
			};
		} catch (error) {
			logError('social.linkedin.refresh', error, { clientId: input.clientId });
			return {
				ok: false,
				adapter: 'linkedin',
				platform: this.platform,
				detail: 'LinkedIn token refresh failed'
			};
		} finally {
			clearTimeout(timer);
		}
	}
}
