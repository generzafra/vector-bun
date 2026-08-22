import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { contextFor, listLeads, updateLeadStatus } from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { leads: [], needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { leads: await listLeads(session, ctx), needsClient: false };
}

export const actions = {
	status: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await updateLeadStatus(
				session,
				contextFor(session, locals.requestId),
				{
					id: String(form.get('id') ?? ''),
					status: String(form.get('status') ?? ''),
					reason: String(form.get('reason') ?? '')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update lead status' });
		}
	}
};
