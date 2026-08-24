import { fail } from '@sveltejs/kit';
import { AppError, APPROVAL_CENTER_GROUPS, type ApprovalCenterGroup } from '@vector/contracts';
import {
	contextFor,
	decideApprovalCenterGroup,
	decideIntelligenceApproval,
	getApprovalCenter
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { needsClient: true, center: null };
	if (!session.permissions.includes('ai.read')) {
		return { needsClient: false, center: null };
	}
	const ctx = contextFor(session, locals.requestId);
	return { needsClient: false, center: await getApprovalCenter(session, ctx) };
}

export const actions = {
	decide: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a business on Overview first' });
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
				notice:
					result.artifact?.kind === 'page_draft'
						? 'Approved. A draft was saved — Vector did not publish or send.'
						: result.recorded.decision === 'approved'
							? 'Approved. Vector did not publish or send.'
							: 'Rejected. Nothing was published or sent.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record that decision' });
		}
	},
	decideGroup: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a business on Overview first' });
		const form = await request.formData();
		const group = String(form.get('group') ?? '') as ApprovalCenterGroup;
		if (!APPROVAL_CENTER_GROUPS.includes(group)) {
			return fail(422, { error: 'Unknown approval group' });
		}
		try {
			const result = await decideApprovalCenterGroup(
				session,
				contextFor(session, locals.requestId),
				{
					group,
					decision: String(form.get('decision') ?? '') === 'rejected' ? 'rejected' : 'approved'
				},
				locals.requestId
			);
			return {
				ok: true,
				notice: `Marked ${result.count} ${result.group.replaceAll('_', ' ')} items. Vector did not publish or send.`
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record those decisions' });
		}
	}
};
