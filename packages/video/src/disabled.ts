import { ProviderError } from '@vector/contracts';
import type {
	GenerateVideoRequest,
	ImageToVideoRequest,
	VideoGenerationResult,
	VideoHealth,
	VideoProvider
} from './types';

export class DisabledVideoProvider implements VideoProvider {
	constructor(
		private readonly detail = 'Video generation is paused',
		private readonly inner?: VideoProvider
	) {}

	async generate(_request: GenerateVideoRequest): Promise<VideoGenerationResult> {
		throw new ProviderError(this.detail, 'VIDEO_GENERATION_PAUSED');
	}

	async imageToVideo(_request: ImageToVideoRequest): Promise<VideoGenerationResult> {
		throw new ProviderError(this.detail, 'VIDEO_GENERATION_PAUSED');
	}

	async health(): Promise<VideoHealth> {
		return { ok: false, adapter: 'disabled', detail: this.detail };
	}

	unwrap() {
		return this.inner;
	}
}
