import { env } from '@vector/config';
import type { AITaskClass } from './types';

export function modelForTask(taskClass: AITaskClass, override?: string) {
	if (override) return override;
	if (taskClass === 'deep_research' || taskClass === 'strategic_reasoning') {
		return env.XAI_MODEL_RESEARCH;
	}
	return env.XAI_MODEL_DEFAULT;
}

export function estimateCostMicros(promptTokens: number, completionTokens: number) {
	return (
		promptTokens * env.AI_INPUT_MICROS_PER_TOKEN + completionTokens * env.AI_OUTPUT_MICROS_PER_TOKEN
	);
}
