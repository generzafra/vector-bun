import { expect, test } from 'bun:test';
import { cookieName, resetRateLimits } from '@vector/auth';
import { eq } from 'drizzle-orm';
import { evaluateAutoExecute, evaluateAiGate } from '@vector/ai';
import { env } from '@vector/config';
import {
	FORBIDDEN_AUTONOMY_ACTIONS,
	ForbiddenError,
	LOW_RISK_AUTO_EXECUTE_ACTIONS,
	PHASE_8_MAX_AUTONOMY,
	S1_AUTO_EXECUTE_ACTIONS,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	countAnalyticsEventsForTenant,
	countEmailMessagesByStatusForTenant,
	countPublishedPageVersionsForTenant,
	countSucceededAiActionExecutionsForTenant,
	db,
	getAiActionExecutionByIdempotency,
	insertAiActionExecutionForTenant,
	insertAnalyticsEventForTenant,
	listAiActionExecutionsForTenant,
	listAiActionPolicies,
	listKillSwitchEventsForTenant,
	type InternalWeeklyReportOutput
} from '@vector/db';
import {
	contextFor,
	getAutonomyOverview,
	login,
	pauseIntelligence,
	resolveSession,
	runAutoExecute,
	setAutonomyCeiling,
	switchActiveClient,
	utcIsoWeekKey
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

function emailMessageTotal(rows: { total: number | bigint }[]) {
	return rows.reduce((sum, row) => sum + Number(row.total), 0);
}

function observedLeadCreated(rows: { name: string; isTest: boolean; total: number | bigint }[]) {
	return rows.reduce((sum, row) => {
		if (row.isTest || row.name !== 'lead_created') return sum;
		return sum + Number(row.total);
	}, 0);
}

function uniqueRequestId(prefix: string) {
	return `${prefix}-${crypto.randomUUID()}`;
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

test('missing TenantContext cannot list kill-switch events or executions', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listKillSwitchEventsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listAiActionExecutionsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(getAiActionExecutionByIdempotency(null as never, 'missing-key-xx')).rejects.toBeInstanceOf(
		TenantContextError
	);
	expect(countSucceededAiActionExecutionsForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
	expect(
		insertAiActionExecutionForTenant(null as never, {
			actionType: 'internal_weekly_report',
			status: 'succeeded',
			idempotencyKey: 'ctx-missing-key',
			requestId: 'ctx-missing'
		})
	).rejects.toBeInstanceOf(TenantContextError);
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
		expect(ready.phase8MaxAutonomy).toBe(PHASE_8_MAX_AUTONOMY);
		const weekly = ready.actions.find((row) => row.actionType === 'internal_weekly_report');
		expect(weekly?.eligibleNow).toBe(true);
		expect(weekly?.executableNow).toBe(true);
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
		expect(
			overview.actions.find((row) => row.actionType === 'internal_weekly_report')?.executableNow
		).toBe(true);
		expect(
			overview.actions.find((row) => row.actionType === 'launch.queue_qa')?.executableNow
		).toBe(false);
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
	await expect(
		runAutoExecute(
			actor,
			ctx,
			{ actionType: 'internal_weekly_report', idempotencyKey: 'no-manage-weekly' },
			'auto-cap-execute'
		)
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
		expect(own.executions.every((row) => row.clientId === alpha.id)).toBe(true);
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
	expect(S1_AUTO_EXECUTE_ACTIONS).toEqual(['internal_weekly_report']);
	expect(utcIsoWeekKey()).toMatch(/^\d{4}-W\d{2}$/);
});

test('S1 auto-executes an internal weekly report from observed tenant metrics only', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.11', 'auto-s1-run');
	const ctx = contextFor(actor, 'auto-s1-run');
	const idempotencyKey = `s1-weekly-${crypto.randomUUID()}`;
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s1-ceiling');
		const emailsBefore = emailMessageTotal(await countEmailMessagesByStatusForTenant(ctx));
		const pagesBefore = await countPublishedPageVersionsForTenant(ctx);
		const leadsBefore = observedLeadCreated(await countAnalyticsEventsForTenant(ctx));
		await insertAnalyticsEventForTenant(ctx, {
			eventId: crypto.randomUUID(),
			name: 'lead_created',
			taxonomyVersion: 1,
			isTest: true
		});
		await insertAnalyticsEventForTenant(ctx, {
			eventId: crypto.randomUUID(),
			name: 'lead_created',
			taxonomyVersion: 1,
			isTest: false
		});
		const first = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'internal_weekly_report', idempotencyKey },
			uniqueRequestId('auto-s1-execute')
		);
		expect(first.executed).toBe(true);
		expect(first.replayed).toBe(false);
		expect(first.blockedBy).toBeNull();
		expect(first.execution?.status).toBe('succeeded');
		expect(first.execution?.clientId).toBe(alpha.id);
		expect(first.execution?.confidenceIgnored).toBe(true);
		expect(first.execution?.autonomyLevel).toBe(3);
		const output = first.execution?.output as InternalWeeklyReportOutput;
		expect(output.kind).toBe('internal_weekly_report');
		expect(output.evidenceClass).toBe('observed');
		expect(output.sent).toBe(false);
		expect(output.published).toBe(false);
		expect(output.observed.leadCreated).toBe(leadsBefore + 1);
		expect(emailMessageTotal(await countEmailMessagesByStatusForTenant(ctx))).toBe(emailsBefore);
		expect(await countPublishedPageVersionsForTenant(ctx)).toBe(pagesBefore);
		const replay = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'internal_weekly_report', idempotencyKey },
			uniqueRequestId('auto-s1-replay')
		);
		expect(replay.replayed).toBe(true);
		expect(replay.executed).toBe(true);
		expect(replay.execution?.id).toBe(first.execution?.id);
		const overview = await getAutonomyOverview(actor, ctx);
		expect(overview.executed).toBe(true);
		expect(overview.executedCount).toBeGreaterThanOrEqual(1);
		expect(overview.executions.some((row) => row.id === first.execution?.id)).toBe(true);
		expect(overview.executions.every((row) => row.clientId === alpha.id)).toBe(true);
	} finally {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s1-ceiling-reset');
	}
});

test('kill switch records a blocked execution and does not succeed', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.12', 'auto-s1-pause');
	const ctx = contextFor(actor, 'auto-s1-pause');
	const idempotencyKey = `s1-paused-${crypto.randomUUID()}`;
	const succeededBefore = await countSucceededAiActionExecutionsForTenant(ctx);
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s1-pause-ceiling');
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: true, reason: 'Pause S1 weekly report during review' },
			'auto-s1-pause-on'
		);
		const blocked = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'internal_weekly_report', idempotencyKey },
			uniqueRequestId('auto-s1-pause-execute')
		);
		expect(blocked.executed).toBe(false);
		expect(blocked.blockedBy).toBe('client_pause');
		expect(blocked.execution?.status).toBe('blocked');
		expect(await getAiActionExecutionByIdempotency(ctx, idempotencyKey)).toBeNull();
		expect(await countSucceededAiActionExecutionsForTenant(ctx)).toBe(succeededBefore);
	} finally {
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: false, reason: 'Resume after S1 pause check' },
			'auto-s1-pause-off'
		);
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s1-pause-ceiling-reset');
	}
});

test('default ceiling 2 blocks S1 execute', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.13', 'auto-s1-ceil2');
	const ctx = contextFor(actor, 'auto-s1-ceil2');
	await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s1-ceil2-set');
	const blocked = await runAutoExecute(
		actor,
		ctx,
		{ actionType: 'internal_weekly_report', idempotencyKey: `s1-ceil2-${crypto.randomUUID()}` },
		uniqueRequestId('auto-s1-ceil2-execute')
	);
	expect(blocked.executed).toBe(false);
	expect(blocked.blockedBy).toBe('autonomy_ceiling');
	expect(blocked.execution?.status).toBe('blocked');
});

test('S1 cannot succeed legal, publish, or later launch classes', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.14', 'auto-s1-forbid');
	const ctx = contextFor(actor, 'auto-s1-forbid');
	const emailsBefore = emailMessageTotal(await countEmailMessagesByStatusForTenant(ctx));
	const pagesBefore = await countPublishedPageVersionsForTenant(ctx);
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s1-forbid-ceiling');
		const legal = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'legal.reply' },
			uniqueRequestId('auto-s1-legal')
		);
		expect(legal.executed).toBe(false);
		expect(legal.blockedBy).toBe('forbidden_action');
		const publish = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'page.publish' },
			uniqueRequestId('auto-s1-publish')
		);
		expect(publish.executed).toBe(false);
		expect(publish.blockedBy).toBe('forbidden_action');
		await expect(
			runAutoExecute(actor, ctx, { actionType: 'launch.queue_qa' }, 'auto-s1-qa')
		).rejects.toBeInstanceOf(ValidationError);
		await expect(
			runAutoExecute(
				actor,
				ctx,
				{ actionType: 'nurture.enroll_approved_sequence' },
				'auto-s1-enroll'
			)
		).rejects.toBeInstanceOf(ValidationError);
		const executions = await listAiActionExecutionsForTenant(ctx);
		expect(
			executions.some(
				(row) =>
					row.status === 'succeeded' &&
					(row.actionType === 'legal.reply' ||
						row.actionType === 'page.publish' ||
						row.actionType === 'launch.queue_qa' ||
						row.actionType === 'nurture.enroll_approved_sequence')
			)
		).toBe(false);
		expect(emailMessageTotal(await countEmailMessagesByStatusForTenant(ctx))).toBe(emailsBefore);
		expect(await countPublishedPageVersionsForTenant(ctx)).toBe(pagesBefore);
	} finally {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s1-forbid-ceiling-reset');
	}
});

test('user on client A cannot read or run client B executions', async () => {
	resetRateLimits();
	const { alpha, beta } = await seededClients();
	const admin = await adminOn(beta.id, '10.0.8.15', 'auto-s1-beta');
	const betaCtx = contextFor(admin, 'auto-s1-beta');
	const idempotencyKey = `s1-beta-${crypto.randomUUID()}`;
	try {
		await setAutonomyCeiling(admin, betaCtx, { autonomyCeiling: 3 }, 'auto-s1-beta-ceiling');
		const betaRun = await runAutoExecute(
			admin,
			betaCtx,
			{ actionType: 'internal_weekly_report', idempotencyKey },
			uniqueRequestId('auto-s1-beta-execute')
		);
		expect(betaRun.executed).toBe(true);
		expect(betaRun.execution?.clientId).toBe(beta.id);
		const { session } = await login(
			{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
			'10.0.8.16'
		);
		const ctx = contextFor(session, 'auto-s1-iso');
		expect(ctx.clientId).toBe(alpha.id);
		const own = await getAutonomyOverview(session, ctx);
		expect(JSON.stringify(own)).not.toContain(beta.id);
		expect(JSON.stringify(own)).not.toContain(betaRun.execution?.id);
		expect(JSON.stringify(own)).not.toContain('Beta warehouse');
		expect(own.executions.every((row) => row.clientId === alpha.id)).toBe(true);
		expect(await getAiActionExecutionByIdempotency(ctx, idempotencyKey)).toBeNull();
		await expect(
			runAutoExecute(
				session,
				betaCtx,
				{ actionType: 'internal_weekly_report', idempotencyKey: `s1-steal-${crypto.randomUUID()}` },
				uniqueRequestId('auto-s1-steal')
			)
		).rejects.toBeInstanceOf(TenantContextError);
		const leaked = await app.request(`/v1/autonomy/${beta.id}`, {
			headers: { cookie: `${cookieName()}=${session.token}` }
		});
		expect(leaked.status).toBeGreaterThanOrEqual(400);
		const leakedText = await leaked.text();
		expect(leakedText.toLowerCase()).not.toContain('warehouse');
		expect(leakedText).not.toContain(betaRun.execution?.id ?? 'missing-execution');
	} finally {
		await setAutonomyCeiling(admin, betaCtx, { autonomyCeiling: 2 }, 'auto-s1-beta-ceiling-reset');
	}
});

test('API execute records a weekly report at ceiling 3 and stays CSRF-protected', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.17', 'auto-s1-api');
	const ctx = contextFor(actor, 'auto-s1-api');
	const idempotencyKey = `s1-api-${crypto.randomUUID()}`;
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s1-api-ceiling');
		const cookie = `${cookieName()}=${actor.token}`;
		const denied = await app.request('/v1/autonomy/execute', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				cookie
			},
			body: JSON.stringify({ actionType: 'internal_weekly_report', idempotencyKey })
		});
		expect(denied.status).toBeGreaterThanOrEqual(400);
		const res = await app.request('/v1/autonomy/execute', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				cookie,
				'x-csrf-token': actor.csrf
			},
			body: JSON.stringify({ actionType: 'internal_weekly_report', idempotencyKey })
		});
		expect(res.status).toBe(201);
		const body = (await res.json()) as {
			data: {
				executed: boolean;
				execution: { clientId: string; output: InternalWeeklyReportOutput };
			};
		};
		expect(body.data.executed).toBe(true);
		expect(body.data.execution.clientId).toBe(alpha.id);
		expect(body.data.execution.output.sent).toBe(false);
		expect(body.data.execution.output.published).toBe(false);
	} finally {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s1-api-ceiling-reset');
	}
});
