import { env, isTest } from '@vector/config';
import { InProcessWorkflowRuntime } from './in-process';
import { TriggerWorkflowRuntime } from './trigger';
import type { TriggerTaskClient, WorkflowRuntime } from './types';

let cached: WorkflowRuntime | null = null;

export function createWorkflowRuntime(client?: TriggerTaskClient): WorkflowRuntime {
	if (!isTest && env.TRIGGER_SECRET_KEY) {
		return new TriggerWorkflowRuntime(client);
	}
	return new InProcessWorkflowRuntime();
}

export function workflowRuntime() {
	cached ??= createWorkflowRuntime();
	return cached;
}

export function setWorkflowRuntime(runtime: WorkflowRuntime) {
	cached = runtime;
}

export function resetWorkflowRuntime() {
	cached = null;
}
