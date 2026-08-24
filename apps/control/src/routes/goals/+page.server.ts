import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	contextFor,
	getClientOutcomes,
	updateNotificationPreference,
	upsertClientGoal
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) {
		return { needsClient: true, outcomes: null };
	}
	const ctx = contextFor(session, locals.requestId);
	return { needsClient: false, outcomes: await getClientOutcomes(session, ctx) };
}

export const actions = {
	saveGoal: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		const currency = String(form.get('currency') ?? '').trim();
		const startOn = String(form.get('startOn') ?? '').trim();
		const endOn = String(form.get('endOn') ?? '').trim();
		try {
			await upsertClientGoal(
				session,
				contextFor(session, locals.requestId),
				{
					name: String(form.get('name') ?? ''),
					goalType: String(form.get('goalType') ?? ''),
					targetValue: Number(form.get('targetValue')),
					unit: String(form.get('unit') ?? ''),
					currency: currency || null,
					period: String(form.get('period') ?? ''),
					isPrimary: form.get('isPrimary') === 'on',
					startOn: startOn || undefined,
					endOn: endOn || undefined
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not save the goal' });
		}
	},
	saveNotification: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await updateNotificationPreference(
				session,
				contextFor(session, locals.requestId),
				{
					topic: String(form.get('topic') ?? ''),
					enabled: form.get('enabled') === 'on'
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update the notification' });
		}
	}
};
