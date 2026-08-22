import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { addMembership, contextFor, listMemberships } from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { memberships: [] };
	const ctx = contextFor(session, locals.requestId);
	return { memberships: await listMemberships(session, ctx) };
}

export const actions = {
	create: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await addMembership(
				session,
				contextFor(session, locals.requestId),
				{
					email: String(form.get('email') ?? ''),
					name: String(form.get('name') ?? ''),
					roleKey: String(form.get('roleKey') ?? 'read_only')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, { error: error.message });
			}
			return fail(500, { error: 'Could not add member' });
		}
	}
};
