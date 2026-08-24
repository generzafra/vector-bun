import { ProviderError } from '@vector/contracts';
import type {
	EditImageRequest,
	GenerateImageRequest,
	ImageGenerationResult,
	ImageHealth,
	ImageProvider,
	VariantImageRequest
} from './types';

export class DisabledImageProvider implements ImageProvider {
	constructor(
		private readonly detail = 'Image generation is paused',
		private readonly inner?: ImageProvider
	) {}

	async generate(_request: GenerateImageRequest): Promise<ImageGenerationResult> {
		throw new ProviderError(this.detail, 'IMAGE_GENERATION_PAUSED');
	}

	async edit(_request: EditImageRequest): Promise<ImageGenerationResult> {
		throw new ProviderError(this.detail, 'IMAGE_GENERATION_PAUSED');
	}

	async generateVariants(_request: VariantImageRequest): Promise<ImageGenerationResult[]> {
		throw new ProviderError(this.detail, 'IMAGE_GENERATION_PAUSED');
	}

	async health(): Promise<ImageHealth> {
		return { ok: false, adapter: 'disabled', detail: this.detail };
	}

	unwrap() {
		return this.inner;
	}
}
