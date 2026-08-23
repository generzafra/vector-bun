import {
	FORBIDDEN_AUTONOMY_ACTIONS,
	NEVER_AUTO_EXECUTE_ACTIONS,
	PHASE_8_MAX_AUTONOMY,
	type AutonomyRiskClass
} from '@vector/contracts';
import { confidenceCannotAuthorize } from './policy';

export { PHASE_8_MAX_AUTONOMY };

const FORBIDDEN = new Set<string>(FORBIDDEN_AUTONOMY_ACTIONS);
const NEVER_AUTO = new Set<string>(NEVER_AUTO_EXECUTE_ACTIONS);

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
	| 'phase8_autonomy';

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
