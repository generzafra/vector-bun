import { ProviderError, VIDEO_PROMPT_VERSION, VIDEO_SCHEMA_VERSION } from '@vector/contracts';
import { MEMORY_MP4 } from './mp4';
import type {
	GenerateVideoRequest,
	ImageToVideoRequest,
	VideoGenerationResult,
	VideoHealth,
	VideoProvider
} from './types';

export const MEMORY_VIDEO_COST_MICROS = 50_000;

export class MemoryVideoProvider implements VideoProvider {
	readonly generateRequests: GenerateVideoRequest[] = [];
	readonly imageToVideoRequests: ImageToVideoRequest[] = [];
	nextCostMicros = MEMORY_VIDEO_COST_MICROS;

	async generate(request: GenerateVideoRequest): Promise<VideoGenerationResult> {
		this.generateRequests.push(request);
		this.assertRequest(request);
		return this.result(request, `mem-vid-${request.idempotencyKey}`);
	}

	async imageToVideo(request: ImageToVideoRequest): Promise<VideoGenerationResult> {
		this.imageToVideoRequests.push(request);
		this.assertRequest(request);
		if (!request.sourceContentType.startsWith('image/')) {
			throw new ProviderError('Choose an image to animate', 'VIDEO_SOURCE_REJECTED');
		}
		return this.result(request, `mem-i2v-${request.idempotencyKey}`);
	}

	async health(): Promise<VideoHealth> {
		return {
			ok: true,
			adapter: 'memory',
			detail: `${this.generateRequests.length + this.imageToVideoRequests.length} video drafts`
		};
	}

	private assertRequest(request: GenerateVideoRequest) {
		if (
			!Number.isInteger(request.durationSeconds) ||
			request.durationSeconds < 1 ||
			request.durationSeconds > 15
		) {
			throw new ProviderError(
				'Short-form video is limited to 15 seconds',
				'VIDEO_DURATION_REJECTED'
			);
		}
		if (
			request.costCeilingMicros !== undefined &&
			this.nextCostMicros > request.costCeilingMicros
		) {
			throw new ProviderError('Video cost ceiling exceeded', 'VIDEO_COST_CEILING');
		}
	}

	private result(request: GenerateVideoRequest, providerRequestId: string): VideoGenerationResult {
		return {
			adapter: 'memory',
			model: 'memory-video-v1',
			providerRequestId,
			bytes: MEMORY_MP4,
			contentType: 'video/mp4',
			durationSeconds: request.durationSeconds,
			latencyMs: 1,
			promptVersion: request.promptVersion ?? VIDEO_PROMPT_VERSION,
			schemaVersion: request.schemaVersion ?? VIDEO_SCHEMA_VERSION,
			costMicros: this.nextCostMicros,
			currency: 'USD'
		};
	}
}
