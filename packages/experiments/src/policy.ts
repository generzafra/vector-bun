import {
	DEFERRED_EXPERIMENT_METRICS,
	EXPERIMENT_GUARDRAIL_METRICS,
	EXPERIMENT_PRIMARY_METRICS,
	EXPERIMENT_TRANSITION_TARGETS,
	ValidationError,
	type ExperimentPrimaryMetric,
	type ExperimentStatus,
	type ExperimentTransitionTarget
} from '@vector/contracts';

export { EXPERIMENT_TRANSITION_TARGETS, type ExperimentTransitionTarget };

export const ALLOWED_EXPERIMENT_TRANSITIONS: Record<ExperimentStatus, ExperimentStatus[]> = {
	draft: ['proposed'],
	proposed: ['approved'],
	approved: ['paused'],
	running: ['paused'],
	paused: ['approved', 'running'],
	decided: [],
	archived: []
};

export function isOpenExperimentStatus(status: ExperimentStatus) {
	return status !== 'decided' && status !== 'archived';
}

export function canChangeLockedFields(status: ExperimentStatus) {
	return status === 'draft';
}

export function nextExperimentStatuses(
	status: ExperimentStatus,
	launchedAt: Date | null
): ExperimentTransitionTarget[] {
	if (status === 'proposed') return ['approved'];
	if (status === 'approved' || status === 'running') return ['paused'];
	if (status === 'paused') return launchedAt ? ['running'] : ['approved'];
	return [];
}

export function assertExperimentTransition(
	from: ExperimentStatus,
	to: string,
	launchedAt: Date | null
): asserts to is ExperimentTransitionTarget {
	if (!ALLOWED_EXPERIMENT_TRANSITIONS[from].includes(to as ExperimentStatus)) {
		throw new ValidationError(`Cannot move a ${from} experiment to ${to}`);
	}
	if (to === 'running' && (from !== 'paused' || !launchedAt)) {
		throw new ValidationError('Assignment and exposure are not started from approve');
	}
	if (from === 'paused' && to === 'approved' && launchedAt) {
		throw new ValidationError('A launched experiment resumes to running');
	}
}

export function assertPrimaryMetricAllowed(
	metric: string
): asserts metric is ExperimentPrimaryMetric {
	if ((DEFERRED_EXPERIMENT_METRICS as readonly string[]).includes(metric)) {
		throw new ValidationError(
			'Qualified-lead and revenue metrics need sample size and data-health coverage'
		);
	}
	if (!(EXPERIMENT_PRIMARY_METRICS as readonly string[]).includes(metric)) {
		throw new ValidationError('Primary metric must be a Vector taxonomy conversion event');
	}
}

export function assertGuardrailMetrics(primaryMetric: string, guardrails: string[]) {
	const seen = new Set<string>();
	for (const metric of guardrails) {
		if (metric === primaryMetric) {
			throw new ValidationError('Guardrail metrics cannot include the primary metric');
		}
		if (!(EXPERIMENT_GUARDRAIL_METRICS as readonly string[]).includes(metric)) {
			throw new ValidationError('Guardrail metrics must be Vector taxonomy events');
		}
		if (seen.has(metric)) {
			throw new ValidationError('Guardrail metrics must be unique');
		}
		seen.add(metric);
	}
}

export function assertDistinctVariants(
	controlPageVersionId: string,
	challengerPageVersionId: string
) {
	if (controlPageVersionId === challengerPageVersionId) {
		throw new ValidationError('Control and challenger must be different published page versions');
	}
}

export function assertCanMutateExperimentDefinition(status: ExperimentStatus) {
	if (!canChangeLockedFields(status)) {
		throw new ValidationError('Experiment definition is locked after the proposal is recorded');
	}
}

export function assertCanChangePrimaryMetric(status: ExperimentStatus) {
	if (!canChangeLockedFields(status)) {
		throw new ValidationError('Primary metric cannot be changed after the proposal is recorded');
	}
}

export function assertNoConflictingExperiment(openCount: number) {
	if (openCount > 0) {
		throw new ValidationError('An open experiment already uses this page and primary metric');
	}
}
