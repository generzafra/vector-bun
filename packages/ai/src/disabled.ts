import { ProviderError } from '@vector/contracts';
import type {
	AIHealth,
	AIProvider,
	StructuredRequest,
	StructuredResult,
	TextRequest,
	TextResult,
	ToolRequest,
	ToolResult
} from './types';

export class DisabledAIProvider implements AIProvider {
	constructor(
		private readonly detail = 'AI execution is paused',
		private readonly inner?: AIProvider
	) {}

	async generateStructured<T>(_request: StructuredRequest<T>): Promise<StructuredResult<T>> {
		throw new ProviderError(this.detail, 'AI_EXECUTION_PAUSED');
	}

	async generateText(_request: TextRequest): Promise<TextResult> {
		throw new ProviderError(this.detail, 'AI_EXECUTION_PAUSED');
	}

	async useTools(_request: ToolRequest): Promise<ToolResult> {
		throw new ProviderError(this.detail, 'AI_EXECUTION_PAUSED');
	}

	async health(): Promise<AIHealth> {
		return { ok: false, adapter: 'disabled', detail: this.detail };
	}

	unwrap() {
		return this.inner;
	}
}
