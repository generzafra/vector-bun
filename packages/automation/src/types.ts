import type { WorkflowName } from './contracts';

export type WorkflowAdapterName = 'in-process' | 'trigger';

export type WorkflowHealth = {
	ok: boolean;
	adapter: WorkflowAdapterName;
	detail: string;
};

export type WorkflowDispatchInput = {
	name: WorkflowName;
	payload: unknown;
	idempotencyKey: string;
};

export type WorkflowDispatchResult =
	| { adapter: 'in-process'; queued: false; result: unknown }
	| { adapter: 'trigger'; queued: true; runId: string };

export type WorkflowHandler = (payload: unknown) => Promise<unknown>;

export type TriggerTaskClient = {
	trigger(
		name: WorkflowName,
		payload: unknown,
		options: { idempotencyKey: string }
	): Promise<{ runId: string }>;
};

export interface WorkflowRuntime {
	health(): WorkflowHealth;
	dispatch(input: WorkflowDispatchInput): Promise<WorkflowDispatchResult>;
}
