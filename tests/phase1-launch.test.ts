import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ALLOWED_LAUNCH_TRANSITIONS,
	ForbiddenError,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import {
	auditLogs,
	clients,
	db,
	getLaunchForTenant,
	getProductionDomainForTenant,
	getReadinessForTenant,
	listLaunchEventsForTenant
} from '@vector/db';
import {
	completeReadinessItem,
	contextFor,
	getLaunch,
	liveLaunchBlockReason,
	login,
	vectorReadyBlockReason,
	recalculateReadiness,
	resolveSession,
	saveBrand,
	switchActiveClient,
	transitionLaunch
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

test('missing TenantContext cannot read launch records', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(getLaunchForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(getReadinessForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('live and launching stay blocked without a production domain', () => {
	expect(liveLaunchBlockReason('launching', false)).toBe(
		'Production domain is required before live launch'
	);
	expect(liveLaunchBlockReason('live', false)).toBe(
		'Production domain is required before live launch'
	);
	expect(liveLaunchBlockReason('launching', true)).toBeNull();
	expect(liveLaunchBlockReason('vector_ready', false)).toBeNull();
	expect(ALLOWED_LAUNCH_TRANSITIONS.vector_ready).not.toContain('live');
	expect(vectorReadyBlockReason('vector_ready', false)).toBe(
		'Blocking readiness items are incomplete'
	);
	expect(vectorReadyBlockReason('vector_ready', true)).toBeNull();
	expect(vectorReadyBlockReason('onboarding', false)).toBeNull();
});

test('user on client A cannot read or transition client B launch', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.40'
	);
	const ctx = contextFor(session, 'launch-read');
	expect(ctx.clientId).toBe(alpha.id);
	const own = await recalculateReadiness(session, ctx, 'launch-read');
	expect(own.launch.clientId).toBe(alpha.id);
	expect(JSON.stringify(own.events)).not.toContain(beta.id);

	await expect(getLaunch(session, ctx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		transitionLaunch(
			session,
			{ ...ctx, clientId: beta.id },
			{ to: 'onboarding', reason: 'Hijack Beta launch' },
			'launch-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant launch through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/launch/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('warehouse');
});

test('missing launch.manage returns 403', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.41'
	);
	const ctx = contextFor(session, 'launch-cap');
	const actor = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'launch.manage')
	};
	await expect(recalculateReadiness(actor, ctx, 'launch-cap')).rejects.toBeInstanceOf(
		ForbiddenError
	);
});

test('seeded preview knowledge is Vector Ready without a production domain', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.0.41', 'launch-ready');
	const ctx = contextFor(actor, 'launch-ready');
	const ready = await recalculateReadiness(actor, ctx, 'launch-ready');
	expect(ready.readiness.vectorReady).toBe(true);
	expect(ready.readiness.blockingComplete).toBe(ready.readiness.blockingTotal);
	expect(ready.items.find((item) => item.key === 'funnel.preview_published')?.status).toBe(
		'complete'
	);
	expect(ready.items.find((item) => item.key === 'domain.production')?.status).toBe('pending');
	expect(await getProductionDomainForTenant(ctx)).toBeNull();
	expect(ALLOWED_LAUNCH_TRANSITIONS.vector_ready).not.toContain('live');
	expect(ALLOWED_LAUNCH_TRANSITIONS.awaiting_domain).toContain('launching');
});

test('ready Alpha can move to Vector Ready and events stay on Alpha', async () => {
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.0.45', 'launch-walk');
	const ctx = contextFor(actor, 'launch-walk');
	const ready = await recalculateReadiness(actor, ctx, 'launch-walk');
	expect(ready.readiness.vectorReady).toBe(true);
	let published = ready;
	if (published.launch.status === 'draft') {
		published = await transitionLaunch(
			actor,
			ctx,
			{ to: 'onboarding', reason: 'Alpha onboarding start' },
			'launch-onboard'
		);
	}
	if (published.launch.status === 'onboarding' || published.launch.status === 'blocked') {
		published = await transitionLaunch(
			actor,
			ctx,
			{ to: 'vector_ready', reason: 'Alpha implant preview is ready' },
			'launch-vector'
		);
	}
	expect([
		'vector_ready',
		'generating',
		'qa',
		'awaiting_client_approval',
		'awaiting_domain',
		'launching',
		'live'
	]).toContain(published.launch.status);
	if (published.launch.status === 'vector_ready') {
		expect(published.launch.vectorReadyAt).toBeTruthy();
	}
	const vectorEvent = published.events.find(
		(event) => event.reason === 'Alpha implant preview is ready'
	);
	if (vectorEvent) {
		const [audit] = await db
			.select()
			.from(auditLogs)
			.where(eq(auditLogs.entityId, published.launch.id));
		expect(audit?.action).toBe('launch.transition');
		expect(audit?.clientId).toBe(alpha.id);
		expect(audit?.clientId).not.toBe(beta.id);
	}

	await switchActiveClient(actor, actor.token, beta.id, 'launch-beta-switch');
	const betaActor = await resolveSession(actor.token);
	if (!betaActor) throw new Error('beta session missing');
	const betaEvents = await listLaunchEventsForTenant(contextFor(betaActor, 'launch-beta'));
	expect(betaEvents.every((event) => event.clientId === beta.id)).toBe(true);
	expect(JSON.stringify(betaEvents)).not.toContain('Alpha implant preview is ready');
	expect(JSON.stringify(betaEvents)).not.toContain('implant');
}, 15000);

test('incomplete brand narrative cannot become Vector Ready', async () => {
	const { beta } = await seededClients();
	const actor = await adminOn(beta.id, '10.0.0.43', 'launch-block');
	const ctx = contextFor(actor, 'launch-block');
	try {
		await saveBrand(
			actor,
			ctx,
			{
				displayName: 'Client Beta Logistics',
				audience: null,
				offer: null,
				primaryConversion: null,
				tokens: { accent: '#d4b06a' }
			},
			'launch-clear-narrative'
		);
		const recalculated = await recalculateReadiness(actor, ctx, 'launch-block-recalc');
		expect(recalculated.readiness.vectorReady).toBe(false);
		expect(recalculated.items.find((item) => item.key === 'brand.narrative')?.status).toBe(
			'pending'
		);
		expect(vectorReadyBlockReason('vector_ready', recalculated.readiness.vectorReady)).toBe(
			'Blocking readiness items are incomplete'
		);
	} finally {
		await saveBrand(
			actor,
			ctx,
			{
				displayName: 'Client Beta Logistics',
				audience: 'Warehouse operators who need faster throughput',
				offer: 'Automation that reduces dock-to-stock time',
				primaryConversion: 'Request a warehouse assessment',
				brandPersonality: 'technology',
				tokens: { accent: '#d4b06a' }
			},
			'launch-restore-narrative'
		);
	}
}, 15000);

test('operator items can be recorded and automatic items cannot', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.0.44', 'launch-op');
	const ctx = contextFor(actor, 'launch-op');
	const done = await completeReadinessItem(
		actor,
		ctx,
		{ key: 'compliance.reviewed', note: 'Alpha counsel reviewed claims' },
		'launch-op'
	);
	expect(done.items.find((item) => item.key === 'compliance.reviewed')?.status).toBe('complete');
	await expect(
		completeReadinessItem(actor, ctx, { key: 'brand.narrative' }, 'launch-op-auto')
	).rejects.toBeInstanceOf(ValidationError);
});
