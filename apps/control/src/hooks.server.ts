import { redirect, type Handle } from '@sveltejs/kit';
import { assertCsrf, cookieName } from '@vector/auth';
import { resolveSession } from '@vector/domain';
import { createRequestId } from '@vector/observability';
import {
	CONTROL_OVERVIEW_PATH,
	isControlMarketingPath,
	isControlPublicPath,
	normalizeControlPath
} from '$lib/public-paths';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = createRequestId();
	const publicPath = isControlPublicPath(event.url.pathname);
	try {
		event.locals.session = await resolveSession(event.cookies.get(cookieName()));
	} catch (error) {
		if (!publicPath) throw error;
		event.locals.session = null;
	}
	if (!event.locals.session && !publicPath) {
		throw redirect(303, '/login');
	}
	if (
		event.locals.session &&
		isControlMarketingPath(event.url.pathname) &&
		(event.request.method === 'GET' || event.request.method === 'HEAD')
	) {
		throw redirect(303, CONTROL_OVERVIEW_PATH);
	}
	if (
		event.locals.session &&
		event.request.method !== 'GET' &&
		event.request.method !== 'HEAD' &&
		normalizeControlPath(event.url.pathname) !== '/login'
	) {
		const form = event.request.headers.get('content-type')?.includes('form')
			? await event.request.clone().formData()
			: null;
		assertCsrf(event.locals.session.csrf, form?.get('_csrf')?.toString());
	}
	return resolve(event);
};
