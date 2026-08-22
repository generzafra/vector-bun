import { ValidationError } from '@vector/contracts';
import type { WorkflowName } from './contracts';
import type { WorkflowHandler } from './types';

const handlers = new Map<WorkflowName, WorkflowHandler>();

export function registerWorkflowHandler(name: WorkflowName, handler: WorkflowHandler) {
	handlers.set(name, handler);
}

export function registerWorkflowHandlers(next: Partial<Record<WorkflowName, WorkflowHandler>>) {
	for (const [name, handler] of Object.entries(next) as [WorkflowName, WorkflowHandler][]) {
		if (handler) handlers.set(name, handler);
	}
}

export function getWorkflowHandler(name: WorkflowName) {
	const handler = handlers.get(name);
	if (!handler) {
		throw new ValidationError(`Workflow handler is not registered: ${name}`);
	}
	return handler;
}

export function resetWorkflowHandlers() {
	handlers.clear();
}
