import { afterEach, beforeEach, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { TenantContextError } from '@vector/contracts';
import {
	clients,
	db,
	geoCitations,
	geoEngineObservations,
	geoFactRepresentations,
	geoMeasurementRuns,
	geoQueries,
	geoQuerySets,
	geoReferralEvents,
	geoVisibilitySnapshots,
	getPublishedHomeForTenant,
	getSiteForTenant,
	listGeoReferralEventsForTenant
} from '@vector/db';
import {
	captureLead,
	contextFor,
	deliveryTenantContext,
	getSearchOverview,
	login,
	recordGeoObservation,
	refreshGeoQuerySet,
	resolveSession,
	switchActiveClient,
	updateLeadStatus
} from '@vector/domain';
import {
	classifySearchReferral,
	geoAttributionParams,
	searchAttributionParams,
	searchOutcomeImpact
} from '@vector/search';

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

async function resetOutcomeRows(clientId: string) {
	await db.delete(geoReferralEvents).where(eq(geoReferralEvents.clientId, clientId));
	await db.delete(geoFactRepresentations).where(eq(geoFactRepresentations.clientId, clientId));
	await db.delete(geoVisibilitySnapshots).where(eq(geoVisibilitySnapshots.clientId, clientId));
	await db.delete(geoCitations).where(eq(geoCitations.clientId, clientId));
	await db.delete(geoEngineObservations).where(eq(geoEngineObservations.clientId, clientId));
	await db.delete(geoMeasurementRuns).where(eq(geoMeasurementRuns.clientId, clientId));
	await db.delete(geoQueries).where(eq(geoQueries.clientId, clientId));
	await db.delete(geoQuerySets).where(eq(geoQuerySets.clientId, clientId));
}

async function adminOn(clientId: string, ip: string, requestId: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	await switchActiveClient(session, session.token, clientId, `${requestId}-switch`);
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return actor;
}

async function pageIds(ctx: ReturnType<typeof contextFor>) {
	const [published, site] = await Promise.all([
		getPublishedHomeForTenant(ctx),
		getSiteForTenant(ctx)
	]);
	if (!published || !site) throw new Error('Published home missing. Seed and publish first.');
	return {
		siteId: site.id,
		funnelId: published.page.funnelId,
		pageId: published.page.id,
		pageVersionId: published.version.id
	};
}

beforeEach(async () => {
	const { alpha, beta } = await seededClients();
	await resetOutcomeRows(alpha.id);
	await resetOutcomeRows(beta.id);
});

afterEach(async () => {
	const { alpha, beta } = await seededClients();
	await resetOutcomeRows(alpha.id);
	await resetOutcomeRows(beta.id);
});

test('mentions and generic referrers are not search referrals', () => {
	expect(classifySearchReferral({ medium: 'social', source: 'linkedin' })).toBeNull();
	expect(classifySearchReferral({ referrer: 'https://chat.openai.com/' } as never)).toBeNull();
	expect(classifySearchReferral({ medium: 'organic', source: 'newsletter' })).toBeNull();
	expect(
		classifySearchReferral(geoAttributionParams('chatgpt', '11111111-1111-4111-8111-111111111111'))
	).toEqual({
		channel: 'generative',
		engine: 'chatgpt'
	});
	expect(classifySearchReferral(searchAttributionParams('google'))).toEqual({
		channel: 'organic_search',
		engine: 'google'
	});
	const empty = searchOutcomeImpact({
		visibilityCurrent: false,
		mentionedQueries: 2,
		referralCount: 0,
		leadCount: 0,
		qualifiedCount: 0,
		wonCount: 0
	});
	expect(empty.headline).toContain('A mention is not a visit or a lead');
	expect(empty.revenueKnown).toBe(false);
	expect(empty.revenueMinor).toBeNull();
	expect(empty.revenueLabel).toBe('unknown');
});

test('a GEO mention does not create a referred lead', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.7.1.1', 'geo-out-mention');
	const ctx = contextFor(actor, 'geo-out-mention');
	const refreshed = await refreshGeoQuerySet(actor, ctx, 'geo-out-mention');
	const query = refreshed.queries[0];
	if (!query) throw new Error('expected a GEO query');
	await recordGeoObservation(
		actor,
		ctx,
		{
			queryId: query.id,
			engine: 'other',
			method: 'manual',
			mentioned: true,
			ownedCitation: false,
			earnedCitation: false,
			represented: false
		},
		'geo-out-mention-obs'
	);
	const overview = await getSearchOverview(actor, ctx);
	expect(overview.geoImpact.leadCount).toBe(0);
	expect(overview.geoImpact.referralLabel).toBe('unknown');
	expect(overview.geoImpact.revenueKnown).toBe(false);
	expect(JSON.stringify(overview)).not.toMatch(/geoScore|AI rank|ai rank/i);
});

test('observable GEO UTMs join a tenant lead and ignore a foreign query id', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '10.7.1.2', 'geo-out-a');
	const betaActor = await adminOn(beta.id, '10.7.1.3', 'geo-out-b');
	const alphaCtx = contextFor(alphaActor, 'geo-out-a');
	const betaCtx = contextFor(betaActor, 'geo-out-b');
	const alphaSet = await refreshGeoQuerySet(alphaActor, alphaCtx, 'geo-out-a');
	const betaSet = await refreshGeoQuerySet(betaActor, betaCtx, 'geo-out-b');
	const alphaQuery = alphaSet.queries[0];
	const betaQuery = betaSet.queries[0];
	if (!alphaQuery || !betaQuery) throw new Error('expected GEO queries');
	const suffix = crypto.randomUUID().slice(0, 8);
	const captured = await captureLead(
		deliveryTenantContext(alphaCtx),
		{
			name: 'Search Lead',
			email: `search-${suffix}@alpha.test`,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...geoAttributionParams('chatgpt', alphaQuery.id),
			...(await pageIds(alphaCtx))
		},
		'geo-out-capture-a'
	);
	await captureLead(
		deliveryTenantContext(alphaCtx),
		{
			name: 'Foreign Query Lead',
			email: `search-foreign-${suffix}@alpha.test`,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...geoAttributionParams('gemini', betaQuery.id),
			...(await pageIds(alphaCtx))
		},
		'geo-out-capture-foreign'
	);
	await captureLead(
		deliveryTenantContext(betaCtx),
		{
			name: 'Beta Search Lead',
			email: `search-${suffix}@beta.test`,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'preview-beta.localhost',
			domainKind: 'preview',
			...geoAttributionParams('chatgpt', betaQuery.id),
			...(await pageIds(betaCtx))
		},
		'geo-out-capture-b'
	);
	await updateLeadStatus(
		alphaActor,
		alphaCtx,
		{ id: captured.lead.id, status: 'qualified', reason: 'S7 test' },
		'geo-out-qualify'
	);
	const alphaOverview = await getSearchOverview(alphaActor, alphaCtx);
	const betaOverview = await getSearchOverview(betaActor, betaCtx);
	expect(alphaOverview.geoImpact.leadCount).toBe(2);
	expect(alphaOverview.geoImpact.qualifiedCount).toBe(1);
	expect(alphaOverview.geoImpact.referralLabel).toBe('observed');
	expect(alphaOverview.geoImpact.leadLabel).toBe('observed');
	expect(alphaOverview.geoImpact.outcomeLabel).toBe('observed');
	expect(alphaOverview.geoImpact.revenueKnown).toBe(false);
	expect(alphaOverview.geoImpact.leads.some((row) => row.queryId === alphaQuery.id)).toBe(true);
	expect(alphaOverview.geoImpact.leads.some((row) => row.queryId === betaQuery.id)).toBe(false);
	expect(betaOverview.geoImpact.leadCount).toBe(1);
	expect(betaOverview.geoImpact.leads.some((row) => row.id === captured.lead.id)).toBe(false);
	expect(JSON.stringify(alphaOverview)).not.toContain(`search-${suffix}@alpha.test`);
	expect(JSON.stringify(alphaOverview)).not.toMatch(/geoScore|AI rank|ai rank/i);
	await expect(getSearchOverview(alphaActor, alphaCtx, beta.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('missing TenantContext cannot list search referral rows', () => {
	expect(listGeoReferralEventsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});
