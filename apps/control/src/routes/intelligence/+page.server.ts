import { fail, redirect } from '@sveltejs/kit';
import { AppError, hasOperatorControlNav } from '@vector/contracts';
import {
	contextFor,
	decideIntelligenceApproval,
	getIntelligenceOverview,
	pauseIntelligence,
	runIntelligence
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!hasOperatorControlNav(session.permissions)) {
		throw redirect(303, '/approvals');
	}
	if (!session.clientId) return { overview: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { overview: await getIntelligenceOverview(session, ctx), needsClient: false };
}

export const actions = {
	run: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			const result = await runIntelligence(
				session,
				contextFor(session, locals.requestId),
				{
					agentKey: String(form.get('agentKey') ?? ''),
					brief: String(form.get('brief') ?? '') || null
				},
				locals.requestId
			);
			return {
				ok: true,
				notice: `Draft recorded for ${result.run.agentKey}. Approval is required. Nothing executed.`
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not run intelligence' });
		}
	},
	decide: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			const result = await decideIntelligenceApproval(
				session,
				contextFor(session, locals.requestId),
				{
					id: String(form.get('id') ?? ''),
					decision: String(form.get('decision') ?? ''),
					note: String(form.get('note') ?? '') || null
				},
				locals.requestId
			);
			return {
				ok: true,
				notice: result.executed
					? 'Unexpected execution'
					: result.artifact?.kind === 'page_draft'
						? `Marked ${result.recorded.decision}. Unpublished page draft created. Vector did not publish, send, or go live.`
						: `Marked ${result.recorded.decision}. Vector did not publish, send, or execute.`
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record approval' });
		}
	},
	pause: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await pauseIntelligence(
				session,
				contextFor(session, locals.requestId),
				{
					paused: form.get('paused') === 'true',
					reason: String(form.get('reason') ?? '')
				},
				locals.requestId
			);
			return { ok: true, notice: 'Client AI pause updated. Confidence cannot override a pause.' };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update AI pause' });
		}
	}
};
