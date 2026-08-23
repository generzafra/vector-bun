import { consumeRateLimit, requireCapability } from '@vector/auth';
import { CORE_EVENTS } from '@vector/analytics';
import {
	evaluateAutoExecute,
	evaluateConditionalAutoExecute,
	evaluateLaunchAutomationStep,
	type ActionPolicySnapshot
} from '@vector/ai';
import { env } from '@vector/config';
import {
	LAUNCH_AUTOMATION_ACTIONS,
	LAUNCH_QA_CHECKLIST,
	PHASE_4_MAX_AUTONOMY,
	PHASE_8_MAX_AUTONOMY,
	S1_AUTO_EXECUTE_ACTIONS,
	S2_LAUNCH_AUTO_EXECUTE_CANDIDATES,
	S3_LAUNCH_AUTO_EXECUTE_ACTIONS,
	S4_CONDITIONAL_ACTIONS,
	S4_ROLLBACK_ACTIONS,
	ValidationError,
	assertActorOwnsContext,
	parseContract,
	rollbackAutoExecuteSchema,
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
	deleteLaunchDraftEventPlanForTenant,
	ensureAiSettingsForTenant,
	ensureLaunchAutomationPoliciesForTenant,
	getAiActionExecutionByIdForTenant,
	getAiActionExecutionByIdempotency,
	getAiActionPolicyByType,
	getLaunchForTenant,
	getPageForTenant,
	insertAiActionExecutionForTenant,
	insertLaunchApprovalForTenant,
	listAiActionExecutionsForTenant,
	listAiActionPolicies,
	listKillSwitchEventsForTenant,
	listLatestDraftPageVersionsForTenant,
	listLaunchApprovalsForTenant,
	listLaunchDraftEventPlansForTenant,
	listPublishedPageVersionsForTenant,
	markAiActionExecutionRolledBackForTenant,
	updateAiSettingsForTenant,
	updateLaunchAutomationPolicyForTenant,
	updatePagePublishedVersionForTenant,
	upsertLaunchDraftEventPlanForTenant,
	type ExperimentPromoteWinnerOutput,
	type InternalWeeklyReportOutput,
	type LaunchQueueQaOutput,
	type LaunchWireTrackingOutput
} from '@vector/db';
import { logInfo } from '@vector/observability';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { findPromoteReadyExperiments, promoteExperimentWinnerForAutonomy } from './experiments';

const S1_ACTIONS = new Set<string>(S1_AUTO_EXECUTE_ACTIONS);
const S2_CANDIDATES = new Set<string>(S2_LAUNCH_AUTO_EXECUTE_CANDIDATES);
const S3_ACTIONS = new Set<string>(S3_LAUNCH_AUTO_EXECUTE_ACTIONS);
const S4_ACTIONS = new Set<string>(S4_CONDITIONAL_ACTIONS);
const S4_ROLLBACK = new Set<string>(S4_ROLLBACK_ACTIONS);
const TRACKING_EVENTS = [...CORE_EVENTS];

function canRollbackExecution(
	execution: {
		status: string;
		actionType: string;
		rolledBackAt: Date | null;
		output: unknown;
	},
	rollbackSupported: boolean
) {
	if (!rollbackSupported || execution.status !== 'succeeded' || execution.rolledBackAt) {
		return false;
	}
	if (!execution.output || typeof execution.output !== 'object') return false;
	if (execution.actionType === 'launch.wire_tracking') {
		return Array.isArray((execution.output as LaunchWireTrackingOutput).priorPlans);
	}
	if (execution.actionType === 'experiment.promote_winner') {
		const row = execution.output as ExperimentPromoteWinnerOutput;
		return Boolean(row.previousPublishedVersionId && row.promotedPageVersionId);
	}
	return false;
}

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
	const [
		settings,
		policies,
		killSwitchEvents,
		executions,
		executedCount,
		launchPolicies,
		promoteReady
	] = await Promise.all([
		ensureAiSettingsForTenant(required),
		listAiActionPolicies(),
		listKillSwitchEventsForTenant(required),
		listAiActionExecutionsForTenant(required),
		countSucceededAiActionExecutionsForTenant(required),
		ensureLaunchAutomationPoliciesForTenant(required),
		findPromoteReadyExperiments(required)
	]);
	const launch = await getLaunchForTenant(required);
	const pausedGlobal = env.AI_EXECUTION_PAUSED;
	const rollbackTypes = new Set(
		policies.filter((policy) => policy.rollbackSupported).map((policy) => policy.actionType)
	);
	const actions = policies.map((policy) => {
		const isLevel4 = S4_ACTIONS.has(policy.actionType);
		const gate = isLevel4
			? evaluateConditionalAutoExecute({
					pausedGlobal,
					pausedClient: settings.paused,
					autonomyCeiling: settings.autonomyCeiling,
					requestedAutonomy: 4,
					confidence: 100,
					actionType: policy.actionType,
					policy: policySnapshot(policy)
				})
			: evaluateAutoExecute({
					pausedGlobal,
					pausedClient: settings.paused,
					autonomyCeiling: settings.autonomyCeiling,
					requestedAutonomy: 3,
					confidence: 100,
					actionType: policy.actionType,
					policy: policySnapshot(policy)
				});
		let blockedBy = gate.allowed ? null : gate.blockedBy;
		let executableNow = gate.allowed && S1_ACTIONS.has(policy.actionType);
		if (isLevel4 && gate.allowed) {
			if (promoteReady.length === 0) {
				blockedBy = 'experiment_not_ready';
				executableNow = false;
			} else if (promoteReady.length > 1) {
				blockedBy = 'ambiguous_experiment';
				executableNow = false;
			} else {
				executableNow = true;
			}
		}
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
			executableNow,
			blockedBy
		};
	});
	const launchAutomation = {
		launchId: launch?.id ?? null,
		launchStatus: launch?.status ?? null,
		unpublishedDraftsOnly: true,
		s2Executes: false as const,
		s3Executes: true as const,
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
				executableNow: later.allowed && S3_ACTIONS.has(actionType),
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
		s3ActionTypes: S3_LAUNCH_AUTO_EXECUTE_ACTIONS,
		s4ActionTypes: S4_CONDITIONAL_ACTIONS,
		executed: executedCount > 0,
		executedCount,
		actions,
		executions: executions.slice(0, 40).map((execution) => {
			const rollbackSupported =
				S4_ROLLBACK.has(execution.actionType) && rollbackTypes.has(execution.actionType);
			return {
				...execution,
				rollbackSupported,
				canRollback: canRollbackExecution(execution, rollbackSupported)
			};
		}),
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
		throw new ValidationError('Autonomy ceiling cannot exceed Level 4 in Phase 8');
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

type RequiredTenant = TenantContext & { organizationId: string; clientId: string };

async function recordBlockedExecution(
	actor: Actor,
	required: RequiredTenant,
	input: { actionType: string; blockedBy: string; requestId: string }
) {
	const execution = await insertAiActionExecutionForTenant(required, {
		actionType: input.actionType,
		status: 'blocked',
		blockedBy: input.blockedBy,
		idempotencyKey: `blocked:${input.requestId}`,
		requestId: input.requestId,
		actorId: actor.userId,
		error: `Blocked by ${input.blockedBy}`
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'ai.auto_execute.blocked',
		entityType: 'ai_action_execution',
		entityId: execution?.id,
		requestId: input.requestId,
		reason: input.blockedBy
	});
	logInfo('ai.auto_execute.blocked', {
		clientId: required.clientId,
		actionType: input.actionType,
		blockedBy: input.blockedBy
	});
	return {
		executed: false as const,
		replayed: false,
		blockedBy: input.blockedBy,
		execution
	};
}

async function recordSucceededExecution(
	actor: Actor,
	required: RequiredTenant,
	input: {
		actionType: string;
		idempotencyKey: string;
		requestId: string;
		reason: string;
		output:
			| InternalWeeklyReportOutput
			| LaunchQueueQaOutput
			| LaunchWireTrackingOutput
			| ExperimentPromoteWinnerOutput;
		autonomyLevel?: number;
	}
) {
	const execution = await insertAiActionExecutionForTenant(required, {
		actionType: input.actionType,
		status: 'succeeded',
		idempotencyKey: input.idempotencyKey,
		requestId: input.requestId,
		actorId: actor.userId,
		output: input.output,
		autonomyLevel: input.autonomyLevel
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'ai.auto_execute',
		entityType: 'ai_action_execution',
		entityId: execution?.id,
		requestId: input.requestId,
		reason: input.reason
	});
	logInfo('ai.auto_execute.succeeded', {
		clientId: required.clientId,
		actionType: input.actionType,
		sent: false,
		published: false,
		wentLive: false
	});
	return {
		executed: true as const,
		replayed: false,
		blockedBy: null,
		execution
	};
}

async function queueLaunchQa(
	actor: Actor,
	required: RequiredTenant,
	launch: { id: string; status: string }
): Promise<LaunchQueueQaOutput> {
	const approvals = await listLaunchApprovalsForTenant(required);
	const pending = approvals.find(
		(row) => row.kind === 'internal_qa' && row.status === 'pending' && row.launchId === launch.id
	);
	const approval =
		pending ??
		(await insertLaunchApprovalForTenant(required, {
			launchId: launch.id,
			kind: 'internal_qa',
			status: 'pending',
			actorId: actor.userId,
			note: 'Queued standard launch QA checklist. Unpublished drafts only. Does not go live.'
		}));
	return {
		kind: 'launch.queue_qa',
		launchId: launch.id,
		launchStatus: launch.status,
		approvalId: approval?.id ?? null,
		checklist: [...LAUNCH_QA_CHECKLIST],
		unpublishedDraftsOnly: true,
		sent: false,
		published: false,
		wentLive: false
	};
}

async function wireLaunchTracking(
	required: RequiredTenant,
	launch: { id: string; status: string }
): Promise<LaunchWireTrackingOutput> {
	const drafts = await listLatestDraftPageVersionsForTenant(required);
	if (drafts.length === 0) {
		throw new ValidationError('S3 wires tracking on unpublished drafts only');
	}
	const published = await listPublishedPageVersionsForTenant(required);
	const publishedIds = new Set(published.map((row) => row.id));
	const existingPlans = await listLaunchDraftEventPlansForTenant(required);
	const existingByVersion = new Map(existingPlans.map((row) => [row.pageVersionId, row]));
	const pageVersionIds: string[] = [];
	const priorPlans: LaunchWireTrackingOutput['priorPlans'] = [];
	for (const draft of drafts) {
		if (draft.status !== 'draft' || publishedIds.has(draft.id)) {
			throw new ValidationError('S3 cannot wire tracking on a published page version');
		}
		const existing = existingByVersion.get(draft.id);
		priorPlans.push({
			pageId: draft.pageId,
			pageVersionId: draft.id,
			events: existing?.events ?? null
		});
		const plan = await upsertLaunchDraftEventPlanForTenant(required, {
			launchId: launch.id,
			pageId: draft.pageId,
			pageVersionId: draft.id,
			events: TRACKING_EVENTS
		});
		if (!plan || plan.unpublishedDraftsOnly !== true) {
			throw new ValidationError('S3 cannot wire tracking on a published page version');
		}
		pageVersionIds.push(draft.id);
	}
	return {
		kind: 'launch.wire_tracking',
		launchId: launch.id,
		launchStatus: launch.status,
		pageVersionIds,
		events: TRACKING_EVENTS,
		priorPlans,
		unpublishedDraftsOnly: true,
		sent: false,
		published: false,
		wentLive: false
	};
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
	const isLevel4 = S4_ACTIONS.has(parsed.actionType);
	const gate = isLevel4
		? evaluateConditionalAutoExecute({
				pausedGlobal: env.AI_EXECUTION_PAUSED,
				pausedClient: settings.paused,
				autonomyCeiling: settings.autonomyCeiling,
				requestedAutonomy: 4,
				confidence: 100,
				actionType: parsed.actionType,
				policy: policySnapshot(policy)
			})
		: evaluateAutoExecute({
				pausedGlobal: env.AI_EXECUTION_PAUSED,
				pausedClient: settings.paused,
				autonomyCeiling: settings.autonomyCeiling,
				requestedAutonomy: 3,
				confidence: 100,
				actionType: parsed.actionType,
				policy: policySnapshot(policy)
			});
	if (!gate.allowed) {
		return recordBlockedExecution(actor, required, {
			actionType: parsed.actionType,
			blockedBy: gate.blockedBy,
			requestId
		});
	}
	if (S1_ACTIONS.has(parsed.actionType)) {
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
		return recordSucceededExecution(actor, required, {
			actionType: parsed.actionType,
			idempotencyKey,
			requestId,
			reason: periodKey,
			output
		});
	}
	if (S3_ACTIONS.has(parsed.actionType)) {
		const launchPolicies = await ensureLaunchAutomationPoliciesForTenant(required);
		const launch = await getLaunchForTenant(required);
		const row = launchPolicies.find((policyRow) => policyRow.actionType === parsed.actionType);
		const later = evaluateLaunchAutomationStep({
			catalog: gate,
			enabled: row?.enabled ?? false,
			unpublishedDraftsOnly: row?.unpublishedDraftsOnly ?? true,
			actionType: parsed.actionType,
			launchStatus: launch?.status ?? 'draft'
		});
		if (!later.allowed) {
			return recordBlockedExecution(actor, required, {
				actionType: parsed.actionType,
				blockedBy: later.blockedBy,
				requestId
			});
		}
		if (!launch) throw new ValidationError('Launch record not found');
		const idempotencyKey = parsed.idempotencyKey ?? `${parsed.actionType}:${launch.id}`;
		const existing = await getAiActionExecutionByIdempotency(required, idempotencyKey);
		if (existing) {
			return {
				executed: existing.status === 'succeeded',
				replayed: true,
				blockedBy: existing.blockedBy,
				execution: existing
			};
		}
		const output =
			parsed.actionType === 'launch.queue_qa'
				? await queueLaunchQa(actor, required, launch)
				: await wireLaunchTracking(required, launch);
		return recordSucceededExecution(actor, required, {
			actionType: parsed.actionType,
			idempotencyKey,
			requestId,
			reason: parsed.actionType,
			output
		});
	}
	if (isLevel4) {
		if (parsed.experimentId) {
			const idempotencyKey = parsed.idempotencyKey ?? `${parsed.actionType}:${parsed.experimentId}`;
			const existing = await getAiActionExecutionByIdempotency(required, idempotencyKey);
			if (existing) {
				return {
					executed: existing.status === 'succeeded',
					replayed: true,
					blockedBy: existing.blockedBy,
					execution: existing
				};
			}
		}
		const ready = await findPromoteReadyExperiments(required);
		let experimentId = parsed.experimentId ?? null;
		if (!experimentId) {
			if (ready.length === 0) {
				return recordBlockedExecution(actor, required, {
					actionType: parsed.actionType,
					blockedBy: 'experiment_not_ready',
					requestId
				});
			}
			if (ready.length > 1) {
				return recordBlockedExecution(actor, required, {
					actionType: parsed.actionType,
					blockedBy: 'ambiguous_experiment',
					requestId
				});
			}
			experimentId = ready[0]!.id;
		} else if (!ready.some((row) => row.id === experimentId)) {
			return recordBlockedExecution(actor, required, {
				actionType: parsed.actionType,
				blockedBy: 'experiment_not_ready',
				requestId
			});
		}
		const idempotencyKey = parsed.idempotencyKey ?? `${parsed.actionType}:${experimentId}`;
		const existing = await getAiActionExecutionByIdempotency(required, idempotencyKey);
		if (existing) {
			return {
				executed: existing.status === 'succeeded',
				replayed: true,
				blockedBy: existing.blockedBy,
				execution: existing
			};
		}
		const output = await promoteExperimentWinnerForAutonomy(
			actor,
			required,
			experimentId,
			requestId
		);
		return recordSucceededExecution(actor, required, {
			actionType: parsed.actionType,
			idempotencyKey,
			requestId,
			reason: parsed.actionType,
			output,
			autonomyLevel: 4
		});
	}
	throw new ValidationError(
		'S1, S3, and S4 only auto-execute internal_weekly_report, launch.queue_qa, launch.wire_tracking, and experiment.promote_winner'
	);
}

export async function rollbackAutoExecute(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`ai-rollback:${required.clientId}`, 20, 60_000);
	const parsed = parseContract(rollbackAutoExecuteSchema, input);
	const execution = await getAiActionExecutionByIdForTenant(required, parsed.executionId);
	if (!execution) throw new ValidationError('Execution not found');
	if (execution.status === 'rolled_back' || execution.rolledBackAt) {
		return {
			executed: false as const,
			replayed: true,
			blockedBy: null,
			execution
		};
	}
	if (execution.status !== 'succeeded') {
		throw new ValidationError('Only a succeeded execution can be rolled back');
	}
	const policy = await getAiActionPolicyByType(execution.actionType);
	if (!policy?.rollbackSupported || !S4_ROLLBACK.has(execution.actionType)) {
		throw new ValidationError(
			'S4 only rolls back launch.wire_tracking and experiment.promote_winner'
		);
	}
	if (execution.actionType === 'launch.wire_tracking') {
		await rollbackWireTracking(required, execution.output);
	} else if (execution.actionType === 'experiment.promote_winner') {
		await rollbackExperimentPromote(required, execution.output);
	}
	const rolled = await markAiActionExecutionRolledBackForTenant(required, {
		id: execution.id,
		idempotencyKey: execution.idempotencyKey,
		rolledBackAt: new Date()
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'ai.auto_execute.rollback',
		entityType: 'ai_action_execution',
		entityId: execution.id,
		requestId,
		reason: execution.actionType
	});
	logInfo('ai.auto_execute.rolled_back', {
		clientId: required.clientId,
		actionType: execution.actionType,
		executionId: execution.id
	});
	return {
		executed: true as const,
		replayed: false,
		blockedBy: null,
		execution: rolled ?? execution
	};
}

async function rollbackWireTracking(required: RequiredTenant, output: unknown) {
	if (!output || typeof output !== 'object' || !('priorPlans' in output)) {
		throw new ValidationError('Rollback requires captured prior state');
	}
	const priorPlans = (output as LaunchWireTrackingOutput).priorPlans;
	if (!Array.isArray(priorPlans)) {
		throw new ValidationError('Rollback requires captured prior state');
	}
	const launchId = (output as LaunchWireTrackingOutput).launchId;
	for (const prior of priorPlans) {
		if (prior.events === null) {
			await deleteLaunchDraftEventPlanForTenant(required, prior.pageVersionId);
			continue;
		}
		const restored = await upsertLaunchDraftEventPlanForTenant(required, {
			launchId,
			pageId: prior.pageId,
			pageVersionId: prior.pageVersionId,
			events: prior.events
		});
		if (!restored) {
			throw new ValidationError('S4 cannot restore tracking on a published page version');
		}
	}
}

async function rollbackExperimentPromote(required: RequiredTenant, output: unknown) {
	if (!output || typeof output !== 'object' || !('pageId' in output)) {
		throw new ValidationError('Rollback requires captured prior state');
	}
	const row = output as ExperimentPromoteWinnerOutput;
	if (!row.previousPublishedVersionId || !row.promotedPageVersionId || !row.pageId) {
		throw new ValidationError('Rollback requires captured prior state');
	}
	const page = await getPageForTenant(required, row.pageId);
	if (!page) throw new ValidationError('Page not found for this client');
	if (page.publishedVersionId === row.previousPublishedVersionId) {
		return;
	}
	if (page.publishedVersionId !== row.promotedPageVersionId) {
		throw new ValidationError('Published pointer changed since promote');
	}
	const restored = await updatePagePublishedVersionForTenant(
		required,
		row.pageId,
		row.previousPublishedVersionId
	);
	if (!restored) {
		throw new ValidationError('Rollback target must be a published page version of this page');
	}
}
