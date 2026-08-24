import type { ImageAdapterName, ImageAspectRatio, ImageGenerationPurpose } from '@vector/contracts';

export type ImageUsage = {
	costMicros: number;
	currency: 'USD';
};

export type GenerateImageRequest = {
	clientId: string;
	requestId: string;
	idempotencyKey: string;
	prompt: string;
	purpose: ImageGenerationPurpose;
	promptVersion?: string;
	schemaVersion?: string;
	aspectRatio?: ImageAspectRatio;
	timeoutMs?: number;
	costCeilingMicros?: number;
};

export type EditImageRequest = GenerateImageRequest & {
	sourceBytes: Uint8Array;
	sourceContentType: string;
};

export type VariantImageRequest = GenerateImageRequest & {
	variantCount: number;
};

export type ImageGenerationResult = {
	adapter: ImageAdapterName;
	model: string;
	providerRequestId: string;
	bytes: Uint8Array;
	contentType: string;
	latencyMs: number;
	promptVersion: string;
	schemaVersion: string;
} & ImageUsage;

export type ImageHealth = {
	ok: boolean;
	adapter: ImageAdapterName;
	detail: string;
};

export interface ImageProvider {
	generate(request: GenerateImageRequest): Promise<ImageGenerationResult>;
	edit(request: EditImageRequest): Promise<ImageGenerationResult>;
	generateVariants(request: VariantImageRequest): Promise<ImageGenerationResult[]>;
	health(): Promise<ImageHealth>;
}

export type { ImageAdapterName, ImageAspectRatio, ImageGenerationPurpose };
