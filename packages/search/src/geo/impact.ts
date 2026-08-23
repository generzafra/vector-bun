import type { SearchOutcomeLabel } from '@vector/contracts';

export type SearchOutcomeImpactDraft = {
	headline: string;
	visibilityLabel: SearchOutcomeLabel;
	referralLabel: SearchOutcomeLabel;
	leadLabel: SearchOutcomeLabel;
	outcomeLabel: SearchOutcomeLabel;
	revenueLabel: SearchOutcomeLabel;
	revenueMinor: null;
	revenueKnown: false;
};

export function searchOutcomeImpact(input: {
	visibilityCurrent: boolean;
	mentionedQueries: number;
	referralCount: number;
	leadCount: number;
	qualifiedCount: number;
	wonCount: number;
}): SearchOutcomeImpactDraft {
	const visibilityLabel: SearchOutcomeLabel = input.visibilityCurrent ? 'observed' : 'unknown';
	const referralLabel: SearchOutcomeLabel = input.referralCount > 0 ? 'observed' : 'unknown';
	const leadLabel: SearchOutcomeLabel = input.leadCount > 0 ? 'observed' : 'unknown';
	const outcomeLabel: SearchOutcomeLabel =
		input.qualifiedCount > 0 || input.wonCount > 0 ? 'observed' : 'unknown';
	let headline =
		'No observable search or AI-discovery referrals yet. A mention is not a visit or a lead.';
	if (input.leadCount > 0 && input.qualifiedCount === 0 && input.wonCount === 0) {
		headline = `Vector observed ${input.leadCount} lead${input.leadCount === 1 ? '' : 's'} from observable search or AI-discovery referrals. That is not a qualified lead or revenue.`;
	} else if (input.qualifiedCount > 0 || input.wonCount > 0) {
		headline = `Vector observed ${input.qualifiedCount} qualified lead${input.qualifiedCount === 1 ? '' : 's'} among ${input.leadCount} search or AI-discovery referred lead${input.leadCount === 1 ? '' : 's'}. Revenue is not assigned from a mention.`;
	}
	return {
		headline,
		visibilityLabel,
		referralLabel,
		leadLabel,
		outcomeLabel,
		revenueLabel: 'unknown',
		revenueMinor: null,
		revenueKnown: false
	};
}
