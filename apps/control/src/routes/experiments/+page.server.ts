import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	contextFor,
	createExperimentProposal,
	getExperimentOverview,
	transitionExperiment
} from '@vector/domain';

function formString(form: FormData, key: string) {
	return String(form.get(key) ?? '');
}

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { overview: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { overview: await getExperimentOverview(session, ctx), needsClient: false };
}

export const actions = {
	create: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await createExperimentProposal(
				session,
				contextFor(session, locals.requestId),
				{
					name: formString(form, 'name'),
					problem: formString(form, 'problem'),
					evidence: formString(form, 'evidence'),
					hypothesis: formString(form, 'hypothesis'),
					audience: formString(form, 'audience'),
					audienceKey: 'all_visitors',
					pageId: formString(form, 'pageId'),
					controlPageVersionId: formString(form, 'controlPageVersionId'),
					challengerPageVersionId: formString(form, 'challengerPageVersionId'),
					challengerName: formString(form, 'challengerName') || 'Challenger',
					primaryMetric: formString(form, 'primaryMetric'),
					guardrailMetrics: form.getAll('guardrailMetrics').map(String),
					minDurationDays: Number(formString(form, 'minDurationDays')),
					minSamplePerVariant: Number(formString(form, 'minSamplePerVariant')),
					decisionRule: formString(form, 'decisionRule') || 'fixed_horizon',
					rollbackRule: formString(form, 'rollbackRule') || 'revert_to_control'
				},
				locals.requestId
			);
			return {
				ok: true,
				notice: 'Proposal recorded. Assignment and promotion stay later and policy-gated.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record the experiment proposal' });
		}
	},
	transition: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		const to = formString(form, 'to');
		try {
			await transitionExperiment(
				session,
				contextFor(session, locals.requestId),
				{ id: formString(form, 'id'), to },
				locals.requestId
			);
			if (to === 'approved') {
				return {
					ok: true,
					notice: 'Status is approved. Assignment and exposure stay later.'
				};
			}
			if (to === 'paused') {
				return {
					ok: true,
					notice: 'Experiment paused. The page and primary metric stay reserved.'
				};
			}
			return {
				ok: true,
				notice: 'Experiment resumed. Assignment still requires a later launch slice.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update the experiment status' });
		}
	}
};
