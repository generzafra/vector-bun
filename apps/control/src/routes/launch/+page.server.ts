import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	activateClientDomain,
	completeReadinessItem,
	contextFor,
	disableClientDomain,
	getLaunch,
	listClientDomains,
	recalculateReadiness,
	submitClientDomain,
	transitionLaunch,
	verifyClientDomain
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { launch: null, domains: [], needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	const [launch, domains] = await Promise.all([
		getLaunch(session, ctx),
		listClientDomains(session, ctx)
	]);
	return { launch, domains, needsClient: false };
}

export const actions = {
	recalculate: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			await recalculateReadiness(session, contextFor(session, locals.requestId), locals.requestId);
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
	},
	submitDomain: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await submitClientDomain(
				session,
				contextFor(session, locals.requestId),
				{
					hostname: String(form.get('hostname') ?? ''),
					kind: String(form.get('kind') ?? '')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not submit domain' });
		}
	},
	verifyDomain: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await verifyClientDomain(
				session,
				contextFor(session, locals.requestId),
				String(form.get('id') ?? ''),
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not verify domain' });
		}
	},
	activateDomain: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await activateClientDomain(
				session,
				contextFor(session, locals.requestId),
				String(form.get('id') ?? ''),
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not activate domain' });
		}
	},
	disableDomain: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await disableClientDomain(
				session,
				contextFor(session, locals.requestId),
				String(form.get('id') ?? ''),
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not disable domain' });
		}
	}
};
