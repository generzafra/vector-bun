import { contextFor, getAnalyticsReport } from '@vector/domain';

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { report: null, needsClient: true };
	const ctx = contextFor(session, locals.requestId);
	return { report: await getAnalyticsReport(session, ctx), needsClient: false };
}
