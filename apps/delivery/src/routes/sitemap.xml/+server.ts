import { error } from '@sveltejs/kit';
import { deliverySitemapXml, deliveryTenantContext } from '@vector/domain';

export async function GET({ locals, url }) {
	if (locals.delivery.kind !== 'sitemap' || locals.delivery.domainKind !== 'production') {
		error(404, 'Unknown host');
	}
	const body = await deliverySitemapXml(
		deliveryTenantContext(locals.delivery, locals.requestId),
		url.origin
	);
	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'no-store'
		}
	});
}
