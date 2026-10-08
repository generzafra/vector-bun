import { env } from '@vector/config';
import { DisabledVideoProvider } from './disabled';
import { MemoryVideoProvider } from './memory';
import type { VideoProvider } from './types';

let cached: VideoProvider | null = null;

export function createVideoProvider(): VideoProvider {
	const inner = new MemoryVideoProvider();
	if (env.AI_EXECUTION_PAUSED || env.VIDEO_GENERATION_PAUSED) {
		return new DisabledVideoProvider('Video generation is paused', inner);
	}
	return inner;
}

export function videoProvider() {
	cached ??= createVideoProvider();
	return cached;
}

export function setVideoProvider(provider: VideoProvider) {
	cached = provider;
}

export function resetVideoProvider() {
	cached = null;
}
