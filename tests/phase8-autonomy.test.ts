import { expect, test } from 'bun:test';
import { CORE_EVENTS } from '@vector/analytics';
import { cookieName, resetRateLimits } from '@vector/auth';
import { eq } from 'drizzle-orm';
import {
	evaluateAutoExecute,
	evaluateAiGate,
	evaluateConditionalAutoExecute,
	evaluateLaunchAutomationStep
} from '@vector/ai';
import { env } from '@vector/config';
import {
	FORBIDDEN_AUTONOMY_ACTIONS,
	ForbiddenError,
	LOW_RISK_AUTO_EXECUTE_ACTIONS,
	PHASE_8_MAX_AUTONOMY,
	LAUNCH_AUTOMATION_ACTIONS,
	LAUNCH_QA_CHECKLIST,
	S1_AUTO_EXECUTE_ACTIONS,
	S2_LAUNCH_AUTO_EXECUTE_CANDIDATES,
	S3_LAUNCH_AUTO_EXECUTE_ACTIONS,
	S4_CONDITIONAL_ACTIONS,
	S4_ROLLBACK_ACTIONS,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import {
	analyticsEvents,
	clients,
	countAnalyticsEventsForTenant,
	countDraftPageVersionsForTenant,
	countEmailMessagesByStatusForTenant,
	countPublishedPageVersionsForTenant,
	countSucceededAiActionExecutionsForTenant,
	db,
	deleteExperimentsForTenant,
	deleteLaunchDraftEventPlanForTenant,
	experimentAssignments,
	experiments,
	getAiActionExecutionByIdForTenant,
	getAiActionExecutionByIdempotency,
	getLaunchForTenant,
	getPageForTenant,
	insertAiActionExecutionForTenant,
	insertAnalyticsEventForTenant,
	listAiActionExecutionsForTenant,
	listAiActionPolicies,
	listKillSwitchEventsForTenant,
	listLaunchApprovalsForTenant,
	listLaunchAutomationPoliciesForTenant,
	listLaunchDraftEventPlansForTenant,
	listLatestDraftPageVersionsForTenant,
	listPublishedPageVersionsForTenant,
	markAiActionExecutionRolledBackForTenant,
	updateLaunchForTenant,
	updatePagePublishedVersionForTenant,
	upsertLaunchDraftEventPlanForTenant,
	visitors,
	type ExperimentPromoteWinnerOutput,
	type InternalWeeklyReportOutput,
	type LaunchQueueQaOutput,
	type LaunchWireTrackingOutput
} from '@vector/db';
import {
	composeFunnel,
	contextFor,
	createExperimentProposal,
	getAutonomyOverview,
	getExperimentOverview,
	login,
	pauseIntelligence,
	publishFunnel,
	resolveSession,
	rollbackAutoExecute,
	runAutoExecute,
	setAutonomyCeiling,
	setLaunchAutomationPolicy,
	switchActiveClient,
	transitionExperiment,
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
		blockedBy: 'policy_max_autonomy'
	});
	expect(evaluateAutoExecute({ ...autoBase, requestedAutonomy: 5 })).toEqual({
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

test('Level 4 conditional gate allows experiment promote only at ceiling 4', () => {
	const promotePolicy = {
		actionType: 'experiment.promote_winner',
		riskClass: 'content' as const,
		maxAutonomy: 4,
		autoExecuteAllowed: true,
		forbidden: false,
		financialLimitMinor: 0
	};
	const base = {
		pausedGlobal: false,
		pausedClient: false,
		autonomyCeiling: 4,
		requestedAutonomy: 4,
		confidence: 100,
		actionType: 'experiment.promote_winner',
		policy: promotePolicy
	};
	expect(evaluateConditionalAutoExecute(base).allowed).toBe(true);
	expect(evaluateConditionalAutoExecute({ ...base, pausedClient: true })).toEqual({
		allowed: false,
		blockedBy: 'client_pause'
	});
	expect(evaluateConditionalAutoExecute({ ...base, autonomyCeiling: 3 })).toEqual({
		allowed: false,
		blockedBy: 'autonomy_ceiling'
	});
	expect(evaluateConditionalAutoExecute({ ...base, requestedAutonomy: 3 })).toEqual({
		allowed: false,
		blockedBy: 'auto_execute_disabled'
	});
	expect(evaluateConditionalAutoExecute({ ...base, requestedAutonomy: 5 })).toEqual({
		allowed: false,
		blockedBy: 'phase8_autonomy'
	});
	expect(
		evaluateConditionalAutoExecute({
			...base,
			actionType: 'internal_weekly_report',
			policy: { ...promotePolicy, actionType: 'internal_weekly_report' }
		})
	).toEqual({ allowed: false, blockedBy: 'not_conditional_action' });
	expect(
		evaluateAutoExecute({
			pausedGlobal: false,
			pausedClient: false,
			autonomyCeiling: 4,
			requestedAutonomy: 3,
			confidence: 100,
			actionType: 'experiment.promote_winner',
			policy: promotePolicy
		})
	).toEqual({ allowed: false, blockedBy: 'risk_class' });
	expect(S4_CONDITIONAL_ACTIONS).toEqual(['experiment.promote_winner']);
	expect(S4_ROLLBACK_ACTIONS).toEqual(['launch.wire_tracking', 'experiment.promote_winner']);
});

test('launch automation step stays unpublished and kill-switch gated', () => {
	const allowed = { allowed: true as const };
	const base = {
		catalog: allowed,
		enabled: true,
		unpublishedDraftsOnly: true,
		actionType: 'launch.queue_qa',
		launchStatus: 'draft'
	};
	expect(evaluateLaunchAutomationStep(base).allowed).toBe(true);
	expect(evaluateLaunchAutomationStep({ ...base, unpublishedDraftsOnly: false })).toEqual({
		allowed: false,
		blockedBy: 'published_target_forbidden'
	});
	expect(evaluateLaunchAutomationStep({ ...base, enabled: false })).toEqual({
		allowed: false,
		blockedBy: 'tenant_policy_disabled'
	});
	expect(evaluateLaunchAutomationStep({ ...base, launchStatus: 'live' })).toEqual({
		allowed: false,
		blockedBy: 'launch_status'
	});
	expect(evaluateLaunchAutomationStep({ ...base, actionType: 'launch.generate_drafts' })).toEqual({
		allowed: false,
		blockedBy: 'never_auto_execute'
	});
	expect(
		evaluateLaunchAutomationStep({
			...base,
			catalog: { allowed: false, blockedBy: 'client_pause' }
		})
	).toEqual({ allowed: false, blockedBy: 'client_pause' });
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
	expect(listLaunchAutomationPoliciesForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
	expect(listLaunchDraftEventPlansForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
	expect(
		upsertLaunchDraftEventPlanForTenant(null as never, {
			launchId: '00000000-0000-0000-0000-000000000000',
			pageId: '00000000-0000-0000-0000-000000000000',
			pageVersionId: '00000000-0000-0000-0000-000000000000',
			events: [...CORE_EVENTS]
		})
	).rejects.toBeInstanceOf(TenantContextError);
	expect(
		getAiActionExecutionByIdForTenant(null as never, crypto.randomUUID())
	).rejects.toBeInstanceOf(TenantContextError);
	expect(
		markAiActionExecutionRolledBackForTenant(null as never, {
			id: crypto.randomUUID(),
			idempotencyKey: 'rolled-missing',
			rolledBackAt: new Date()
		})
	).rejects.toBeInstanceOf(TenantContextError);
	expect(
		deleteLaunchDraftEventPlanForTenant(null as never, crypto.randomUUID())
	).rejects.toBeInstanceOf(TenantContextError);
	expect(
		updatePagePublishedVersionForTenant(null as never, crypto.randomUUID(), crypto.randomUUID())
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

test('autonomy ceiling can be Level 4 and cannot be Level 5', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.5', 'auto-ceiling');
	const ctx = contextFor(actor, 'auto-ceiling');
	try {
		const settings = await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 4 }, 'auto-ceiling-4');
		expect(settings?.autonomyCeiling).toBe(4);
		expect(PHASE_8_MAX_AUTONOMY).toBe(4);
		await expect(
			setAutonomyCeiling(actor, ctx, { autonomyCeiling: 5 }, 'auto-ceiling-5')
		).rejects.toBeInstanceOf(ValidationError);
	} finally {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-ceiling-reset');
	}
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
	await expect(
		setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: true },
			'auto-cap-launch'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		rollbackAutoExecute(
			actor,
			ctx,
			{ executionId: '00000000-0000-4000-8000-000000000001' },
			'auto-cap-rollback'
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
		expect(own.launchAutomation.steps.every((row) => row.clientId === alpha.id)).toBe(true);
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
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: false },
			'auto-s1-qa-disable'
		);
		const queued = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa' },
			uniqueRequestId('auto-s1-qa')
		);
		expect(queued.executed).toBe(false);
		expect(queued.blockedBy).toBe('tenant_policy_disabled');
		let enrollSucceeded = false;
		try {
			const enroll = await runAutoExecute(
				actor,
				ctx,
				{ actionType: 'nurture.enroll_approved_sequence' },
				uniqueRequestId('auto-s1-enroll')
			);
			enrollSucceeded = enroll.executed;
		} catch (error) {
			expect(error).toBeInstanceOf(ValidationError);
		}
		expect(enrollSucceeded).toBe(false);
		const executions = await listAiActionExecutionsForTenant(ctx);
		expect(
			executions.some(
				(row) =>
					row.status === 'succeeded' &&
					(row.actionType === 'legal.reply' ||
						row.actionType === 'page.publish' ||
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

test('S2 records launch automation policies without executing', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.21', 'auto-s2-record');
	const ctx = contextFor(actor, 'auto-s2-record');
	const emailsBefore = emailMessageTotal(await countEmailMessagesByStatusForTenant(ctx));
	const pagesBefore = await countPublishedPageVersionsForTenant(ctx);
	const draftsBefore = await countDraftPageVersionsForTenant(ctx);
	try {
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: false },
			'auto-s2-reset-qa'
		);
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', enabled: false },
			'auto-s2-reset-track'
		);
		const overview = await getAutonomyOverview(actor, ctx);
		expect(overview.launchAutomation.s2Executes).toBe(false);
		expect(overview.launchAutomation.s3Executes).toBe(true);
		expect(overview.launchAutomation.unpublishedDraftsOnly).toBe(true);
		expect(overview.launchAutomation.steps.map((row) => row.actionType)).toEqual([
			...LAUNCH_AUTOMATION_ACTIONS
		]);
		const qa = overview.launchAutomation.steps.find((row) => row.actionType === 'launch.queue_qa');
		const tracking = overview.launchAutomation.steps.find(
			(row) => row.actionType === 'launch.wire_tracking'
		);
		const drafts = overview.launchAutomation.steps.find(
			(row) => row.actionType === 'launch.generate_drafts'
		);
		expect(qa?.enabled).toBe(false);
		expect(qa?.readyForLaterExecute).toBe(false);
		expect(qa?.blockedBy).toBe('autonomy_ceiling');
		expect(qa?.executableNow).toBe(false);
		expect(tracking?.candidateForLaterExecute).toBe(true);
		expect(drafts?.candidateForLaterExecute).toBe(false);
		expect(drafts?.blockedBy).toBe('forbidden_action');
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s2-ceiling');
		const enabled = await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: true },
			'auto-s2-enable-qa'
		);
		expect(enabled?.enabled).toBe(true);
		expect(enabled?.unpublishedDraftsOnly).toBe(true);
		expect(enabled?.clientId).toBe(alpha.id);
		const ready = await getAutonomyOverview(actor, ctx);
		expect(
			ready.launchAutomation.steps.find((row) => row.actionType === 'launch.queue_qa')
				?.readyForLaterExecute
		).toBe(true);
		expect(
			ready.launchAutomation.steps.find((row) => row.actionType === 'launch.queue_qa')
				?.executableNow
		).toBe(true);
		expect(
			ready.launchAutomation.steps.find((row) => row.actionType === 'launch.wire_tracking')
				?.readyForLaterExecute
		).toBe(false);
		await expect(
			setLaunchAutomationPolicy(
				actor,
				ctx,
				{ actionType: 'launch.generate_drafts', enabled: true },
				'auto-s2-enable-drafts'
			)
		).rejects.toBeInstanceOf(ValidationError);
		expect(emailMessageTotal(await countEmailMessagesByStatusForTenant(ctx))).toBe(emailsBefore);
		expect(await countPublishedPageVersionsForTenant(ctx)).toBe(pagesBefore);
		expect(await countDraftPageVersionsForTenant(ctx)).toBe(draftsBefore);
		expect(S2_LAUNCH_AUTO_EXECUTE_CANDIDATES).toEqual(['launch.queue_qa', 'launch.wire_tracking']);
		expect(S3_LAUNCH_AUTO_EXECUTE_ACTIONS).toEqual(S2_LAUNCH_AUTO_EXECUTE_CANDIDATES);
	} finally {
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: false },
			'auto-s2-disable-qa'
		);
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s2-ceiling-reset');
	}
});

test('kill switch and live launch status block later launch auto-execute', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.22', 'auto-s2-pause');
	const ctx = contextFor(actor, 'auto-s2-pause');
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s2-pause-ceiling');
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', enabled: true },
			'auto-s2-enable-track'
		);
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: true, reason: 'Pause launch automation during review' },
			'auto-s2-pause-on'
		);
		const paused = await getAutonomyOverview(actor, ctx);
		expect(
			paused.launchAutomation.steps.find((row) => row.actionType === 'launch.wire_tracking')
				?.blockedBy
		).toBe('client_pause');
		expect(
			paused.launchAutomation.steps.find((row) => row.actionType === 'launch.wire_tracking')
				?.readyForLaterExecute
		).toBe(false);
	} finally {
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: false, reason: 'Resume after launch automation review' },
			'auto-s2-pause-off'
		);
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', enabled: false },
			'auto-s2-disable-track'
		);
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s2-pause-ceiling-reset');
	}
});

test('user on client A cannot read or write client B launch automation policies', async () => {
	resetRateLimits();
	const { alpha, beta } = await seededClients();
	const admin = await adminOn(beta.id, '10.0.8.23', 'auto-s2-beta');
	const betaCtx = contextFor(admin, 'auto-s2-beta');
	try {
		await setAutonomyCeiling(admin, betaCtx, { autonomyCeiling: 3 }, 'auto-s2-beta-ceiling');
		const betaPolicy = await setLaunchAutomationPolicy(
			admin,
			betaCtx,
			{ actionType: 'launch.queue_qa', enabled: true },
			'auto-s2-beta-enable'
		);
		const betaLaunch = await getLaunchForTenant(betaCtx);
		expect(betaPolicy?.clientId).toBe(beta.id);
		const { session } = await login(
			{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
			'10.0.8.24'
		);
		const ctx = contextFor(session, 'auto-s2-iso');
		expect(ctx.clientId).toBe(alpha.id);
		const own = await getAutonomyOverview(session, ctx);
		expect(JSON.stringify(own)).not.toContain(beta.id);
		expect(JSON.stringify(own)).not.toContain(betaPolicy?.id);
		expect(JSON.stringify(own)).not.toContain(betaLaunch?.id);
		expect(JSON.stringify(own)).not.toContain('warehouse');
		expect(own.launchAutomation.steps.every((row) => row.clientId === alpha.id)).toBe(true);
		await expect(
			setLaunchAutomationPolicy(
				session,
				betaCtx,
				{ actionType: 'launch.queue_qa', enabled: true },
				'auto-s2-steal'
			)
		).rejects.toBeInstanceOf(TenantContextError);
		const leaked = await app.request(`/v1/autonomy/${beta.id}`, {
			headers: { cookie: `${cookieName()}=${session.token}` }
		});
		expect(leaked.status).toBeGreaterThanOrEqual(400);
		const leakedBody = await leaked.text();
		expect(leakedBody.toLowerCase()).not.toContain('warehouse');
		expect(leakedBody).not.toContain(betaPolicy?.id ?? 'missing-policy');
		expect(leakedBody).not.toContain(betaLaunch?.id ?? 'missing-launch');
		const alphaPolicies = await listLaunchAutomationPoliciesForTenant(ctx);
		expect(alphaPolicies.every((row) => row.clientId === alpha.id)).toBe(true);
		expect(alphaPolicies.some((row) => row.id === betaPolicy?.id)).toBe(false);
	} finally {
		await setLaunchAutomationPolicy(
			admin,
			betaCtx,
			{ actionType: 'launch.queue_qa', enabled: false },
			'auto-s2-beta-disable'
		);
		await setAutonomyCeiling(admin, betaCtx, { autonomyCeiling: 2 }, 'auto-s2-beta-ceiling-reset');
	}
});

test('S3 queues launch QA on unpublished drafts without going live', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.25', 'auto-s3-qa');
	const ctx = contextFor(actor, 'auto-s3-qa');
	const emailsBefore = emailMessageTotal(await countEmailMessagesByStatusForTenant(ctx));
	const pagesBefore = await countPublishedPageVersionsForTenant(ctx);
	const draftsBefore = await countDraftPageVersionsForTenant(ctx);
	const launchBefore = await getLaunchForTenant(ctx);
	const approvalsBefore = (await listLaunchApprovalsForTenant(ctx)).filter(
		(row) => row.kind === 'internal_qa' && row.status === 'pending'
	).length;
	const idempotencyKey = `s3-qa-${crypto.randomUUID()}`;
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s3-qa-ceiling');
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: true },
			'auto-s3-qa-enable'
		);
		const first = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', idempotencyKey },
			uniqueRequestId('auto-s3-qa-run')
		);
		expect(first.executed).toBe(true);
		expect(first.replayed).toBe(false);
		expect(first.execution?.clientId).toBe(alpha.id);
		const output = first.execution?.output as LaunchQueueQaOutput;
		expect(output.kind).toBe('launch.queue_qa');
		expect(output.checklist).toEqual([...LAUNCH_QA_CHECKLIST]);
		expect(output.unpublishedDraftsOnly).toBe(true);
		expect(output.sent).toBe(false);
		expect(output.published).toBe(false);
		expect(output.wentLive).toBe(false);
		expect(output.launchStatus).not.toBe('live');
		const replay = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', idempotencyKey },
			uniqueRequestId('auto-s3-qa-replay')
		);
		expect(replay.replayed).toBe(true);
		expect(replay.execution?.id).toBe(first.execution?.id);
		const launchAfter = await getLaunchForTenant(ctx);
		expect(launchAfter?.status).toBe(launchBefore?.status);
		expect(launchAfter?.status).not.toBe('live');
		expect(launchAfter?.status).not.toBe('launching');
		const approvalsAfter = (await listLaunchApprovalsForTenant(ctx)).filter(
			(row) => row.kind === 'internal_qa' && row.status === 'pending' && row.clientId === alpha.id
		);
		expect(approvalsAfter.length).toBeGreaterThanOrEqual(Math.max(1, approvalsBefore));
		expect(approvalsAfter.every((row) => row.clientId === alpha.id)).toBe(true);
		expect(emailMessageTotal(await countEmailMessagesByStatusForTenant(ctx))).toBe(emailsBefore);
		expect(await countPublishedPageVersionsForTenant(ctx)).toBe(pagesBefore);
		expect(await countDraftPageVersionsForTenant(ctx)).toBe(draftsBefore);
	} finally {
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: false },
			'auto-s3-qa-disable'
		);
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s3-qa-ceiling-reset');
	}
});

test('S3 wires conversion events on unpublished drafts only', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.26', 'auto-s3-track');
	const ctx = contextFor(actor, 'auto-s3-track');
	const emailsBefore = emailMessageTotal(await countEmailMessagesByStatusForTenant(ctx));
	const pagesBefore = await countPublishedPageVersionsForTenant(ctx);
	const draftsBefore = await countDraftPageVersionsForTenant(ctx);
	const published = await listPublishedPageVersionsForTenant(ctx);
	const idempotencyKey = `s3-track-${crypto.randomUUID()}`;
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s3-track-ceiling');
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', enabled: true },
			'auto-s3-track-enable'
		);
		const first = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', idempotencyKey },
			uniqueRequestId('auto-s3-track-run')
		);
		expect(first.executed).toBe(true);
		const output = first.execution?.output as LaunchWireTrackingOutput;
		expect(output.kind).toBe('launch.wire_tracking');
		expect(output.events).toEqual([...CORE_EVENTS]);
		expect(output.unpublishedDraftsOnly).toBe(true);
		expect(output.sent).toBe(false);
		expect(output.published).toBe(false);
		expect(output.wentLive).toBe(false);
		expect(output.pageVersionIds.length).toBeGreaterThan(0);
		expect(output.priorPlans.length).toBe(output.pageVersionIds.length);
		const publishedIds = new Set(published.map((row) => row.id));
		expect(output.pageVersionIds.some((id) => publishedIds.has(id))).toBe(false);
		const plans = await listLaunchDraftEventPlansForTenant(ctx);
		const wired = plans.filter((row) => output.pageVersionIds.includes(row.pageVersionId));
		expect(wired.length).toBe(output.pageVersionIds.length);
		expect(wired.every((row) => row.clientId === alpha.id)).toBe(true);
		expect(wired.every((row) => row.unpublishedDraftsOnly)).toBe(true);
		expect(wired.every((row) => !publishedIds.has(row.pageVersionId))).toBe(true);
		const drafts = await listLatestDraftPageVersionsForTenant(ctx);
		expect(drafts.every((row) => row.status === 'draft')).toBe(true);
		expect(wired.every((row) => drafts.some((draft) => draft.id === row.pageVersionId))).toBe(true);
		expect(emailMessageTotal(await countEmailMessagesByStatusForTenant(ctx))).toBe(emailsBefore);
		expect(await countPublishedPageVersionsForTenant(ctx)).toBe(pagesBefore);
		expect(await countDraftPageVersionsForTenant(ctx)).toBe(draftsBefore);
		const replay = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', idempotencyKey },
			uniqueRequestId('auto-s3-track-replay')
		);
		expect(replay.replayed).toBe(true);
		expect(replay.execution?.id).toBe(first.execution?.id);
	} finally {
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', enabled: false },
			'auto-s3-track-disable'
		);
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s3-track-ceiling-reset');
	}
});

test('S3 does not execute generate drafts, disabled steps, paused clients, or live launches', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.27', 'auto-s3-block');
	const ctx = contextFor(actor, 'auto-s3-block');
	const launch = await getLaunchForTenant(ctx);
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s3-block-ceiling');
		const drafts = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.generate_drafts' },
			uniqueRequestId('auto-s3-block-drafts')
		);
		expect(drafts.executed).toBe(false);
		expect(drafts.blockedBy).toBe('forbidden_action');
		const disabled = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking' },
			uniqueRequestId('auto-s3-block-disabled')
		);
		expect(disabled.executed).toBe(false);
		expect(disabled.blockedBy).toBe('tenant_policy_disabled');
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', enabled: true },
			'auto-s3-block-enable'
		);
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: true, reason: 'Pause S3 launch execute during review' },
			'auto-s3-block-pause-on'
		);
		const paused = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking' },
			uniqueRequestId('auto-s3-block-pause')
		);
		expect(paused.executed).toBe(false);
		expect(paused.blockedBy).toBe('client_pause');
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: false, reason: 'Resume after S3 launch execute review' },
			'auto-s3-block-pause-off'
		);
		await updateLaunchForTenant(ctx, { status: 'live' });
		const live = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking' },
			uniqueRequestId('auto-s3-block-live')
		);
		expect(live.executed).toBe(false);
		expect(live.blockedBy).toBe('launch_status');
		expect(await getLaunchForTenant(ctx)).toMatchObject({ status: 'live' });
	} finally {
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: false, reason: 'Ensure S3 block test leaves pause off' },
			'auto-s3-block-pause-reset'
		);
		await updateLaunchForTenant(ctx, { status: launch?.status ?? 'draft' });
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', enabled: false },
			'auto-s3-block-disable'
		);
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s3-block-ceiling-reset');
	}
});

test('user on client A cannot read or run client B launch auto-execute', async () => {
	resetRateLimits();
	const { alpha, beta } = await seededClients();
	const admin = await adminOn(beta.id, '10.0.8.28', 'auto-s3-beta');
	const betaCtx = contextFor(admin, 'auto-s3-beta');
	const idempotencyKey = `s3-beta-${crypto.randomUUID()}`;
	try {
		await setAutonomyCeiling(admin, betaCtx, { autonomyCeiling: 3 }, 'auto-s3-beta-ceiling');
		await setLaunchAutomationPolicy(
			admin,
			betaCtx,
			{ actionType: 'launch.queue_qa', enabled: true },
			'auto-s3-beta-enable'
		);
		const betaRun = await runAutoExecute(
			admin,
			betaCtx,
			{ actionType: 'launch.queue_qa', idempotencyKey },
			uniqueRequestId('auto-s3-beta-run')
		);
		expect(betaRun.executed).toBe(true);
		expect(betaRun.execution?.clientId).toBe(beta.id);
		const betaPlans = await listLaunchDraftEventPlansForTenant(betaCtx);
		const { session } = await login(
			{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
			'10.0.8.29'
		);
		const ctx = contextFor(session, 'auto-s3-iso');
		expect(ctx.clientId).toBe(alpha.id);
		const own = await getAutonomyOverview(session, ctx);
		expect(JSON.stringify(own)).not.toContain(beta.id);
		expect(JSON.stringify(own)).not.toContain(betaRun.execution?.id);
		expect(JSON.stringify(own)).not.toContain('warehouse');
		expect(own.executions.every((row) => row.clientId === alpha.id)).toBe(true);
		expect(await getAiActionExecutionByIdempotency(ctx, idempotencyKey)).toBeNull();
		const alphaPlans = await listLaunchDraftEventPlansForTenant(ctx);
		expect(alphaPlans.every((row) => row.clientId === alpha.id)).toBe(true);
		expect(alphaPlans.some((row) => betaPlans.some((plan) => plan.id === row.id))).toBe(false);
		await expect(
			runAutoExecute(
				session,
				betaCtx,
				{ actionType: 'launch.queue_qa', idempotencyKey: `s3-steal-${crypto.randomUUID()}` },
				uniqueRequestId('auto-s3-steal')
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
		await setLaunchAutomationPolicy(
			admin,
			betaCtx,
			{ actionType: 'launch.queue_qa', enabled: false },
			'auto-s3-beta-disable'
		);
		await setAutonomyCeiling(admin, betaCtx, { autonomyCeiling: 2 }, 'auto-s3-beta-ceiling-reset');
	}
});

test('API execute records launch QA at ceiling 3 when the tenant policy is enabled', async () => {
	resetRateLimits();
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.30', 'auto-s3-api');
	const ctx = contextFor(actor, 'auto-s3-api');
	const idempotencyKey = `s3-api-${crypto.randomUUID()}`;
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s3-api-ceiling');
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: true },
			'auto-s3-api-enable'
		);
		const cookie = `${cookieName()}=${actor.token}`;
		const denied = await app.request('/v1/autonomy/execute', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				cookie
			},
			body: JSON.stringify({ actionType: 'launch.queue_qa', idempotencyKey })
		});
		expect(denied.status).toBeGreaterThanOrEqual(400);
		const res = await app.request('/v1/autonomy/execute', {
			method: 'POST',
			headers: {
				'content-type': 'application/json',
				cookie,
				'x-csrf-token': actor.csrf
			},
			body: JSON.stringify({ actionType: 'launch.queue_qa', idempotencyKey })
		});
		expect(res.status).toBe(201);
		const body = (await res.json()) as {
			data: {
				executed: boolean;
				execution: { clientId: string; output: LaunchQueueQaOutput };
			};
		};
		expect(body.data.executed).toBe(true);
		expect(body.data.execution.clientId).toBe(alpha.id);
		expect(body.data.execution.output.wentLive).toBe(false);
		expect(body.data.execution.output.published).toBe(false);
	} finally {
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: false },
			'auto-s3-api-disable'
		);
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s3-api-ceiling-reset');
	}
});

async function twoPublishedVersions(
	actor: Awaited<ReturnType<typeof adminOn>>,
	ctx: ReturnType<typeof contextFor>
) {
	let overview = await getExperimentOverview(actor, ctx);
	let page = overview.pages[0];
	if (!page) throw new Error('seed page missing');
	let versions = overview.versions.filter((row) => row.pageId === page.id);
	if (versions.length < 2) {
		await composeFunnel(actor, ctx, `${ctx.requestId}-compose`);
		await publishFunnel(actor, ctx, `${ctx.requestId}-publish`);
		overview = await getExperimentOverview(actor, ctx);
		page = overview.pages[0];
		if (!page) throw new Error('seed page missing');
		versions = overview.versions.filter((row) => row.pageId === page.id);
	}
	if (versions.length < 2) throw new Error('need two published versions');
	return { page, control: versions[1]!, challenger: versions[0]! };
}

function liveControlAndChallenger(
	page: { publishedVersionId: string | null },
	versions: Array<{ id: string }>
) {
	const liveId = page.publishedVersionId;
	const other = versions.find((row) => row.id !== liveId);
	if (!liveId || !other) throw new Error('need a live version and a distinct challenger');
	return { controlPageVersionId: liveId, challengerPageVersionId: other.id };
}

async function seedDecisionReadyTraffic(
	ctx: ReturnType<typeof contextFor>,
	input: {
		experimentId: string;
		pageId: string;
		control: { id: string; key: string; pageVersionId: string };
		challenger: { id: string; key: string; pageVersionId: string };
		controlConverts: number;
		challengerConverts: number;
	}
) {
	const controlIds = Array.from({ length: 100 }, () => crypto.randomUUID());
	const challengerIds = Array.from({ length: 100 }, () => crypto.randomUUID());
	const people = await db
		.insert(visitors)
		.values(
			[...controlIds, ...challengerIds].map((anonymousId) => ({
				organizationId: ctx.organizationId,
				clientId: ctx.clientId,
				anonymousId
			}))
		)
		.returning({ id: visitors.id, anonymousId: visitors.anonymousId });
	await db.insert(experimentAssignments).values(
		people.map((row) => {
			const variant = controlIds.includes(row.anonymousId) ? input.control : input.challenger;
			return {
				organizationId: ctx.organizationId,
				clientId: ctx.clientId,
				experimentId: input.experimentId,
				visitorAnonymousId: row.anonymousId,
				variantId: variant.id,
				variantKey: variant.key as 'control' | 'challenger',
				pageVersionId: variant.pageVersionId,
				isTest: false
			};
		})
	);
	const converters = [
		...people.filter((row) => controlIds.includes(row.anonymousId)).slice(0, input.controlConverts),
		...people
			.filter((row) => challengerIds.includes(row.anonymousId))
			.slice(0, input.challengerConverts)
	];
	if (converters.length === 0) return;
	await db.insert(analyticsEvents).values(
		converters.map((row) => {
			const variant = controlIds.includes(row.anonymousId) ? input.control : input.challenger;
			return {
				organizationId: ctx.organizationId,
				clientId: ctx.clientId,
				eventId: crypto.randomUUID(),
				name: 'form_started',
				taxonomyVersion: 1,
				visitorId: row.id,
				pageId: input.pageId,
				pageVersionId: variant.pageVersionId,
				properties: {
					experimentId: input.experimentId,
					experimentVariant: variant.key,
					userAgent: 'Mozilla/5.0'
				},
				isTest: false
			};
		})
	);
}

test('S4 rolls back wired draft tracking even when the client is paused', async () => {
	resetRateLimits();
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.8.41', 'auto-s4-roll');
	const ctx = contextFor(actor, 'auto-s4-roll');
	const betaActor = await adminOn(beta.id, '10.0.8.42', 'auto-s4-roll-b');
	const betaCtx = contextFor(betaActor, 'auto-s4-roll-b');
	const idempotencyKey = `s4-track-${crypto.randomUUID()}`;
	try {
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s4-roll-ceiling');
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', enabled: true },
			'auto-s4-roll-enable'
		);
		const first = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', idempotencyKey },
			uniqueRequestId('auto-s4-roll-run')
		);
		expect(first.executed).toBe(true);
		const output = first.execution?.output as LaunchWireTrackingOutput;
		expect(output.priorPlans.length).toBeGreaterThan(0);
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: true },
			'auto-s4-roll-qa-enable'
		);
		const qa = await runAutoExecute(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', idempotencyKey: `s4-qa-${crypto.randomUUID()}` },
			uniqueRequestId('auto-s4-qa-for-rollback')
		);
		expect(qa.executed).toBe(true);
		await expect(
			rollbackAutoExecute(
				actor,
				ctx,
				{ executionId: qa.execution!.id },
				uniqueRequestId('auto-s4-qa-rb')
			)
		).rejects.toBeInstanceOf(ValidationError);
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: true, reason: 'Pause S4 rollback during review' },
			'auto-s4-roll-pause'
		);
		const rolled = await rollbackAutoExecute(
			actor,
			ctx,
			{ executionId: first.execution!.id },
			uniqueRequestId('auto-s4-roll-now')
		);
		expect(rolled.executed).toBe(true);
		expect(rolled.execution?.status).toBe('rolled_back');
		expect(rolled.execution?.clientId).toBe(alpha.id);
		const replay = await rollbackAutoExecute(
			actor,
			ctx,
			{ executionId: first.execution!.id },
			uniqueRequestId('auto-s4-roll-replay')
		);
		expect(replay.replayed).toBe(true);
		const after = await listLaunchDraftEventPlansForTenant(ctx);
		for (const prior of output.priorPlans) {
			const restored = after.find((row) => row.pageVersionId === prior.pageVersionId);
			if (prior.events === null) {
				expect(restored).toBeUndefined();
			} else {
				expect(restored?.events).toEqual(prior.events);
			}
		}
		await expect(
			rollbackAutoExecute(
				betaActor,
				betaCtx,
				{ executionId: first.execution!.id },
				uniqueRequestId('auto-s4-roll-cross')
			)
		).rejects.toBeInstanceOf(ValidationError);
	} finally {
		await pauseIntelligence(
			actor,
			ctx,
			{ paused: false, reason: 'Resume after S4 rollback review' },
			'auto-s4-roll-resume'
		);
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.wire_tracking', enabled: false },
			'auto-s4-roll-disable'
		);
		await setLaunchAutomationPolicy(
			actor,
			ctx,
			{ actionType: 'launch.queue_qa', enabled: false },
			'auto-s4-roll-qa-disable'
		);
		await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s4-roll-ceiling-reset');
	}
});

test(
	'S4 promotes a Phase 7 ready challenger at Level 4 and can restore the published pointer',
	async () => {
		resetRateLimits();
		const { alpha, beta } = await seededClients();
		const actor = await adminOn(alpha.id, '10.0.8.43', 'auto-s4-promote');
		const ctx = contextFor(actor, 'auto-s4-promote');
		const betaActor = await adminOn(beta.id, '10.0.8.44', 'auto-s4-promote-b');
		const betaCtx = contextFor(betaActor, 'auto-s4-promote-b');
		const versions = await twoPublishedVersions(actor, ctx);
		await deleteExperimentsForTenant(ctx);
		await deleteExperimentsForTenant(betaCtx);
		const pair = liveControlAndChallenger(versions.page, [versions.control, versions.challenger]);
		const pageBefore = await getPageForTenant(ctx, versions.page.id);
		try {
			await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 3 }, 'auto-s4-promote-3');
			const blockedCeiling = await runAutoExecute(
				actor,
				ctx,
				{ actionType: 'experiment.promote_winner' },
				uniqueRequestId('auto-s4-promote-ceil3')
			);
			expect(blockedCeiling.executed).toBe(false);
			expect(blockedCeiling.blockedBy).toBe('autonomy_ceiling');

			await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 4 }, 'auto-s4-promote-4');
			const notReady = await runAutoExecute(
				actor,
				ctx,
				{ actionType: 'experiment.promote_winner' },
				uniqueRequestId('auto-s4-promote-unready')
			);
			expect(notReady.executed).toBe(false);
			expect(notReady.blockedBy).toBe('experiment_not_ready');

			const created = await createExperimentProposal(
				actor,
				ctx,
				{
					name: 'S4 promote challenger',
					problem: 'Too few visitors start the consult form.',
					evidence: 'form_started is low relative to page_viewed on the live homepage.',
					hypothesis: 'A shorter hero lede will raise form_started.',
					audience: 'New homepage visitors looking for an implant consult',
					pageId: versions.page.id,
					controlPageVersionId: pair.controlPageVersionId,
					challengerPageVersionId: pair.challengerPageVersionId,
					primaryMetric: 'form_started',
					guardrailMetrics: ['page_viewed'],
					minDurationDays: 14,
					minSamplePerVariant: 100
				},
				'auto-s4-promote-create'
			);
			await transitionExperiment(actor, ctx, { id: created.id, to: 'approved' }, 'auto-s4-approve');
			await transitionExperiment(actor, ctx, { id: created.id, to: 'running' }, 'auto-s4-start');
			const control = created.variants.find((row) => row.role === 'control');
			const challenger = created.variants.find((row) => row.role === 'challenger');
			if (!control || !challenger) throw new Error('variants missing');
			await seedDecisionReadyTraffic(ctx, {
				experimentId: created.id,
				pageId: versions.page.id,
				control,
				challenger,
				controlConverts: 10,
				challengerConverts: 18
			});
			await db
				.update(experiments)
				.set({ launchedAt: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000) })
				.where(eq(experiments.id, created.id));

			await pauseIntelligence(
				actor,
				ctx,
				{ paused: true, reason: 'Pause S4 promote during review' },
				'auto-s4-promote-pause'
			);
			const paused = await runAutoExecute(
				actor,
				ctx,
				{ actionType: 'experiment.promote_winner', experimentId: created.id },
				uniqueRequestId('auto-s4-promote-paused')
			);
			expect(paused.executed).toBe(false);
			expect(paused.blockedBy).toBe('client_pause');
			await pauseIntelligence(
				actor,
				ctx,
				{ paused: false, reason: 'Resume after S4 promote pause check' },
				'auto-s4-promote-resume'
			);

			const overview = await getAutonomyOverview(actor, ctx);
			const promote = overview.actions.find(
				(row) => row.actionType === 'experiment.promote_winner'
			);
			expect(promote?.eligibleNow).toBe(true);
			expect(promote?.executableNow).toBe(true);
			expect(promote?.maxAutonomy).toBe(4);

			const first = await runAutoExecute(
				actor,
				ctx,
				{ actionType: 'experiment.promote_winner', experimentId: created.id },
				uniqueRequestId('auto-s4-promote-run')
			);
			expect(first.executed).toBe(true);
			expect(first.execution?.autonomyLevel).toBe(4);
			expect(first.execution?.clientId).toBe(alpha.id);
			const output = first.execution?.output as ExperimentPromoteWinnerOutput;
			expect(output.kind).toBe('experiment.promote_winner');
			expect(output.sent).toBe(false);
			expect(output.createdDraft).toBe(false);
			expect(output.publishedPointerChanged).toBe(true);
			expect(output.promotedPageVersionId).toBe(challenger.pageVersionId);
			expect(output.previousPublishedVersionId).toBe(pageBefore?.publishedVersionId);
			const afterPromote = await getPageForTenant(ctx, versions.page.id);
			expect(afterPromote?.publishedVersionId).toBe(challenger.pageVersionId);

			const replay = await runAutoExecute(
				actor,
				ctx,
				{ actionType: 'experiment.promote_winner', experimentId: created.id },
				uniqueRequestId('auto-s4-promote-replay')
			);
			expect(replay.replayed).toBe(true);

			const betaVersions = await twoPublishedVersions(betaActor, betaCtx);
			const betaPage = await getPageForTenant(betaCtx, betaVersions.page.id);
			expect(betaPage?.publishedVersionId).not.toBe(challenger.pageVersionId);

			const rolled = await rollbackAutoExecute(
				actor,
				ctx,
				{ executionId: first.execution!.id },
				uniqueRequestId('auto-s4-promote-rollback')
			);
			expect(rolled.executed).toBe(true);
			const restored = await getPageForTenant(ctx, versions.page.id);
			expect(restored?.publishedVersionId).toBe(output.previousPublishedVersionId);

			const leaked = await app.request(`/v1/autonomy/${beta.id}`, {
				headers: { cookie: `${cookieName()}=${actor.token}` }
			});
			expect(leaked.status).toBeGreaterThanOrEqual(400);

			const cookie = `${cookieName()}=${actor.token}`;
			const denied = await app.request('/v1/autonomy/rollback', {
				method: 'POST',
				headers: { 'content-type': 'application/json', cookie },
				body: JSON.stringify({ executionId: first.execution!.id })
			});
			expect(denied.status).toBeGreaterThanOrEqual(400);
		} finally {
			await pauseIntelligence(
				actor,
				ctx,
				{ paused: false, reason: 'Ensure S4 promote test leaves pause off' },
				'auto-s4-promote-pause-off'
			);
			if (pageBefore?.publishedVersionId) {
				await updatePagePublishedVersionForTenant(
					ctx,
					versions.page.id,
					pageBefore.publishedVersionId
				);
			}
			await deleteExperimentsForTenant(ctx);
			await deleteExperimentsForTenant(betaCtx);
			await setAutonomyCeiling(actor, ctx, { autonomyCeiling: 2 }, 'auto-s4-promote-ceiling-reset');
		}
	},
	{ timeout: 40_000 }
);
