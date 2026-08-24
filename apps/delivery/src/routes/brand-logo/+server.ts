import { error } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { deliveryTenantContext, getDeliveryBrandLogoBytes } from '@vector/domain';

export async function GET({ locals }) {
	if (locals.delivery.kind !== 'brand_logo') error(404, 'Unknown host');
	try {
		const result = await getDeliveryBrandLogoBytes(
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
