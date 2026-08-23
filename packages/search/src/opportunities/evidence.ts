import type {
	SeoEffort,
	SeoEvidenceClass,
	SeoOpportunityChannel,
	SeoSourceKind
} from '@vector/contracts';

const EVIDENCE_WEIGHT: Record<SeoEvidenceClass, number> = {
	observed: 20,
	measured: 24,
	provider_reported: 22,
	client_verified: 22,
	source_verified: 20,
	inferred: 10,
	estimated: 8,
	hypothesis: 6,
	unknown: 4
};

const CHANNEL_WEIGHT: Record<SeoOpportunityChannel, number> = {
	seo: 12,
	aeo: 10,
	geo: 8
};

const EFFORT_DIVISOR: Record<SeoEffort, number> = {
	low: 1,
	medium: 1.5,
	high: 2.5
};

export function canMarkPublishReady(sourceKind: SeoSourceKind) {
	return sourceKind === 'knowledge_claim' || sourceKind === 'official_query';
}

export function scoreOpportunity(input: {
	channel: SeoOpportunityChannel;
	evidenceClass: SeoEvidenceClass;
	effort: SeoEffort;
}) {
	const raw =
		(EVIDENCE_WEIGHT[input.evidenceClass] + CHANNEL_WEIGHT[input.channel]) /
		EFFORT_DIVISOR[input.effort];
	return Math.max(1, Math.min(100, Math.round(raw)));
}
