import type { VideoAdapterName } from '@vector/contracts';

export type VideoUsage = {
	costMicros: number;
	currency: 'USD';
};

export type GenerateVideoRequest = {
	clientId: string;
	requestId: string;
	idempotencyKey: string;
	prompt: string;
	durationSeconds: number;
	promptVersion?: string;
	schemaVersion?: string;
	timeoutMs?: number;
	costCeilingMicros?: number;
};

export type ImageToVideoRequest = GenerateVideoRequest & {
	sourceBytes: Uint8Array;
	sourceContentType: string;
};

export type VideoGenerationResult = {
	adapter: VideoAdapterName;
	model: string;
	providerRequestId: string;
	bytes: Uint8Array;
	contentType: 'video/mp4';
	durationSeconds: number;
	latencyMs: number;
	promptVersion: string;
	schemaVersion: string;
} & VideoUsage;

export type VideoHealth = {
	ok: boolean;
	adapter: VideoAdapterName;
	detail: string;
};

export interface VideoProvider {
	generate(request: GenerateVideoRequest): Promise<VideoGenerationResult>;
	imageToVideo(request: ImageToVideoRequest): Promise<VideoGenerationResult>;
	health(): Promise<VideoHealth>;
}
