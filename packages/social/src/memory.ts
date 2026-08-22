import type { SocialPlatform } from '@vector/contracts';
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
		this.metrics.clear();
		this.refreshFail = false;
	}
}
