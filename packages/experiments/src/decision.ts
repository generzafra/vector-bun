import {
	EXPERIMENT_DECISION_OUTCOMES,
	ValidationError,
	type ExperimentDecisionOutcome,
	type ExperimentStatus
} from '@vector/contracts';
import { assertNotEarlyStop, type ExperimentMeasurement } from './measurement';

export { EXPERIMENT_DECISION_OUTCOMES, type ExperimentDecisionOutcome };

export type ObservedPrimaryWinner = 'control' | 'challenger' | null;

export function resolveObservedPrimaryWinner(
	controlPrimaryCount: number,
	challengerPrimaryCount: number
): ObservedPrimaryWinner {
	if (challengerPrimaryCount > controlPrimaryCount) return 'challenger';
	if (controlPrimaryCount > challengerPrimaryCount) return 'control';
	return null;
}

export function assertCanDecideExperiment(status: ExperimentStatus, launchedAt: Date | null) {
	if (status === 'decided' || status === 'archived') {
		throw new ValidationError('Experiment is already decided');
	}
	if (status !== 'running' && !(status === 'paused' && launchedAt)) {
		throw new ValidationError('A decision requires a launched experiment');
	}
}

export function assertExperimentDecisionOutcome(
	outcome: string,
	measurement: ExperimentMeasurement
): asserts outcome is ExperimentDecisionOutcome {
	assertNotEarlyStop(measurement);
	if (!(EXPERIMENT_DECISION_OUTCOMES as readonly string[]).includes(outcome)) {
		throw new ValidationError('Decision outcome is not allowed');
	}
	const observed = resolveObservedPrimaryWinner(
		measurement.controlPrimaryCount,
		measurement.challengerPrimaryCount
	);
	if (outcome === 'promote_challenger' && observed !== 'challenger') {
		throw new ValidationError(
			'Challenger can be promoted only when the predetermined primary count is higher and policy is ready'
		);
	}
}

export function decisionWinnerVariantKey(
	outcome: ExperimentDecisionOutcome
): 'control' | 'challenger' | null {
	if (outcome === 'promote_challenger') return 'challenger';
	if (outcome === 'keep_control') return 'control';
	return null;
}

export function formatLearningResult(
	primaryMetric: string,
	measurement: Pick<
		ExperimentMeasurement,
		'controlPrimaryCount' | 'challengerPrimaryCount' | 'controlSample' | 'challengerSample'
	>
) {
	return `${primaryMetric} control ${measurement.controlPrimaryCount} / challenger ${measurement.challengerPrimaryCount}. Sample control ${measurement.controlSample} / challenger ${measurement.challengerSample}.`;
}

export function learningConfidence() {
	return 'measured' as const;
}
