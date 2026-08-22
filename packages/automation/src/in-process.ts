import { getWorkflowHandler } from './handlers';
import type { WorkflowDispatchInput, WorkflowHealth, WorkflowRuntime } from './types';

export class InProcessWorkflowRuntime implements WorkflowRuntime {
	health(): WorkflowHealth {
		return {
			ok: true,
			adapter: 'in-process',
			detail: 'Phase 3 contracts run in the API process'
		};
	}

	async dispatch(input: WorkflowDispatchInput) {
		const result = await getWorkflowHandler(input.name)(input.payload);
		return { adapter: 'in-process' as const, queued: false as const, result };
	}
}
