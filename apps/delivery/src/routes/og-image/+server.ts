import { error } from '@sveltejs/kit';
import { deliveryTenantContext, getDeliveryOgImageBytes } from '@vector/domain';

export async function GET({ locals }) {
	if (locals.delivery.kind !== 'og_image') error(404, 'Unknown host');
	try {
		const result = await getDeliveryOgImageBytes(
			deliveryTenantContext(locals.delivery, locals.requestId)
		);
		const body = new ArrayBuffer(result.bytes.byteLength);
		new Uint8Array(body).set(result.bytes);
		return new Response(body, {
			headers: {
				'content-type': result.mimeType,
				'cache-control': 'private, no-store'
			}
		});
	} catch {
		error(404, 'Unknown host');
	}
}
