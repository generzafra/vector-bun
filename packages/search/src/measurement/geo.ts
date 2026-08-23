import type {
	GenerativeVisibilityResult,
	MeasureGenerativeVisibilityInput,
	RecordedGenerativeVisibility,
	UnsupportedGenerativeVisibility
} from '../types';
import { assertGeoObservationIntegrity } from '../geo/observations';

export function unsupportedGenerativeVisibility(
	detail = 'Official generative-engine APIs are unsupported. Use manual or operator-assisted measurement.'
): UnsupportedGenerativeVisibility {
	return {
		supported: false,
		status: 'unsupported',
		detail
	};
}

export function measureGenerativeVisibility(
	input: MeasureGenerativeVisibilityInput
): GenerativeVisibilityResult {
	if (input.method !== 'manual' && input.method !== 'operator_assisted') {
		return unsupportedGenerativeVisibility();
	}
	assertGeoObservationIntegrity({
		method: input.method,
		mentioned: Boolean(input.mentioned),
		ownedCitation: Boolean(input.ownedCitation),
		earnedCitation: Boolean(input.earnedCitation),
		represented: Boolean(input.represented),
		detail: input.detail,
		retainedAnswer: input.retainedAnswer,
		citations: input.citations ?? []
	});
	const recorded: RecordedGenerativeVisibility = {
		supported: true,
		status: 'recorded',
		method: input.method,
		adapter: 'manual',
		mentioned: Boolean(input.mentioned),
		ownedCitation: Boolean(input.ownedCitation),
		earnedCitation: Boolean(input.earnedCitation),
		represented: Boolean(input.represented),
		accurate: input.accurate ?? 'unknown',
		prominence: input.prominence ?? 'unknown',
		confidence: input.confidence ?? 50,
		detail: input.detail?.trim() ? input.detail.trim() : null,
		citations: input.citations ?? []
	};
	return recorded;
}

export function generativeMeasurementOverview() {
	return {
		supported: false,
		status: 'unsupported' as const,
		manualSupported: true,
		liveSupported: false,
		detail:
			'Manual and operator-assisted measurement is available. Official generative-engine APIs stay unsupported.'
	};
}
