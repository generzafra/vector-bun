import type { z } from 'zod';

export type AIAdapterName = 'memory' | 'grok' | 'disabled';

export const AI_TASK_CLASSES = [
	'classification',
	'extraction',
	'copy_generation',
	'strategic_reasoning',
	'deep_research',
	'content_review',
	'data_interpretation',
	'tool_orchestration'
] as const;

export type AITaskClass = (typeof AI_TASK_CLASSES)[number];

export const AI_AGENT_KEYS = ['research', 'copy', 'analytics', 'funnel_strategist'] as const;
export type AIAgentKey = (typeof AI_AGENT_KEYS)[number];

export type TenantKnowledgeFacts = {
	brandName: string | null;
	audience: string | null;
	offer: string | null;
	primaryConversion: string | null;
	services: string[];
	approvedClaims: string[];
	prohibitedClaims: string[];
};

export type TenantAnalyticsFacts = {
	pageViewed: number;
	ctaClicked: number;
	formStarted: number;
	formSubmitted: number;
	leadCreated: number;
};

export type AIUsage = {
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	costMicros: number;
	currency: 'USD';
};

export type StructuredRequest<T> = {
	clientId: string;
	requestId: string;
	idempotencyKey: string;
	taskClass: AITaskClass;
	schemaName: string;
	schemaVersion: string;
	schema: z.ZodType<T>;
	system: string;
	prompt: string;
	facts: {
		knowledge: TenantKnowledgeFacts;
		analytics: TenantAnalyticsFacts;
	};
	model?: string;
	timeoutMs?: number;
	costCeilingMicros?: number;
};

export type StructuredResult<T> = {
	output: T;
	provider: AIAdapterName;
	model: string;
	providerRequestId: string;
	latencyMs: number;
} & AIUsage;

export type TextRequest = {
	clientId: string;
	requestId: string;
	idempotencyKey: string;
	taskClass: AITaskClass;
	system: string;
	prompt: string;
	model?: string;
	timeoutMs?: number;
};

export type TextResult = {
	text: string;
	provider: AIAdapterName;
	model: string;
	providerRequestId: string;
	latencyMs: number;
} & AIUsage;

export type ToolDefinition = {
	name: string;
	description: string;
};

export type ToolRequest = {
	clientId: string;
	requestId: string;
	idempotencyKey: string;
	taskClass: AITaskClass;
	system: string;
	prompt: string;
	tools: ToolDefinition[];
	model?: string;
	timeoutMs?: number;
};

export type ProposedToolCall = {
	name: string;
	arguments: Record<string, string | number | boolean | null>;
};

export type ToolResult = {
	calls: ProposedToolCall[];
	provider: AIAdapterName;
	model: string;
	providerRequestId: string;
	latencyMs: number;
} & AIUsage;

export type AIHealth = {
	ok: boolean;
	adapter: AIAdapterName;
	detail: string;
};

export interface AIProvider {
	generateStructured<T>(request: StructuredRequest<T>): Promise<StructuredResult<T>>;
	generateText(request: TextRequest): Promise<TextResult>;
	useTools(request: ToolRequest): Promise<ToolResult>;
	health(): Promise<AIHealth>;
}
