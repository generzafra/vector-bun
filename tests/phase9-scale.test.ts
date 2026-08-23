import { afterEach, beforeEach, expect, test } from 'bun:test';
import { cookieName, resetRateLimits } from '@vector/auth';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	DEFAULT_USAGE_LIMITS,
	ForbiddenError,
	RateLimitError,
	TenantContextError,
	USAGE_RESOURCE_FAMILIES,
	evaluateUsageQuota,
	evaluateVector24Clock,
	requireTenantContext,
	summarizeVector24Kpis
} from '@vector/contracts';
import {
	clients,
	db,
	deleteTenantUsageForTenant,
	getLaunchForTenant,
	getPublishedHomeForTenant,
	getSiteForTenant,
	listTenantUsageEventsForTenant,
	listTenantUsageLimitsForTenant,
	updateLaunchForTenant
} from '@vector/db';
import {
	addClientSuppression,
	captureLead,
	consumeTenantUsage,
	contextFor,
	deliveryTenantContext,
	evaluateAndRecordUsage,
	getPortfolioClient,
	getPortfolioOverview,
	login,
	recordDeliveryEvent,
	resetDomainEmailProvider,
	resolveSession,
	runIntelligence,
	setDomainEmailProvider,
	setTenantUsageLimit,
	switchActiveClient,
	uploadBrandAsset,
	upsertSendingDomain
} from '@vector/domain';
import { MemoryEmailProvider, resetDnsLookup, setDnsLookup } from '@vector/email';
import { app } from '../apps/api/src/app';

const PNG_1X1 = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
	0x42, 0x60, 0x82
]);

const memoryEmail = new MemoryEmailProvider();

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

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
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

async function userAOn(ip: string) {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		ip
	);
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return actor;
}

const launchSnapshots = new Map<string, Awaited<ReturnType<typeof getLaunchForTenant>>>();

beforeEach(async () => {
	resetRateLimits();
	const { alpha, beta } = await seededClients();
	const alphaCtx = {
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		roleIds: [],
		requestId: 'scale-reset-a'
	};
	const betaCtx = {
		organizationId: beta.organizationId,
		clientId: beta.id,
		roleIds: [],
		requestId: 'scale-reset-b'
	};
	launchSnapshots.set(alpha.id, await getLaunchForTenant(alphaCtx));
	launchSnapshots.set(beta.id, await getLaunchForTenant(betaCtx));
	await deleteTenantUsageForTenant(alphaCtx);
	await deleteTenantUsageForTenant(betaCtx);
});

afterEach(async () => {
	const { alpha, beta } = await seededClients();
	for (const client of [alpha, beta]) {
		const ctx = {
			organizationId: client.organizationId,
			clientId: client.id,
			roleIds: [],
			requestId: 'scale-restore'
		};
		const snap = launchSnapshots.get(client.id);
		if (snap) {
			await updateLaunchForTenant(ctx, {
				launchClass: snap.launchClass,
				status: snap.status,
				vectorReadyAt: snap.vectorReadyAt,
				liveAt: snap.liveAt,
				pausedAt: snap.pausedAt,
				pausedSeconds: snap.pausedSeconds,
				failureReason: snap.failureReason
			});
		}
		await deleteTenantUsageForTenant(ctx);
	}
	resetDnsLookup();
	resetDomainEmailProvider();
	memoryEmail.reset();
});

test('usage quota is evaluate-only until enforce, and over-limit still records', () => {
	const under = evaluateUsageQuota({
		used: 18,
		hardLimit: 20,
		warningPercent: 80,
		quantity: 1,
		mode: 'evaluate_only'
	});
	expect(under.warning).toBe(true);
	expect(under.wouldDeny).toBe(false);
	expect(under.allowed).toBe(true);

	const over = evaluateUsageQuota({
		used: 20,
		hardLimit: 20,
		warningPercent: 80,
		quantity: 1,
		mode: 'evaluate_only'
	});
	expect(over.wouldDeny).toBe(true);
	expect(over.allowed).toBe(true);
	expect(over.remaining).toBe(0);

	const enforced = evaluateUsageQuota({
		used: 20,
		hardLimit: 20,
		warningPercent: 80,
		quantity: 1,
		mode: 'enforce'
	});
	expect(enforced.allowed).toBe(false);
	expect(enforced.wouldDeny).toBe(true);
});

test('Vector 24 clock excludes pauses and does not promise Class D', () => {
	const ready = new Date('2026-08-23T00:00:00.000Z');
	const now = new Date('2026-08-23T10:00:00.000Z');
	const paused = evaluateVector24Clock({
		launchClass: 'B',
		status: 'paused',
		vectorReadyAt: ready,
		liveAt: null,
		pausedAt: new Date('2026-08-23T06:00:00.000Z'),
		pausedSeconds: 3600,
		now
	});
	expect(paused.started).toBe(true);
	expect(paused.promised).toBe(true);
	expect(paused.elapsedSeconds).toBe(5 * 3600);
	expect(paused.overClass).toBe(false);

	const late = evaluateVector24Clock({
		launchClass: 'B',
		status: 'live',
		vectorReadyAt: ready,
		liveAt: new Date('2026-08-23T13:00:00.000Z'),
		pausedAt: null,
		pausedSeconds: 0,
		now
	});
	expect(late.overClass).toBe(true);
	expect(late.over24h).toBe(false);

	const classD = evaluateVector24Clock({
		launchClass: 'D',
		status: 'live',
		vectorReadyAt: ready,
		liveAt: new Date('2026-08-24T12:00:00.000Z'),
		pausedAt: null,
		pausedSeconds: 0,
		now
	});
	expect(classD.promised).toBe(false);
	expect(classD.over24h).toBe(false);
	expect(classD.vector24TargetSeconds).toBeNull();
});

test('Vector 24 KPI ignores Class D and uses live promised samples only', () => {
	const kpi = summarizeVector24Kpis([
		{
			launchClass: 'B',
			status: 'live',
			liveAt: new Date(),
			elapsedSeconds: 3 * 3600,
			promised: true
		},
		{
			launchClass: 'C',
			status: 'live',
			liveAt: new Date(),
			elapsedSeconds: 20 * 3600,
			promised: true
		},
		{
			launchClass: 'D',
			status: 'live',
			liveAt: new Date(),
			elapsedSeconds: 40 * 3600,
			promised: false
		},
		{
			launchClass: 'B',
			status: 'generating',
			liveAt: null,
			elapsedSeconds: 2 * 3600,
			promised: true
		}
	]);
	expect(kpi.livePromised).toBe(2);
	expect(kpi.under12h).toBe(1);
	expect(kpi.under24h).toBe(2);
	expect(kpi.percentUnder12h).toBe(50);
	expect(kpi.percentUnder24h).toBe(100);
	expect(kpi.medianReadyToLiveSeconds).toBe(((3 + 20) * 3600) / 2);
});

test('every tenant gets the same six usage families', async () => {
	const { alpha } = await seededClients();
	const admin = await adminOn(alpha.id, '10.9.0.1', 'scale-families');
	const row = await getPortfolioClient(admin, contextFor(admin, 'scale-families'));
	expect(row.usage.map((item) => item.resourceFamily).sort()).toEqual(
		[...USAGE_RESOURCE_FAMILIES].sort()
	);
	expect(row.usage.every((item) => item.mode === 'enforce')).toBe(true);
	expect(DEFAULT_USAGE_LIMITS).toHaveLength(USAGE_RESOURCE_FAMILIES.length);
});

test('recording over the limit stays evaluate-only and is replay-safe', async () => {
	const { alpha } = await seededClients();
	const admin = await adminOn(alpha.id, '10.9.0.2', 'scale-record');
	const ctx = contextFor(admin, 'scale-record-1');
	await setTenantUsageLimit(
		admin,
		{
			clientId: alpha.id,
			resourceFamily: 'ai',
			hardLimit: 2,
			warningPercent: 80,
			mode: 'evaluate_only',
			reason: 'Lower AI for the evaluate-only test'
		},
		'scale-limit-ai'
	);
	const first = await evaluateAndRecordUsage(ctx, { resourceFamily: 'ai', quantity: 2 });
	expect(first.evaluation.wouldDeny).toBe(false);
	const over = await evaluateAndRecordUsage(
		{ ...ctx, requestId: 'scale-record-2' },
		{ resourceFamily: 'ai', quantity: 1 }
	);
	expect(over.evaluation.wouldDeny).toBe(true);
	expect(over.evaluation.allowed).toBe(true);
	expect(over.event?.outcome).toBe('would_deny');
	const replay = await evaluateAndRecordUsage(
		{ ...ctx, requestId: 'scale-record-2' },
		{ resourceFamily: 'ai', quantity: 1 }
	);
	expect(replay.replayed).toBe(true);
	expect(replay.event?.id).toBe(over.event?.id);
	const events = await listTenantUsageEventsForTenant(ctx);
	expect(events.filter((row) => row.requestId === 'scale-record-2')).toHaveLength(1);
});

test('missing TenantContext fails closed for usage events', async () => {
	await expect(
		evaluateAndRecordUsage(
			{ organizationId: '', clientId: '', roleIds: [], requestId: '' },
			{
				resourceFamily: 'api'
			}
		)
	).rejects.toBeInstanceOf(TenantContextError);
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
});

test('Alpha cannot read Beta usage events or portfolio clocks', async () => {
	const { alpha, beta } = await seededClients();
	const admin = await adminOn(beta.id, '10.9.0.3', 'scale-beta');
	const betaCtx = contextFor(admin, 'scale-beta');
	await updateLaunchForTenant(betaCtx, {
		status: 'paused',
		launchClass: 'B',
		vectorReadyAt: new Date('2026-08-23T00:00:00.000Z'),
		pausedAt: new Date('2026-08-23T02:00:00.000Z'),
		pausedSeconds: 0,
		failureReason: 'Beta warehouse pause must stay on Beta'
	});
	await evaluateAndRecordUsage(betaCtx, { resourceFamily: 'email', quantity: 3 });
	const userA = await userAOn('10.9.0.4');
	const alphaCtx = contextFor(userA, 'scale-alpha');
	expect(alphaCtx.clientId).toBe(alpha.id);
	const events = await listTenantUsageEventsForTenant(alphaCtx);
	expect(events).toHaveLength(0);
	const own = await getPortfolioClient(userA, alphaCtx);
	expect(own.clientId).toBe(alpha.id);
	expect(JSON.stringify(own)).not.toContain(beta.id);
	expect(JSON.stringify(own)).not.toContain('Beta warehouse');
	await expect(getPortfolioClient(userA, alphaCtx, beta.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	const scoped = await getPortfolioOverview(userA, 'scale-port-user');
	expect(scoped.clients.some((row) => row.clientId === alpha.id)).toBe(true);
	expect(scoped.clients.some((row) => row.clientId === beta.id)).toBe(false);
	expect(JSON.stringify(scoped)).not.toContain(beta.id);
	expect(JSON.stringify(scoped)).not.toContain('Beta warehouse');
});

test('operators see Alpha and Beta exceptions and Alpha-scoped users cannot override', async () => {
	const { alpha, beta } = await seededClients();
	const admin = await adminOn(alpha.id, '10.9.0.5', 'scale-admin');
	const alphaCtx = contextFor(admin, 'scale-admin');
	await switchActiveClient(admin, admin.token, beta.id, 'scale-admin-b-switch');
	const betaActor = await resolveSession(admin.token);
	if (!betaActor) throw new Error('session missing');
	const betaCtx = contextFor(betaActor, 'scale-admin-b');
	await updateLaunchForTenant(betaCtx, {
		status: 'launch_failed',
		launchClass: 'B',
		failureReason: 'Beta warehouse launch failed'
	});
	await setTenantUsageLimit(
		admin,
		{
			clientId: alpha.id,
			resourceFamily: 'upload',
			hardLimit: 1,
			warningPercent: 80,
			mode: 'evaluate_only',
			reason: 'Cap Alpha uploads for the exception test'
		},
		'scale-admin-limit'
	);
	await evaluateAndRecordUsage(
		{ ...alphaCtx, requestId: 'scale-admin-upload' },
		{ resourceFamily: 'upload', quantity: 2 }
	);
	const portfolio = await getPortfolioOverview(admin, 'scale-admin-port');
	expect(portfolio.clients.some((row) => row.clientId === alpha.id)).toBe(true);
	expect(portfolio.clients.some((row) => row.clientId === beta.id)).toBe(true);
	expect(portfolio.exceptions.some((row) => row.clientId === alpha.id)).toBe(true);
	expect(portfolio.exceptions.some((row) => row.clientId === beta.id)).toBe(true);
	const userA = await userAOn('10.9.0.7');
	await expect(
		setTenantUsageLimit(
			userA,
			{
				clientId: alpha.id,
				resourceFamily: 'ai',
				hardLimit: 5,
				warningPercent: 80,
				reason: 'Client admin must not raise limits'
			},
			'scale-user-limit'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		setTenantUsageLimit(
			userA,
			{
				clientId: beta.id,
				resourceFamily: 'ai',
				hardLimit: 5,
				warningPercent: 80,
				reason: 'Client admin must not touch Beta'
			},
			'scale-user-beta'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
}, 15_000);

test('route client id cannot leak the other tenant through the portfolio API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/portfolio/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('warehouse');
});

test('API records evaluate-only usage and CSRF-protects limit overrides', async () => {
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '10.9.0.8', 'scale-api');
	const cookie = `${cookieName()}=${actor.token}`;
	const denied = await app.request('/v1/portfolio/usage', {
		method: 'POST',
		headers: { 'content-type': 'application/json', cookie },
		body: JSON.stringify({ resourceFamily: 'analytics', quantity: 1 })
	});
	expect(denied.status).toBeGreaterThanOrEqual(400);
	const recorded = await app.request('/v1/portfolio/usage', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			cookie,
			'x-csrf-token': actor.csrf
		},
		body: JSON.stringify({ resourceFamily: 'analytics', quantity: 1 })
	});
	expect(recorded.status).toBe(201);
	const body = (await recorded.json()) as {
		data: { evaluation: { allowed: boolean; wouldDeny: boolean }; event: { clientId: string } };
	};
	expect(body.data.evaluation.allowed).toBe(true);
	expect(body.data.event.clientId).toBe(alpha.id);
	const userA = await userAOn('10.9.0.9');
	const stolen = await app.request('/v1/portfolio/limits', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			cookie: `${cookieName()}=${userA.token}`,
			'x-csrf-token': userA.csrf
		},
		body: JSON.stringify({
			clientId: beta.id,
			resourceFamily: 'api',
			hardLimit: 3,
			reason: 'Must not override Beta from Alpha'
		})
	});
	expect(stolen.status).toBeGreaterThanOrEqual(400);
	const limits = await listTenantUsageLimitsForTenant({
		organizationId: beta.organizationId,
		clientId: beta.id,
		roleIds: [],
		requestId: 'scale-api-beta'
	});
	const apiDefault = DEFAULT_USAGE_LIMITS.find((row) => row.resourceFamily === 'api')!.hardLimit;
	expect(limits.find((row) => row.resourceFamily === 'api')?.hardLimit ?? apiDefault).toBe(
		apiDefault
	);
});

test('enforce over-limit refuses, records would_deny, and replay stays one event', async () => {
	const { alpha } = await seededClients();
	const admin = await adminOn(alpha.id, '10.9.1.1', 'scale-enforce');
	const ctx = contextFor(admin, 'scale-enforce');
	await setTenantUsageLimit(
		admin,
		{
			clientId: alpha.id,
			resourceFamily: 'ai',
			hardLimit: 1,
			warningPercent: 80,
			mode: 'enforce',
			reason: 'Cap Alpha AI for the enforce deny test'
		},
		'scale-enforce-limit'
	);
	await evaluateAndRecordUsage({ ...ctx, requestId: 'scale-enforce-1' }, { resourceFamily: 'ai' });
	let deniedError: unknown;
	try {
		await evaluateAndRecordUsage(
			{ ...ctx, requestId: 'scale-enforce-2' },
			{ resourceFamily: 'ai' }
		);
	} catch (error) {
		deniedError = error;
	}
	expect(deniedError).toBeInstanceOf(RateLimitError);
	const events = await listTenantUsageEventsForTenant(ctx);
	const denied = events.find((row) => row.requestId === 'scale-enforce-2');
	expect(denied?.outcome).toBe('would_deny');
	expect(denied?.mode).toBe('enforce');
	let replayError: unknown;
	try {
		await evaluateAndRecordUsage(
			{ ...ctx, requestId: 'scale-enforce-2' },
			{ resourceFamily: 'ai' }
		);
	} catch (error) {
		replayError = error;
	}
	expect(replayError).toBeInstanceOf(RateLimitError);
	expect(events.filter((row) => row.requestId === 'scale-enforce-2')).toHaveLength(1);
	expect(
		(await listTenantUsageEventsForTenant(ctx)).filter((row) => row.requestId === 'scale-enforce-2')
	).toHaveLength(1);
}, 15_000);

test('evaluate-only over-limit still records and does not refuse', async () => {
	const { alpha } = await seededClients();
	const admin = await adminOn(alpha.id, '10.9.1.2', 'scale-eval');
	const ctx = contextFor(admin, 'scale-eval');
	await setTenantUsageLimit(
		admin,
		{
			clientId: alpha.id,
			resourceFamily: 'workflow',
			hardLimit: 1,
			warningPercent: 80,
			mode: 'evaluate_only',
			reason: 'Keep workflow evaluate-only for this check'
		},
		'scale-eval-limit'
	);
	await evaluateAndRecordUsage(
		{ ...ctx, requestId: 'scale-eval-1' },
		{ resourceFamily: 'workflow' }
	);
	const over = await evaluateAndRecordUsage(
		{ ...ctx, requestId: 'scale-eval-2' },
		{ resourceFamily: 'workflow' }
	);
	expect(over.evaluation.wouldDeny).toBe(true);
	expect(over.evaluation.allowed).toBe(true);
	expect(over.event?.outcome).toBe('would_deny');
});

async function expectRateLimited(work: () => Promise<unknown>) {
	let error: unknown;
	try {
		await work();
	} catch (caught) {
		error = caught;
	}
	expect(error).toBeInstanceOf(RateLimitError);
}

test('write paths refuse enforce over-limit and Alpha cannot consume Beta', async () => {
	const { alpha, beta } = await seededClients();
	const admin = await adminOn(alpha.id, '10.9.1.3', 'scale-write');
	const ctx = contextFor(admin, 'scale-write');
	for (const resourceFamily of ['upload', 'ai', 'analytics'] as const) {
		await setTenantUsageLimit(
			admin,
			{
				clientId: alpha.id,
				resourceFamily,
				hardLimit: 1,
				warningPercent: 80,
				mode: 'enforce',
				reason: `Cap Alpha ${resourceFamily} for write-path deny`
			},
			`scale-write-${resourceFamily}`
		);
		await consumeTenantUsage(
			{ ...ctx, requestId: `scale-write-${resourceFamily}-fill` },
			{ resourceFamily }
		);
	}
	await expectRateLimited(() =>
		uploadBrandAsset(
			admin,
			ctx,
			{
				purpose: 'logo',
				filename: 'quota-logo.png',
				declaredType: 'image/png',
				bytes: PNG_1X1
			},
			'scale-write-upload-deny'
		)
	);
	await expectRateLimited(() =>
		runIntelligence(admin, ctx, { agentKey: 'research' }, 'scale-write-ai-deny')
	);
	const published = await pageIds(ctx);
	await expectRateLimited(() =>
		recordDeliveryEvent(
			deliveryTenantContext(ctx),
			{
				name: 'page_viewed',
				visitorId: crypto.randomUUID(),
				sessionId: crypto.randomUUID(),
				hostname: 'preview-alpha.localhost',
				domainKind: 'preview',
				...published
			},
			'scale-write-analytics-deny'
		)
	);
	const userA = await userAOn('10.9.1.4');
	const alphaCtx = contextFor(userA, 'scale-write-alpha');
	await expect(
		runIntelligence(
			userA,
			{ ...alphaCtx, clientId: beta.id },
			{ agentKey: 'research' },
			'scale-write-beta'
		)
	).rejects.toBeInstanceOf(TenantContextError);
	const betaEvents = await listTenantUsageEventsForTenant({
		organizationId: beta.organizationId,
		clientId: beta.id,
		roleIds: [],
		requestId: 'scale-write-beta-events'
	});
	expect(betaEvents).toHaveLength(0);
});

test('API mutating routes return 429 when api enforce is exhausted', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.9.1.5', 'scale-api-429');
	await setTenantUsageLimit(
		actor,
		{
			clientId: alpha.id,
			resourceFamily: 'api',
			hardLimit: 1,
			warningPercent: 80,
			mode: 'enforce',
			reason: 'Cap Alpha API for the 429 test'
		},
		'scale-api-429-limit'
	);
	const cookie = `${cookieName()}=${actor.token}`;
	const first = await app.request('/v1/portfolio/usage', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			cookie,
			'x-csrf-token': actor.csrf
		},
		body: JSON.stringify({ resourceFamily: 'workflow', quantity: 1 })
	});
	expect(first.status).toBe(201);
	const second = await app.request('/v1/portfolio/usage', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			cookie,
			'x-csrf-token': actor.csrf
		},
		body: JSON.stringify({ resourceFamily: 'workflow', quantity: 1 })
	});
	expect(second.status).toBe(429);
	const body = (await second.json()) as { error: string };
	expect(body.error).toBe('RATE_LIMITED');
});

test('suppressed email does not consume; enforce deny after eligibility does not send', async () => {
	setDomainEmailProvider(memoryEmail);
	const { alpha } = await seededClients();
	const admin = await adminOn(alpha.id, '10.9.1.6', 'scale-email');
	const ctx = contextFor(admin, 'scale-email');
	const suppressed = `suppressed-${crypto.randomUUID()}@alpha.test`;
	await addClientSuppression(
		admin,
		ctx,
		{ email: suppressed, reason: 'operator' },
		'scale-email-sup'
	);
	const published = await pageIds(ctx);
	const skipped = await captureLead(
		deliveryTenantContext(ctx, 'scale-email-sup-lead'),
		{
			name: 'Suppressed Quota',
			email: suppressed,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'alpha.example',
			domainKind: 'production',
			...published
		},
		'scale-email-sup-lead',
		'10.9.1.60'
	);
	expect(skipped.nurture?.enrolled).toBe(false);
	expect(memoryEmail.sent.filter((row) => row.to === suppressed)).toHaveLength(0);
	const afterSkip = await listTenantUsageEventsForTenant(ctx);
	expect(afterSkip.filter((row) => row.resourceFamily === 'email')).toHaveLength(0);

	const domain = `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`;
	setDnsLookup(async (name) => {
		if (name === domain) return ['v=spf1 include:resend.com ~all'];
		if (name === `resend._domainkey.${domain}`) return ['v=DKIM1; k=rsa; p=test'];
		if (name === `_dmarc.${domain}`) return ['v=DMARC1; p=none;'];
		return [];
	});
	await upsertSendingDomain(
		admin,
		ctx,
		{
			domain,
			fromAddress: `hello@${domain}`,
			fromName: 'Client Alpha Dental',
			fromApproved: true,
			dkimSelector: 'resend'
		},
		'scale-email-domain'
	);
	await setTenantUsageLimit(
		admin,
		{
			clientId: alpha.id,
			resourceFamily: 'email',
			hardLimit: 1,
			warningPercent: 80,
			mode: 'enforce',
			reason: 'Cap Alpha email for send deny'
		},
		'scale-email-limit'
	);
	await consumeTenantUsage({ ...ctx, requestId: 'scale-email-fill' }, { resourceFamily: 'email' });
	const open = `open-${crypto.randomUUID()}@alpha.test`;
	const captured = await captureLead(
		deliveryTenantContext(ctx, 'scale-email-deny-lead'),
		{
			name: 'Open Quota',
			email: open,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'alpha.example',
			domainKind: 'production',
			...published
		},
		'scale-email-deny-lead',
		'10.9.1.61'
	);
	expect(captured.nurture && 'enrolled' in captured.nurture && captured.nurture.enrolled).toBe(
		false
	);
	expect(memoryEmail.sent.filter((row) => row.to === open)).toHaveLength(0);
	const emailEvents = (await listTenantUsageEventsForTenant(ctx)).filter(
		(row) => row.resourceFamily === 'email'
	);
	expect(emailEvents.some((row) => row.outcome === 'would_deny')).toBe(true);
}, 20_000);
