import { isRedirect, redirect } from '@sveltejs/kit';
import { completeSocialOAuth, contextFor } from '@vector/domain';

export async function GET({ url, locals }) {
	const session = locals.session;
	if (!session) throw redirect(303, '/login');
	if (!session.clientId) throw redirect(303, '/social?oauth=error');
	if (url.searchParams.get('error')) throw redirect(303, '/social?oauth=error');
	const code = url.searchParams.get('code') ?? '';
	const state = url.searchParams.get('state') ?? '';
	try {
		await completeSocialOAuth(
			session,
			contextFor(session, locals.requestId),
			{ code, state },
			locals.requestId
		);
		throw redirect(303, '/social?oauth=connected');
	} catch (error) {
		if (isRedirect(error)) throw error;
		throw redirect(303, '/social?oauth=error');
	}
}
