import { ProviderError, ValidationError } from '@vector/contracts';
import { logError, logInfo } from '@vector/observability';
import { z } from 'zod';
import { estimateCostMicros, modelForTask } from './routing';
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

type ChatResponse = {
	id?: string;
	model?: string;
	choices?: Array<{ message?: { content?: string | null } }>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		total_tokens?: number;
	};
};

const DEFAULT_TIMEOUT_MS = 20_000;

export class GrokProvider implements AIProvider {
	constructor(
		private readonly apiKey: string,
		private readonly baseUrl = 'https://api.x.ai/v1',
		private readonly sendHttp: typeof fetch = fetch
	) {}

	async generateStructured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>> {
		if (!this.apiKey) throw new ProviderError('xAI API key is missing', 'PROVIDER_CONFIG');
		const started = Date.now();
		const model = modelForTask(request.taskClass, request.model);
		const jsonSchema = z.toJSONSchema(request.schema);
		const body = await this.chat(
			{
				model,
				messages: [
					{ role: 'system', content: request.system },
					{ role: 'user', content: request.prompt }
				],
				response_format: {
					type: 'json_schema',
					json_schema: {
						name: request.schemaName.replace(/[^a-zA-Z0-9_]/g, '_'),
						strict: true,
						schema: jsonSchema
					}
				}
			},
			request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
			request.idempotencyKey,
			request.clientId
		);
		const text = body.choices?.[0]?.message?.content;
		if (!text) throw new ValidationError('Grok did not return structured content');
		let raw: unknown;
		try {
			raw = JSON.parse(text);
		} catch {
			throw new ValidationError('Grok returned invalid JSON');
		}
		const parsed = request.schema.safeParse(raw);
		if (!parsed.success) {
			throw new ValidationError('Structured output failed validation');
		}
		const usage = this.usage(body);
		if (request.costCeilingMicros !== undefined && usage.costMicros > request.costCeilingMicros) {
			throw new ProviderError('AI cost ceiling exceeded', 'AI_COST_CEILING');
		}
		logInfo('ai.grok.structured', {
			clientId: request.clientId,
			schemaName: request.schemaName,
			model,
			costMicros: usage.costMicros
		});
		return {
			output: parsed.data,
			provider: 'grok',
			model: body.model ?? model,
			providerRequestId: body.id ?? `grok-${request.idempotencyKey}`,
			latencyMs: Date.now() - started,
			...usage
		};
	}

	async generateText(request: TextRequest): Promise<TextResult> {
		if (!this.apiKey) throw new ProviderError('xAI API key is missing', 'PROVIDER_CONFIG');
		const started = Date.now();
		const model = modelForTask(request.taskClass, request.model);
		const body = await this.chat(
			{
				model,
				messages: [
					{ role: 'system', content: request.system },
					{ role: 'user', content: request.prompt }
				]
			},
			request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
			request.idempotencyKey,
			request.clientId
		);
		const text = body.choices?.[0]?.message?.content;
		if (!text) throw new ValidationError('Grok did not return text');
		return {
			text,
			provider: 'grok',
			model: body.model ?? model,
			providerRequestId: body.id ?? `grok-text-${request.idempotencyKey}`,
			latencyMs: Date.now() - started,
			...this.usage(body)
		};
	}

	async useTools(_request: ToolRequest): Promise<ToolResult> {
		throw new ProviderError(
			'Production agents cannot invoke tools in Phase 4',
			'AI_TOOLS_DISABLED'
		);
	}

	async health(): Promise<AIHealth> {
		return { ok: true, adapter: 'grok', detail: 'xAI Grok API configured' };
	}

	private usage(body: ChatResponse) {
		const promptTokens = body.usage?.prompt_tokens ?? 0;
		const completionTokens = body.usage?.completion_tokens ?? 0;
		const totalTokens = body.usage?.total_tokens ?? promptTokens + completionTokens;
		return {
			promptTokens,
			completionTokens,
			totalTokens,
			costMicros: estimateCostMicros(promptTokens, completionTokens),
			currency: 'USD' as const
		};
	}

	private async chat(
		payload: Record<string, unknown>,
		timeoutMs: number,
		idempotencyKey: string,
		clientId: string
	): Promise<ChatResponse> {
		let lastError: unknown;
		for (let attempt = 0; attempt < 2; attempt += 1) {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeoutMs);
			try {
				const response = await this.sendHttp(
					`${this.baseUrl.replace(/\/$/, '')}/chat/completions`,
					{
						method: 'POST',
						signal: controller.signal,
						headers: {
							authorization: `Bearer ${this.apiKey}`,
							'content-type': 'application/json',
							'idempotency-key': idempotencyKey
						},
						body: JSON.stringify(payload)
					}
				);
				if (response.status >= 500 || response.status === 429) {
					lastError = new ProviderError('Grok request failed', 'PROVIDER_TEMPORARY_FAILURE');
					continue;
				}
				if (!response.ok) {
					logError('ai.grok.chat', new Error(`status ${response.status}`), {
						clientId,
						status: response.status
					});
					throw new ProviderError('Grok request failed', 'PROVIDER_TEMPORARY_FAILURE');
				}
				return (await response.json()) as ChatResponse;
			} catch (error) {
				if (error instanceof ProviderError || error instanceof ValidationError) throw error;
				lastError = error;
			} finally {
				clearTimeout(timer);
			}
		}
		logError('ai.grok.chat', lastError, { clientId });
		throw new ProviderError('Grok request failed', 'PROVIDER_TEMPORARY_FAILURE');
	}
}
