import {
	IMAGE_PROMPT_VERSION,
	IMAGE_SCHEMA_VERSION,
	ProviderError,
	ValidationError
} from '@vector/contracts';
import { logError, logInfo } from '@vector/observability';
import type {
	EditImageRequest,
	GenerateImageRequest,
	ImageGenerationResult,
	ImageHealth,
	ImageProvider,
	VariantImageRequest
} from './types';

type ImageApiResponse = {
	id?: string;
	model?: string;
	data?: Array<{ b64_json?: string; url?: string }>;
};

const DEFAULT_TIMEOUT_MS = 45_000;

export class GrokImagineProvider implements ImageProvider {
	constructor(
		private readonly apiKey: string,
		private readonly baseUrl = 'https://api.x.ai/v1',
		private readonly model = 'grok-imagine-image-2.0',
		private readonly costPerImageMicros = 40_000,
		private readonly sendHttp: typeof fetch = fetch
	) {}

	async generate(request: GenerateImageRequest): Promise<ImageGenerationResult> {
		return this.run(request, {
			model: this.model,
			prompt: request.prompt,
			n: 1,
			response_format: 'b64_json',
			aspect_ratio: request.aspectRatio ?? '16:9'
		});
	}

	async edit(_request: EditImageRequest): Promise<ImageGenerationResult> {
		throw new ProviderError('Image edit is not enabled in C2', 'IMAGE_EDIT_UNSUPPORTED');
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
		return { ok: true, adapter: 'grok', detail: 'xAI Imagine API configured' };
	}

	private async run(
		request: GenerateImageRequest,
		payload: Record<string, unknown>
	): Promise<ImageGenerationResult> {
		if (!this.apiKey) throw new ProviderError('xAI API key is missing', 'PROVIDER_CONFIG');
		if (
			request.costCeilingMicros !== undefined &&
			this.costPerImageMicros > request.costCeilingMicros
		) {
			throw new ProviderError('Image cost ceiling exceeded', 'IMAGE_COST_CEILING');
		}
		const started = Date.now();
		const body = await this.post(
			'/images/generations',
			payload,
			request.timeoutMs ?? DEFAULT_TIMEOUT_MS,
			request.idempotencyKey,
			request.clientId
		);
		const b64 = body.data?.[0]?.b64_json;
		if (!b64) throw new ValidationError('Grok did not return image bytes');
		let bytes: Uint8Array;
		try {
			bytes = Uint8Array.from(Buffer.from(b64, 'base64'));
		} catch {
			throw new ValidationError('Grok returned invalid image bytes');
		}
		if (bytes.byteLength < 32) throw new ValidationError('Grok returned empty image bytes');
		logInfo('image.grok.generate', {
			clientId: request.clientId,
			model: body.model ?? this.model,
			costMicros: this.costPerImageMicros
		});
		return {
			adapter: 'grok',
			model: body.model ?? this.model,
			providerRequestId: body.id ?? `grok-img-${request.idempotencyKey}`,
			bytes,
			contentType: sniffContentType(bytes),
			latencyMs: Date.now() - started,
			promptVersion: request.promptVersion ?? IMAGE_PROMPT_VERSION,
			schemaVersion: request.schemaVersion ?? IMAGE_SCHEMA_VERSION,
			costMicros: this.costPerImageMicros,
			currency: 'USD'
		};
	}

	private async post(
		path: string,
		payload: Record<string, unknown>,
		timeoutMs: number,
		idempotencyKey: string,
		clientId: string
	): Promise<ImageApiResponse> {
		let lastError: unknown;
		for (let attempt = 0; attempt < 2; attempt += 1) {
			const controller = new AbortController();
			const timer = setTimeout(() => controller.abort(), timeoutMs);
			try {
				const response = await this.sendHttp(`${this.baseUrl.replace(/\/$/, '')}${path}`, {
					method: 'POST',
					signal: controller.signal,
					headers: {
						authorization: `Bearer ${this.apiKey}`,
						'content-type': 'application/json',
						'idempotency-key': idempotencyKey
					},
					body: JSON.stringify(payload)
				});
				if (response.status >= 500 || response.status === 429) {
					lastError = new ProviderError('Grok image request failed', 'PROVIDER_TEMPORARY_FAILURE');
					continue;
				}
				if (!response.ok) {
					logError('image.grok.generate', new Error(`status ${response.status}`), {
						clientId,
						status: response.status
					});
					throw new ProviderError('Grok image request failed', 'PROVIDER_TEMPORARY_FAILURE');
				}
				return (await response.json()) as ImageApiResponse;
			} catch (error) {
				if (error instanceof ProviderError || error instanceof ValidationError) throw error;
				if (error instanceof Error && error.name === 'AbortError') {
					throw new ProviderError('Grok image request timed out', 'IMAGE_TIMEOUT');
				}
				lastError = error;
			} finally {
				clearTimeout(timer);
			}
		}
		logError('image.grok.generate', lastError, { clientId });
		throw new ProviderError('Grok image request failed', 'PROVIDER_TEMPORARY_FAILURE');
	}
}

function sniffContentType(bytes: Uint8Array) {
	if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
		return 'image/png';
	}
	if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return 'image/jpeg';
	if (
		bytes[0] === 0x52 &&
		bytes[1] === 0x49 &&
		bytes[2] === 0x46 &&
		bytes[3] === 0x46 &&
		bytes[8] === 0x57 &&
		bytes[9] === 0x45 &&
		bytes[10] === 0x42 &&
		bytes[11] === 0x50
	) {
		return 'image/webp';
	}
	throw new ValidationError('Generated bytes are not a supported image');
}
