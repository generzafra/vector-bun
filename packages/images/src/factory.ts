import { env } from '@vector/config';
import { DisabledImageProvider } from './disabled';
import { GrokImagineProvider } from './grok';
import { MemoryImageProvider } from './memory';
import type { ImageProvider } from './types';

let cached: ImageProvider | null = null;

export function createImageProvider(): ImageProvider {
	const inner = env.XAI_API_KEY
		? new GrokImagineProvider(
				env.XAI_API_KEY,
				env.XAI_BASE_URL,
				env.XAI_IMAGE_MODEL,
				env.IMAGE_COST_PER_IMAGE_MICROS
			)
		: new MemoryImageProvider();
	if (env.AI_EXECUTION_PAUSED || env.IMAGE_GENERATION_PAUSED) {
		return new DisabledImageProvider('Image generation is paused', inner);
	}
	return inner;
}

export function imageProvider() {
	cached ??= createImageProvider();
	return cached;
}

export function setImageProvider(provider: ImageProvider) {
	cached = provider;
}

export function resetImageProvider() {
	cached = null;
}
