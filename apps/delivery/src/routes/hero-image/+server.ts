import { error } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { deliveryTenantContext, getDeliveryHeroImageBytes } from '@vector/domain';

export async function GET({ locals }) {
	if (locals.delivery.kind !== 'hero_image') error(404, 'Unknown host');
	try {
		const result = await getDeliveryHeroImageBytes(
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
	} catch (caught) {
		if (caught instanceof AppError) error(caught.status, caught.message);
		error(404, 'Unknown host');
	}
}
