import { fail } from '@sveltejs/kit';
import { AppError } from '@vector/contracts';
import {
	connectSearchProperty,
	contextFor,
	createSeoOpportunity,
	getSearchOverview,
	markSeoOpportunityPublishReady,
	recordGeoObservation,
	refreshAnswerReadiness,
	refreshGeoQuerySet,
	refreshGeoVisibilitySnapshot,
	runTechnicalSearchAudit,
	submitSearchSitemap,
	syncSearchProperty,
	validateSearchProperty
} from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { overview: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { overview: await getSearchOverview(session, ctx), needsClient: false };
}

export const actions = {
	connect: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await connectSearchProperty(
				session,
				contextFor(session, locals.requestId),
				{
					engine: String(form.get('engine') ?? ''),
					siteUrl: String(form.get('siteUrl') ?? ''),
					credential: String(form.get('credential') ?? '')
				},
				locals.requestId
			);
			return { ok: true, notice: 'Search property stored. The credential stays on the server.' };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not connect the search property' });
		}
	},
	validate: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			const result = await validateSearchProperty(
				session,
				contextFor(session, locals.requestId),
				{ id: String(form.get('id') ?? '') },
				locals.requestId
			);
			return {
				ok: true,
				notice: result.health.ok ? 'Official property check succeeded.' : result.health.detail
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not validate the search property' });
		}
	},
	sync: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			const result = await syncSearchProperty(
				session,
				contextFor(session, locals.requestId),
				{ id: String(form.get('id') ?? '') },
				locals.requestId
			);
			return {
				ok: true,
				notice: `Synced ${result.queries} official queries and ${result.pages} pages.`
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not sync official search rows' });
		}
	},
	sitemap: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			const result = await submitSearchSitemap(
				session,
				contextFor(session, locals.requestId),
				{
					id: String(form.get('id') ?? ''),
					sitemapUrl: String(form.get('sitemapUrl') ?? '')
				},
				locals.requestId
			);
			return { ok: true, notice: result.detail };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not submit the sitemap' });
		}
	},
	answerReadiness: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			const result = await refreshAnswerReadiness(
				session,
				contextFor(session, locals.requestId),
				locals.requestId
			);
			return {
				ok: true,
				notice: `${result.summary.gaps} FAQ gap(s) on ${result.summary.targets} answer target(s). No new page was created.`
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not refresh answer readiness' });
		}
	},
	geoQuerySet: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			const result = await refreshGeoQuerySet(
				session,
				contextFor(session, locals.requestId),
				locals.requestId
			);
			return {
				ok: true,
				notice: `${result.queries.length} commercial AI-discovery queries. Official generative APIs stay unsupported.`
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not refresh the GEO query set' });
		}
	},
	geoObservation: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		const citations = [];
		const ownedUrl = String(form.get('ownedUrl') ?? '').trim();
		const earnedUrl = String(form.get('earnedUrl') ?? '').trim();
		if (ownedUrl) citations.push({ kind: 'owned' as const, url: ownedUrl });
		if (earnedUrl) citations.push({ kind: 'earned' as const, url: earnedUrl });
		try {
			await recordGeoObservation(
				session,
				contextFor(session, locals.requestId),
				{
					queryId: String(form.get('queryId') ?? ''),
					engine: String(form.get('engine') ?? ''),
					method: String(form.get('method') ?? 'manual'),
					mentioned: form.get('mentioned') === 'on',
					ownedCitation: form.get('ownedCitation') === 'on',
					earnedCitation: form.get('earnedCitation') === 'on',
					represented: form.get('represented') === 'on',
					accurate: String(form.get('accurate') ?? 'unknown'),
					prominence: String(form.get('prominence') ?? 'unknown'),
					detail: String(form.get('detail') ?? ''),
					citations
				},
				locals.requestId
			);
			return {
				ok: true,
				notice: 'Recorded observation stored. A mention is not a citation, visit, or lead.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not record the GEO observation' });
		}
	},
	geoSnapshot: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			const result = await refreshGeoVisibilitySnapshot(
				session,
				contextFor(session, locals.requestId),
				locals.requestId
			);
			return { ok: true, notice: result.report.headline };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not refresh the visibility snapshot' });
		}
	},
	audit: async ({ locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		try {
			const result = await runTechnicalSearchAudit(
				session,
				contextFor(session, locals.requestId),
				locals.requestId
			);
			return { ok: true, notice: result.audit.summary };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not run the technical audit' });
		}
	},
	opportunity: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await createSeoOpportunity(
				session,
				contextFor(session, locals.requestId),
				{
					channel: String(form.get('channel') ?? ''),
					title: String(form.get('title') ?? ''),
					problem: String(form.get('problem') ?? ''),
					proposedAction: String(form.get('proposedAction') ?? ''),
					evidenceClass: String(form.get('evidenceClass') ?? ''),
					sourceKind: String(form.get('sourceKind') ?? ''),
					sourceId: String(form.get('sourceId') ?? ''),
					queryId: form.get('queryId') ? String(form.get('queryId')) : null,
					pageId: form.get('pageId') ? String(form.get('pageId')) : null,
					effort: String(form.get('effort') ?? 'medium')
				},
				locals.requestId
			);
			return { ok: true, notice: 'Opportunity added to the tenant backlog.' };
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not create the opportunity' });
		}
	},
	publishReady: async ({ request, locals }) => {
		const session = locals.session!;
		if (!session.clientId) return fail(400, { error: 'Select a client first' });
		const form = await request.formData();
		try {
			await markSeoOpportunityPublishReady(
				session,
				contextFor(session, locals.requestId),
				{ id: String(form.get('id') ?? '') },
				locals.requestId
			);
			return {
				ok: true,
				notice: 'Marked publish-ready. Approval still does not publish the page.'
			};
		} catch (error) {
			if (error instanceof AppError) return fail(error.status, { error: error.message });
			return fail(500, { error: 'Could not mark the opportunity publish-ready' });
		}
	}
};
