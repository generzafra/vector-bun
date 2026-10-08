import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import { contextFor, decideClientReveal, getClientReveal } from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { reveal: null, needsClient: true };
	return {
		reveal: await getClientReveal(session, contextFor(session, locals.requestId)),
		needsClient: false
	};
}

export const actions = {
	approve: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			await decideClientReveal(
				session,
				contextFor(session, locals.requestId),
				{ decision: 'approved' },
				locals.requestId
			);
			return { notice: 'Approved. This does not publish the site.' };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record approval' });
		}
	},
	changes: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await decideClientReveal(
				session,
				contextFor(session, locals.requestId),
				{
					decision: 'changes_requested',
					note: String(form.get('note') ?? ''),
					categories: form.getAll('category').map(String)
				},
				locals.requestId
			);
			return { notice: 'Change request recorded. Nothing was published.' };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record the change request' });
		}
	}
};
