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
	if (decision.kind === 'redirect') {
		const dest = new URL(event.url);
		dest.hostname = decision.targetHostname;
		return new Response(null, {
			status: 308,
			headers: { location: dest.toString() }
		});
	}
	if (
		decision.kind === 'domain_challenge' ||
		decision.kind === 'robots' ||
		decision.kind === 'sitemap' ||
		decision.kind === 'llms' ||
		decision.kind === 'unsubscribe' ||
		decision.kind === 'brand_logo' ||
		decision.kind === 'og_image' ||
		decision.kind === 'hero_image'
	) {
		const response = await resolve(event);
		if (decision.kind !== 'domain_challenge' && decision.domainKind === 'preview') {
			response.headers.set('X-Robots-Tag', 'noindex, nofollow');
			response.headers.set('Cache-Control', 'private, no-store');
		}
		return response;
	}
	if (decision.kind !== 'page') error(404, 'Unknown host');
	const response = await resolve(event);
	if (decision.domainKind === 'preview') {
		response.headers.set('X-Robots-Tag', 'noindex, nofollow');
		response.headers.set('Cache-Control', 'private, no-store');
	}
	const exposed = event.locals.delivery;
	if (exposed.kind === 'page' && exposed.experiment) {
		response.headers.set('Cache-Control', 'private, no-store');
	}
	return response;
};
