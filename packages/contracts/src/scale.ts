import type { LaunchClass, LaunchState } from './launch';

export const USAGE_RESOURCE_FAMILIES = [
	'api',
	'workflow',
	'ai',
	'email',
	'upload',
	'analytics'
] as const;
export type UsageResourceFamily = (typeof USAGE_RESOURCE_FAMILIES)[number];

export const USAGE_WINDOWS = ['minute', 'hour', 'day', 'month'] as const;
export type UsageWindow = (typeof USAGE_WINDOWS)[number];

export const USAGE_LIMIT_MODES = ['evaluate_only', 'enforce'] as const;
export type UsageLimitMode = (typeof USAGE_LIMIT_MODES)[number];

export const USAGE_EVENT_OUTCOMES = ['recorded', 'would_deny'] as const;
export type UsageEventOutcome = (typeof USAGE_EVENT_OUTCOMES)[number];

export const DEFAULT_USAGE_WARNING_PERCENT = 80;
export const VECTOR_24_TARGET_SECONDS = 24 * 60 * 60;
export const VECTOR_12H_TARGET_SECONDS = 12 * 60 * 60;

export const LAUNCH_CLASS_TARGET_SECONDS: Record<LaunchClass, number | null> = {
	A: 4 * 60 * 60,
	B: 12 * 60 * 60,
	C: 24 * 60 * 60,
	D: null
};

export type DefaultUsageLimit = {
	resourceFamily: UsageResourceFamily;
	window: UsageWindow;
	hardLimit: number;
	warningPercent: number;
};

export const S1_ENFORCE_USAGE_FAMILIES = ['api', 'ai', 'email', 'upload', 'analytics'] as const;
export type S1EnforceUsageFamily = (typeof S1_ENFORCE_USAGE_FAMILIES)[number];

export const DEFAULT_USAGE_LIMIT_MODE: UsageLimitMode = 'enforce';

export const DEFAULT_USAGE_LIMITS: DefaultUsageLimit[] = [
	{ resourceFamily: 'api', window: 'minute', hardLimit: 600, warningPercent: 80 },
	{ resourceFamily: 'workflow', window: 'minute', hardLimit: 30, warningPercent: 80 },
	{ resourceFamily: 'ai', window: 'minute', hardLimit: 120, warningPercent: 80 },
	{ resourceFamily: 'email', window: 'hour', hardLimit: 200, warningPercent: 80 },
	{ resourceFamily: 'upload', window: 'hour', hardLimit: 80, warningPercent: 80 },
	{ resourceFamily: 'analytics', window: 'minute', hardLimit: 2000, warningPercent: 80 }
];

export function usageWindowStart(window: UsageWindow, at: Date) {
	const year = at.getUTCFullYear();
	const month = at.getUTCMonth();
	const day = at.getUTCDate();
	const hour = at.getUTCHours();
	const minute = at.getUTCMinutes();
	if (window === 'minute') return new Date(Date.UTC(year, month, day, hour, minute));
	if (window === 'hour') return new Date(Date.UTC(year, month, day, hour));
	if (window === 'day') return new Date(Date.UTC(year, month, day));
	return new Date(Date.UTC(year, month, 1));
}

export type UsageQuotaInput = {
	used: number;
	hardLimit: number;
	warningPercent: number;
	quantity: number;
	mode: UsageLimitMode;
};

export type UsageQuotaResult = {
	used: number;
	quantity: number;
	hardLimit: number;
	remaining: number;
	remainingAfter: number;
	warning: boolean;
	wouldDeny: boolean;
	allowed: boolean;
};

export function evaluateUsageQuota(input: UsageQuotaInput): UsageQuotaResult {
	const used = Math.max(0, input.used);
	const quantity = Math.max(0, input.quantity);
	const hardLimit = Math.max(0, input.hardLimit);
	const projected = used + quantity;
	const warningFloor = Math.ceil((hardLimit * input.warningPercent) / 100);
	const wouldDeny = projected > hardLimit;
	return {
		used,
		quantity,
		hardLimit,
		remaining: Math.max(0, hardLimit - used),
		remainingAfter: Math.max(0, hardLimit - projected),
		warning: projected >= warningFloor && warningFloor > 0,
		wouldDeny,
		allowed: input.mode === 'evaluate_only' || !wouldDeny
	};
}

export type Vector24ClockInput = {
	launchClass: LaunchClass;
	status: LaunchState;
	vectorReadyAt: Date | string | null;
	liveAt: Date | string | null;
	pausedAt: Date | string | null;
	pausedSeconds: number;
	now?: Date;
};

export type Vector24Clock = {
	started: boolean;
	promised: boolean;
	elapsedSeconds: number | null;
	classTargetSeconds: number | null;
	vector24TargetSeconds: number | null;
	overClass: boolean;
	over24h: boolean;
	warningClass: boolean;
};

function asDate(value: Date | string | null) {
	if (!value) return null;
	return value instanceof Date ? value : new Date(value);
}

export function evaluateVector24Clock(input: Vector24ClockInput): Vector24Clock {
	const now = input.now ?? new Date();
	const readyAt = asDate(input.vectorReadyAt);
	const liveAt = asDate(input.liveAt);
	const pausedAt = asDate(input.pausedAt);
	const classTargetSeconds = LAUNCH_CLASS_TARGET_SECONDS[input.launchClass];
	const promised = input.launchClass !== 'D';
	if (!readyAt) {
		return {
			started: false,
			promised,
			elapsedSeconds: null,
			classTargetSeconds,
			vector24TargetSeconds: promised ? VECTOR_24_TARGET_SECONDS : null,
			overClass: false,
			over24h: false,
			warningClass: false
		};
	}
	const end = liveAt ?? now;
	let excludedPause = Math.max(0, input.pausedSeconds);
	if (!liveAt && input.status === 'paused' && pausedAt) {
		excludedPause += Math.max(0, Math.floor((now.getTime() - pausedAt.getTime()) / 1000));
	}
	const elapsedSeconds = Math.max(
		0,
		Math.floor((end.getTime() - readyAt.getTime()) / 1000) - excludedPause
	);
	const overClass = classTargetSeconds !== null && elapsedSeconds > classTargetSeconds;
	const warningClass =
		classTargetSeconds !== null &&
		!overClass &&
		elapsedSeconds >= Math.ceil(classTargetSeconds * 0.75);
	return {
		started: true,
		promised,
		elapsedSeconds,
		classTargetSeconds,
		vector24TargetSeconds: promised ? VECTOR_24_TARGET_SECONDS : null,
		overClass,
		over24h: promised && elapsedSeconds > VECTOR_24_TARGET_SECONDS,
		warningClass
	};
}

export type Vector24Sample = {
	launchClass: LaunchClass;
	status: LaunchState;
	liveAt: Date | string | null;
	elapsedSeconds: number | null;
	promised: boolean;
};

export type Vector24Kpi = {
	livePromised: number;
	under12h: number;
	under24h: number;
	percentUnder12h: number | null;
	percentUnder24h: number | null;
	medianReadyToLiveSeconds: number | null;
};

export function summarizeVector24Kpis(samples: Vector24Sample[]): Vector24Kpi {
	const live = samples.filter(
		(row) => row.status === 'live' && row.promised && row.liveAt && row.elapsedSeconds !== null
	);
	const sorted = live.map((row) => row.elapsedSeconds as number).sort((a, b) => a - b);
	const mid = Math.floor(sorted.length / 2);
	const median =
		sorted.length === 0
			? null
			: sorted.length % 2 === 0
				? Math.round((sorted[mid - 1]! + sorted[mid]!) / 2)
				: sorted[mid]!;
	const under12h = live.filter(
		(row) => (row.elapsedSeconds ?? 0) <= VECTOR_12H_TARGET_SECONDS
	).length;
	const under24h = live.filter(
		(row) => (row.elapsedSeconds ?? 0) <= VECTOR_24_TARGET_SECONDS
	).length;
	return {
		livePromised: live.length,
		under12h,
		under24h,
		percentUnder12h: live.length === 0 ? null : Math.round((under12h / live.length) * 100),
		percentUnder24h: live.length === 0 ? null : Math.round((under24h / live.length) * 100),
		medianReadyToLiveSeconds: median
	};
}

export const PORTFOLIO_EXCEPTION_REASONS = [
	'launch_failed',
	'blocked',
	'paused',
	'open_block',
	'sla_over',
	'sla_warning',
	'usage_would_deny',
	'usage_warning'
] as const;
export type PortfolioExceptionReason = (typeof PORTFOLIO_EXCEPTION_REASONS)[number];

export function nextLaunchAction(status: LaunchState, reasons: readonly string[]): string | null {
	if (reasons.includes('usage_would_deny')) return 'Review tenant usage or raise the limit';
	if (reasons.includes('usage_warning')) return 'Review tenant usage';
	if (status === 'launch_failed') return 'Review launch failure';
	if (status === 'blocked' || reasons.includes('open_block')) return 'Resolve readiness blocker';
	if (status === 'paused') return 'Resume or document the pause';
	if (reasons.includes('sla_over')) return 'Finish remaining launch steps';
	if (reasons.includes('sla_warning')) return 'Finish remaining launch steps';
	return null;
}
