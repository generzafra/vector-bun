export const ATTRIBUTION_EVIDENCE_CLASSES = [
	'observed',
	'measured',
	'inferred',
	'estimated',
	'unknown'
] as const;

export type AttributionEvidenceClass = (typeof ATTRIBUTION_EVIDENCE_CLASSES)[number];

const EVIDENCE = new Set<string>(ATTRIBUTION_EVIDENCE_CLASSES);

/** Caps applied to a recommendation confidence score. Measured is the only class that does not lower it. */
const RECOMMENDATION_CONFIDENCE_CAP: Record<AttributionEvidenceClass, number> = {
	measured: 100,
	observed: 60,
	inferred: 40,
	estimated: 20,
	unknown: 0
};

export function storedAttributionEvidence(
	value: string | null | undefined
): AttributionEvidenceClass {
	if (value && EVIDENCE.has(value)) return value as AttributionEvidenceClass;
	return 'unknown';
}

/**
 * Labels the last non-direct touch already stored on a lead.
 * A campaign id is measured. A non-direct touch without one is observed.
 * Direct is inferred. A missing channel is unknown. Estimated is never assigned here.
 */
export function attributionEvidenceClass(input: {
	lastNonDirectChannel?: string | null;
	lastNonDirectCampaign?: string | null;
}): AttributionEvidenceClass {
	const campaign = input.lastNonDirectCampaign?.trim() ?? '';
	const channel = input.lastNonDirectChannel?.trim() ?? '';
	if (!channel) return 'unknown';
	if (campaign) return 'measured';
	if (channel !== 'direct') return 'observed';
	return 'inferred';
}

export function attributionCoverage(input: {
	leadCount: number;
	classes: Array<string | null | undefined>;
}): {
	evidenceClass: AttributionEvidenceClass;
	highImpactAutoExecute: boolean;
	detail: string;
} {
	const classes = input.classes.map((value) => storedAttributionEvidence(value));
	const incomplete = {
		highImpactAutoExecute: false,
		detail: 'Attribution coverage is incomplete, so high-impact auto-execute stays off.'
	};
	if (input.leadCount <= 0 || classes.length !== input.leadCount) {
		return { evidenceClass: 'unknown', ...incomplete };
	}
	if (classes.every((value) => value === 'measured')) {
		return {
			evidenceClass: 'measured',
			highImpactAutoExecute: true,
			detail: 'Every lead has a measured campaign. High-impact auto-execute can use this coverage.'
		};
	}
	const rank: Record<AttributionEvidenceClass, number> = {
		unknown: 0,
		estimated: 1,
		inferred: 2,
		observed: 3,
		measured: 4
	};
	const weakest = classes.reduce((left, right) => (rank[left] <= rank[right] ? left : right));
	return { evidenceClass: weakest, ...incomplete };
}

export function capRecommendationConfidence(
	confidence: number,
	evidence: AttributionEvidenceClass
): number {
	if (!Number.isFinite(confidence)) return 0;
	return Math.min(RECOMMENDATION_CONFIDENCE_CAP[evidence], Math.max(0, Math.trunc(confidence)));
}

export function highImpactAutoExecuteGate(coverage: {
	evidenceClass: AttributionEvidenceClass;
	highImpactAutoExecute: boolean;
}): { allowed: true } | { allowed: false; blockedBy: 'attribution_coverage' } {
	if (coverage.highImpactAutoExecute && coverage.evidenceClass === 'measured') {
		return { allowed: true };
	}
	return { allowed: false, blockedBy: 'attribution_coverage' };
}
