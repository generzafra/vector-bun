import { fail } from '@sveltejs/kit';
import { AppError, switchClientSchema } from '@vector/contracts';
import { cookieName } from '@vector/auth';
import {
	contextFor,
	getBrandVisualProfile,
	getClientOverview,
	getOutcomesQuickStart,
	listClientsForActor,
	listMonthlyGrowthReports,
	recordMonthlyGrowthReport,
	askVector,
	listAskVectorTurns,
	recordRevenueEvent,
	switchActiveClient
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	const clients = await listClientsForActor(session);
	let quickstart = null;
	let brandVisualConfirmed: boolean | null = null;
	if (session.clientId && session.permissions.includes('goals.read')) {
		quickstart = await getOutcomesQuickStart(session, contextFor(session, locals.requestId));
	}
	if (session.clientId && session.permissions.includes('knowledge.read')) {
		const review = await getBrandVisualProfile(session, contextFor(session, locals.requestId));
		brandVisualConfirmed = review.confirmed;
	}
	let overview = null;
	let reviews: Awaited<ReturnType<typeof listMonthlyGrowthReports>> = [];
	let asks: Awaited<ReturnType<typeof listAskVectorTurns>> = [];
	if (
		session.clientId &&
		(session.permissions.includes('goals.read') || session.permissions.includes('leads.read'))
	) {
		overview = await getClientOverview(session, contextFor(session, locals.requestId));
	}
	if (session.clientId && session.permissions.includes('outcomes.read')) {
		reviews = await listMonthlyGrowthReports(session, contextFor(session, locals.requestId));
	}
	if (
		session.clientId &&
		(session.permissions.includes('goals.read') ||
			session.permissions.includes('leads.read') ||
			session.permissions.includes('outcomes.read'))
	) {
		asks = await listAskVectorTurns(session, contextFor(session, locals.requestId));
	}
	return {
		clients,
		activeClientId: session.clientId,
		quickstart,
		brandVisualConfirmed,
		overview,
		reviews,
		asks
	};
}

export const actions = {
	switchClient: async ({ request, locals, cookies }) => {
		const form = await request.formData();
		const parsed = switchClientSchema.safeParse({ clientId: form.get('clientId') });
		if (!parsed.success) return fail(422, { error: 'Invalid client' });
		const token = cookies.get(cookieName());
		if (!locals.session || !token) return fail(401, { error: 'Unauthorized' });
		await switchActiveClient(locals.session, token, parsed.data.clientId, locals.requestId);
		return { ok: true };
	},
	recordRevenue: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		const raw = String(form.get('amountMajor') ?? '').trim();
		if (!/^\d+$/.test(raw)) return fail(422, { error: 'Amount must be a whole number' });
		try {
			await recordRevenueEvent(
				session,
				contextFor(session, locals.requestId),
				{
					amountMinor: Number(raw) * 100,
					currency: String(form.get('currency') ?? ''),
					note: String(form.get('note') ?? '').trim() || null
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record revenue' });
		}
	},
	recordReview: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			await recordMonthlyGrowthReport(
				session,
				contextFor(session, locals.requestId),
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record the monthly review' });
		}
	},
	ask: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await askVector(
				session,
				contextFor(session, locals.requestId),
				{ intent: String(form.get('intent') ?? '') },
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not answer' });
		}
	}
};
