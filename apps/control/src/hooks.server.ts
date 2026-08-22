import { redirect, type Handle } from '@sveltejs/kit';
import { assertCsrf, cookieName } from '@vector/auth';
import { resolveSession } from '@vector/domain';
import { createRequestId } from '@vector/observability';

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.requestId = createRequestId();
	const token = event.cookies.get(cookieName());
	event.locals.session = await resolveSession(token);
	const publicPath = event.url.pathname === '/login';
	if (!event.locals.session && !publicPath) {
		throw redirect(303, '/login');
	}
	if (event.locals.session && event.request.method !== 'GET' && event.request.method !== 'HEAD') {
		const form = event.request.headers.get('content-type')?.includes('form')
			? await event.request.clone().formData()
			: null;
		assertCsrf(event.locals.session.csrf, form?.get('_csrf')?.toString());
	}
	return resolve(event);
};
