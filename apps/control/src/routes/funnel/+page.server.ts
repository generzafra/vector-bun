import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	composeFunnel,
	contextFor,
	getFunnel,
	overrideFirstRevealGate,
	publishFunnel,
	composeCreativeShells,
	placeFunnelShareCards
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { funnel: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { funnel: await getFunnel(session, ctx), needsClient: false };
}

export const actions = {
	compose: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			await composeFunnel(session, contextFor(session, locals.requestId), locals.requestId);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not compose funnel' });
		}
	},
	publish: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			await publishFunnel(session, contextFor(session, locals.requestId), locals.requestId);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not publish preview' });
		}
	},
	overrideGate: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await overrideFirstRevealGate(
				session,
				contextFor(session, locals.requestId),
				{ reason: String(form.get('reason') ?? '') },
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record override' });
		}
	},
	composeCards: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			await composeCreativeShells(session, contextFor(session, locals.requestId), locals.requestId);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not compose share cards' });
		}
	},
	placeCards: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			await placeFunnelShareCards(session, contextFor(session, locals.requestId), locals.requestId);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not place share cards on the preview' });
		}
	}
};
