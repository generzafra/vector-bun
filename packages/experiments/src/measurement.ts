import { ValidationError } from '@vector/contracts';

export const BOT_CONTAMINATION_MAX_SHARE_BPS = 2000;
export const SOURCE_IMBALANCE_MAX_SHARE_BPS = 7000;
export const SOURCE_IMBALANCE_MIN_VISITORS = 10;

const BOT_UA_PATTERN =
	/(bot|crawler|crawl|spider|slurp|headless|phantom|selenium|wget|curl\/|python-requests|go-http-client|facebookexternalhit|linkedinbot|twitterbot|slackbot|discordbot|ahrefs|semrush|mj12bot|bytespider|gptbot|claudebot|perplexity|google-extended)/i;

export type ExperimentMeasurementReason =
	'not_launched' | 'horizon_unmet' | 'sample_unmet' | 'bot_contamination' | 'source_imbalance';

export type ExperimentMetricCounts = Record<string, { control: number; challenger: number }>;

export type ExperimentSourceShare = {
	source: string;
	control: number;
	challenger: number;
};

export type ExperimentMeasurement = {
	horizonMet: boolean;
	sampleMet: boolean;
	botContamination: boolean;
	sourceImbalance: boolean;
	earlyStopBlocked: boolean;
	decisionReady: boolean;
	botShareBps: number;
	controlSample: number;
	challengerSample: number;
	controlPrimaryCount: number;
	challengerPrimaryCount: number;
	reasons: ExperimentMeasurementReason[];
	metricCounts: ExperimentMetricCounts;
	sourceShares: ExperimentSourceShare[];
};

export type MeasurementAssignment = {
	visitorAnonymousId: string;
	variantKey: string;
	isTest: boolean;
};

export type MeasurementEvent = {
	visitorAnonymousId: string;
	name: string;
	isTest: boolean;
	userAgent?: string | null;
	utmSource?: string | null;
	experimentId?: string | null;
	experimentVariant?: string | null;
};

export function isLikelyBotUserAgent(userAgent: string | null | undefined) {
	if (!userAgent?.trim()) return false;
	return BOT_UA_PATTERN.test(userAgent);
}

export function shareBps(part: number, total: number) {
	if (total <= 0) return 0;
	return Math.round((part * 10_000) / total);
}

export function sourceImbalanceDetected(shares: ExperimentSourceShare[]) {
	for (const row of shares) {
		const total = row.control + row.challenger;
		if (total < SOURCE_IMBALANCE_MIN_VISITORS) continue;
		const controlBps = shareBps(row.control, total);
		if (
			controlBps > SOURCE_IMBALANCE_MAX_SHARE_BPS ||
			controlBps < 10_000 - SOURCE_IMBALANCE_MAX_SHARE_BPS
		) {
			return true;
		}
	}
	return false;
}

export function horizonElapsed(launchedAt: Date | null, minDurationDays: number, now: Date) {
	if (!launchedAt) return false;
	return now.getTime() >= launchedAt.getTime() + minDurationDays * 24 * 60 * 60 * 1000;
}

export function sampleMet(
	controlSample: number,
	challengerSample: number,
	minSamplePerVariant: number
) {
	return controlSample >= minSamplePerVariant && challengerSample >= minSamplePerVariant;
}

export function predeterminedMetricNames(input: {
	primaryMetric: string;
	guardrailMetrics: string[];
}) {
	return [input.primaryMetric, ...input.guardrailMetrics];
}

export function assertMetricsMatchPredetermined(requested: string[], predetermined: string[]) {
	if (requested.length === 0) return;
	const wanted = new Set(predetermined);
	const got = new Set(requested);
	if (wanted.size !== got.size || [...wanted].some((name) => !got.has(name))) {
		throw new ValidationError('Measurement can only use the predetermined experiment metrics');
	}
}

export function evaluateExperimentReadiness(input: {
	launchedAt: Date | null;
	minDurationDays: number;
	minSamplePerVariant: number;
	now: Date;
	controlSample: number;
	challengerSample: number;
	botShareBps: number;
	sourceImbalance: boolean;
}): Omit<
	ExperimentMeasurement,
	| 'botShareBps'
	| 'controlSample'
	| 'challengerSample'
	| 'controlPrimaryCount'
	| 'challengerPrimaryCount'
	| 'metricCounts'
	| 'sourceShares'
> {
	const horizonMet = horizonElapsed(input.launchedAt, input.minDurationDays, input.now);
	const samplesReady = sampleMet(
		input.controlSample,
		input.challengerSample,
		input.minSamplePerVariant
	);
	const botContamination = input.botShareBps > BOT_CONTAMINATION_MAX_SHARE_BPS;
	const reasons: ExperimentMeasurementReason[] = [];
	if (!input.launchedAt) reasons.push('not_launched');
	if (input.launchedAt && !horizonMet) reasons.push('horizon_unmet');
	if (input.launchedAt && !samplesReady) reasons.push('sample_unmet');
	if (botContamination) reasons.push('bot_contamination');
	if (input.sourceImbalance) reasons.push('source_imbalance');
	const decisionReady =
		Boolean(input.launchedAt) &&
		horizonMet &&
		samplesReady &&
		!botContamination &&
		!input.sourceImbalance;
	return {
		horizonMet,
		sampleMet: samplesReady,
		botContamination,
		sourceImbalance: input.sourceImbalance,
		earlyStopBlocked: !decisionReady,
		decisionReady,
		reasons
	};
}

export function assertNotEarlyStop(measurement: { decisionReady: boolean }) {
	if (!measurement.decisionReady) {
		throw new ValidationError('Experiment is not ready to decide. Early stop is blocked.');
	}
}

export function computeExperimentMeasurement(input: {
	experimentId: string;
	primaryMetric: string;
	metrics: string[];
	launchedAt: Date | null;
	minDurationDays: number;
	minSamplePerVariant: number;
	now: Date;
	assignments: MeasurementAssignment[];
	events: MeasurementEvent[];
}): ExperimentMeasurement {
	const production = input.assignments.filter(
		(row) => !row.isTest && (row.variantKey === 'control' || row.variantKey === 'challenger')
	);
	const eventsByVisitor = new Map<string, MeasurementEvent[]>();
	for (const event of input.events) {
		if (event.experimentId !== input.experimentId) continue;
		const list = eventsByVisitor.get(event.visitorAnonymousId) ?? [];
		list.push(event);
		eventsByVisitor.set(event.visitorAnonymousId, list);
	}

	const eligible: Array<{
		variantKey: 'control' | 'challenger';
		visitorAnonymousId: string;
		source: string;
	}> = [];
	let botAssignments = 0;
	for (const assignment of production) {
		const visitorEvents = eventsByVisitor.get(assignment.visitorAnonymousId) ?? [];
		const bot = visitorEvents.some((event) => isLikelyBotUserAgent(event.userAgent));
		if (bot) {
			botAssignments += 1;
			continue;
		}
		const sourceEvent = visitorEvents.find((event) => event.utmSource?.trim());
		eligible.push({
			variantKey: assignment.variantKey === 'challenger' ? 'challenger' : 'control',
			visitorAnonymousId: assignment.visitorAnonymousId,
			source: sourceEvent?.utmSource?.trim().toLowerCase() || 'direct'
		});
	}

	const controlSample = eligible.filter((row) => row.variantKey === 'control').length;
	const challengerSample = eligible.filter((row) => row.variantKey === 'challenger').length;
	const botShareBps = shareBps(botAssignments, production.length);
	const sourceMap = new Map<string, ExperimentSourceShare>();
	for (const row of eligible) {
		const current = sourceMap.get(row.source) ?? { source: row.source, control: 0, challenger: 0 };
		current[row.variantKey] += 1;
		sourceMap.set(row.source, current);
	}
	const sourceShares = [...sourceMap.values()].sort((a, b) => a.source.localeCompare(b.source));
	const imbalance = sourceImbalanceDetected(sourceShares);

	const eligibleIds = new Set(eligible.map((row) => row.visitorAnonymousId));
	const variantByVisitor = new Map(
		eligible.map((row) => [row.visitorAnonymousId, row.variantKey] as const)
	);
	const metricCounts: ExperimentMetricCounts = {};
	for (const metric of input.metrics) {
		const converted = { control: 0, challenger: 0 };
		const seen = new Set<string>();
		for (const event of input.events) {
			if (event.isTest) continue;
			if (event.experimentId !== input.experimentId) continue;
			if (event.name !== metric) continue;
			if (!eligibleIds.has(event.visitorAnonymousId)) continue;
			if (seen.has(event.visitorAnonymousId)) continue;
			const assigned = variantByVisitor.get(event.visitorAnonymousId);
			if (!assigned) continue;
			if (event.experimentVariant && event.experimentVariant !== assigned) continue;
			if (isLikelyBotUserAgent(event.userAgent)) continue;
			seen.add(event.visitorAnonymousId);
			converted[assigned] += 1;
		}
		metricCounts[metric] = converted;
	}

	const readiness = evaluateExperimentReadiness({
		launchedAt: input.launchedAt,
		minDurationDays: input.minDurationDays,
		minSamplePerVariant: input.minSamplePerVariant,
		now: input.now,
		controlSample,
		challengerSample,
		botShareBps,
		sourceImbalance: imbalance
	});

	return {
		...readiness,
		botShareBps,
		controlSample,
		challengerSample,
		controlPrimaryCount: metricCounts[input.primaryMetric]?.control ?? 0,
		challengerPrimaryCount: metricCounts[input.primaryMetric]?.challenger ?? 0,
		metricCounts,
		sourceShares
	};
}
