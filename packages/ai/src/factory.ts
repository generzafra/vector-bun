import { env } from '@vector/config';
import { DisabledAIProvider } from './disabled';
import { GrokProvider } from './grok';
import { MemoryAIProvider } from './memory';
import type { AIProvider } from './types';

let cached: AIProvider | null = null;

export function createAIProvider(): AIProvider {
	const inner = env.XAI_API_KEY
		? new GrokProvider(env.XAI_API_KEY, env.XAI_BASE_URL)
		: new MemoryAIProvider();
	if (env.AI_EXECUTION_PAUSED) {
		return new DisabledAIProvider('AI execution is paused', inner);
	}
	return inner;
}

export function aiProvider() {
	cached ??= createAIProvider();
	return cached;
}

export function setAIProvider(provider: AIProvider) {
	cached = provider;
}

export function resetAIProvider() {
	cached = null;
}
