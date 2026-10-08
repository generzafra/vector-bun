import type { AttributionEvidenceClass } from './attribution';
import { capRecommendationConfidence } from './attribution';

export type DataHealthCheckStatus = 'healthy' | 'warning' | 'broken' | 'unknown';

export function recommendationIsImportant(input: {
	riskClass: string;
	recommendedAutonomy: number;
}): boolean {
	return (
		input.riskClass === 'financial' || input.riskClass === 'legal' || input.recommendedAutonomy >= 3
	);
}

export function dataHealthEvidenceClass(
	checks: Array<{ status: string }>
): AttributionEvidenceClass {
	if (checks.length === 0) return 'unknown';
	if (checks.some((check) => check.status === 'broken' || check.status === 'unknown')) {
		return 'unknown';
	}
	if (checks.some((check) => check.status === 'warning')) return 'estimated';
	if (checks.every((check) => check.status === 'healthy')) return 'observed';
	return 'unknown';
}

export function recommendationDataHealthGate(
	checks: Array<{ status: string }>,
	recommendation: { riskClass: string; recommendedAutonomy: number }
): {
	allowed: boolean;
	evidenceClass: AttributionEvidenceClass;
	detail: string;
} {
	const evidenceClass = dataHealthEvidenceClass(checks);
	const important = recommendationIsImportant(recommendation);
	if (important && evidenceClass !== 'observed') {
		return {
			allowed: false,
			evidenceClass,
			detail: 'Data health is incomplete, so this recommendation cannot be approved.'
		};
	}
	if (evidenceClass === 'observed') {
		return {
			allowed: true,
			evidenceClass,
			detail: 'Data health was checked. Tracking looks healthy.'
		};
	}
	return {
		allowed: true,
		evidenceClass,
		detail: 'Data health was checked. This draft stays a recommendation.'
	};
}

export function recommendationConfidenceAfterDataHealth(
	modelConfidence: number,
	gate: { allowed: boolean; evidenceClass: AttributionEvidenceClass }
): number {
	if (gate.allowed) return modelConfidence;
	return capRecommendationConfidence(modelConfidence, gate.evidenceClass);
}
