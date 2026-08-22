import { createHash, randomBytes } from 'node:crypto';
import { SOCIAL_PLATFORMS, ValidationError, type SocialPlatform } from '@vector/contracts';
import { decryptSecret, encryptSecret } from './secrets';

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
