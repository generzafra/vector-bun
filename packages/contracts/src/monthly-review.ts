import type { AttributionEvidenceClass } from './attribution';

export function monthlyGrowthNarrative(input: {
	label: string;
	qualifiedLeads: number;
	salesCount: number | null;
	revenueDetail: string;
	handledCount: number;
	attributionEvidence: AttributionEvidenceClass;
	dataHealthEvidence: AttributionEvidenceClass;
}): string {
	const sales =
		input.salesCount === null
			? 'Sales are unknown because a won lead has no recorded sale.'
			: `Sales: ${input.salesCount} observed.`;
	const actions = input.handledCount === 1 ? 'action' : 'actions';
	const health =
		input.dataHealthEvidence === 'observed'
			? 'Data health was checked.'
			: 'Data health is incomplete, so this review does not rank a channel or a campaign.';
	return [
		input.label,
		`Qualified leads: ${input.qualifiedLeads} observed.`,
		sales,
		`Revenue: ${input.revenueDetail}`,
		`What Vector handled: ${input.handledCount} observed ${actions}. These are nurture sends and published posts.`,
		`Source coverage is ${input.attributionEvidence}.`,
		health
	].join('\n');
}
