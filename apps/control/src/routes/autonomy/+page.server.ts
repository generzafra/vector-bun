import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	contextFor,
	getAutonomyOverview,
	pauseIntelligence,
	setAutonomyCeiling
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { overview: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { overview: await getAutonomyOverview(session, ctx), needsClient: false };
}

export const actions = {
	pause: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await pauseIntelligence(
				session,
				contextFor(session, locals.requestId),
				{
					paused: form.get('paused') === 'true',
					reason: String(form.get('reason') ?? '')
				},
				locals.requestId
			);
			return {
				ok: true,
				notice: 'Client kill switch updated. Confidence cannot override a pause.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update the kill switch' });
		}
	},
	ceiling: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await setAutonomyCeiling(
				session,
				contextFor(session, locals.requestId),
				{ autonomyCeiling: Number(form.get('autonomyCeiling') ?? '') },
				locals.requestId
			);
			return {
				ok: true,
				notice: 'Autonomy ceiling updated. Level 4 and 5 stay closed. Nothing auto-executed.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update the autonomy ceiling' });
		}
	}
};
