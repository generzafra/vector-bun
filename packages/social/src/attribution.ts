import type { SocialPlatform } from '@vector/contracts';

export const SOCIAL_ATTRIBUTION_MEDIUM = 'social';
export const SOCIAL_ATTRIBUTION_CAMPAIGN = 'vector-social';

export function socialAttributionContent(postId: string) {
	return `post:${postId}`;
}

export function socialAttributionParams(platform: SocialPlatform, postId: string) {
	return {
		utmSource: platform,
		utmMedium: SOCIAL_ATTRIBUTION_MEDIUM,
		utmCampaign: SOCIAL_ATTRIBUTION_CAMPAIGN,
		utmContent: socialAttributionContent(postId)
	};
}

export function parseSocialAttributionContent(content: string | null | undefined) {
	const match = content?.trim().match(/^post:([0-9a-f-]{36})$/i);
	return match?.[1] ?? null;
}
