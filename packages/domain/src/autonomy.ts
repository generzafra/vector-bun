import { consumeRateLimit, requireCapability } from '@vector/auth';
import {
	evaluateAutoExecute,
	evaluateLaunchAutomationStep,
	type ActionPolicySnapshot
} from '@vector/ai';
import { env } from '@vector/config';
import {
	LAUNCH_AUTOMATION_ACTIONS,
	PHASE_4_MAX_AUTONOMY,
	PHASE_8_MAX_AUTONOMY,
	S1_AUTO_EXECUTE_ACTIONS,
	S2_LAUNCH_AUTO_EXECUTE_CANDIDATES,
	ValidationError,
	assertActorOwnsContext,
	parseContract,
	runAutoExecuteSchema,
	setAutonomyCeilingSchema,
	setLaunchAutomationPolicySchema,
	type TenantContext
} from '@vector/contracts';
import {
	assertAutonomyClient,
	countAnalyticsEventsForTenant,
	countPublishedPageVersionsForTenant,
	countSucceededAiActionExecutionsForTenant,
	ensureAiSettingsForTenant,
	ensureLaunchAutomationPoliciesForTenant,
	getAiActionExecutionByIdempotency,
	getAiActionPolicyByType,
	getLaunchForTenant,
	insertAiActionExecutionForTenant,
	listAiActionExecutionsForTenant,
	listAiActionPolicies,
	listKillSwitchEventsForTenant,
	updateAiSettingsForTenant,
	updateLaunchAutomationPolicyForTenant,
	type InternalWeeklyReportOutput
} from '@vector/db';
import { logInfo } from '@vector/observability';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

const S1_ACTIONS = new Set<string>(S1_AUTO_EXECUTE_ACTIONS);
const S2_CANDIDATES = new Set<string>(S2_LAUNCH_AUTO_EXECUTE_CANDIDATES);

export function utcIsoWeekKey(at = new Date()) {
	const date = new Date(Date.UTC(at.getUTCFullYear(), at.getUTCMonth(), at.getUTCDate()));
	date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
	const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
	const week = Math.ceil(((date.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
	return `${date.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

function policySnapshot(
	policy: {
		actionType: string;
		riskClass: ActionPolicySnapshot['riskClass'];
		maxAutonomy: number;
		autoExecuteAllowed: boolean;
		forbidden: boolean;
		financialLimitMinor: number;
	} | null
): ActionPolicySnapshot | null {
	if (!policy) return null;
	return {
		actionType: policy.actionType,
		riskClass: policy.riskClass,
		maxAutonomy: policy.maxAutonomy,
		autoExecuteAllowed: policy.autoExecuteAllowed,
		forbidden: policy.forbidden,
		financialLimitMinor: policy.financialLimitMinor
	};
}

async function observedWeeklyReport(ctx: TenantContext, periodKey: string) {
	const [rows, publishedPageVersions] = await Promise.all([
		countAnalyticsEventsForTenant(ctx),
		countPublishedPageVersionsForTenant(ctx)
	]);
	const observed = {
		pageViewed: 0,
		ctaClicked: 0,
		formStarted: 0,
		formSubmitted: 0,
		leadCreated: 0
	};
	for (const row of rows) {
		if (row.isTest) continue;
		if (row.name === 'page_viewed') observed.pageViewed += Number(row.total);
		if (row.name === 'cta_clicked') observed.ctaClicked += Number(row.total);
		if (row.name === 'form_started') observed.formStarted += Number(row.total);
		if (row.name === 'form_submitted') observed.formSubmitted += Number(row.total);
		if (row.name === 'lead_created') observed.leadCreated += Number(row.total);
	}
	const output: InternalWeeklyReportOutput = {
		kind: 'internal_weekly_report',
		periodKey,
		observed,
		publishedPageVersions,
		evidenceClass: 'observed',
		sent: false,
		published: false
	};
	return output;
}

export async function getAutonomyOverview(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'ai.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertAutonomyClient(required, clientId);
	const [settings, policies, killSwitchEvents, executions, executedCount, launchPolicies] =
		await Promise.all([
			ensureAiSettingsForTenant(required),
			listAiActionPolicies(),
			listKillSwitchEventsForTenant(required),
			listAiActionExecutionsForTenant(required),
			countSucceededAiActionExecutionsForTenant(required),
			ensureLaunchAutomationPoliciesForTenant(required)
		]);
	const launch = await getLaunchForTenant(required);
	const pausedGlobal = env.AI_EXECUTION_PAUSED;
	const actions = policies.map((policy) => {
		const gate = evaluateAutoExecute({
			pausedGlobal,
			pausedClient: settings.paused,
			autonomyCeiling: settings.autonomyCeiling,
			requestedAutonomy: 3,
			confidence: 100,
			actionType: policy.actionType,
			policy: policySnapshot(policy)
		});
		return {
			id: policy.id,
			actionType: policy.actionType,
			name: policy.name,
			description: policy.description,
			riskClass: policy.riskClass,
			defaultAutonomy: policy.defaultAutonomy,
			maxAutonomy: policy.maxAutonomy,
			autoExecuteAllowed: policy.autoExecuteAllowed,
			forbidden: policy.forbidden,
			financialLimitMinor: policy.financialLimitMinor,
			financialCurrency: policy.financialCurrency,
			contentLimit: policy.contentLimit,
			providerLimit: policy.providerLimit,
			approvalExpirySeconds: policy.approvalExpirySeconds,
			rollbackSupported: policy.rollbackSupported,
			eligibleNow: gate.allowed,
			executableNow: gate.allowed && S1_ACTIONS.has(policy.actionType),
			blockedBy: gate.allowed ? null : gate.blockedBy
		};
	});
	const launchAutomation = {
		launchId: launch?.id ?? null,
		launchStatus: launch?.status ?? null,
		unpublishedDraftsOnly: true,
		s2Executes: false as const,
		steps: LAUNCH_AUTOMATION_ACTIONS.map((actionType) => {
			const catalog = policies.find((policy) => policy.actionType === actionType);
			const row = launchPolicies.find((policy) => policy.actionType === actionType);
			const catalogGate = evaluateAutoExecute({
				pausedGlobal,
				pausedClient: settings.paused,
				autonomyCeiling: settings.autonomyCeiling,
				requestedAutonomy: 3,
				confidence: 100,
				actionType,
				policy: policySnapshot(catalog ?? null)
			});
			const later = evaluateLaunchAutomationStep({
				catalog: catalogGate,
				enabled: row?.enabled ?? false,
				unpublishedDraftsOnly: row?.unpublishedDraftsOnly ?? true,
				actionType,
				launchStatus: launch?.status ?? 'draft'
			});
			return {
				id: row?.id ?? null,
				clientId: required.clientId,
				launchId: row?.launchId ?? launch?.id ?? null,
				actionType,
				name: catalog?.name ?? actionType,
				description: catalog?.description ?? '',
				riskClass: catalog?.riskClass ?? 'content',
				catalogAutoExecuteAllowed: catalog?.autoExecuteAllowed ?? false,
				candidateForLaterExecute: S2_CANDIDATES.has(actionType),
				enabled: row?.enabled ?? false,
				unpublishedDraftsOnly: row?.unpublishedDraftsOnly ?? true,
				catalogEligibleNow: catalogGate.allowed,
				readyForLaterExecute: later.allowed,
				executableNow: false,
				blockedBy: later.allowed ? null : later.blockedBy
			};
		})
	};
	return {
		settings,
		pausedGlobal,
		phase4MaxAutonomy: PHASE_4_MAX_AUTONOMY,
		phase8MaxAutonomy: PHASE_8_MAX_AUTONOMY,
		s1ActionType: 'internal_weekly_report' as const,
		executed: executedCount > 0,
		executedCount,
		actions,
		executions: executions.slice(0, 40),
		launchAutomation,
		killSwitchEvents
	};
}

export async function setAutonomyCeiling(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(setAutonomyCeilingSchema, input);
	if (parsed.autonomyCeiling > PHASE_8_MAX_AUTONOMY) {
		throw new ValidationError('Autonomy ceiling cannot exceed Level 3 in Phase 8');
	}
	const settings = await updateAiSettingsForTenant(required, {
		autonomyCeiling: parsed.autonomyCeiling
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'ai.autonomy_ceiling',
		entityType: 'ai_client_settings',
		entityId: settings?.id,
		requestId,
		reason: `ceiling:${parsed.autonomyCeiling}`
	});
	logInfo('ai.autonomy.ceiling', {
		clientId: required.clientId,
		autonomyCeiling: parsed.autonomyCeiling
	});
	return settings;
}

export async function setLaunchAutomationPolicy(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`ai-launch-policy:${required.clientId}`, 20, 60_000);
	const parsed = parseContract(setLaunchAutomationPolicySchema, input);
	if (parsed.actionType === 'launch.generate_drafts' && parsed.enabled) {
		throw new ValidationError('Launch draft generation cannot be enabled for auto-execute');
	}
	const policy = await updateLaunchAutomationPolicyForTenant(required, parsed);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'ai.launch_automation_policy',
		entityType: 'launch_automation_policy',
		entityId: policy?.id,
		requestId,
		reason: `${parsed.actionType}:${parsed.enabled ? 'enabled' : 'disabled'}`
	});
	logInfo('ai.launch_automation.policy', {
		clientId: required.clientId,
		actionType: parsed.actionType,
		enabled: parsed.enabled,
		unpublishedDraftsOnly: true,
		executed: false
	});
	return policy;
}

export async function runAutoExecute(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`ai-exec:${required.clientId}`, 20, 60_000);
	const parsed = parseContract(runAutoExecuteSchema, input);
	const settings = await ensureAiSettingsForTenant(required);
	const policy = await getAiActionPolicyByType(parsed.actionType);
	const gate = evaluateAutoExecute({
		pausedGlobal: env.AI_EXECUTION_PAUSED,
		pausedClient: settings.paused,
		autonomyCeiling: settings.autonomyCeiling,
		requestedAutonomy: 3,
		confidence: 100,
		actionType: parsed.actionType,
		policy: policySnapshot(policy)
	});
	if (!gate.allowed) {
		const execution = await insertAiActionExecutionForTenant(required, {
			actionType: parsed.actionType,
			status: 'blocked',
			blockedBy: gate.blockedBy,
			idempotencyKey: `blocked:${requestId}`,
			requestId,
			actorId: actor.userId,
			error: `Blocked by ${gate.blockedBy}`
		});
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'human',
			actorId: actor.userId,
			action: 'ai.auto_execute.blocked',
			entityType: 'ai_action_execution',
			entityId: execution?.id,
			requestId,
			reason: gate.blockedBy
		});
		logInfo('ai.auto_execute.blocked', {
			clientId: required.clientId,
			actionType: parsed.actionType,
			blockedBy: gate.blockedBy
		});
		return {
			executed: false as const,
			replayed: false,
			blockedBy: gate.blockedBy,
			execution
		};
	}
	if (!S1_ACTIONS.has(parsed.actionType)) {
		throw new ValidationError('S1 only auto-executes internal_weekly_report');
	}
	const periodKey = utcIsoWeekKey();
	const idempotencyKey = parsed.idempotencyKey ?? `${parsed.actionType}:${periodKey}`;
	const existing = await getAiActionExecutionByIdempotency(required, idempotencyKey);
	if (existing) {
		return {
			executed: existing.status === 'succeeded',
			replayed: true,
			blockedBy: existing.blockedBy,
			execution: existing
		};
	}
	const output = await observedWeeklyReport(required, periodKey);
	const execution = await insertAiActionExecutionForTenant(required, {
		actionType: parsed.actionType,
		status: 'succeeded',
		idempotencyKey,
		requestId,
		actorId: actor.userId,
		output
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'ai.auto_execute',
		entityType: 'ai_action_execution',
		entityId: execution?.id,
		requestId,
		reason: periodKey
	});
	logInfo('ai.auto_execute.succeeded', {
		clientId: required.clientId,
		actionType: parsed.actionType,
		periodKey,
		sent: false,
		published: false
	});
	return {
		executed: true as const,
		replayed: false,
		blockedBy: null,
		execution
	};
}
