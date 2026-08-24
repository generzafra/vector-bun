import { z } from 'zod';
import { DEFAULT_PROHIBITED_STYLES, normalizeBrandColor } from './brand-visual';
import { ValidationError } from './errors';

export const COMPOSITION_KINDS = ['og', 'social', 'email'] as const;
export type CompositionKind = (typeof COMPOSITION_KINDS)[number];

export const COMPOSITION_SCHEMA_VERSION = 'composition.shell.v1';

export const FUNNEL_ASSET_MANIFEST_SCHEMA_VERSION = 'funnel.asset.manifest.v1';
export const FUNNEL_ASSET_SLOTS = ['og', 'social', 'email'] as const;
export type FunnelAssetSlot = (typeof FUNNEL_ASSET_SLOTS)[number];

export const COMPOSITION_TEMPLATE_STYLES = ['editorial', 'minimal'] as const;
export type CompositionTemplateStyle = (typeof COMPOSITION_TEMPLATE_STYLES)[number];

export const COMPOSITION_TEMPLATES = {
	og: { key: 'og-editorial', width: 1200, height: 630, style: 'editorial' as const },
	social: { key: 'social-minimal', width: 1080, height: 1080, style: 'minimal' as const },
	email: { key: 'email-banner', width: 600, height: 200, style: 'editorial' as const }
} as const;

export const compositionIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export type CompositionCopy = {
	headline: string;
	lede: string;
	cta: string;
};

export type CompositionTokens = {
	background: string;
	text: string;
	accent: string;
	fontFamily: string;
};

export function compositionKindLabel(kind: CompositionKind) {
	if (kind === 'og') return 'Open Graph';
	if (kind === 'social') return 'Social';
	return 'Email';
}

export function clipCompositionText(value: string, max: number) {
	const trimmed = value.trim().replace(/\s+/g, ' ');
	if (trimmed.length <= max) return trimmed;
	return `${trimmed.slice(0, Math.max(1, max - 1)).trimEnd()}…`;
}

export function buildCompositionCopy(brand: {
	displayName: string;
	tagline?: string | null;
	offer?: string | null;
	audience?: string | null;
	primaryConversion?: string | null;
}): CompositionCopy {
	const headline = clipCompositionText(brand.displayName, 72);
	if (!headline) throw new ValidationError('Brand profile is required');
	const lede = clipCompositionText(brand.tagline || brand.offer || brand.audience || '', 140);
	const cta = clipCompositionText(brand.primaryConversion || '', 40);
	return {
		headline,
		lede: lede || headline,
		cta: cta || 'Learn more'
	};
}

function relativeLuminance(hex: string) {
	const n = hex.replace('#', '');
	const toLin = (slice: string) => {
		const c = parseInt(slice, 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return (
		0.2126 * toLin(n.slice(0, 2)) + 0.7152 * toLin(n.slice(2, 4)) + 0.0722 * toLin(n.slice(4, 6))
	);
}

export function contrastingInk(background: string) {
	return relativeLuminance(background) > 0.45 ? '#111111' : '#F7F7F5';
}

export function resolveCompositionTokens(input: {
	brandTokens?: {
		accent?: string;
		background?: string;
		text?: string;
		fontFamily?: string;
	} | null;
	profile?: {
		status: string;
		primaryColor: string | null;
		accentColor: string | null;
		primaryFont: string | null;
	} | null;
}): CompositionTokens {
	const tokens = input.brandTokens ?? {};
	const confirmed = input.profile?.status === 'confirmed';
	const background =
		(confirmed ? normalizeBrandColor(input.profile?.primaryColor) : null) ??
		normalizeBrandColor(tokens.background) ??
		normalizeBrandColor(tokens.accent) ??
		'#111111';
	let accent =
		(confirmed ? normalizeBrandColor(input.profile?.accentColor) : null) ??
		normalizeBrandColor(tokens.accent) ??
		background;
	if (accent === background) accent = contrastingInk(background);
	const fontFamily =
		(confirmed && input.profile?.primaryFont?.trim() ? input.profile.primaryFont.trim() : null) ??
		(tokens.fontFamily?.trim() ? tokens.fontFamily.trim() : null) ??
		'Georgia, serif';
	let text = normalizeBrandColor(tokens.text) ?? contrastingInk(background);
	if (text === background) text = contrastingInk(background);
	return { background, text, accent, fontFamily };
}

export function compositionSvgHitsProhibitedStyle(
	svg: string,
	prohibited: readonly string[]
): string | null {
	const hay = svg.toLowerCase();
	for (const style of prohibited) {
		const item = style.trim().toLowerCase();
		if (item.length >= 2 && hay.includes(item)) return style.trim();
	}
	return null;
}

export function compositionTemplatesAvoidDefaultProhibited() {
	const declared = COMPOSITION_TEMPLATE_STYLES.join(' ').toLowerCase();
	return !DEFAULT_PROHIBITED_STYLES.some((item) => declared.includes(item.toLowerCase()));
}
