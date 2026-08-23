import {
	ValidationError,
	type GeoCitationKind,
	type GeoMeasurementMethod
} from '@vector/contracts';

export const GEO_OBSERVATION_STALE_MS = 14 * 24 * 60 * 60 * 1000;

export type GeoObservationInput = {
	method: GeoMeasurementMethod;
	mentioned: boolean;
	ownedCitation: boolean;
	earnedCitation: boolean;
	represented: boolean;
	detail?: string | null;
	retainedAnswer?: string | null;
	citations: { kind: GeoCitationKind; url?: string | null; domain?: string | null }[];
};

export function mentionIsNotCitation(input: {
	mentioned: boolean;
	ownedCitation: boolean;
	earnedCitation: boolean;
}) {
	return input.mentioned && !input.ownedCitation && !input.earnedCitation;
}

export function geoObservationIsStale(
	observedAt: Date,
	now = new Date(),
	maxAgeMs = GEO_OBSERVATION_STALE_MS
) {
	return now.getTime() - observedAt.getTime() > maxAgeMs;
}

export function assertGeoObservationIntegrity(input: GeoObservationInput) {
	if (input.method !== 'manual' && input.method !== 'operator_assisted') {
		throw new ValidationError(
			'Only manual or operator-assisted GEO observations can be stored now'
		);
	}
	if (input.retainedAnswer?.trim()) {
		throw new ValidationError('Full generated answers are not stored');
	}
	if ((input.ownedCitation || input.earnedCitation) && !input.mentioned) {
		throw new ValidationError('A citation requires a mention');
	}
	const owned = input.citations.filter((row) => row.kind === 'owned');
	const earned = input.citations.filter((row) => row.kind === 'earned');
	if (input.ownedCitation && owned.length === 0) {
		throw new ValidationError('Owned citation requires an owned source');
	}
	if (input.earnedCitation && earned.length === 0) {
		throw new ValidationError('Earned citation requires an earned source');
	}
	for (const citation of input.citations) {
		if (!citation.url?.trim() && !citation.domain?.trim()) {
			throw new ValidationError('A citation needs a URL or domain');
		}
	}
}

export function publicGeoObservationFreshness(observedAt: Date, now = new Date()) {
	const stale = geoObservationIsStale(observedAt, now);
	return {
		stale,
		label: stale ? 'stale recorded observation' : 'recorded observation',
		detail: stale
			? 'This observation is older than 14 days and is not current visibility.'
			: 'This is a recorded observation, not a current GEO score or ranking.'
	};
}
