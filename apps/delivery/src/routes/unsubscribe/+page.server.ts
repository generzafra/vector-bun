import { error, fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { unsubscribeByToken } from '@vector/domain';

export async function load({ locals, url }) {
	if (locals.delivery.kind !== 'unsubscribe') error(404, 'Unknown host');
	return {
		token: url.searchParams.get('token') ?? '',
		hostname: locals.delivery.hostname
	};
}

export const actions = {
	default: async ({ request, locals, getClientAddress }) => {
		if (locals.delivery.kind !== 'unsubscribe') return fail(404, { error: 'Unknown host' });
		const form = await request.formData();
		try {
			const result = await unsubscribeByToken(
				{ token: String(form.get('token') ?? '') },
				locals.requestId,
				locals.delivery.clientId,
				getClientAddress()
			);
			return { ok: true, email: result.email };
		} catch (err) {
			if (err instanceof AppError) return fail(err.status, { error: err.message });
			return fail(500, { error: 'Could not update email preferences' });
		}
	}
};
