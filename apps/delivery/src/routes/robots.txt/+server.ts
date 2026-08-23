import { error } from '@sveltejs/kit';
import { deliveryRobotsTxt } from '@vector/domain';

export function GET({ locals, url }) {
	if (locals.delivery.kind !== 'robots') {
		error(404, 'Unknown host');
	}
	const body = deliveryRobotsTxt({
		domainKind: locals.delivery.domainKind,
		origin: url.origin
	});
	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-store'
		}
	});
}
