import { isProd } from '@vector/config';

export const VISITOR_COOKIE = 'vector_vid';
export const ANALYTICS_SESSION_COOKIE = 'vector_asid';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function cookieId(value: string | undefined) {
	return value && UUID_RE.test(value) ? value : crypto.randomUUID();
}

export function analyticsCookieOptions() {
	return {
		path: '/',
		httpOnly: true,
		sameSite: 'lax' as const,
		secure: isProd,
		maxAge: 60 * 60 * 24 * 365
	};
}
