import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	approveCreativeAsset,
	confirmCreativeRights,
	contextFor,
	createSocialPost,
	getSocialOverview,
	processDueSocialPublishesForOperator,
	publishSocialPost,
	refreshSocialConnection,
	scheduleSocialPost,
	syncSocialMetricsForOperator,
	transitionSocialPost,
	uploadCreativeAsset,
	upsertSocialConnection
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { overview: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { overview: await getSocialOverview(session, ctx), needsClient: false };
}

export const actions = {
	connect: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await upsertSocialConnection(
				session,
				contextFor(session, locals.requestId),
				{
					platform: String(form.get('platform') ?? ''),
					accessToken: String(form.get('accessToken') ?? ''),
					refreshToken: String(form.get('refreshToken') ?? '') || null,
					externalAccountId: String(form.get('externalAccountId') ?? ''),
					handle: String(form.get('handle') ?? ''),
					displayName: String(form.get('displayName') ?? ''),
					required: form.get('required') === 'on'
				},
				locals.requestId
			);
			return {
				ok: true,
				notice: 'Connection stored. The token is encrypted and is not shown again.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not save social connection' });
		}
	},
	refreshConnection: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await refreshSocialConnection(
				session,
				contextFor(session, locals.requestId),
				{ id: String(form.get('id') ?? '') },
				locals.requestId
			);
			return { ok: true, notice: 'Connection token refreshed. The new token is not shown.' };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not refresh social connection' });
		}
	},
	uploadAsset: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		const file = form.get('file');
		if (!(file instanceof File)) return fail(400, { error: 'File is required' });
		try {
			await uploadCreativeAsset(
				session,
				contextFor(session, locals.requestId),
				{
					title: String(form.get('title') ?? ''),
					kind: String(form.get('kind') ?? 'image'),
					filename: file.name,
					declaredType: file.type,
					bytes: new Uint8Array(await file.arrayBuffer())
				},
				locals.requestId
			);
			return {
				ok: true,
				notice: 'Creative asset uploaded as a draft. Confirm rights before approval.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not upload creative asset' });
		}
	},
	confirmRights: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await confirmCreativeRights(
				session,
				contextFor(session, locals.requestId),
				{
					id: String(form.get('id') ?? ''),
					rightsStatus: String(form.get('rightsStatus') ?? ''),
					usageNotes: String(form.get('usageNotes') ?? '') || null
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not confirm creative rights' });
		}
	},
	approveAsset: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await approveCreativeAsset(
				session,
				contextFor(session, locals.requestId),
				{ id: String(form.get('id') ?? '') },
				locals.requestId
			);
			return { ok: true, notice: 'Creative asset approved. Posts may attach this version.' };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not approve creative asset' });
		}
	},
	createPost: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await createSocialPost(
				session,
				contextFor(session, locals.requestId),
				{
					body: String(form.get('body') ?? ''),
					assetId: String(form.get('assetId') ?? '') || null,
					status: String(form.get('status') ?? 'draft')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not create social post' });
		}
	},
	transition: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await transitionSocialPost(
				session,
				contextFor(session, locals.requestId),
				{
					id: String(form.get('id') ?? ''),
					to: String(form.get('to') ?? '')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not update post status' });
		}
	},
	schedule: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await scheduleSocialPost(
				session,
				contextFor(session, locals.requestId),
				{
					id: String(form.get('id') ?? ''),
					scheduledAt: String(form.get('scheduledAt') ?? '')
				},
				locals.requestId
			);
			return { ok: true };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not schedule post' });
		}
	},
	publish: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			const result = await publishSocialPost(
				session,
				contextFor(session, locals.requestId),
				{
					id: String(form.get('id') ?? ''),
					accountIds: form.getAll('accountIds').map(String)
				},
				locals.requestId
			);
			return {
				ok: true,
				notice:
					'queued' in result && result.queued
						? 'Publish queued in the workflow runner.'
						: 'Approved post published through the social adapters.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not publish post' });
		}
	},
	processDue: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			const result = await processDueSocialPublishesForOperator(
				session,
				contextFor(session, locals.requestId),
				locals.requestId
			);
			return { ok: true, notice: `Processed ${result.processed} scheduled post(s).` };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not process scheduled posts' });
		}
	},
	syncMetrics: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			const result = await syncSocialMetricsForOperator(
				session,
				contextFor(session, locals.requestId),
				locals.requestId
			);
			return { ok: true, notice: `Synced metrics for ${result.synced} publication(s).` };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not sync social metrics' });
		}
	}
};
