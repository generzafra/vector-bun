import { z } from 'zod';

export const BRAND_VISUAL_STATUSES = ['draft', 'confirmed'] as const;
export type BrandVisualStatus = (typeof BRAND_VISUAL_STATUSES)[number];

export const BRAND_VISUAL_SOURCES = ['intake', 'edited'] as const;
export type BrandVisualSource = (typeof BRAND_VISUAL_SOURCES)[number];

/** Platform fail-closed baseline. C2/C3 must refuse these unless the confirmed profile removed one. */
export const DEFAULT_PROHIBITED_STYLES = [
	'cartoon',
	'neon',
	'robot',
	'generic corporate office',
	'purple AI gradient',
	'futuristic hologram',
	'stock photo look',
	'excessive glow'
] as const;

export type DefaultProhibitedStyle = (typeof DEFAULT_PROHIBITED_STYLES)[number];

const PERSONALITY_DIRECTION: Record<
	string,
	{ visualPersonality: string; photographyDirection: string }
> = {
	premium: {
		visualPersonality: 'Premium / clean / professional',
		photographyDirection: 'Real people, natural lighting'
	},
	technology: {
		visualPersonality: 'Technical / clean / precise',
		photographyDirection: 'Product and workspace, even lighting'
	},
	growth: {
		visualPersonality: 'Energetic / clear / growth-focused',
		photographyDirection: 'Real people, natural lighting'
	},
	creative: {
		visualPersonality: 'Editorial / distinctive',
		photographyDirection: 'Authentic locations, natural lighting'
	},
	corporate: {
		visualPersonality: 'Institutional / clean / professional',
		photographyDirection: 'Real people, even lighting'
	}
};

export type BrandVisualFields = {
	primaryLogoAssetId: string | null;
	primaryColor: string | null;
	accentColor: string | null;
	primaryFont: string | null;
	visualPersonality: string;
	photographyDirection: string;
	prohibitedStyles: string[];
};

export type BrandVisualSnapshot = BrandVisualFields;

export function normalizeBrandColor(value: string | null | undefined): string | null {
	const raw = value?.trim() ?? '';
	const match = raw.match(/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/);
	if (!match) return null;
	const hex = match[1] ?? '';
	if (hex.length === 3) {
		return `#${hex[0]}${hex[0]}${hex[1]}${hex[1]}${hex[2]}${hex[2]}`.toUpperCase();
	}
	return `#${hex}`.toUpperCase();
}

export function uniqueProhibitedStyles(values: readonly string[]): string[] {
	const seen = new Set<string>();
	const styles: string[] = [];
	for (const value of values) {
		const trimmed = value.trim();
		if (trimmed.length < 2) continue;
		const key = trimmed.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);
		styles.push(trimmed);
	}
	return styles.slice(0, 20);
}

export function brandStyleIsProhibited(candidate: string, prohibited: readonly string[]): boolean {
	const needle = candidate.trim().toLowerCase();
	if (!needle) return false;
	return prohibited.some((item) => item.trim().toLowerCase() === needle);
}

export function brandVisualProfileConfirmed(row: { status: string } | null | undefined): boolean {
	return row?.status === 'confirmed';
}

function parseColor(value: string, ctx: z.RefinementCtx) {
	const normalized = normalizeBrandColor(value);
	if (!normalized) {
		ctx.addIssue({ code: 'custom', message: 'Use a hex color like #123456' });
		return z.NEVER;
	}
	return normalized;
}

const requiredColorSchema = z
	.string()
	.trim()
	.min(1)
	.transform((value, ctx) => parseColor(value, ctx));

const optionalColorSchema = z
	.string()
	.trim()
	.optional()
	.nullable()
	.transform((value, ctx) => {
		if (!value) return null;
		return parseColor(value, ctx);
	});

const optionalLogoSchema = z
	.union([z.string().uuid(), z.literal(''), z.null()])
	.optional()
	.transform((value) => (value ? value : null));

const optionalFontSchema = z
	.string()
	.trim()
	.max(80)
	.optional()
	.nullable()
	.transform((value) => (value ? value : null));

export const saveBrandVisualProfileSchema = z
	.object({
		primaryLogoAssetId: optionalLogoSchema,
		primaryColor: requiredColorSchema,
		accentColor: optionalColorSchema,
		primaryFont: optionalFontSchema,
		visualPersonality: z.string().trim().min(2).max(120),
		photographyDirection: z.string().trim().min(2).max(200),
		prohibitedStyles: z
			.array(z.string().trim().min(2).max(80))
			.min(1)
			.max(20)
			.transform((values) => uniqueProhibitedStyles(values))
			.refine((values) => values.length > 0, { message: 'Keep at least one style to avoid' }),
		source: z.enum(BRAND_VISUAL_SOURCES).optional()
	})
	.strict();

export type SaveBrandVisualProfileInput = z.infer<typeof saveBrandVisualProfileSchema>;

export const confirmBrandVisualProfileSchema = saveBrandVisualProfileSchema;
export type ConfirmBrandVisualProfileInput = SaveBrandVisualProfileInput;

export const brandVisualClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export function draftBrandVisualFromIntake(input: {
	brand: {
		brandPersonality?: string | null;
		tokens?: {
			accent?: string;
			background?: string;
			text?: string;
			fontFamily?: string;
		} | null;
	} | null;
	logoAssetId: string | null;
}): BrandVisualFields & { source: BrandVisualSource } {
	const tokens = input.brand?.tokens ?? {};
	const mapped = input.brand?.brandPersonality
		? PERSONALITY_DIRECTION[input.brand.brandPersonality]
		: undefined;
	const primaryColor = normalizeBrandColor(tokens.accent) ?? normalizeBrandColor(tokens.text);
	const textColor = normalizeBrandColor(tokens.text);
	const backgroundColor = normalizeBrandColor(tokens.background);
	let accentColor: string | null = null;
	if (textColor && textColor !== primaryColor) accentColor = textColor;
	else if (backgroundColor && backgroundColor !== primaryColor) accentColor = backgroundColor;
	return {
		primaryLogoAssetId: input.logoAssetId,
		primaryColor,
		accentColor,
		primaryFont: tokens.fontFamily?.trim() ? tokens.fontFamily.trim() : null,
		visualPersonality: mapped?.visualPersonality ?? '',
		photographyDirection: mapped?.photographyDirection ?? '',
		prohibitedStyles: [...DEFAULT_PROHIBITED_STYLES],
		source: 'intake'
	};
}
