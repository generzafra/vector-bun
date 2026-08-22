import type { SocialPlatform } from '@vector/contracts';

export type SocialAdapterName = 'memory' | 'linkedin' | 'x' | 'meta' | 'disabled';

export type ConnectionHealth = {
	ok: boolean;
	adapter: SocialAdapterName;
	platform: SocialPlatform;
	detail: string;
	externalAccountId?: string;
};

export type PublishRequest = {
	clientId: string;
	publicationId: string;
	idempotencyKey: string;
	platform: SocialPlatform;
	accessToken: string;
	externalAccountId: string;
	body: string;
	assetVersionId?: string | null;
};

export type PublishResult = {
	accepted: boolean;
	providerPostId: string;
	detail: string;
};

export type ScheduleRequest = PublishRequest & {
	scheduledAt: Date;
};

export type ScheduleResult = {
	accepted: boolean;
	providerScheduleId: string;
	detail: string;
};

export type MetricsRequest = {
	clientId: string;
	platform: SocialPlatform;
	accessToken: string;
	providerPostId: string;
};

export type PostMetrics = {
	impressions: number;
	likes: number;
	comments: number;
	shares: number;
	clicks: number;
};

export type RefreshRequest = {
	clientId: string;
	platform: SocialPlatform;
	refreshToken: string;
};

export type RefreshResult = ConnectionHealth & {
	accessToken?: string;
	refreshToken?: string;
	expiresAt?: Date;
};

export interface SocialProvider {
	platform: SocialPlatform;
	validateConnection(input: {
		accessToken: string;
		externalAccountId: string;
	}): Promise<ConnectionHealth>;
	publish(request: PublishRequest): Promise<PublishResult>;
	schedule?(request: ScheduleRequest): Promise<ScheduleResult>;
	fetchPostMetrics(request: MetricsRequest): Promise<PostMetrics>;
	refreshConnection(input: RefreshRequest): Promise<RefreshResult>;
}
