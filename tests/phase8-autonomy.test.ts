import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { evaluateAutoExecute, evaluateAiGate } from '@vector/ai';
import { env } from '@vector/config';
import {
	FORBIDDEN_AUTONOMY_ACTIONS,
	ForbiddenError,
	LOW_RISK_AUTO_EXECUTE_ACTIONS,
	PHASE_8_MAX_AUTONOMY,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import { clients, db, listAiActionPolicies, listKillSwitchEventsForTenant } from '@vector/db';
import {
	contextFor,
	getAutonomyOverview,
	login,
	pauseIntelligence,
	resolveSession,
	setAutonomyCeiling,
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

const lowPolicy = {
	actionType: 'internal_weekly_report',
	riskClass: 'low' as const,
	maxAutonomy: 3,
	autoExecuteAllowed: true,
	forbidden: false,
	financialLimitMinor: 0
};

test('AI draft gate still blocks level 3; auto-execute gate allows only preapproved low-risk', () => {
	const draft = {
		pausedGlobal: false,
		pausedClient: false,
		autonomyCeiling: 3,
		requestedAutonomy: 3,
		confidence: 100
	};
	expect(evaluateAiGate(draft)).toEqual({ allowed: false, blockedBy: 'phase4_autonomy' });

	const autoBase = {
		pausedGlobal: false,
		pausedClient: false,
		autonomyCeiling: 3,
		requestedAutonomy: 3,
		confidence: 100,
		actionType: 'internal_weekly_report',
		policy: lowPolicy
	};
	expect(evaluateAutoExecute(autoBase).allowed).toBe(true);
	expect(evaluateAutoExecute({ ...autoBase, pausedGlobal: true })).toEqual({
		allowed: false,
		blockedBy: 'global_pause'
	});
	expect(evaluateAutoExecute({ ...autoBase, pausedClient: true })).toEqual({
		allowed: false,
		blockedBy: 'client_pause'
	});
	expect(evaluateAutoExecute({ ...autoBase, autonomyCeiling: 2 })).toEqual({
		allowed: false,
		blockedBy: 'autonomy_ceiling'
	});
	expect(evaluateAutoExecute({ ...autoBase, requestedAutonomy: 4 })).toEqual({
		allowed: false,
		blockedBy: 'phase8_autonomy'
	});
	expect(evaluateAutoExecute({ ...autoBase, policy: null })).toEqual({
		allowed: false,
		blockedBy: 'unknown_action'
	});
	expect(
		evaluateAutoExecute({
			...autoBase,
			actionType: 'legal.reply',
			policy: {
				...lowPolicy,
				actionType: 'legal.reply',
				riskClass: 'legal',
				autoExecuteAllowed: true,
				forbidden: false
			}
		})
	).toEqual({ allowed: false, blockedBy: 'forbidden_action' });
	expect(
		evaluateAutoExecute({
			...autoBase,
			actionType: 'launch.generate_drafts',
			policy: {
				...lowPolicy,
				actionType: 'launch.generate_drafts',
				riskClass: 'low',
				autoExecuteAllowed: true
			}
		})
	).toEqual({ allowed: false, blockedBy: 'forbidden_action' });
	expect(
		evaluateAutoExecute({
			...autoBase,
			policy: { ...lowPolicy, riskClass: 'content' }
		})
	).toEqual({ allowed: false, blockedBy: 'risk_class' });
});

test('missing TenantContext cannot list kill-switch events', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listKillSwitchEventsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('pause without a reason fails closed', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.2', 'auto-reason');
	const ctx = contextFor(actor, 'auto-reason');
	await expect(
		pauseIntelligence(actor, ctx, { paused: true }, 'auto-reason')
	).rejects.toBeInstanceOf(ValidationError);
});

test('client kill switch is privileged, audited, and blocks Level 3 eligibility', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.3', 'auto-pause');
	const ctx = contextFor(actor, 'auto-pause');
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-pause-ceiling');
		const ready = await getAutonomyOverview(actor, ctx);
		expect(ready.executed).toBe(false);
		expect(ready.executedCount).toBe(0);
		expect(ready.phase8MaxAutonomy).toBe(PHASE_8_MAX_AUTONOMY);
		const weekly = ready.actions.find((row) => row.actionType === 'internal_weekly_report');
		expect(weekly?.eligibleNow).toBe(true);
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: true, reason: 'Pause low-risk auto-execute during review' },
			'auto-pause-on'
		);
		const paused = await getAutonomyOverview(actor, ctx);
		expect(paused.settings.paused).toBe(true);
		expect(
			paused.actions
				.filter((row) => LOW_RISK_AUTO_EXECUTE_ACTIONS.includes(row.actionType as never))
				.every((row) => row.blockedBy === 'client_pause')
		).toBe(true);
		expect(paused.killSwitchEvents[0]?.reason).toBe('Pause low-risk auto-execute during review');
		expect(paused.killSwitchEvents[0]?.privileged).toBe(true);
		expect(paused.killSwitchEvents[0]?.clientId).toBe(alpha.id);
	} finally {
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: false, reason: 'Resume after autonomy review' },
			'auto-pause-off'
		);
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-pause-ceiling-reset');
	}
});

test('forbidden and high-risk classes cannot become eligible even at ceiling 3', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.4', 'auto-forbid');
	const ctx = contextFor(actor, 'auto-forbid');
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-forbid-ceiling');
		const overview = await getAutonomyOverview(actor, ctx);
		for (const actionType of FORBIDDEN_AUTONOMY_ACTIONS) {
			const row = overview.actions.find((item) => item.actionType === actionType);
			expect(row?.eligibleNow).toBe(false);
			expect(row?.blockedBy).toBe('forbidden_action');
		}
		expect(overview.actions.find((row) => row.actionType === 'page.publish')?.eligibleNow).toBe(
			false
		);
		expect(
			overview.actions.find((row) => row.actionType === 'experiment.promote_winner')?.eligibleNow
		).toBe(false);
		expect(overview.executed).toBe(false);
	} finally {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-forbid-ceiling-reset');
	}
});

test('autonomy ceiling cannot be raised above Level 3', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.5', 'auto-ceiling');
	const ctx = contextFor(actor, 'auto-ceiling');
	await expect(
		setAutonomyCeiling(actor, ctx, { autonomyCeiling: 4 }, 'auto-ceiling-4')
	).rejects.toBeInstanceOf(ValidationError);
	await expect(
		setAutonomyCeiling(actor, ctx, { autonomyCeiling: 5 }, 'auto-ceiling-5')
	).rejects.toBeInstanceOf(ValidationError);
});

test('missing ai.manage cannot pause or raise the ceiling', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.8.6'
	);
	const ctx = contextFor(session, 'auto-cap');
	const actor = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'ai.manage')
	};
	await expect(
		pauseIntelligence(
			actor,
			ctx,
			{ paused: true, reason: 'Should not pause without capability' },
			'auto-cap-pause'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-cap-ceiling')
	).rejects.toBeInstanceOf(ForbiddenError);
});

test('user on client A cannot read client B kill-switch events', async () => {
	const { alpha, beta } = await seededClients();
	const admin = await adminOn(beta.id, '10.0.8.7', 'auto-beta');
	const betaCtx = contextFor(admin, 'auto-beta');
	try {
		await pauseIntelligence(
			admin,
			betaCtx,
			{ paused: true, reason: 'Beta warehouse pause must stay on Beta' },
			'auto-beta-on'
		);
		const { session } = await login(
			{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
			'10.0.8.8'
		);
		const ctx = contextFor(session, 'auto-iso');
		expect(ctx.clientId).toBe(alpha.id);
		const own = await getAutonomyOverview(session, ctx);
		expect(JSON.stringify(own)).not.toContain(beta.id);
		expect(JSON.stringify(own)).not.toContain('Beta warehouse pause must stay on Beta');
		expect(own.killSwitchEvents.every((row) => row.clientId === alpha.id)).toBe(true);
		await expect(getAutonomyOverview(session, ctx, beta.id)).rejects.toBeInstanceOf(
			TenantContextError
		);
		const alphaEvents = await listKillSwitchEventsForTenant(ctx);
		expect(alphaEvents.some((row) => row.reason.includes('Beta warehouse'))).toBe(false);
	} finally {
		await pauseIntelligence(
			admin,
			betaCtx,
			{ paused: false, reason: 'Resume Beta after isolation check' },
			'auto-beta-off'
		);
	}
});

test('route client id cannot leak the other tenant autonomy through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/autonomy/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('warehouse');
});

test('seeded catalog includes low-risk preapproved classes and forbidden classes', async () => {
	const policies = await listAiActionPolicies();
	expect(policies.length).toBeGreaterThanOrEqual(LOW_RISK_AUTO_EXECUTE_ACTIONS.length);
	for (const actionType of LOW_RISK_AUTO_EXECUTE_ACTIONS) {
		const row = policies.find((policy) => policy.actionType === actionType);
		expect(row?.autoExecuteAllowed).toBe(true);
		expect(row?.riskClass).toBe('low');
		expect(row?.maxAutonomy).toBe(3);
	}
	for (const actionType of FORBIDDEN_AUTONOMY_ACTIONS) {
		const row = policies.find((policy) => policy.actionType === actionType);
		expect(row?.forbidden).toBe(true);
		expect(row?.autoExecuteAllowed).toBe(false);
	}
});
