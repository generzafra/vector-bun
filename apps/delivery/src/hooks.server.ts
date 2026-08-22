import { error, type Handle } from '@sveltejs/kit';
import { resolveDeliveryPage } from '@vector/domain';
import { createRequestId } from '@vector/observability';

export const handle: Handle = async ({ event, resolve }) => {
	const requestId = createRequestId();
	event.locals.requestId = requestId;
	const decision = await resolveDeliveryPage(
		event.request.headers.get('host'),
		event.url.pathname,
		requestId
	);
	event.locals.delivery = decision;
	if (decision.kind === 'health') return resolve(event);
	if (decision.kind !== 'page') error(404, 'Unknown host');
	const response = await resolve(event);
	if (decision.domainKind === 'preview') {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
		response.headers.set('Cache-Control', 'private, no-store');
	}
	return response;
};
