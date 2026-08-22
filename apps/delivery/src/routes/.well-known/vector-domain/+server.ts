import { error } from '@sveltejs/kit';

export function GET({ locals }) {
	if (locals.delivery.kind !== 'domain_challenge') error(404, 'Unknown host');
	return new Response(locals.delivery.token, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-store'
		}
	});
}
