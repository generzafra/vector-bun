import { fail } from '@sveltejs/kit';
import { AppError, ValidationError } from '@vector/contracts';
import {
	contextFor,
	getClientValueProof,
	recordValueActivity,
	saveClientValueProfile
} from '@vector/domain';

function amountMinorFromMajor(raw: string) {
	const value = raw.trim();
	if (!value) throw new ValidationError('Fee is required');
	if (!/^\d+$/.test(value)) throw new ValidationError('Fee must be a whole number');
	const minor = Number(value) * 100;
	if (minor <= 0) throw new ValidationError('Fee must be greater than zero');
	return minor;
}

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { needsClient: true, proof: null };
	if (!session.permissions.includes('goals.read')) {
		return { needsClient: false, proof: null };
	}
	const ctx = contextFor(session, locals.requestId);
	return { needsClient: false, proof: await getClientValueProof(session, ctx) };
}

export const actions = {
	profile: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a business on Overview first' });
		const form = await request.formData();
		try {
			await saveClientValueProfile(
				session,
				contextFor(session, locals.requestId),
				{
					packageName: String(form.get('packageName') ?? '').trim(),
					feeMinor: amountMinorFromMajor(String(form.get('feeMajor') ?? '')),
					currency: String(form.get('currency') ?? '')
						.trim()
						.toUpperCase()
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not save the package fee' });
		}
	},
	activity: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a business on Overview first' });
		const form = await request.formData();
		try {
			await recordValueActivity(
				session,
				contextFor(session, locals.requestId),
				{
					activityType: String(form.get('activityType') ?? ''),
					description: String(form.get('description') ?? ''),
					quantity: 1,
					automated: false
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record work' });
		}
	}
};
