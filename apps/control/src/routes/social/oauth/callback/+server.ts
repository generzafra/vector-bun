import { isRedirect, redirect } from '@sveltejs/kit';
import { isProd } from '@vector/config';
import {
	completeSocialOAuth,
	contextFor,
	SOCIAL_OAUTH_PAGE_PICK_COOKIE,
	SOCIAL_OAUTH_SELECTION_TTL_MS
} from '@vector/domain';

export async function GET({ url, locals, cookies }) {
	const session = locals.session;
	if (!session) throw redirect(303, '/login');
	if (!session.clientId) throw redirect(303, '/social?oauth=error');
	if (url.searchParams.get('error')) throw redirect(303, '/social?oauth=error');
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
		throw redirect(303, '/social?oauth=error');
	}
}
