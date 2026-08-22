export const PHASE_4_MAX_AUTONOMY = 2;

const MARKUP = /<\/?[a-z][\s\S]*>/i;
const STYLE_OR_SCRIPT = /(?:javascript:|data:text\/html|expression\s*\()/i;

export type AIGateInput = {
	pausedGlobal: boolean;
	pausedClient: boolean;
	autonomyCeiling: number;
	requestedAutonomy: number;
	confidence: number;
};

export type AIGateResult =
	| { allowed: true }
	| {
			allowed: false;
			blockedBy: 'global_pause' | 'client_pause' | 'autonomy_ceiling' | 'phase4_autonomy';
	  };

export function evaluateAiGate(input: AIGateInput): AIGateResult {
	if (input.pausedGlobal) return { allowed: false, blockedBy: 'global_pause' };
	if (input.pausedClient) return { allowed: false, blockedBy: 'client_pause' };
	if (input.requestedAutonomy > PHASE_4_MAX_AUTONOMY) {
		return { allowed: false, blockedBy: 'phase4_autonomy' };
	}
	if (input.requestedAutonomy > input.autonomyCeiling) {
		return { allowed: false, blockedBy: 'autonomy_ceiling' };
	}
	return { allowed: true };
}

export function confidenceCannotAuthorize(_confidence: number) {
	return true;
}

export function containsMarkup(value: string) {
	return MARKUP.test(value) || STYLE_OR_SCRIPT.test(value);
}

export function copyContainsMarkup(variants: Array<{ text: string }>) {
	return variants.some((variant) => containsMarkup(variant.text));
}

export function formatCostUsd(costMicros: number) {
	return `$${(costMicros / 1_000_000).toFixed(6)}`;
}
