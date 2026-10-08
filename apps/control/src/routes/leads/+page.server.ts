import { fail } from '@sveltejs/kit';
import { AppError, ValidationError } from '@vector/contracts';
import {
	contextFor,
	getAttributionConfidence,
	getCrmStatus,
	getSalesOutcomeCoverage,
	listLeads,
	recordSalesOutcome,
	updateLeadStatus
} from '@vector/domain';

function amountMinorFromMajor(raw: string) {
	const value = raw.trim();
	if (!value) return null;
	if (!/^\d+$/.test(value)) throw new ValidationError('Amount must be a whole number');
	return Number(value) * 100;
}

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) {
		return { leads: [], coverage: null, crm: null, attribution: null, needsClient: true };
	}
	const ctx = contextFor(session, locals.requestId);
	const [leads, coverage, crm, attribution] = await Promise.all([
		listLeads(session, ctx),
		getSalesOutcomeCoverage(session, ctx),
		getCrmStatus(session, ctx),
		getAttributionConfidence(session, ctx)
	]);
	return { leads, coverage, crm, attribution, needsClient: false };
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
	},
	outcome: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			const currency = String(form.get('currency') ?? '')
				.trim()
				.toUpperCase();
			await recordSalesOutcome(
				session,
				contextFor(session, locals.requestId),
				{
					leadId: String(form.get('leadId') ?? ''),
					outcomeType: String(form.get('outcomeType') ?? ''),
					amountMinor: amountMinorFromMajor(String(form.get('amountMajor') ?? '')),
					currency: currency || null
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record what happened' });
		}
	}
};
