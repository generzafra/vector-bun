import { error } from '@sveltejs/kit';

export function GET({ locals, url }) {
	if (locals.delivery.kind !== 'robots') error(404, 'Unknown host');
	const body =
		locals.delivery.domainKind === 'preview'
			? 'User-agent: *\nDisallow: /\n'
			: `User-agent: *\nAllow: /\nSitemap: ${url.origin}/sitemap.xml\n`;
	return new Response(body, {
		headers: {
			'content-type': 'text/plain; charset=utf-8',
			'cache-control': 'no-store'
		}
	});
}
