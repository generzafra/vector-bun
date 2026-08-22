import { ProviderError } from '@vector/contracts';
import type { SocialPlatform } from '@vector/contracts';
import type {
	AuthorizationRequest,
	ConnectionHealth,
	ExchangeAuthorizationCodeInput,
	MetricsRequest,
	OAuthTokenSet,
	PostMetrics,
	PublishRequest,
	PublishResult,
	RefreshRequest,
	RefreshResult,
	SocialProvider
} from './types';

const EMPTY_METRICS: PostMetrics = {
	impressions: 0,
	likes: 0,
	comments: 0,
	shares: 0,
	clicks: 0
};

export class MemorySocialProvider implements SocialProvider {
	readonly published: PublishRequest[] = [];
	readonly refreshed: RefreshRequest[] = [];
	readonly exchanged: ExchangeAuthorizationCodeInput[] = [];
	readonly metrics = new Map<string, PostMetrics>();
	refreshFail = false;

	constructor(readonly platform: SocialPlatform) {}

	async validateConnection(input: {
		accessToken: string;
		externalAccountId: string;
	}): Promise<ConnectionHealth> {
		const ok = Boolean(input.accessToken && input.externalAccountId);
		return {
			ok,
			adapter: 'memory',
			platform: this.platform,
			detail: ok ? 'Memory connection is valid' : 'Access token or account id is missing',
			externalAccountId: input.externalAccountId
		};
	}

	createAuthorizationUrl(request: AuthorizationRequest) {
		const url = new URL(`https://social.test/oauth/${this.platform}`);
		url.searchParams.set('response_type', 'code');
		url.searchParams.set('state', request.state);
		url.searchParams.set('redirect_uri', request.redirectUri);
		url.searchParams.set('code_challenge', request.codeChallenge);
		url.searchParams.set('code_challenge_method', 'S256');
		return url.toString();
	}

	async exchangeAuthorizationCode(input: ExchangeAuthorizationCodeInput): Promise<OAuthTokenSet> {
		this.exchanged.push(input);
		if (!input.code || !input.codeVerifier) {
			throw new ProviderError(
				'Memory OAuth code or verifier is missing',
				'PROVIDER_INVALID_PAYLOAD'
			);
		}
		return {
			accessToken: `memory-oauth-${this.platform}-${input.code.slice(0, 12)}`,
			refreshToken: `memory-oauth-rt-${this.platform}`,
			expiresAt: new Date(Date.now() + 60 * 60 * 1000),
			externalAccountId: `oauth-${this.platform}-account`,
			handle: `${this.platform}-oauth`,
			displayName: `${this.platform} OAuth`
		};
	}

	async publish(request: PublishRequest): Promise<PublishResult> {
		this.published.push(request);
		const providerPostId = `mem-${this.platform}-${request.publicationId}`;
		if (!this.metrics.has(providerPostId)) {
			this.metrics.set(providerPostId, { ...EMPTY_METRICS });
		}
		return {
			accepted: true,
			providerPostId,
			detail: 'Published through the memory adapter'
		};
	}

	async fetchPostMetrics(request: MetricsRequest): Promise<PostMetrics> {
		return this.metrics.get(request.providerPostId) ?? { ...EMPTY_METRICS };
	}

	async refreshConnection(input: RefreshRequest): Promise<RefreshResult> {
		this.refreshed.push(input);
		if (this.refreshFail || !input.refreshToken) {
			return {
				ok: false,
				adapter: 'memory',
				platform: this.platform,
				detail: this.refreshFail ? 'Memory token refresh failed' : 'Refresh token is missing'
			};
		}
		return {
			ok: true,
			adapter: 'memory',
			platform: this.platform,
			detail: 'Memory token refreshed',
			accessToken: `memory-refreshed-${this.platform}-${input.clientId.slice(0, 8)}`,
			refreshToken: `memory-rt-${this.platform}-${input.clientId.slice(0, 8)}`,
			expiresAt: new Date(Date.now() + 60 * 60 * 1000)
		};
	}

	setMetrics(providerPostId: string, metrics: PostMetrics) {
		this.metrics.set(providerPostId, metrics);
	}

	reset() {
		this.published.length = 0;
		this.refreshed.length = 0;
		this.exchanged.length = 0;
		this.metrics.clear();
		this.refreshFail = false;
	}
}
