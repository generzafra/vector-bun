import { env, isTest } from '@vector/config';
import { SOCIAL_PLATFORMS, type SocialPlatform } from '@vector/contracts';
import { DisabledSocialProvider } from './disabled';
import { LinkedInSocialProvider } from './linkedin';
import { MemorySocialProvider } from './memory';
import { MetaSocialProvider } from './meta';
import type { SocialProvider } from './types';
import { XSocialProvider } from './x';

const cached = new Map<SocialPlatform, SocialProvider>();
const memory = {
	linkedin: new MemorySocialProvider('linkedin'),
	x: new MemorySocialProvider('x'),
	facebook: new MemorySocialProvider('facebook'),
	instagram: new MemorySocialProvider('instagram')
} as const satisfies Record<SocialPlatform, MemorySocialProvider>;

function officialSocialProvider(platform: SocialPlatform): SocialProvider {
	switch (platform) {
		case 'linkedin':
			return new LinkedInSocialProvider(fetch, {
				clientId: env.LINKEDIN_CLIENT_ID,
				clientSecret: env.LINKEDIN_CLIENT_SECRET
			});
		case 'x':
			return new XSocialProvider(fetch, {
				clientId: env.X_CLIENT_ID,
				clientSecret: env.X_CLIENT_SECRET
			});
		case 'facebook':
		case 'instagram':
			return new MetaSocialProvider(platform, fetch, {
				appId: env.META_APP_ID,
				appSecret: env.META_APP_SECRET
			});
	}
}

export function createSocialProvider(platform: SocialPlatform): SocialProvider {
	const useMemory = isTest || env.SOCIAL_ADAPTER === 'memory';
	const inner = useMemory ? memory[platform] : officialSocialProvider(platform);
	if (env.SOCIAL_PUBLISHING_PAUSED) {
		return new DisabledSocialProvider(platform, 'Outbound social publishing is paused', inner);
	}
	return inner;
}

export function socialProvider(platform: SocialPlatform) {
	const existing = cached.get(platform);
	if (existing) return existing;
	const created = createSocialProvider(platform);
	cached.set(platform, created);
	return created;
}

export function setSocialProvider(platform: SocialPlatform, provider: SocialProvider) {
	cached.set(platform, provider);
}

export function resetSocialProvider() {
	cached.clear();
	for (const platform of SOCIAL_PLATFORMS) memory[platform].reset();
}

export function memorySocialProvider(platform: SocialPlatform) {
	return memory[platform];
}
