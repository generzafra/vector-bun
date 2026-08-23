import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	contextFor,
	getAutonomyOverview,
	pauseIntelligence,
	rollbackAutoExecute,
	runAutoExecute,
	setAutonomyCeiling,
	setLaunchAutomationPolicy
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { overview: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { overview: await getAutonomyOverview(session, ctx), needsClient: false };
}

export const actions = {
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
			return {
				ok: true,
				notice: 'Client kill switch updated. Confidence cannot override a pause.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update the kill switch' });
		}
	},
	ceiling: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await setAutonomyCeiling(
				session,
				contextFor(session, locals.requestId),
				{ autonomyCeiling: Number(form.get('autonomyCeiling') ?? '') },
				locals.requestId
			);
			return {
				ok: true,
				notice: 'Autonomy ceiling updated. Level 5 stays closed.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update the autonomy ceiling' });
		}
	},
	execute: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			const result = await runAutoExecute(
				session,
				contextFor(session, locals.requestId),
				{ actionType: String(form.get('actionType') ?? '') },
				locals.requestId
			);
			if (!result.executed) {
				return {
					ok: true,
					notice: `Blocked by ${result.blockedBy}. Kill switch and policy still win. Nothing was sent, published, or launched live.`
				};
			}
			const actionType = String(form.get('actionType') ?? '');
			if (actionType === 'launch.queue_qa') {
				return {
					ok: true,
					notice: result.replayed
						? 'Existing queued launch QA reused. Nothing went live or was published.'
						: 'Standard launch QA checklist queued. Unpublished drafts only. Nothing went live or was published.'
				};
			}
			if (actionType === 'launch.wire_tracking') {
				return {
					ok: true,
					notice: result.replayed
						? 'Existing draft tracking plan reused. Nothing was published.'
						: 'Standard conversion events wired on unpublished drafts. Nothing was published.'
				};
			}
			if (actionType === 'experiment.promote_winner') {
				return {
					ok: true,
					notice: result.replayed
						? 'Existing experiment promote reused. Phase 7 policy still decided.'
						: 'Challenger promoted under Phase 7 policy. Only this tenant published pointer changed. Confidence did not authorize.'
				};
			}
			return {
				ok: true,
				notice: result.replayed
					? 'Existing internal weekly report reused. Nothing was sent or published.'
					: 'Internal weekly report recorded from observed tenant metrics. Nothing was sent or published.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not auto-execute' });
		}
	},
	launchPolicy: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await setLaunchAutomationPolicy(
				session,
				contextFor(session, locals.requestId),
				{
					actionType: String(form.get('actionType') ?? ''),
					enabled: form.get('enabled') === 'true'
				},
				locals.requestId
			);
			return {
				ok: true,
				notice: 'Launch automation policy updated. S3 executes only opted-in unpublished steps.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update the launch automation policy' });
		}
	},
	rollback: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			const result = await rollbackAutoExecute(
				session,
				contextFor(session, locals.requestId),
				{ executionId: String(form.get('executionId') ?? '') },
				locals.requestId
			);
			return {
				ok: true,
				notice: result.replayed
					? 'Existing rollback reused. Kill switch did not need to unpause.'
					: 'Trusted software restored the captured prior state. Confidence did not authorize.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not roll back the execution' });
		}
	}
};
