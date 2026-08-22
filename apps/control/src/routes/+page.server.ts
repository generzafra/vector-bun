import { fail } from '@sveltejs/kit';
import { switchClientSchema } from '@vector/contracts';
import { cookieName } from '@vector/auth';
import { listClientsForActor, switchActiveClient } from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	const clients = await listClientsForActor(session);
	return { clients, activeClientId: session.clientId };
}

export const actions = {
	switchClient: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const parsed = switchClientSchema.safeParse({ clientId: form.get('clientId') });
		if (!parsed.success) return fail(422, { error: 'Invalid client' });
		const token = cookies.get(cookieName());
		if (!locals.session || !token) return fail(401, { error: 'Unauthorized' });
		await switchActiveClient(locals.session, token, parsed.data.clientId, locals.requestId);
		return { ok: true };
	}
};
