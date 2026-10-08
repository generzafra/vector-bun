import { fail } from '@sveltejs/kit';
import { AppError, ValidationError, formatMinorUnits } from '@vector/contracts';
import {
	contextFor,
	getClientValueProof,
	recordClientValueBaseline,
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
	const proof = await getClientValueProof(session, ctx);
	const baseline = proof.baseline
		? {
				version: proof.baseline.version,
				currency: proof.baseline.currency,
				evidence: proof.baseline.evidence,
				label: proof.baseline.label,
				detail: proof.baseline.detail,
				earlierVersions: proof.baseline.earlierVersions,
				stated: formatMinorUnits(proof.baseline.amountMinor, proof.baseline.currency)
			}
		: null;
	return { needsClient: false, proof: { ...proof, baseline } };
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
	baseline: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a business on Overview first' });
		const form = await request.formData();
		const raw = String(form.get('previousMajor') ?? '').trim();
		if (!raw)
			return fail(400, { error: 'Enter a previous monthly spend, or leave the section unused.' });
		if (!/^\d+$/.test(raw)) return fail(400, { error: 'Previous spend must be a whole number' });
		const minor = Number(raw) * 100;
		if (minor <= 0) return fail(400, { error: 'Previous spend must be greater than zero' });
		try {
			await recordClientValueBaseline(
				session,
				contextFor(session, locals.requestId),
				{
					amountMinor: minor,
					currency: String(form.get('currency') ?? '')
						.trim()
						.toUpperCase()
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record previous spend' });
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
