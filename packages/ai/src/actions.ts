import {
	FORBIDDEN_AUTONOMY_ACTIONS,
	LAUNCH_AUTOMATION_BLOCKED_STATUSES,
	NEVER_AUTO_EXECUTE_ACTIONS,
	PHASE_8_MAX_AUTONOMY,
	S2_LAUNCH_AUTO_EXECUTE_CANDIDATES,
	S4_CONDITIONAL_ACTIONS,
	type AutonomyRiskClass
} from '@vector/contracts';
import { confidenceCannotAuthorize } from './policy';

export { PHASE_8_MAX_AUTONOMY };

const FORBIDDEN = new Set<string>(FORBIDDEN_AUTONOMY_ACTIONS);
const NEVER_AUTO = new Set<string>(NEVER_AUTO_EXECUTE_ACTIONS);
const LAUNCH_CANDIDATES = new Set<string>(S2_LAUNCH_AUTO_EXECUTE_CANDIDATES);
const LEVEL_4_ACTIONS = new Set<string>(S4_CONDITIONAL_ACTIONS);
const BLOCKED_LAUNCH_STATUSES = new Set<string>(LAUNCH_AUTOMATION_BLOCKED_STATUSES);

export type ActionPolicySnapshot = {
	actionType: string;
	riskClass: AutonomyRiskClass;
	maxAutonomy: number;
	autoExecuteAllowed: boolean;
	forbidden: boolean;
	financialLimitMinor: number;
};

export type AutoExecuteInput = {
	pausedGlobal: boolean;
	pausedClient: boolean;
	autonomyCeiling: number;
	requestedAutonomy: number;
	confidence: number;
	actionType: string;
	policy: ActionPolicySnapshot | null;
};

export type AutoExecuteBlockedBy =
	| 'global_pause'
	| 'client_pause'
	| 'unknown_action'
	| 'forbidden_action'
	| 'risk_class'
	| 'auto_execute_disabled'
	| 'autonomy_ceiling'
	| 'policy_max_autonomy'
	| 'phase8_autonomy'
	| 'not_conditional_action'
	| 'experiment_not_ready'
	| 'ambiguous_experiment';

export type AutoExecuteResult =
	{ allowed: true } | { allowed: false; blockedBy: AutoExecuteBlockedBy };

export function evaluateAutoExecute(input: AutoExecuteInput): AutoExecuteResult {
	confidenceCannotAuthorize(input.confidence);
	if (input.pausedGlobal) return { allowed: false, blockedBy: 'global_pause' };
	if (input.pausedClient) return { allowed: false, blockedBy: 'client_pause' };
	if (input.requestedAutonomy > PHASE_8_MAX_AUTONOMY) {
		return { allowed: false, blockedBy: 'phase8_autonomy' };
	}
	if (!input.policy || input.policy.actionType !== input.actionType) {
		return { allowed: false, blockedBy: 'unknown_action' };
	}
	if (
		input.policy.forbidden ||
		FORBIDDEN.has(input.actionType) ||
		NEVER_AUTO.has(input.actionType)
	) {
		return { allowed: false, blockedBy: 'forbidden_action' };
	}
	if (input.policy.riskClass !== 'low') {
		return { allowed: false, blockedBy: 'risk_class' };
	}
	if (!input.policy.autoExecuteAllowed || input.requestedAutonomy < 3) {
		return { allowed: false, blockedBy: 'auto_execute_disabled' };
	}
	if (input.requestedAutonomy > input.policy.maxAutonomy) {
		return { allowed: false, blockedBy: 'policy_max_autonomy' };
	}
	if (input.requestedAutonomy > input.autonomyCeiling) {
		return { allowed: false, blockedBy: 'autonomy_ceiling' };
	}
	return { allowed: true };
}

export function evaluateConditionalAutoExecute(input: AutoExecuteInput): AutoExecuteResult {
	confidenceCannotAuthorize(input.confidence);
	if (input.pausedGlobal) return { allowed: false, blockedBy: 'global_pause' };
	if (input.pausedClient) return { allowed: false, blockedBy: 'client_pause' };
	if (input.requestedAutonomy > PHASE_8_MAX_AUTONOMY) {
		return { allowed: false, blockedBy: 'phase8_autonomy' };
	}
	if (!LEVEL_4_ACTIONS.has(input.actionType)) {
		return { allowed: false, blockedBy: 'not_conditional_action' };
	}
	if (!input.policy || input.policy.actionType !== input.actionType) {
		return { allowed: false, blockedBy: 'unknown_action' };
	}
	if (
		input.policy.forbidden ||
		FORBIDDEN.has(input.actionType) ||
		NEVER_AUTO.has(input.actionType)
	) {
		return { allowed: false, blockedBy: 'forbidden_action' };
	}
	if (input.requestedAutonomy !== 4) {
		return { allowed: false, blockedBy: 'auto_execute_disabled' };
	}
	if (!input.policy.autoExecuteAllowed) {
		return { allowed: false, blockedBy: 'auto_execute_disabled' };
	}
	if (input.requestedAutonomy > input.policy.maxAutonomy) {
		return { allowed: false, blockedBy: 'policy_max_autonomy' };
	}
	if (input.requestedAutonomy > input.autonomyCeiling) {
		return { allowed: false, blockedBy: 'autonomy_ceiling' };
	}
	return { allowed: true };
}

export type LaunchAutomationBlockedBy =
	| AutoExecuteBlockedBy
	| 'tenant_policy_disabled'
	| 'never_auto_execute'
	| 'published_target_forbidden'
	| 'launch_status';

export type LaunchAutomationResult =
	{ allowed: true } | { allowed: false; blockedBy: LaunchAutomationBlockedBy };

export type LaunchAutomationInput = {
	catalog: AutoExecuteResult;
	enabled: boolean;
	unpublishedDraftsOnly: boolean;
	actionType: string;
	launchStatus: string;
};

export function evaluateLaunchAutomationStep(input: LaunchAutomationInput): LaunchAutomationResult {
	if (!input.unpublishedDraftsOnly) {
		return { allowed: false, blockedBy: 'published_target_forbidden' };
	}
	if (!input.catalog.allowed) {
		return { allowed: false, blockedBy: input.catalog.blockedBy };
	}
	if (NEVER_AUTO.has(input.actionType) || !LAUNCH_CANDIDATES.has(input.actionType)) {
		return { allowed: false, blockedBy: 'never_auto_execute' };
	}
	if (!input.enabled) {
		return { allowed: false, blockedBy: 'tenant_policy_disabled' };
	}
	if (BLOCKED_LAUNCH_STATUSES.has(input.launchStatus)) {
		return { allowed: false, blockedBy: 'launch_status' };
	}
	return { allowed: true };
}
