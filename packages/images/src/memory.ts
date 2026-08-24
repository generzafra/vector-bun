import { IMAGE_PROMPT_VERSION, IMAGE_SCHEMA_VERSION, ProviderError } from '@vector/contracts';
import { MEMORY_PNG_1X1 } from './png';
import type {
	EditImageRequest,
	GenerateImageRequest,
	ImageGenerationResult,
	ImageHealth,
	ImageProvider,
	VariantImageRequest
} from './types';

export const MEMORY_IMAGE_COST_MICROS = 50_000;

export class MemoryImageProvider implements ImageProvider {
	readonly generateRequests: GenerateImageRequest[] = [];
	readonly editRequests: EditImageRequest[] = [];
	nextError: Error | null = null;
	nextCostMicros = MEMORY_IMAGE_COST_MICROS;

	async generate(request: GenerateImageRequest): Promise<ImageGenerationResult> {
		this.generateRequests.push(request);
		if (this.nextError) {
			const error = this.nextError;
			this.nextError = null;
			throw error;
		}
		this.assertCost(request);
		return this.result(request, `mem-img-${request.idempotencyKey}`);
	}

	async edit(request: EditImageRequest): Promise<ImageGenerationResult> {
		this.editRequests.push(request);
		this.assertCost(request);
		return this.result(request, `mem-edit-${request.idempotencyKey}`);
	}

	async generateVariants(request: VariantImageRequest): Promise<ImageGenerationResult[]> {
		const count = Math.min(Math.max(request.variantCount, 1), 3);
		const variants: ImageGenerationResult[] = [];
		for (let i = 0; i < count; i += 1) {
			variants.push(
				await this.generate({
					...request,
					idempotencyKey: `${request.idempotencyKey}:v${i}`
				})
			);
		}
		return variants;
	}

	async health(): Promise<ImageHealth> {
		return {
			ok: true,
			adapter: 'memory',
			detail: `${this.generateRequests.length} image drafts`
		};
	}

	reset() {
		this.generateRequests.length = 0;
		this.editRequests.length = 0;
		this.nextError = null;
		this.nextCostMicros = MEMORY_IMAGE_COST_MICROS;
	}

	private assertCost(request: GenerateImageRequest) {
		if (
			request.costCeilingMicros !== undefined &&
			this.nextCostMicros > request.costCeilingMicros
		) {
			throw new ProviderError('Image cost ceiling exceeded', 'IMAGE_COST_CEILING');
		}
	}

	private result(request: GenerateImageRequest, providerRequestId: string): ImageGenerationResult {
		return {
			adapter: 'memory',
			model: 'memory-image-v1',
			providerRequestId,
			bytes: MEMORY_PNG_1X1,
			contentType: 'image/png',
			latencyMs: 1,
			promptVersion: request.promptVersion ?? IMAGE_PROMPT_VERSION,
			schemaVersion: request.schemaVersion ?? IMAGE_SCHEMA_VERSION,
			costMicros: this.nextCostMicros,
			currency: 'USD'
		};
	}
}
