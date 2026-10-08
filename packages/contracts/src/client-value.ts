import { z } from 'zod';
import { formatMinorUnits } from './sales-outcomes';

export const VALUE_ACTIVITY_TYPES = [
	'website',
	'content',
	'social',
	'email',
	'lead_operations',
	'reporting',
	'other'
] as const;
export type ValueActivityType = (typeof VALUE_ACTIVITY_TYPES)[number];

export const saveClientValueProfileSchema = z
	.object({
		packageName: z.string().trim().min(1).max(80),
		feeMinor: z.number().int().positive().max(1_000_000_000_000_000),
		currency: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/)
	})
	.strict();

export const recordClientValueBaselineSchema = z
	.object({
		amountMinor: z.number().int().positive().max(1_000_000_000_000_000),
		currency: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/)
	})
	.strict();

const LINKABLE_ATTRIBUTION = new Set(['observed', 'measured']);

function ratioLabel(revenueMinor: number, feeMinor: number) {
	const tenths =
		revenueMinor > Math.floor(Number.MAX_SAFE_INTEGER / 10)
			? Math.floor(revenueMinor / feeMinor) * 10
			: Math.floor((revenueMinor * 10) / feeMinor);
	const whole = Math.trunc(tenths / 10);
	const frac = Math.abs(tenths % 10);
	return `${whole}.${frac}×`;
}

export function revenueLinkedStatement(input: {
	feeMinor: number | null;
	feeCurrency: string | null;
	revenueMinor: number | null;
	revenueCurrency: string | null;
	revenueEvidence: 'observed' | 'unknown';
	revenueCount: number | null;
	attributionEvidence: string;
}): { status: 'linked' | 'unknown'; ratioLabel: string | null; detail: string } {
	if (
		input.revenueEvidence !== 'observed' ||
		input.revenueMinor == null ||
		input.revenueMinor <= 0 ||
		!input.revenueCurrency
	) {
		if ((input.revenueCount ?? 0) > 0) {
			return {
				status: 'unknown',
				ratioLabel: null,
				detail: 'Revenue is in more than one currency, so there is no revenue-to-fee figure.'
			};
		}
		return {
			status: 'unknown',
			ratioLabel: null,
			detail: 'Revenue is not recorded for this month, so there is no revenue-to-fee figure.'
		};
	}
	const recorded = formatMinorUnits(input.revenueMinor, input.revenueCurrency);
	if (!LINKABLE_ATTRIBUTION.has(input.attributionEvidence)) {
		return {
			status: 'unknown',
			ratioLabel: null,
			detail: `Recorded revenue is ${recorded}. Attribution coverage is not strong enough for a revenue-to-fee figure.`
		};
	}
	if (input.feeMinor == null || input.feeMinor <= 0 || !input.feeCurrency) {
		return {
			status: 'unknown',
			ratioLabel: null,
			detail: `Recorded revenue is ${recorded}. The package fee is not recorded, so there is no revenue-to-fee figure.`
		};
	}
	if (input.feeCurrency !== input.revenueCurrency) {
		return {
			status: 'unknown',
			ratioLabel: null,
			detail: `Recorded revenue is ${input.revenueCurrency} and the package fee is ${input.feeCurrency}, so there is no revenue-to-fee figure.`
		};
	}
	const ratio = ratioLabel(input.revenueMinor, input.feeMinor);
	return {
		status: 'linked',
		ratioLabel: ratio,
		detail: `Observed revenue this month is ${recorded}. Revenue-to-fee ratio is ${ratio}. This compares recorded revenue with the package fee. It is not profit.`
	};
}

const INCREMENTAL_METRICS: Record<string, string> = {
	cta_clicked: 'call to action clicks',
	form_started: 'forms started',
	form_submitted: 'forms submitted',
	lead_created: 'leads created'
};

function wholeCount(value: number) {
	return Number.isInteger(value) && value >= 0 && value <= 1_000_000_000;
}

export function incrementalValueStatement(input: {
	dataHealth: string;
	result: {
		sampleMet: boolean;
		horizonMet: boolean;
		botContamination: boolean;
		sourceImbalance: boolean;
		controlPrimaryCount: number;
		challengerPrimaryCount: number;
		primaryMetric: string;
	} | null;
}): { status: 'observed' | 'unknown'; difference: number | null; detail: string } {
	if (input.dataHealth !== 'observed') {
		return {
			status: 'unknown',
			difference: null,
			detail: 'Data health is not clear, so incremental value stays unknown.'
		};
	}
	const result = input.result;
	const clean =
		result != null &&
		result.sampleMet === true &&
		result.horizonMet === true &&
		result.botContamination === false &&
		result.sourceImbalance === false &&
		wholeCount(result.controlPrimaryCount) &&
		wholeCount(result.challengerPrimaryCount);
	if (!result || !clean) {
		return {
			status: 'unknown',
			difference: null,
			detail: result
				? 'Not enough clean experiment evidence to estimate incremental value.'
				: 'No experiment result is recorded, so incremental value stays unknown.'
		};
	}
	const difference = result.challengerPrimaryCount - result.controlPrimaryCount;
	const metric = INCREMENTAL_METRICS[result.primaryMetric] ?? 'recorded events';
	const kept = 'This count is not revenue and is not added to recorded revenue.';
	if (difference === 0) {
		return {
			status: 'observed',
			difference: 0,
			detail: `Observed difference on ${metric} is 0. No incremental count is claimed. ${kept}`
		};
	}
	if (difference > 0) {
		return {
			status: 'observed',
			difference,
			detail: `Observed difference on ${metric}: ${difference} more on the challenger than the control. ${kept}`
		};
	}
	return {
		status: 'observed',
		difference,
		detail: `Observed difference on ${metric}: the control is ahead by ${Math.abs(difference)}. ${kept}`
	};
}

export function clientBaselineStatement(version: number) {
	return {
		evidence: 'client_confirmed' as const,
		label: 'estimated' as const,
		detail: `Version ${version} is the client's stated previous monthly spend. Estimated. Not a measured result.`
	};
}

export const recordValueActivitySchema = z
	.object({
		activityType: z.enum(VALUE_ACTIVITY_TYPES),
		description: z.string().trim().min(1).max(200),
		quantity: z.number().int().positive().max(10_000).default(1),
		automated: z.boolean().default(false)
	})
	.strict();

export const clientValueClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export function utcMonthWindow(now = new Date()) {
	const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
	const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
	return { start, end };
}
