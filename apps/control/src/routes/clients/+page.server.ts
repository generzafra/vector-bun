import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { createClient, listClientsForActor } from '@vector/domain';

export async function load({ locals }) {
	return { clients: await listClientsForActor(locals.session!) };
}

export const actions = {
	create: async ({ request, locals }) => {
		const form = await request.formData();
		try {
			await createClient(
				locals.session!,
				{
					name: String(form.get('name') ?? ''),
					slug: String(form.get('slug') ?? ''),
					timezone: String(form.get('timezone') ?? 'UTC')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, { error: error.message });
			}
			return fail(500, { error: 'Could not create client' });
		}
	}
};
