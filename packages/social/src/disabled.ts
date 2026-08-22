import { ProviderError } from '@vector/contracts';
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

export class DisabledSocialProvider implements SocialProvider {
	constructor(
		readonly platform: SocialPlatform,
		private readonly detail = 'Outbound social publishing is paused',
		private readonly inner?: SocialProvider
	) {}

	async validateConnection(input: {
		accessToken: string;
		externalAccountId: string;
	}): Promise<ConnectionHealth> {
		if (this.inner) return this.inner.validateConnection(input);
		return {
			ok: false,
			adapter: 'disabled',
			platform: this.platform,
			detail: this.detail
		};
	}

	async publish(_request: PublishRequest): Promise<PublishResult> {
		throw new ProviderError(this.detail, 'SOCIAL_PUBLISHING_PAUSED');
	}

	async fetchPostMetrics(request: MetricsRequest): Promise<PostMetrics> {
		if (this.inner) return this.inner.fetchPostMetrics(request);
		throw new ProviderError(this.detail, 'SOCIAL_PUBLISHING_PAUSED');
	}

	async refreshConnection(input: RefreshRequest): Promise<RefreshResult> {
		if (this.inner) return this.inner.refreshConnection(input);
		return {
			ok: false,
			adapter: 'disabled',
			platform: this.platform,
			detail: this.detail
		};
	}
}
