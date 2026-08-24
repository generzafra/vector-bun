import { z } from 'zod';
import { DEFAULT_PROHIBITED_STYLES } from './brand-visual';

export const IMAGE_ADAPTERS = ['memory', 'grok', 'disabled'] as const;
export type ImageAdapterName = (typeof IMAGE_ADAPTERS)[number];

export const IMAGE_GENERATION_PURPOSES = ['supporting', 'social', 'background'] as const;
export type ImageGenerationPurpose = (typeof IMAGE_GENERATION_PURPOSES)[number];

export const IMAGE_GENERATION_STATUSES = ['succeeded', 'failed', 'denied'] as const;
export type ImageGenerationStatus = (typeof IMAGE_GENERATION_STATUSES)[number];

export const IMAGE_DENY_REASONS = ['budget', 'paused', 'policy'] as const;
export type ImageDenyReason = (typeof IMAGE_DENY_REASONS)[number];

export const IMAGE_ASPECT_RATIOS = ['1:1', '16:9', '4:5', '3:2'] as const;
export type ImageAspectRatio = (typeof IMAGE_ASPECT_RATIOS)[number];

export const IMAGE_PROMPT_VERSION = 'image.supporting.v1';
export const IMAGE_SCHEMA_VERSION = 'image.generation.v1';

const LOGO_REQUEST =
	/\b(logo|wordmark|word-mark|brand mark|trademark|recreate (the |our )?mark)\b/i;
const INVENTED_PROOF =
	/\b(testimonial|review quote|star rating|5 stars|five stars|before[- ]and[- ]after|named customer|case study photo)\b/i;

export const draftSupportingImageSchema = z
	.object({
		title: z.string().trim().min(2).max(160).optional(),
		brief: z.string().trim().min(8).max(500),
		purpose: z.enum(IMAGE_GENERATION_PURPOSES).default('supporting'),
		aspectRatio: z.enum(IMAGE_ASPECT_RATIOS).default('16:9'),
		idempotencyKey: z.string().trim().min(8).max(80).optional()
	})
	.strict();

export type DraftSupportingImageInput = z.infer<typeof draftSupportingImageSchema>;

export function promptRequestsLogo(brief: string) {
	return LOGO_REQUEST.test(brief);
}

export function promptRequestsInventedProof(brief: string) {
	return INVENTED_PROOF.test(brief);
}

export function promptHitsProhibitedStyle(
	brief: string,
	prohibited: readonly string[]
): string | null {
	const needle = brief.trim().toLowerCase();
	if (!needle) return null;
	for (const style of prohibited) {
		const item = style.trim().toLowerCase();
		if (item.length >= 2 && needle.includes(item)) return style.trim();
	}
	return null;
}

export function resolvedProhibitedStyles(stored: string[] | null | undefined): string[] {
	if (stored && stored.length > 0) return stored;
	return [...DEFAULT_PROHIBITED_STYLES];
}

export function buildSupportingImagePrompt(input: {
	brandName: string;
	photographyDirection: string;
	prohibitedStyles: readonly string[];
	brief: string;
}): string {
	const photography =
		input.photographyDirection.trim() ||
		'Authentic locations, natural lighting, real materials. No stock-photo look.';
	return [
		`Create a supporting photograph for ${input.brandName}.`,
		`Photography direction: ${photography}.`,
		'Do not include logos, wordmarks, slogans, prices, testimonials, reviews, or readable marketing text.',
		'Do not invent named customers, star ratings, or before-and-after proof.',
		`Avoid these styles: ${input.prohibitedStyles.join('; ')}.`,
		`Scene brief: ${input.brief.trim()}`
	].join(' ');
}

export function publicImageDenyLabel(reason: string | null | undefined) {
	if (reason === 'budget') {
		return 'Monthly image budget reached. Use approved photos or a type-led layout.';
	}
	if (reason === 'paused') {
		return 'Image drafting is paused for this client.';
	}
	if (reason === 'policy') {
		return 'That request would replace a logo, invent proof, or use a blocked style.';
	}
	return null;
}
