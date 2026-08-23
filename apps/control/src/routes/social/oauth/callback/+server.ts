import { isRedirect, redirect } from '@sveltejs/kit';
import { isProd } from '@vector/config';
import { AppError } from '@vector/contracts';
import {
	completeSocialOAuth,
	contextFor,
	SOCIAL_OAUTH_PAGE_PICK_COOKIE,
	SOCIAL_OAUTH_SELECTION_TTL_MS
} from '@vector/domain';

function oauthErrorRedirect(reason: string): never {
	const safe = reason
		.replace(/[^\w .:-]/g, ' ')
		.trim()
		.slice(0, 180);
	const target = safe
		? `/social?oauth=error&reason=${encodeURIComponent(safe)}`
		: '/social?oauth=error';
	throw redirect(303, target);
}

export async function GET({ url, locals, cookies }) {
	const session = locals.session;
	if (!session) throw redirect(303, '/login');
	if (!session.clientId) oauthErrorRedirect('Select a client before connecting social');
	const providerError = url.searchParams.get('error');
	if (providerError) {
		oauthErrorRedirect(url.searchParams.get('error_description') || providerError);
	}
	const code = url.searchParams.get('code') ?? '';
	const state = url.searchParams.get('state') ?? '';
	try {
		const result = await completeSocialOAuth(
			session,
			contextFor(session, locals.requestId),
			{ code, state },
			locals.requestId
		);
		if (result.status === 'select_page') {
			cookies.set(SOCIAL_OAUTH_PAGE_PICK_COOKIE, result.selectionToken, {
				path: '/',
				httpOnly: true,
				sameSite: 'lax',
				secure: isProd,
				maxAge: Math.floor(SOCIAL_OAUTH_SELECTION_TTL_MS / 1000)
			});
			throw redirect(303, '/social?oauth=select');
		}
		throw redirect(303, '/social?oauth=connected');
	} catch (error) {
		if (isRedirect(error)) throw error;
		oauthErrorRedirect(
			error instanceof AppError ? error.message : 'Official OAuth did not complete'
		);
	}
}
