import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	addClaim,
	addOffer,
	addService,
	contextFor,
	getKnowledge,
	removeClaim,
	removeOffer,
	removeService,
	saveBrand
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { knowledge: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { knowledge: await getKnowledge(session, ctx), needsClient: false };
}

export const actions = {
	saveBrand: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await saveBrand(
				session,
				contextFor(session, locals.requestId),
				{
					displayName: String(form.get('displayName') ?? ''),
					tagline: String(form.get('tagline') ?? '') || null,
					audience: String(form.get('audience') ?? '') || null,
					offer: String(form.get('offer') ?? '') || null,
					primaryConversion: String(form.get('primaryConversion') ?? '') || null,
					secondaryConversion: String(form.get('secondaryConversion') ?? '') || null,
					brandPersonality: String(form.get('brandPersonality') ?? '') || null,
					tokens: {
						accent: String(form.get('accent') ?? '') || undefined,
						background: String(form.get('background') ?? '') || undefined,
						fontFamily: String(form.get('fontFamily') ?? '') || undefined
					}
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not save brand' });
		}
	},
	addService: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await addService(
				session,
				contextFor(session, locals.requestId),
				{
					name: String(form.get('name') ?? ''),
					slug: String(form.get('slug') ?? ''),
					outcome: String(form.get('outcome') ?? ''),
					summary: String(form.get('summary') ?? '')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not add service' });
		}
	},
	removeService: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await removeService(
				session,
				contextFor(session, locals.requestId),
				String(form.get('id') ?? ''),
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not remove service' });
		}
	},
	addOffer: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		const rawPrice = String(form.get('startingPriceMinor') ?? '').trim();
		try {
			await addOffer(
				session,
				contextFor(session, locals.requestId),
				{
					name: String(form.get('name') ?? ''),
					summary: String(form.get('summary') ?? ''),
					startingPriceMinor: rawPrice ? Number(rawPrice) : null,
					currency: String(form.get('currency') ?? 'USD')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not add offer' });
		}
	},
	removeOffer: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await removeOffer(
				session,
				contextFor(session, locals.requestId),
				String(form.get('id') ?? ''),
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not remove offer' });
		}
	},
	addClaim: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await addClaim(
				session,
				contextFor(session, locals.requestId),
				{
					kind: String(form.get('kind') ?? 'approved'),
					statement: String(form.get('statement') ?? ''),
					evidence: String(form.get('evidence') ?? '') || null
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not add claim' });
		}
	},
	removeClaim: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await removeClaim(
				session,
				contextFor(session, locals.requestId),
				String(form.get('id') ?? ''),
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not remove claim' });
		}
	}
};
