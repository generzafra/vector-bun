export type CreativeLearningStatus = 'insufficient' | 'hypothesis';
export type CreativeLearningEvidence = 'observed' | 'unknown';

export type VariantEventCounts = {
	control: number;
	challenger: number;
};

export type CreativeLearningInput = {
	primaryMetric: string;
	sampleMet: boolean;
	horizonMet: boolean;
	botContamination: boolean;
	sourceImbalance: boolean;
	controlPrimaryCount: number;
	challengerPrimaryCount: number;
	qualifiedLeads: VariantEventCounts | null;
	sales: VariantEventCounts | null;
	noveltyScore?: number;
};

export type CreativeLearningHypothesis = {
	status: CreativeLearningStatus;
	evidence: CreativeLearningEvidence;
	statement: string;
	autoApply: false;
};

const PRIMARY_METRIC_LABELS: Record<string, string> = {
	cta_clicked: 'call to action clicks',
	form_started: 'forms started',
	form_submitted: 'forms submitted',
	lead_created: 'leads created'
};

const INSUFFICIENT =
	'Not enough clean observations to change the design. Qualified leads and sales stay uncompared until the sample is clean.';

function wholeCount(value: number) {
	return Number.isInteger(value) && value >= 0 && value <= 1_000_000_000;
}

function sampleIsClean(input: CreativeLearningInput) {
	return (
		input.sampleMet === true &&
		input.horizonMet === true &&
		input.botContamination === false &&
		input.sourceImbalance === false &&
		wholeCount(input.controlPrimaryCount) &&
		wholeCount(input.challengerPrimaryCount)
	);
}

function citedCounts(label: string, counts: VariantEventCounts | null) {
	if (!counts || !wholeCount(counts.control) || !wholeCount(counts.challenger)) {
		const titled = label.charAt(0).toUpperCase() + label.slice(1);
		return `${titled} are not attributed to these variants.`;
	}
	return `Observed ${label}: challenger ${counts.challenger}, control ${counts.control}.`;
}

export function creativeLearningHypothesis(
	input: CreativeLearningInput
): CreativeLearningHypothesis {
	if (!sampleIsClean(input)) {
		return {
			status: 'insufficient',
			evidence: 'unknown',
			statement: INSUFFICIENT,
			autoApply: false
		};
	}
	const metric = PRIMARY_METRIC_LABELS[input.primaryMetric] ?? 'recorded events';
	const qualified = citedCounts('qualified leads', input.qualifiedLeads);
	const sales = citedCounts('sales', input.sales);
	return {
		status: 'hypothesis',
		evidence: 'observed',
		statement: `Observed ${metric}: challenger ${input.challengerPrimaryCount}, control ${input.controlPrimaryCount}. ${qualified} ${sales} A person still decides whether to change the page.`,
		autoApply: false
	};
}
