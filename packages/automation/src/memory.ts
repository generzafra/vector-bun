import type { WorkflowName } from './contracts';
import type { TriggerTaskClient } from './types';

export type MemoryTriggerCall = {
	name: WorkflowName;
	payload: unknown;
	idempotencyKey: string;
};

export class MemoryTriggerClient implements TriggerTaskClient {
	readonly calls: MemoryTriggerCall[] = [];

	async trigger(name: WorkflowName, payload: unknown, options: { idempotencyKey: string }) {
		this.calls.push({ name, payload, idempotencyKey: options.idempotencyKey });
		return { runId: `mem-${this.calls.length}` };
	}

	reset() {
		this.calls.length = 0;
	}
}
