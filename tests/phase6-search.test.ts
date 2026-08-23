import { afterEach, beforeEach, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	db,
	funnels,
	listClaimsForTenant,
	listSeoOpportunitiesForTenant,
	listSeoPropertiesForTenant,
	listSeoQueriesForTenant,
	pageVersions,
	pages,
	seoAudits,
	seoIssues,
	seoKeywords,
	seoOpportunities,
	seoPages,
	seoProperties,
	seoQueries
} from '@vector/db';
import {
	connectSearchProperty,
	contextFor,
	createSeoOpportunity,
	getLaunch,
	getSearchOverview,
	login,
	markSeoOpportunityPublishReady,
	memorySearchProvider,
	resetDomainSearchProvider,
	resolveSession,
	runTechnicalSearchAudit,
	setDomainSearchProvider,
	submitSearchSitemap,
	switchActiveClient,
	syncSearchProperty,
	validateSearchProperty
} from '@vector/domain';
import { app } from '../apps/api/src/app';

function useMemorySearch() {
	resetDomainSearchProvider();
	setDomainSearchProvider('google', memorySearchProvider('google'));
	setDomainSearchProvider('bing', memorySearchProvider('bing'));
}

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

async function resetSearchRows(clientId: string) {
	await db.delete(seoOpportunities).where(eq(seoOpportunities.clientId, clientId));
	await db.delete(seoIssues).where(eq(seoIssues.clientId, clientId));
	await db.delete(seoQueries).where(eq(seoQueries.clientId, clientId));
	await db.delete(seoKeywords).where(eq(seoKeywords.clientId, clientId));
	await db.delete(seoPages).where(eq(seoPages.clientId, clientId));
	await db.delete(seoAudits).where(eq(seoAudits.clientId, clientId));
	await db.delete(seoProperties).where(eq(seoProperties.clientId, clientId));
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

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

beforeEach(async () => {
	useMemorySearch();
	const { alpha, beta } = await seededClients();
	await resetSearchRows(alpha.id);
	await resetSearchRows(beta.id);
});

afterEach(() => {
	useMemorySearch();
});

test('missing TenantContext cannot list search rows', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listSeoPropertiesForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listSeoQueriesForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listSeoOpportunitiesForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('Alpha cannot read Beta search rows or tokens, and overview never returns credentials', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '10.6.2.1', 'search-iso-a');
	const betaActor = await adminOn(beta.id, '10.6.2.2', 'search-iso-b');
	const alphaCtx = contextFor(alphaActor, 'search-iso-a');
	const betaCtx = contextFor(betaActor, 'search-iso-b');
	const secret = `alpha-search-token-${crypto.randomUUID()}`;

	memorySearchProvider('google').setPerformance({
		queries: [
			{
				query: 'implant consult',
				pageUrl: 'https://alpha.search.test/',
				clicks: 4,
				impressions: 40,
				ctrBps: 1000,
				positionMilli: 2100,
				date: '2026-08-22',
				country: '',
				device: ''
			}
		]
	});

	const connected = await connectSearchProperty(
		alphaActor,
		alphaCtx,
		{
			engine: 'google',
			siteUrl: 'https://alpha.search.test/',
			credential: secret
		},
		'search-iso-connect'
	);
	expect(connected.property.status).toBe('active');
	expect(JSON.stringify(connected)).not.toContain(secret);
	expect(connected).not.toHaveProperty('encryptedCredential');

	await syncSearchProperty(alphaActor, alphaCtx, { id: connected.property.id }, 'search-iso-sync');

	const alphaOverview = await getSearchOverview(alphaActor, alphaCtx);
	expect(alphaOverview.properties).toHaveLength(1);
	expect(alphaOverview.queries.some((row) => row.query === 'implant consult')).toBe(true);
	expect(JSON.stringify(alphaOverview)).not.toContain(secret);

	const betaOverview = await getSearchOverview(betaActor, betaCtx);
	expect(betaOverview.properties).toHaveLength(0);
	expect(betaOverview.queries).toHaveLength(0);

	await expect(getSearchOverview(alphaActor, alphaCtx, beta.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(
		getSearchOverview(alphaActor, { ...alphaCtx, clientId: beta.id })
	).rejects.toBeInstanceOf(TenantContextError);

	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/search/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	expect(await res.text()).not.toContain(secret);
});

test('seo.manage is required to connect a property and seo.read is required to load the overview', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.2.3', 'search-cap');
	const ctx = contextFor(actor, 'search-cap');
	const reader = { ...actor, permissions: actor.permissions.filter((cap) => cap !== 'seo.manage') };
	const blind = { ...actor, permissions: actor.permissions.filter((cap) => cap !== 'seo.read') };
	await expect(
		connectSearchProperty(
			reader,
			ctx,
			{
				engine: 'google',
				siteUrl: 'https://cap.search.test/',
				credential: 'memory-search-credential'
			},
			'search-cap-connect'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(getSearchOverview(blind, ctx)).rejects.toBeInstanceOf(ForbiddenError);
});

test('technical audit records tenant-scoped issues and does not leak Beta pages', async () => {
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '10.6.2.4', 'search-audit-a');
	const betaActor = await adminOn(beta.id, '10.6.2.5', 'search-audit-b');
	const alphaCtx = contextFor(alphaActor, 'search-audit-a');
	const betaCtx = contextFor(betaActor, 'search-audit-b');
	const [funnel] = await db.select().from(funnels).where(eq(funnels.clientId, alpha.id)).limit(1);
	if (!funnel) throw new Error('alpha funnel missing');
	const [page] = await db
		.insert(pages)
		.values({
			organizationId: alpha.organizationId,
			clientId: alpha.id,
			funnelId: funnel.id,
			path: `/missing-description-${crypto.randomUUID().slice(0, 8)}`,
			title: ''
		})
		.returning();
	const [version] = await db
		.insert(pageVersions)
		.values({
			organizationId: alpha.organizationId,
			clientId: alpha.id,
			pageId: page.id,
			version: 1,
			status: 'published',
			document: {
				seo: { title: '', description: '', noindex: false },
				brand: { tokens: { accent: '#111111', background: '#000000', text: '#ffffff' } },
				sections: []
			} as never
		})
		.returning();
	await db
		.update(pages)
		.set({ publishedVersionId: version.id, updatedAt: new Date() })
		.where(eq(pages.id, page.id));

	const alphaAudit = await runTechnicalSearchAudit(alphaActor, alphaCtx, 'search-audit-run');
	expect(alphaAudit.issues.some((issue) => issue.path === page.path)).toBe(true);
	expect(alphaAudit.issues.every((issue) => issue.clientId === alpha.id)).toBe(true);

	const betaAudit = await runTechnicalSearchAudit(betaActor, betaCtx, 'search-audit-beta');
	expect(betaAudit.issues.some((issue) => issue.path === page.path)).toBe(false);
	expect(betaAudit.issues.every((issue) => issue.clientId === beta.id)).toBe(true);

	await db.delete(seoIssues).where(eq(seoIssues.pageId, page.id));
	await db.delete(seoPages).where(eq(seoPages.pageId, page.id));
	await db.update(pages).set({ publishedVersionId: null }).where(eq(pages.id, page.id));
	await db.delete(pageVersions).where(eq(pageVersions.pageId, page.id));
	await db.delete(pages).where(eq(pages.id, page.id));
});

test('backlog items without knowledge or official-query evidence cannot be publish-ready', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.2.6', 'search-ready');
	const ctx = contextFor(actor, 'search-ready');
	const approved = (await listClaimsForTenant(ctx)).find((row) => row.kind === 'approved');
	if (!approved) throw new Error('alpha approved claim missing');

	const grounded = await createSeoOpportunity(
		actor,
		ctx,
		{
			channel: 'seo',
			title: 'Refresh consult FAQ',
			problem: 'The written-plan claim is not mapped to a query page',
			proposedAction: 'Add a source-backed FAQ on the consult page',
			evidenceClass: 'source_verified',
			sourceKind: 'knowledge_claim',
			sourceId: approved.id,
			effort: 'low'
		},
		'search-ready-claim'
	);
	expect(grounded.publishReadyAllowed).toBe(true);
	const ready = await markSeoOpportunityPublishReady(
		actor,
		ctx,
		{ id: grounded.id },
		'search-ready-mark'
	);
	expect(ready.status).toBe('publish_ready');

	const [funnel] = await db.select().from(funnels).where(eq(funnels.clientId, alpha.id)).limit(1);
	if (!funnel) throw new Error('alpha funnel missing');
	const [thin] = await db
		.insert(pages)
		.values({
			organizationId: alpha.organizationId,
			clientId: alpha.id,
			funnelId: funnel.id,
			path: `/thin-${crypto.randomUUID().slice(0, 8)}`,
			title: ''
		})
		.returning();
	const [thinVersion] = await db
		.insert(pageVersions)
		.values({
			organizationId: alpha.organizationId,
			clientId: alpha.id,
			pageId: thin.id,
			version: 1,
			status: 'published',
			document: {
				seo: { title: '', description: '', noindex: false },
				brand: { tokens: { accent: '#111111', background: '#000000', text: '#ffffff' } },
				sections: []
			} as never
		})
		.returning();
	await db
		.update(pages)
		.set({ publishedVersionId: thinVersion.id, updatedAt: new Date() })
		.where(eq(pages.id, thin.id));

	const audit = await runTechnicalSearchAudit(actor, ctx, 'search-ready-audit');
	const issue = audit.issues.find((row) => row.pageId === thin.id) ?? audit.issues[0];
	if (!issue) throw new Error('expected a technical issue');
	const ungrounded = await createSeoOpportunity(
		actor,
		ctx,
		{
			channel: 'seo',
			title: 'Fix missing description',
			problem: issue.detail,
			proposedAction: 'Write a factual meta description from approved knowledge',
			evidenceClass: 'observed',
			sourceKind: 'technical_audit',
			sourceId: issue.id,
			effort: 'medium'
		},
		'search-ready-audit-opp'
	);
	expect(ungrounded.publishReadyAllowed).toBe(false);
	await expect(
		markSeoOpportunityPublishReady(actor, ctx, { id: ungrounded.id }, 'search-ready-deny')
	).rejects.toBeInstanceOf(ValidationError);

	await expect(
		createSeoOpportunity(
			actor,
			ctx,
			{
				channel: 'geo',
				title: 'Cite us in ChatGPT',
				problem: 'No citation yet',
				proposedAction: 'Promise a citation',
				evidenceClass: 'hypothesis',
				sourceKind: 'knowledge_claim',
				sourceId: '00000000-0000-4000-8000-000000000000',
				effort: 'low'
			},
			'search-ready-fake'
		)
	).rejects.toBeInstanceOf(ValidationError);

	await db.delete(seoIssues).where(eq(seoIssues.pageId, thin.id));
	await db.delete(seoPages).where(eq(seoPages.pageId, thin.id));
	await db.update(pages).set({ publishedVersionId: null }).where(eq(pages.id, thin.id));
	await db.delete(pageVersions).where(eq(pageVersions.pageId, thin.id));
	await db.delete(pages).where(eq(pages.id, thin.id));
});

test('official query sync can ground a publish-ready opportunity and GEO measure stays unsupported', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.2.7', 'search-query');
	const ctx = contextFor(actor, 'search-query');
	memorySearchProvider('bing').setPerformance({
		queries: [
			{
				query: 'warehouse assessment',
				pageUrl: 'https://alpha.bing.test/',
				clicks: 2,
				impressions: 20,
				ctrBps: 1000,
				positionMilli: 3000,
				date: '2026-08-21',
				country: '',
				device: ''
			}
		]
	});
	const connected = await connectSearchProperty(
		actor,
		ctx,
		{
			engine: 'bing',
			siteUrl: 'https://alpha.bing.test/',
			credential: 'memory-bing-credential'
		},
		'search-query-connect'
	);
	await syncSearchProperty(actor, ctx, { id: connected.property.id }, 'search-query-sync');
	const [query] = await listSeoQueriesForTenant(ctx);
	expect(query?.query).toBe('warehouse assessment');
	const item = await createSeoOpportunity(
		actor,
		ctx,
		{
			channel: 'aeo',
			title: 'Answer warehouse assessment',
			problem: 'Official query has no dedicated answer passage',
			proposedAction: 'Add a source-backed definition on the published page',
			evidenceClass: 'provider_reported',
			sourceKind: 'official_query',
			sourceId: query.id,
			queryId: query.id,
			effort: 'medium'
		},
		'search-query-opp'
	);
	const ready = await markSeoOpportunityPublishReady(
		actor,
		ctx,
		{ id: item.id },
		'search-query-ready'
	);
	expect(ready.status).toBe('publish_ready');

	const sitemap = await submitSearchSitemap(
		actor,
		ctx,
		{ id: connected.property.id, sitemapUrl: 'https://alpha.bing.test/sitemap.xml' },
		'search-query-sitemap'
	);
	expect(sitemap.accepted).toBe(true);
	expect(memorySearchProvider('bing').sitemaps).toContain('https://alpha.bing.test/sitemap.xml');

	const overview = await getSearchOverview(actor, ctx);
	expect(overview.generativeMeasurement.supported).toBe(false);
	expect(overview.generativeMeasurement.status).toBe('unsupported');

	const launch = await getLaunch(actor, ctx);
	const searchReady = launch.items.find((item) => item.key === 'search.property');
	expect(searchReady?.blocking).toBe(false);
	expect(searchReady?.status).toBe('complete');
});

test('validate can mark a property pending when the adapter fails closed', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.6.2.8', 'search-fail');
	const ctx = contextFor(actor, 'search-fail');
	const connected = await connectSearchProperty(
		actor,
		ctx,
		{
			engine: 'google',
			siteUrl: 'https://fail.search.test/',
			credential: 'memory-search-credential'
		},
		'search-fail-connect'
	);
	memorySearchProvider('google').validateFail = true;
	const checked = await validateSearchProperty(
		actor,
		ctx,
		{ id: connected.property.id },
		'search-fail-validate'
	);
	expect(checked.health.ok).toBe(false);
	expect(checked.property.status).toBe('expired');
	expect(JSON.stringify(checked)).not.toContain('memory-search-credential');
});
