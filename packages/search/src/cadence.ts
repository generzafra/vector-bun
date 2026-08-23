import { GEO_QUERY_LIMIT, type SearchWorkKind, type SearchWorkStatus } from '@vector/contracts';
import { GEO_OBSERVATION_STALE_MS } from './geo/observations';

export type { SearchWorkKind, SearchWorkStatus };

export const SEARCH_CADENCE_INTERVAL_MIN_DAYS = 1;
export const SEARCH_CADENCE_INTERVAL_MAX_DAYS = 90;
export const SEARCH_GEO_ENGINE_LIMIT_MAX = 5;
export const SEARCH_GEO_LOCALE_LIMIT_MAX = 8;
export const SEARCH_MONTHLY_BUDGET_MINOR_MAX = 10_000_000;
export const SEARCH_CADENCE_MS_PER_DAY = 86_400_000;

export const DEFAULT_SEARCH_CADENCE = {
	technicalAuditIntervalDays: 7,
	propertySyncIntervalDays: 7,
	aeoRefreshIntervalDays: 7,
	geoSnapshotIntervalDays: 7,
	geoMeasureIntervalDays: 7,
	geoQueryLimit: GEO_QUERY_LIMIT,
	geoEngineLimit: SEARCH_GEO_ENGINE_LIMIT_MAX,
	geoLocaleLimit: 2,
	monthlyBudgetMinor: 0,
	currency: 'USD',
	paused: false
} as const;

export type SearchCadenceSettingsInput = {
	technicalAuditIntervalDays: number;
	propertySyncIntervalDays: number;
	aeoRefreshIntervalDays: number;
	geoSnapshotIntervalDays: number;
	geoMeasureIntervalDays: number;
	geoQueryLimit: number;
	geoEngineLimit: number;
	geoLocaleLimit: number;
	monthlyBudgetMinor: number;
	currency: string;
	paused: boolean;
};

export type SearchDueItem = {
	kind: SearchWorkKind;
	status: SearchWorkStatus;
	title: string;
	detail: string;
	dueAt: Date;
};

export function utcMonthStart(now: Date) {
	return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0, 0));
}

export function remainingBudgetMinor(budgetMinor: number, spentMinor: number) {
	return Math.max(0, budgetMinor - spentMinor);
}

export function intervalDue(lastAt: Date | null | undefined, intervalDays: number, now: Date) {
	if (!lastAt) return true;
	return now.getTime() - lastAt.getTime() >= intervalDays * SEARCH_CADENCE_MS_PER_DAY;
}

export function nextDueAt(lastAt: Date | null | undefined, intervalDays: number, now: Date) {
	if (!lastAt) return now;
	return new Date(lastAt.getTime() + intervalDays * SEARCH_CADENCE_MS_PER_DAY);
}

export function canRecordGeoCost(input: {
	paused: boolean;
	monthlyBudgetMinor: number;
	spentMinor: number;
	costMinor: number;
}): { allowed: true } | { allowed: false; reason: string } {
	if (input.paused) {
		return {
			allowed: false,
			reason: 'Search and AI-discovery measurement is paused for this client.'
		};
	}
	if (input.costMinor === 0) return { allowed: true };
	if (input.spentMinor + input.costMinor > input.monthlyBudgetMinor) {
		return { allowed: false, reason: 'Monthly GEO measurement budget would be exceeded.' };
	}
	return { allowed: true };
}

export function canUseGeoEngine(input: {
	engine: string;
	usedEngines: string[];
	engineLimit: number;
}) {
	if (input.usedEngines.includes(input.engine)) return true;
	return input.usedEngines.length < input.engineLimit;
}

export function geoQueryLimitForSettings(geoQueryLimit: number) {
	return Math.min(GEO_QUERY_LIMIT, Math.max(1, geoQueryLimit));
}

export function publicSearchWorkCopy(kind: SearchWorkKind): { title: string; detail: string } {
	switch (kind) {
		case 'technical_audit':
			return {
				title: 'Technical search audit',
				detail: 'Scheduled technical audit of published pages is due.'
			};
		case 'property_sync':
			return {
				title: 'Official search sync',
				detail: 'Search Console or Bing performance sync is due.'
			};
		case 'aeo_refresh':
			return {
				title: 'Answer readiness',
				detail: 'Answer-target refresh is due. This does not create a new page.'
			};
		case 'geo_snapshot':
			return {
				title: 'AI discovery snapshot',
				detail:
					'Refresh the visibility snapshot from recorded observations. This is not a GEO score.'
			};
		case 'geo_measure':
			return {
				title: 'Manual AI-discovery measurement',
				detail:
					'High-priority AI-discovery queries are due for manual or operator-assisted measurement. Vector will not scrape consumer AI interfaces.'
			};
		case 'stale_measurement':
			return {
				title: 'Stale AI-discovery observations',
				detail: 'Recorded observations are older than 14 days and are not current.'
			};
		case 'budget':
			return {
				title: 'GEO measurement budget',
				detail:
					'Monthly GEO measurement budget is exhausted. Paid measurement waits until next month.'
			};
	}
}

function item(
	kind: SearchWorkKind,
	status: SearchWorkStatus,
	dueAt: Date,
	detailOverride?: string
): SearchDueItem {
	const copy = publicSearchWorkCopy(kind);
	return {
		kind,
		status,
		title: copy.title,
		detail: detailOverride ?? copy.detail,
		dueAt
	};
}

export function buildSearchDueItems(input: {
	now: Date;
	settings: SearchCadenceSettingsInput;
	lastTechnicalAuditAt: Date | null;
	lastPropertySyncAt: Date | null;
	hasProperty: boolean;
	lastAeoRefreshAt: Date | null;
	lastGeoSnapshotAt: Date | null;
	geoQueryCount: number;
	lastGeoObservationAt: Date | null;
	spentMinor: number;
}): SearchDueItem[] {
	const pausedDetail = 'Scheduled search work is paused for this client.';
	const remaining = remainingBudgetMinor(input.settings.monthlyBudgetMinor, input.spentMinor);

	const scheduled = (
		kind: SearchWorkKind,
		due: boolean,
		dueAt: Date,
		clearWhen?: boolean
	): SearchDueItem => {
		if (clearWhen)
			return item(kind, 'clear', dueAt, 'Not scheduled until the required source exists.');
		if (input.settings.paused && due) return item(kind, 'blocked', dueAt, pausedDetail);
		if (due) return item(kind, 'due', dueAt);
		return item(kind, 'clear', dueAt, 'On cadence. No due work.');
	};

	const items: SearchDueItem[] = [
		scheduled(
			'technical_audit',
			intervalDue(input.lastTechnicalAuditAt, input.settings.technicalAuditIntervalDays, input.now),
			nextDueAt(input.lastTechnicalAuditAt, input.settings.technicalAuditIntervalDays, input.now)
		),
		scheduled(
			'property_sync',
			intervalDue(input.lastPropertySyncAt, input.settings.propertySyncIntervalDays, input.now),
			nextDueAt(input.lastPropertySyncAt, input.settings.propertySyncIntervalDays, input.now),
			!input.hasProperty
		),
		scheduled(
			'aeo_refresh',
			intervalDue(input.lastAeoRefreshAt, input.settings.aeoRefreshIntervalDays, input.now),
			nextDueAt(input.lastAeoRefreshAt, input.settings.aeoRefreshIntervalDays, input.now)
		),
		scheduled(
			'geo_snapshot',
			intervalDue(input.lastGeoSnapshotAt, input.settings.geoSnapshotIntervalDays, input.now),
			nextDueAt(input.lastGeoSnapshotAt, input.settings.geoSnapshotIntervalDays, input.now),
			input.geoQueryCount === 0
		),
		scheduled(
			'geo_measure',
			intervalDue(input.lastGeoObservationAt, input.settings.geoMeasureIntervalDays, input.now),
			nextDueAt(input.lastGeoObservationAt, input.settings.geoMeasureIntervalDays, input.now),
			input.geoQueryCount === 0
		)
	];

	const stale =
		Boolean(input.lastGeoObservationAt) &&
		input.now.getTime() - (input.lastGeoObservationAt?.getTime() ?? 0) > GEO_OBSERVATION_STALE_MS;
	items.push(
		stale
			? item('stale_measurement', 'due', input.lastGeoObservationAt ?? input.now)
			: item(
					'stale_measurement',
					'clear',
					input.lastGeoObservationAt ?? input.now,
					'No stale recorded observations.'
				)
	);

	items.push(
		input.settings.monthlyBudgetMinor > 0 && remaining === 0
			? item('budget', 'blocked', input.now)
			: item(
					'budget',
					'clear',
					input.now,
					input.settings.monthlyBudgetMinor === 0
						? 'Paid GEO measurement is capped at zero. Manual $0 recordings stay allowed unless paused.'
						: `${remaining} minor units remain this month.`
				)
	);

	return items;
}
