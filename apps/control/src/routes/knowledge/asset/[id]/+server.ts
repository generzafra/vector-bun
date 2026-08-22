import { error } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { contextFor, getBrandAssetBytes } from '@vector/domain';

export async function GET({ params, locals }) {
	const session = locals.session;
	if (!session?.clientId) throw error(403, 'Select a client first');
	try {
		const result = await getBrandAssetBytes(
			session,
			contextFor(session, locals.requestId),
			params.id
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
		if (caught instanceof AppError) throw error(caught.status, caught.message);
		throw error(404, 'Asset not found');
	}
}
