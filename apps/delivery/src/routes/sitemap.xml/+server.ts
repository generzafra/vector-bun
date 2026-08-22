import { error } from '@sveltejs/kit';

export function GET({ locals, url }) {
	if (locals.delivery.kind !== 'sitemap' || locals.delivery.domainKind !== 'production') {
		error(404, 'Unknown host');
	}
	const loc = `${url.origin}/`;
	const body = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${loc}</loc></url></urlset>\n`;
	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'no-store'
		}
	});
}
