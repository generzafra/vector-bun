import { Hono, type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { assertCsrf, consumeRateLimit, cookieName, sessionCookieOptions } from '@vector/auth';
import { env } from '@vector/config';
import { AppError, ForbiddenError, UnauthorizedError, ValidationError } from '@vector/contracts';
import {
	actorCan,
	contextFor,
	addClaim,
	addOffer,
	addService,
	createClient,
	getBrandAssetBytes,
	getClient,
	completeReadinessItem,
	activateClientDomain,
	composeFunnel,
	disableClientDomain,
	getFunnel,
	listClientDomains,
	submitClientDomain,
	verifyClientDomain,
	getKnowledge,
	getAnalyticsReport,
	getLaunch,
	listLeads,
	listClientsForActor,
	addClientSuppression,
	decideIntelligenceApproval,
	enrollEligibleLeadsForOperator,
	getEmailOverview,
	getIntelligenceOverview,
	getAutonomyOverview,
	getPortfolioClient,
	getPortfolioOverview,
	pauseIntelligence,
	runAutoExecute,
	rollbackAutoExecute,
	consumeTenantUsage,
	recordTenantUsage,
	setAutonomyCeiling,
	setLaunchAutomationPolicy,
	setTenantUsageLimit,
	processDueNurtureForOperator,
	processEmailWebhook,
	reviewInboundMessage,
	recheckSendingDomain,
	runIntelligence,
	unsubscribeByToken,
	upsertSendingDomain,
	login,
	publishFunnel,
	recalculateReadiness,
	removeBrandAsset,
	resolveSession,
	saveBrand,
	transitionLaunch,
	updateLeadStatus,
	updateClientSettings,
	uploadBrandAsset,
	approveCreativeAsset,
	confirmCreativeRights,
	createSocialPost,
	getCreativeAssetBytes,
	getSocialOverview,
	processDueSocialPublishesForOperator,
	publishSocialPost,
	refreshSocialConnection,
	scheduleSocialPost,
	serveSocialMediaGrant,
	startSocialOAuth,
	completeSocialOAuth,
	selectSocialOAuthPage,
	syncSocialMetricsForOperator,
	transitionSocialPost,
	uploadCreativeAsset,
	upsertSocialConnection,
	connectSearchProperty,
	createSeoOpportunity,
	getSearchOverview,
	listSearchPortfolioQueue,
	markSeoOpportunityPublishReady,
	processSearchDueSweepForOperator,
	recordGeoObservation,
	refreshAnswerReadiness,
	refreshGeoQuerySet,
	refreshGeoVisibilitySnapshot,
	runTechnicalSearchAudit,
	submitSearchSitemap,
	syncSearchProperty,
	updateSearchCadence,
	validateSearchProperty,
	createExperimentProposal,
	decideExperiment,
	getExperimentOverview,
	measureExperiment,
	transitionExperiment,
	getClientOutcomes,
	upsertClientGoal,
	updateNotificationPreference,
	overrideFirstRevealGate
} from '@vector/domain';
import { createRequestId } from '@vector/observability';

export const app = new Hono();

app.get('/health', (c) => c.json({ ok: true, service: 'vector-api' }));

app.post('/v1/auth/login', async (c) => {
	const body = await c.req.json();
	const result = await login(body, c.req.header('x-forwarded-for') ?? '127.0.0.1');
	setCookie(c, cookieName(), result.session.token, sessionCookieOptions());
	return c.json({
		data: {
			user: result.user,
			csrf: result.session.csrf,
			clientId: result.session.clientId
		}
	});
});

async function requireSession(c: Context) {
	const session = await resolveSession(getCookie(c, cookieName()));
	if (!session) throw new UnauthorizedError();
	return session;
}

app.use('/v1/*', async (c, next) => {
	const method = c.req.method;
	const path = c.req.path;
	if (
		method === 'GET' ||
		method === 'HEAD' ||
		method === 'OPTIONS' ||
		path.startsWith('/v1/auth') ||
		path.startsWith('/v1/webhooks') ||
		path.startsWith('/v1/public')
	) {
		return next();
	}
	const session = await resolveSession(getCookie(c, cookieName()));
	if (session?.clientId) {
		await consumeTenantUsage(contextFor(session, createRequestId()), {
			resourceFamily: 'api',
			actorId: session.userId
		});
	}
	return next();
});

app.get('/v1/clients', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	actorCan(session, 'clients.read');
	const rows = await listClientsForActor(session);
	return c.json({ requestId, data: rows });
});

app.get('/v1/clients/:id', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'clients.read');
	const ctx = contextFor(session, requestId);
	const client = await getClient(ctx, c.req.param('id'));
	return c.json({ requestId, data: client });
});

app.post('/v1/clients', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'clients.manage');
	const body = await c.req.json();
	const client = await createClient(session, body, requestId);
	return c.json({ requestId, data: client }, 201);
});

app.patch('/v1/clients/:id', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'clients.manage');
	const ctx = contextFor(session, requestId);
	const row = await updateClientSettings(
		session,
		ctx,
		c.req.param('id'),
		await c.req.json(),
		requestId
	);
	return c.json({ requestId, data: row });
});

app.get('/v1/knowledge', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'knowledge.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getKnowledge(session, ctx) });
});

app.get('/v1/knowledge/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'knowledge.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getKnowledge(session, ctx, c.req.param('clientId')) });
});

app.patch('/v1/knowledge', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'knowledge.manage');
	const ctx = contextFor(session, requestId);
	const row = await saveBrand(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row });
});

app.post('/v1/knowledge/services', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'knowledge.manage');
	const ctx = contextFor(session, requestId);
	const row = await addService(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row }, 201);
});

app.post('/v1/knowledge/offers', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'knowledge.manage');
	const ctx = contextFor(session, requestId);
	const row = await addOffer(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row }, 201);
});

app.post('/v1/knowledge/claims', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'knowledge.manage');
	const ctx = contextFor(session, requestId);
	const row = await addClaim(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row }, 201);
});

app.post('/v1/knowledge/assets', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	const form = await c.req.formData();
	assertCsrf(session.csrf, c.req.header('x-csrf-token') ?? String(form.get('_csrf') ?? ''));
	actorCan(session, 'knowledge.manage');
	const file = form.get('file');
	if (!(file instanceof File)) throw new ValidationError('File is required');
	const ctx = contextFor(session, requestId);
	const row = await uploadBrandAsset(
		session,
		ctx,
		{
			purpose: String(form.get('purpose') ?? ''),
			filename: file.name,
			declaredType: file.type,
			bytes: new Uint8Array(await file.arrayBuffer())
		},
		requestId
	);
	const { storageKey: _storageKey, ...safe } = row;
	return c.json({ requestId, data: safe }, 201);
});

app.get('/v1/knowledge/assets/:id', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'knowledge.read');
	const ctx = contextFor(session, requestId);
	const result = await getBrandAssetBytes(session, ctx, c.req.param('id'));
	const body = new ArrayBuffer(result.bytes.byteLength);
	new Uint8Array(body).set(result.bytes);
	return new Response(body, {
		headers: {
			'content-type': result.mimeType,
			'cache-control': 'private, no-store',
			'x-request-id': requestId
		}
	});
});

app.delete('/v1/knowledge/assets/:id', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'knowledge.manage');
	const ctx = contextFor(session, requestId);
	await removeBrandAsset(session, ctx, c.req.param('id'), requestId);
	return c.json({ requestId, data: { ok: true } });
});

app.get('/v1/funnel', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'pages.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getFunnel(session, ctx) });
});

app.get('/v1/funnel/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'pages.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getFunnel(session, ctx, c.req.param('clientId')) });
});

app.post('/v1/funnel/compose', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'pages.manage');
	const ctx = contextFor(session, requestId);
	const row = await composeFunnel(session, ctx, requestId);
	return c.json({ requestId, data: row }, 201);
});

app.get('/v1/domains', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'pages.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await listClientDomains(session, ctx) });
});

app.get('/v1/domains/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'pages.read');
	const ctx = contextFor(session, requestId);
	return c.json({
		requestId,
		data: await listClientDomains(session, ctx, c.req.param('clientId'))
	});
});

app.post('/v1/domains', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'pages.manage');
	const ctx = contextFor(session, requestId);
	const row = await submitClientDomain(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row }, 201);
});

app.post('/v1/domains/:id/verify', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'pages.manage');
	const ctx = contextFor(session, requestId);
	const row = await verifyClientDomain(session, ctx, c.req.param('id'), requestId);
	return c.json({ requestId, data: row });
});

app.post('/v1/domains/:id/activate', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'pages.manage');
	const ctx = contextFor(session, requestId);
	const row = await activateClientDomain(session, ctx, c.req.param('id'), requestId);
	return c.json({ requestId, data: row });
});

app.post('/v1/domains/:id/disable', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'pages.manage');
	const ctx = contextFor(session, requestId);
	const row = await disableClientDomain(session, ctx, c.req.param('id'), requestId);
	return c.json({ requestId, data: row });
});

app.post('/v1/funnel/publish', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'pages.manage');
	const ctx = contextFor(session, requestId);
	const row = await publishFunnel(session, ctx, requestId);
	return c.json({ requestId, data: row });
});

app.post('/v1/funnel/first-reveal-override', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'pages.manage');
	const ctx = contextFor(session, requestId);
	const row = await overrideFirstRevealGate(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row });
});

app.get('/v1/goals', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'goals.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getClientOutcomes(session, ctx) });
});

app.post('/v1/goals', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'goals.manage');
	const ctx = contextFor(session, requestId);
	const row = await upsertClientGoal(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row }, 201);
});

app.post('/v1/goals/notifications', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'goals.manage');
	const ctx = contextFor(session, requestId);
	const row = await updateNotificationPreference(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row });
});

app.get('/v1/goals/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'goals.read');
	const ctx = contextFor(session, requestId);
	return c.json({
		requestId,
		data: await getClientOutcomes(session, ctx, c.req.param('clientId'))
	});
});

app.get('/v1/launch', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'launch.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getLaunch(session, ctx) });
});

app.get('/v1/launch/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'launch.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getLaunch(session, ctx, c.req.param('clientId')) });
});

app.post('/v1/launch/recalculate', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'launch.manage');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await recalculateReadiness(session, ctx, requestId) });
});

app.post('/v1/launch/items', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'launch.manage');
	const ctx = contextFor(session, requestId);
	const row = await completeReadinessItem(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row });
});

app.get('/v1/analytics', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'analytics.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getAnalyticsReport(session, ctx) });
});

app.get('/v1/analytics/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'analytics.read');
	const ctx = contextFor(session, requestId);
	return c.json({
		requestId,
		data: await getAnalyticsReport(session, ctx, c.req.param('clientId'))
	});
});

app.get('/v1/leads', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'leads.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await listLeads(session, ctx) });
});

app.get('/v1/leads/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'leads.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await listLeads(session, ctx, c.req.param('clientId')) });
});

app.get('/v1/email', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'email.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getEmailOverview(session, ctx) });
});

app.get('/v1/email/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'email.read');
	const ctx = contextFor(session, requestId);
	return c.json({
		requestId,
		data: await getEmailOverview(session, ctx, c.req.param('clientId'))
	});
});

app.post('/v1/email/domains', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'email.manage');
	const ctx = contextFor(session, requestId);
	const row = await upsertSendingDomain(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row }, 201);
});

app.post('/v1/email/domains/:id/recheck', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'email.manage');
	const ctx = contextFor(session, requestId);
	const row = await recheckSendingDomain(session, ctx, { id: c.req.param('id') }, requestId);
	return c.json({ requestId, data: row });
});

app.post('/v1/email/suppressions', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'email.manage');
	const ctx = contextFor(session, requestId);
	const row = await addClientSuppression(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row }, 201);
});

app.post('/v1/email/nurture/process-due', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'email.manage');
	const ctx = contextFor(session, requestId);
	const data = await processDueNurtureForOperator(session, ctx, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/email/inbound/:id/review', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'email.manage');
	const ctx = contextFor(session, requestId);
	const data = await reviewInboundMessage(session, ctx, { id: c.req.param('id') }, requestId);
	return c.json({ requestId, data });
});

app.get('/v1/intelligence', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'ai.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getIntelligenceOverview(session, ctx) });
});

app.get('/v1/intelligence/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'ai.read');
	const ctx = contextFor(session, requestId);
	return c.json({
		requestId,
		data: await getIntelligenceOverview(session, ctx, c.req.param('clientId'))
	});
});

app.post('/v1/intelligence/runs', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'ai.manage');
	const ctx = contextFor(session, requestId);
	const data = await runIntelligence(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data }, 201);
});

app.post('/v1/intelligence/approvals/:id/decide', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'ai.manage');
	const ctx = contextFor(session, requestId);
	const body = await c.req.json();
	const data = await decideIntelligenceApproval(
		session,
		ctx,
		{ ...body, id: c.req.param('id') },
		requestId
	);
	return c.json({ requestId, data });
});

app.post('/v1/intelligence/pause', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'ai.manage');
	const ctx = contextFor(session, requestId);
	const data = await pauseIntelligence(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.get('/v1/autonomy', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'ai.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getAutonomyOverview(session, ctx) });
});

app.get('/v1/autonomy/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'ai.read');
	const ctx = contextFor(session, requestId);
	return c.json({
		requestId,
		data: await getAutonomyOverview(session, ctx, c.req.param('clientId'))
	});
});

app.post('/v1/autonomy/ceiling', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'ai.manage');
	const ctx = contextFor(session, requestId);
	const data = await setAutonomyCeiling(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/autonomy/execute', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'ai.manage');
	const ctx = contextFor(session, requestId);
	const data = await runAutoExecute(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data }, data.executed ? 201 : 200);
});

app.post('/v1/autonomy/launch-policy', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'ai.manage');
	const ctx = contextFor(session, requestId);
	const data = await setLaunchAutomationPolicy(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/autonomy/rollback', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'ai.manage');
	const ctx = contextFor(session, requestId);
	const data = await rollbackAutoExecute(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data }, data.executed ? 201 : 200);
});

app.get('/v1/portfolio', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	actorCan(session, 'scale.read');
	return c.json({ requestId, data: await getPortfolioOverview(session, requestId) });
});

app.get('/v1/portfolio/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'scale.read');
	const ctx = contextFor(session, requestId);
	return c.json({
		requestId,
		data: await getPortfolioClient(session, ctx, c.req.param('clientId'))
	});
});

app.post('/v1/portfolio/usage', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'scale.read');
	const ctx = contextFor(session, requestId);
	const data = await recordTenantUsage(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data }, data.replayed ? 200 : 201);
});

app.post('/v1/portfolio/limits', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'scale.manage');
	const data = await setTenantUsageLimit(session, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/email/nurture/enroll-eligible', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'email.manage');
	const ctx = contextFor(session, requestId);
	const data = await enrollEligibleLeadsForOperator(session, ctx, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/webhooks/resend', async (c) => {
	const requestId = createRequestId();
	const payload = await c.req.text();
	const headers: Record<string, string | undefined> = {
		'svix-id': c.req.header('svix-id'),
		'svix-timestamp': c.req.header('svix-timestamp'),
		'svix-signature': c.req.header('svix-signature')
	};
	const data = await processEmailWebhook(
		headers,
		payload,
		requestId,
		c.req.header('x-forwarded-for') ?? '127.0.0.1'
	);
	return c.json({ requestId, data }, 202);
});

app.post('/v1/public/email/unsubscribe', async (c) => {
	const requestId = createRequestId();
	const body = await c.req.json();
	const data = await unsubscribeByToken(
		body,
		requestId,
		undefined,
		c.req.header('x-forwarded-for') ?? '127.0.0.1'
	);
	return c.json({ requestId, data });
});

app.post('/v1/leads/:id/status', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'leads.manage');
	const ctx = contextFor(session, requestId);
	const body = await c.req.json();
	const row = await updateLeadStatus(session, ctx, { ...body, id: c.req.param('id') }, requestId);
	return c.json({ requestId, data: row });
});

app.get('/v1/public/social-media', async (c) => {
	const requestId = createRequestId();
	consumeRateLimit(`social-media:${c.req.header('x-forwarded-for') ?? '127.0.0.1'}`, 60, 60_000);
	const result = await serveSocialMediaGrant(c.req.query('token') ?? '');
	const body = new ArrayBuffer(result.bytes.byteLength);
	new Uint8Array(body).set(result.bytes);
	return new Response(body, {
		headers: {
			'content-type': result.mimeType,
			'cache-control': 'private, max-age=60',
			'x-robots-tag': 'noindex',
			'x-request-id': requestId
		}
	});
});

app.get('/v1/social', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'social.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getSocialOverview(session, ctx) });
});

app.get('/v1/social/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'social.read');
	const ctx = contextFor(session, requestId);
	return c.json({
		requestId,
		data: await getSocialOverview(session, ctx, c.req.param('clientId'))
	});
});

app.post('/v1/social/oauth/start', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const data = await startSocialOAuth(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/social/oauth/complete', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const data = await completeSocialOAuth(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/social/oauth/select', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const data = await selectSocialOAuthPage(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/social/connections', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const data = await upsertSocialConnection(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data }, 201);
});

app.post('/v1/social/connections/:id/refresh', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const data = await refreshSocialConnection(session, ctx, { id: c.req.param('id') }, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/social/posts', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const data = await createSocialPost(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data }, 201);
});

app.post('/v1/social/posts/:id/transition', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const body = await c.req.json();
	const data = await transitionSocialPost(
		session,
		ctx,
		{ ...body, id: c.req.param('id') },
		requestId
	);
	return c.json({ requestId, data });
});

app.post('/v1/social/posts/:id/schedule', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const body = await c.req.json();
	const data = await scheduleSocialPost(
		session,
		ctx,
		{ ...body, id: c.req.param('id') },
		requestId
	);
	return c.json({ requestId, data });
});

app.post('/v1/social/posts/:id/publish', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const body = await c.req.json();
	const data = await publishSocialPost(session, ctx, { ...body, id: c.req.param('id') }, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/social/publish/process-due', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const data = await processDueSocialPublishesForOperator(session, ctx, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/social/metrics/sync', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const data = await syncSocialMetricsForOperator(session, ctx, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/creative/assets', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	const form = await c.req.formData();
	assertCsrf(session.csrf, c.req.header('x-csrf-token') ?? String(form.get('_csrf') ?? ''));
	actorCan(session, 'social.manage');
	const file = form.get('file');
	if (!(file instanceof File)) throw new ValidationError('File is required');
	const ctx = contextFor(session, requestId);
	const data = await uploadCreativeAsset(
		session,
		ctx,
		{
			title: String(form.get('title') ?? ''),
			kind: String(form.get('kind') ?? 'image'),
			filename: file.name,
			declaredType: file.type,
			bytes: new Uint8Array(await file.arrayBuffer())
		},
		requestId
	);
	return c.json({ requestId, data }, 201);
});

app.get('/v1/creative/assets/:id', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'social.read');
	const ctx = contextFor(session, requestId);
	const result = await getCreativeAssetBytes(session, ctx, c.req.param('id'));
	const body = new ArrayBuffer(result.bytes.byteLength);
	new Uint8Array(body).set(result.bytes);
	return new Response(body, {
		headers: {
			'content-type': result.mimeType,
			'cache-control': 'private, no-store',
			'x-request-id': requestId
		}
	});
});

app.post('/v1/creative/assets/:id/rights', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const body = await c.req.json();
	const data = await confirmCreativeRights(
		session,
		ctx,
		{ ...body, id: c.req.param('id') },
		requestId
	);
	return c.json({ requestId, data });
});

app.post('/v1/creative/assets/:id/approve', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'social.manage');
	const ctx = contextFor(session, requestId);
	const data = await approveCreativeAsset(session, ctx, { id: c.req.param('id') }, requestId);
	return c.json({ requestId, data });
});

app.get('/v1/search', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'seo.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getSearchOverview(session, ctx) });
});

app.get('/v1/search/portfolio', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	actorCan(session, 'seo.read');
	return c.json({
		requestId,
		data: await listSearchPortfolioQueue(session, requestId)
	});
});

app.get('/v1/search/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'seo.read');
	const ctx = contextFor(session, requestId);
	return c.json({
		requestId,
		data: await getSearchOverview(session, ctx, c.req.param('clientId'))
	});
});

app.post('/v1/search/properties', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await connectSearchProperty(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/properties/:id/validate', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await validateSearchProperty(session, ctx, { id: c.req.param('id') }, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/properties/:id/sync', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await syncSearchProperty(session, ctx, { id: c.req.param('id') }, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/properties/:id/sitemap', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const body = await c.req.json();
	const data = await submitSearchSitemap(
		session,
		ctx,
		{ ...body, id: c.req.param('id') },
		requestId
	);
	return c.json({ requestId, data });
});

app.post('/v1/search/audits', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await runTechnicalSearchAudit(session, ctx, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/answer-readiness', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await refreshAnswerReadiness(session, ctx, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/geo/query-set', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await refreshGeoQuerySet(session, ctx, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/geo/observations', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await recordGeoObservation(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/geo/snapshot', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await refreshGeoVisibilitySnapshot(session, ctx, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/opportunities', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await createSeoOpportunity(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/cadence', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await updateSearchCadence(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/due-sweep', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await processSearchDueSweepForOperator(session, ctx, requestId);
	return c.json({ requestId, data });
});

app.post('/v1/search/opportunities/:id/publish-ready', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'seo.manage');
	const ctx = contextFor(session, requestId);
	const data = await markSeoOpportunityPublishReady(
		session,
		ctx,
		{ id: c.req.param('id') },
		requestId
	);
	return c.json({ requestId, data });
});

app.get('/v1/experiments', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'experiments.read');
	const ctx = contextFor(session, requestId);
	return c.json({ requestId, data: await getExperimentOverview(session, ctx) });
});

app.get('/v1/experiments/:clientId', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	actorCan(session, 'experiments.read');
	const ctx = contextFor(session, requestId);
	return c.json({
		requestId,
		data: await getExperimentOverview(session, ctx, c.req.param('clientId'))
	});
});

app.post('/v1/experiments', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'experiments.manage');
	const ctx = contextFor(session, requestId);
	const data = await createExperimentProposal(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/experiments/transition', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'experiments.manage');
	const ctx = contextFor(session, requestId);
	const data = await transitionExperiment(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/experiments/measure', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'experiments.read');
	const ctx = contextFor(session, requestId);
	const body = (await c.req.json()) as { id?: string };
	const data = await measureExperiment(session, ctx, String(body.id ?? ''), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/experiments/decide', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'experiments.manage');
	const ctx = contextFor(session, requestId);
	const data = await decideExperiment(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data });
});

app.post('/v1/launch/transition', async (c) => {
	const requestId = createRequestId();
	const session = await requireSession(c);
	if (!session.clientId) throw new ForbiddenError('No active client');
	assertCsrf(session.csrf, c.req.header('x-csrf-token'));
	actorCan(session, 'launch.manage');
	const ctx = contextFor(session, requestId);
	const row = await transitionLaunch(session, ctx, await c.req.json(), requestId);
	return c.json({ requestId, data: row });
});

app.onError((error, c) => {
	if (error instanceof AppError) {
		return c.json({ error: error.code, message: error.message }, error.status as 400);
	}
	return c.json({ error: 'INTERNAL', message: 'Unexpected error' }, 500);
});

export function listen() {
	return Bun.serve({
		port: env.API_PORT,
		fetch: app.fetch
	});
}
