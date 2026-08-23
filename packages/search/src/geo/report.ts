import type { GeoAccuracy, GeoReportStatus, GeoRepresentationStatus } from '@vector/contracts';
import { GEO_OBSERVATION_STALE_MS, mentionIsNotCitation } from './observations';

export const GEO_SNAPSHOT_MIN_OBSERVATIONS = 2;
const CLAIM_MATCH_MIN = 12;

export type GeoReportObservation = {
	id: string;
	queryId: string;
	mentioned: boolean;
	ownedCitation: boolean;
	earnedCitation: boolean;
	represented: boolean;
	accurate: GeoAccuracy;
	observedAt: Date;
	detail?: string | null;
};

export type GeoReportClaim = {
	id: string;
	kind: string;
	statement: string;
};

export type GeoFactRepresentationDraft = {
	observationId: string;
	claimId: string | null;
	status: GeoRepresentationStatus;
	evidenceClass: 'observed' | 'source_verified';
	detail: string | null;
};

export type GeoVisibilitySnapshotDraft = {
	windowStart: Date;
	windowEnd: Date;
	queryCount: number;
	observationCount: number;
	mentionedQueryCount: number;
	ownedCitationQueryCount: number;
	earnedCitationQueryCount: number;
	representedQueryCount: number;
	accurateYesCount: number;
	accurateNoCount: number;
	mentionOnlyCount: number;
	sufficient: boolean;
	headline: string;
	status: GeoReportStatus;
	representations: GeoFactRepresentationDraft[];
};

export function matchApprovedClaim(detail: string | null | undefined, claims: GeoReportClaim[]) {
	const text = detail?.trim().toLowerCase() ?? '';
	if (text.length < CLAIM_MATCH_MIN) return null;
	const approved = claims.filter(
		(claim) => claim.kind === 'approved' && claim.statement.trim().length >= CLAIM_MATCH_MIN
	);
	const matches = approved.filter((claim) => {
		const statement = claim.statement.trim().toLowerCase();
		return text.includes(statement) || statement.includes(text);
	});
	matches.sort((a, b) => b.statement.length - a.statement.length);
	return matches[0] ?? null;
}

export function geoObservationInWindow(
	observedAt: Date,
	now: Date,
	maxAgeMs = GEO_OBSERVATION_STALE_MS
) {
	return now.getTime() - observedAt.getTime() <= maxAgeMs;
}

export function publicGeoReportFreshness(computedAt: Date, now = new Date()) {
	const stale = now.getTime() - computedAt.getTime() > GEO_OBSERVATION_STALE_MS;
	return {
		stale,
		current: !stale,
		label: stale ? 'stale visibility snapshot' : 'recorded visibility snapshot',
		detail: stale
			? 'This visibility snapshot is older than 14 days and is not current.'
			: 'This snapshot summarizes recorded observations. It is not a ranking.'
	};
}

export function geoVisibilityHeadline(input: {
	monitoredQueries: number;
	mentionedQueries: number;
	observationCount: number;
	mentionOnlyCount: number;
	accurateNoCount: number;
	sufficient: boolean;
	stale: boolean;
}) {
	if (input.monitoredQueries === 0) {
		return {
			status: 'empty' as const,
			current: false,
			headline: 'No commercial AI-discovery queries are monitored yet.'
		};
	}
	if (input.observationCount === 0) {
		return {
			status: 'empty' as const,
			current: false,
			headline: 'No recorded observations yet. This snapshot is not a ranking, visit, or lead.'
		};
	}
	if (!input.sufficient) {
		return {
			status: 'insufficient' as const,
			current: false,
			headline: `Vector recorded ${input.observationCount} observation${input.observationCount === 1 ? '' : 's'} across ${input.monitoredQueries} monitored AI discovery queries. One observation is not a visibility pattern. A mention is not a visit or a lead.`
		};
	}
	const base = `Vector observed your company in ${input.mentionedQueries} of ${input.monitoredQueries} monitored AI discovery queries in this snapshot. A mention is not a visit or a lead.`;
	const mentionNote =
		input.mentionOnlyCount > 0 && input.mentionOnlyCount === input.observationCount
			? ' Those records were mentions, not citations.'
			: '';
	const accuracyNote =
		input.accurateNoCount > 0
			? ` ${input.accurateNoCount} recorded representation${input.accurateNoCount === 1 ? '' : 's'} did not match approved facts.`
			: '';
	if (input.stale) {
		return {
			status: 'stale' as const,
			current: false,
			headline: `This visibility snapshot is older than 14 days and is not current. ${base}${mentionNote}${accuracyNote}`
		};
	}
	return {
		status: 'recorded' as const,
		current: true,
		headline: `${base}${mentionNote}${accuracyNote}`
	};
}

export function buildGeoVisibilitySnapshot(input: {
	queries: { id: string }[];
	observations: GeoReportObservation[];
	claims: GeoReportClaim[];
	now?: Date;
}): GeoVisibilitySnapshotDraft {
	const now = input.now ?? new Date();
	const windowStart = new Date(now.getTime() - GEO_OBSERVATION_STALE_MS);
	const inWindow = input.observations.filter((row) => geoObservationInWindow(row.observedAt, now));
	const mentionedQueryIds = new Set(
		inWindow.filter((row) => row.mentioned).map((row) => row.queryId)
	);
	const ownedQueryIds = new Set(
		inWindow.filter((row) => row.ownedCitation).map((row) => row.queryId)
	);
	const earnedQueryIds = new Set(
		inWindow.filter((row) => row.earnedCitation).map((row) => row.queryId)
	);
	const representedQueryIds = new Set(
		inWindow.filter((row) => row.represented).map((row) => row.queryId)
	);
	const mentionOnlyCount = inWindow.filter((row) => mentionIsNotCitation(row)).length;
	const accurateYesCount = inWindow.filter((row) => row.accurate === 'yes').length;
	const accurateNoCount = inWindow.filter((row) => row.accurate === 'no').length;
	const sufficient = inWindow.length >= GEO_SNAPSHOT_MIN_OBSERVATIONS;
	const headline = geoVisibilityHeadline({
		monitoredQueries: input.queries.length,
		mentionedQueries: mentionedQueryIds.size,
		observationCount: inWindow.length,
		mentionOnlyCount,
		accurateNoCount,
		sufficient,
		stale: false
	});
	const representations: GeoFactRepresentationDraft[] = [];
	for (const observation of inWindow) {
		const draft = representationFromObservation(observation, input.claims);
		if (draft) representations.push(draft);
	}
	return {
		windowStart,
		windowEnd: now,
		queryCount: input.queries.length,
		observationCount: inWindow.length,
		mentionedQueryCount: mentionedQueryIds.size,
		ownedCitationQueryCount: ownedQueryIds.size,
		earnedCitationQueryCount: earnedQueryIds.size,
		representedQueryCount: representedQueryIds.size,
		accurateYesCount,
		accurateNoCount,
		mentionOnlyCount,
		sufficient,
		headline: headline.headline,
		status: headline.status,
		representations
	};
}

function representationFromObservation(
	observation: GeoReportObservation,
	claims: GeoReportClaim[]
): GeoFactRepresentationDraft | null {
	if (!observation.mentioned && !observation.represented) return null;
	const matched = matchApprovedClaim(observation.detail, claims);
	if (observation.mentioned && !observation.represented) {
		return {
			observationId: observation.id,
			claimId: matched?.id ?? null,
			status: 'missing',
			evidenceClass: matched ? 'source_verified' : 'observed',
			detail: observation.detail?.trim() ? observation.detail.trim() : null
		};
	}
	const status: GeoRepresentationStatus =
		observation.accurate === 'yes'
			? 'accurate'
			: observation.accurate === 'no'
				? 'inaccurate'
				: 'unknown';
	return {
		observationId: observation.id,
		claimId: matched?.id ?? null,
		status,
		evidenceClass: matched ? 'source_verified' : 'observed',
		detail: observation.detail?.trim() ? observation.detail.trim() : null
	};
}
