import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	addClientSuppression,
	contextFor,
	enrollEligibleLeadsForOperator,
	getEmailOverview,
	processDueNurtureForOperator,
	recheckSendingDomain,
	upsertSendingDomain
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { overview: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { overview: await getEmailOverview(session, ctx), needsClient: false };
}

export const actions = {
	domain: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await upsertSendingDomain(
				session,
				contextFor(session, locals.requestId),
				{
					domain: String(form.get('domain') ?? ''),
					fromAddress: String(form.get('fromAddress') ?? ''),
					fromName: String(form.get('fromName') ?? ''),
					fromApproved: form.get('fromApproved') === 'on',
					dkimSelector: String(form.get('dkimSelector') ?? 'resend')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not save sending domain' });
		}
	},
	recheck: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await recheckSendingDomain(
				session,
				contextFor(session, locals.requestId),
				{ id: String(form.get('id') ?? '') },
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not recheck domain' });
		}
	},
	suppress: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await addClientSuppression(
				session,
				contextFor(session, locals.requestId),
				{
					email: String(form.get('email') ?? ''),
					reason: String(form.get('reason') ?? 'operator')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not add suppression' });
		}
	},
	processDue: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			const result = await processDueNurtureForOperator(
				session,
				contextFor(session, locals.requestId),
				locals.requestId
			);
			return { ok: true, notice: `Processed ${result.processed} due nurture steps.` };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not process due nurture steps' });
		}
	},
	enrollEligible: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			const result = await enrollEligibleLeadsForOperator(
				session,
				contextFor(session, locals.requestId),
				locals.requestId
			);
			return {
				ok: true,
				notice: `Synced ${result.synced} contacts and enrolled ${result.enrolled} waiting leads.`
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not enroll eligible leads' });
		}
	}
};
