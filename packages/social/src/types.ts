import type { SocialPlatform } from '@vector/contracts';

export type SocialAdapterName = 'memory' | 'linkedin' | 'x' | 'meta' | 'disabled';

export type ConnectionHealth = {
	ok: boolean;
	adapter: SocialAdapterName;
	platform: SocialPlatform;
	detail: string;
	externalAccountId?: string;
};

export type PublishMedia = {
	assetVersionId: string;
	filename: string;
	mimeType: string;
	bytes: Uint8Array;
	publicUrl?: string;
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
	media?: PublishMedia | null;
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

export type AuthorizationRequest = {
	state: string;
	redirectUri: string;
	codeChallenge: string;
};

export type ExchangeAuthorizationCodeInput = {
	code: string;
	redirectUri: string;
	codeVerifier: string;
};

export type OAuthTokenSet = {
	accessToken: string;
	refreshToken?: string;
	expiresAt?: Date;
	scopes?: string;
	externalAccountId: string;
	handle: string;
	displayName: string;
};

export type OAuthPageChoice = {
	pageId: string;
	name: string;
	instagramUserId?: string;
	instagramHandle?: string;
};

export type OAuthConnectedResult = {
	kind: 'connected';
	tokens: OAuthTokenSet;
};

export type OAuthSelectPageResult = {
	kind: 'select_page';
	pages: OAuthPageChoice[];
	userAccessToken: string;
	userRefreshToken?: string;
	expiresAt?: Date;
};

export type OAuthExchangeResult = OAuthConnectedResult | OAuthSelectPageResult;

export type ResolveOAuthPageInput = {
	userAccessToken: string;
	pageId: string;
};

export function oauthConnected(tokens: OAuthTokenSet): OAuthConnectedResult {
	return { kind: 'connected', tokens };
}

export function oauthSelectPage(input: {
	pages: OAuthPageChoice[];
	userAccessToken: string;
	userRefreshToken?: string;
	expiresAt?: Date;
}): OAuthSelectPageResult {
	return { kind: 'select_page', ...input };
}

export interface SocialProvider {
	platform: SocialPlatform;
	validateConnection(input: {
		accessToken: string;
		externalAccountId: string;
	}): Promise<ConnectionHealth>;
	createAuthorizationUrl(request: AuthorizationRequest): string;
	exchangeAuthorizationCode(input: ExchangeAuthorizationCodeInput): Promise<OAuthExchangeResult>;
	resolveOAuthPage(input: ResolveOAuthPageInput): Promise<OAuthTokenSet>;
	publish(request: PublishRequest): Promise<PublishResult>;
	schedule?(request: ScheduleRequest): Promise<ScheduleResult>;
	fetchPostMetrics(request: MetricsRequest): Promise<PostMetrics>;
	refreshConnection(input: RefreshRequest): Promise<RefreshResult>;
}
