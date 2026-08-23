import { error } from '@sveltejs/kit';
import { deliveryLlmsTxt, deliveryTenantContext } from '@vector/domain';

export async function GET({ locals, url }) {
	if (locals.delivery.kind !== 'llms' || locals.delivery.domainKind !== 'production') {
		error(404, 'Unknown host');
	}
	const body = await deliveryLlmsTxt(
		deliveryTenantContext(locals.delivery, locals.requestId),
		url.origin
	);
	if (!body) error(404, 'Unknown host');
	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-store'
		}
	});
}
