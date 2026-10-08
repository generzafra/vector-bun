import { z } from 'zod';

export const VIDEO_ADAPTERS = ['memory', 'disabled'] as const;
export type VideoAdapterName = (typeof VIDEO_ADAPTERS)[number];

export const VIDEO_GENERATION_MODES = ['generate', 'image_to_video'] as const;
export type VideoGenerationMode = (typeof VIDEO_GENERATION_MODES)[number];

export const VIDEO_PROMPT_VERSION = 'video.short.v1';
export const VIDEO_SCHEMA_VERSION = 'video.generation.v1';

export const draftShortVideoSchema = z
	.object({
		title: z.string().trim().min(2).max(80),
		brief: z.string().trim().min(8).max(500),
		durationSeconds: z.number().int().min(1).max(15).default(6),
		mode: z.enum(VIDEO_GENERATION_MODES).default('generate'),
		sourceAssetId: z.string().uuid().optional(),
		idempotencyKey: z.string().trim().min(8).max(80).optional()
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.mode === 'image_to_video' && !value.sourceAssetId) {
			ctx.addIssue({
				code: 'custom',
				path: ['sourceAssetId'],
				message: 'Choose an image to animate'
			});
		}
	});
