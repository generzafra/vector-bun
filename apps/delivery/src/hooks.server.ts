import { error, type Handle } from '@sveltejs/kit';
import { resolveDeliveryRequest } from '$lib/server/host';

export const handle: Handle = async ({ event, resolve }) => {
	const decision = resolveDeliveryRequest(event.url.pathname, event.request.headers.get('host'));
	if (decision.allow) return resolve(event);
	error(404, 'Unknown host');
};
