import { Hono, type Context } from 'hono';
import { getCookie, setCookie } from 'hono/cookie';
import { assertCsrf, cookieName, sessionCookieOptions } from '@vector/auth';
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
	login,
	publishFunnel,
	recalculateReadiness,
	removeBrandAsset,
	resolveSession,
	saveBrand,
	transitionLaunch,
	updateLeadStatus,
	updateClientSettings,
	uploadBrandAsset
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
