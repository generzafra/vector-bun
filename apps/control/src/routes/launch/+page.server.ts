import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	completeReadinessItem,
	contextFor,
	getLaunch,
	recalculateReadiness,
	transitionLaunch
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { launch: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { launch: await getLaunch(session, ctx), needsClient: false };
}

export const actions = {
	recalculate: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			await recalculateReadiness(
				session,
				contextFor(session, locals.requestId),
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not recalculate readiness' });
		}
	},
	completeItem: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await completeReadinessItem(
				session,
				contextFor(session, locals.requestId),
				{
					key: String(form.get('key') ?? ''),
					note: String(form.get('note') ?? '') || undefined
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not complete item' });
		}
	},
	transition: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await transitionLaunch(
				session,
				contextFor(session, locals.requestId),
				{
					to: String(form.get('to') ?? ''),
					reason: String(form.get('reason') ?? ''),
					launchClass: String(form.get('launchClass') ?? '') || undefined
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not change launch state' });
		}
	}
};
