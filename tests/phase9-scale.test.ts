import { afterEach, beforeEach, expect, test } from 'bun:test';
import { cookieName, resetRateLimits } from '@vector/auth';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	DEFAULT_USAGE_LIMITS,
	ForbiddenError,
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
	listTenantUsageEventsForTenant,
	listTenantUsageLimitsForTenant,
	updateLaunchForTenant
} from '@vector/db';
import {
	contextFor,
	evaluateAndRecordUsage,
	getPortfolioClient,
	getPortfolioOverview,
	login,
	resolveSession,
	setTenantUsageLimit,
	switchActiveClient
} from '@vector/domain';
import { app } from '../apps/api/src/app';

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
	expect(row.usage.every((item) => item.mode === 'evaluate_only')).toBe(true);
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
	expect(limits.find((row) => row.resourceFamily === 'api')?.hardLimit ?? 120).toBe(120);
});
