import { createHash, randomBytes } from 'node:crypto';
import { SOCIAL_PLATFORMS, ValidationError, type SocialPlatform } from '@vector/contracts';
import { decryptSecret, encryptSecret } from './secrets';
import type { OAuthPageChoice } from './types';

export type SocialOAuthState = {
	clientId: string;
	organizationId: string;
	userId: string;
	platform: SocialPlatform;
	redirectUri: string;
	codeVerifier: string;
	required: boolean;
	exp: number;
};

export function createPkcePair() {
	const verifier = randomBytes(32).toString('base64url');
	const challenge = createHash('sha256').update(verifier).digest('base64url');
	return { verifier, challenge };
}

export function createSocialOAuthState(secret: string, state: SocialOAuthState) {
	return encryptSecret(secret, JSON.stringify(state));
}

export function parseSocialOAuthState(secret: string, token: string): SocialOAuthState | null {
	let raw: string;
	try {
		raw = decryptSecret(secret, token);
	} catch {
		return null;
	}
	let parsed: Partial<SocialOAuthState>;
	try {
		parsed = JSON.parse(raw) as Partial<SocialOAuthState>;
	} catch {
		return null;
	}
	if (
		!parsed.clientId ||
		!parsed.organizationId ||
		!parsed.userId ||
		!parsed.platform ||
		!parsed.redirectUri ||
		!parsed.codeVerifier ||
		typeof parsed.required !== 'boolean' ||
		typeof parsed.exp !== 'number' ||
		!Number.isFinite(parsed.exp) ||
		parsed.exp <= Date.now()
	) {
		return null;
	}
	if (!(SOCIAL_PLATFORMS as readonly string[]).includes(parsed.platform)) return null;
	return parsed as SocialOAuthState;
}

export function socialOAuthRedirectUri(controlOrigin: string, override?: string) {
	if (override?.trim()) return override.replace(/\/$/, '');
	return `${controlOrigin.replace(/\/$/, '')}/social/oauth/callback`;
}

export function requireOAuthState(secret: string, token: string): SocialOAuthState {
	const state = parseSocialOAuthState(secret, token);
	if (!state) throw new ValidationError('Social OAuth state is invalid or expired');
	return state;
}

export const SOCIAL_OAUTH_PAGE_PICK_COOKIE = 'vector_social_page_pick';
export const SOCIAL_OAUTH_SELECTION_TTL_MS = 10 * 60_000;

export type SocialOAuthSelection = {
	clientId: string;
	organizationId: string;
	userId: string;
	platform: Extract<SocialPlatform, 'facebook' | 'instagram'>;
	userAccessToken: string;
	userRefreshToken?: string;
	expiresAt?: number;
	required: boolean;
	pages: OAuthPageChoice[];
	exp: number;
};

function publicPageChoice(page: Partial<OAuthPageChoice>): OAuthPageChoice | null {
	if (!page.pageId || !page.name) return null;
	return {
		pageId: page.pageId,
		name: page.name,
		...(page.instagramUserId ? { instagramUserId: page.instagramUserId } : {}),
		...(page.instagramHandle ? { instagramHandle: page.instagramHandle } : {})
	};
}

export function createSocialOAuthSelection(secret: string, selection: SocialOAuthSelection) {
	return encryptSecret(
		secret,
		JSON.stringify({
			...selection,
			pages: selection.pages.map((page) => publicPageChoice(page)).filter(Boolean)
		})
	);
}

export function parseSocialOAuthSelection(
	secret: string,
	token: string
): SocialOAuthSelection | null {
	let raw: string;
	try {
		raw = decryptSecret(secret, token);
	} catch {
		return null;
	}
	let parsed: Partial<SocialOAuthSelection>;
	try {
		parsed = JSON.parse(raw) as Partial<SocialOAuthSelection>;
	} catch {
		return null;
	}
	if (
		!parsed.clientId ||
		!parsed.organizationId ||
		!parsed.userId ||
		(parsed.platform !== 'facebook' && parsed.platform !== 'instagram') ||
		!parsed.userAccessToken ||
		typeof parsed.required !== 'boolean' ||
		!Array.isArray(parsed.pages) ||
		typeof parsed.exp !== 'number' ||
		!Number.isFinite(parsed.exp) ||
		parsed.exp <= Date.now()
	) {
		return null;
	}
	const pages = parsed.pages.map((page) => publicPageChoice(page)).filter((page) => page !== null);
	if (pages.length === 0) return null;
	return {
		clientId: parsed.clientId,
		organizationId: parsed.organizationId,
		userId: parsed.userId,
		platform: parsed.platform,
		userAccessToken: parsed.userAccessToken,
		userRefreshToken:
			typeof parsed.userRefreshToken === 'string' && parsed.userRefreshToken.length > 0
				? parsed.userRefreshToken
				: undefined,
		expiresAt: typeof parsed.expiresAt === 'number' ? parsed.expiresAt : undefined,
		required: parsed.required,
		pages,
		exp: parsed.exp
	};
}

export function requireOAuthSelection(secret: string, token: string): SocialOAuthSelection {
	const selection = parseSocialOAuthSelection(secret, token);
	if (!selection) throw new ValidationError('Social OAuth page selection is invalid or expired');
	return selection;
}
