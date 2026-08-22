import type { WorkflowName } from './contracts';
import type {
	TriggerTaskClient,
	WorkflowDispatchInput,
	WorkflowHealth,
	WorkflowRuntime
} from './types';

type TriggerSdk = {
	tasks: {
		trigger(
			id: string,
			payload: unknown,
			options?: { idempotencyKey?: string }
		): Promise<{ id: string }>;
	};
};

export async function createOfficialTriggerClient(): Promise<TriggerTaskClient> {
	const sdk = (await import('@trigger.dev/sdk')) as TriggerSdk;
	return {
		async trigger(name: WorkflowName, payload: unknown, options: { idempotencyKey: string }) {
			const handle = await sdk.tasks.trigger(name, payload, {
				idempotencyKey: options.idempotencyKey
			});
			return { runId: handle.id };
		}
	};
}

export class TriggerWorkflowRuntime implements WorkflowRuntime {
	private official: Promise<TriggerTaskClient> | null = null;

	constructor(private readonly client?: TriggerTaskClient) {}

	health(): WorkflowHealth {
		return {
			ok: true,
			adapter: 'trigger',
			detail: 'Trigger.dev task host'
		};
	}

	async dispatch(input: WorkflowDispatchInput) {
		const client = await this.resolveClient();
		const handle = await client.trigger(input.name, input.payload, {
			idempotencyKey: input.idempotencyKey
		});
		return { adapter: 'trigger' as const, queued: true as const, runId: handle.runId };
	}

	private resolveClient() {
		if (this.client) return Promise.resolve(this.client);
		this.official ??= createOfficialTriggerClient();
		return this.official;
	}
}
