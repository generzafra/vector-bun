import { isHeroSection, isTypographyLedHeroType, type PageDocument } from './schema';

export const FIRST_REVEAL_GATE_VERSION = 2;

export const FIRST_REVEAL_CHECK_KEYS = [
	'headline',
	'placeholder_copy',
	'preview_noindex',
	'primary_cta',
	'hero_identity',
	'known_hero',
	'visual_contrast',
	'a11y_form',
	'perf_weight',
	'first_screen'
] as const;

export type FirstRevealCheckKey = (typeof FIRST_REVEAL_CHECK_KEYS)[number];

export type FirstRevealCheck = {
	key: FirstRevealCheckKey;
	passed: boolean;
	detail: string;
};

export type FirstRevealGateEvaluation = {
	version: typeof FIRST_REVEAL_GATE_VERSION;
	passed: boolean;
	checks: FirstRevealCheck[];
};

const PLACEHOLDER_PATTERN =
	/\b(lorem ipsum|your logo|placeholder|coming soon|lorem\b|todo:|fixme|xxx+)\b|\[insert/i;

function collectText(value: unknown): string[] {
	if (typeof value === 'string') return [value];
	if (Array.isArray(value)) return value.flatMap(collectText);
	if (value && typeof value === 'object') return Object.values(value).flatMap(collectText);
	return [];
}

function heroOf(document: PageDocument) {
	return document.sections.find(isHeroSection);
}

function check(key: FirstRevealCheckKey, passed: boolean, detail: string): FirstRevealCheck {
	return { key, passed, detail };
}

function channel(hex: string) {
	const n = hex.replace('#', '');
	if (!/^[0-9a-fA-F]{6}$/.test(n)) return null;
	const toLin = (slice: string) => {
		const c = parseInt(slice, 16) / 255;
		return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
	};
	return (
		0.2126 * toLin(n.slice(0, 2)) + 0.7152 * toLin(n.slice(2, 4)) + 0.0722 * toLin(n.slice(4, 6))
	);
}

function contrastRatio(background: string | undefined, text: string | undefined) {
	const bg = background ? channel(background) : null;
	const fg = text ? channel(text) : null;
	if (bg === null || fg === null) return null;
	const lighter = Math.max(bg, fg);
	const darker = Math.min(bg, fg);
	return (lighter + 0.05) / (darker + 0.05);
}

export function evaluateFirstRevealGate(input: {
	document: PageDocument;
	preview: boolean;
	hasLogo: boolean;
}): FirstRevealGateEvaluation {
	const hero = heroOf(input.document);
	const headline = hero?.headline.trim() ?? '';
	const cta =
		hero?.primaryCta ??
		input.document.sections.find((section) => 'primaryCta' in section)?.primaryCta;
	const copy = collectText(input.document).join('\n');
	const knownHero = Boolean(hero);
	const typographyLed = Boolean(hero && isTypographyLedHeroType(hero.type));

	const checks: FirstRevealCheck[] = [
		check(
			'headline',
			headline.length >= 8,
			headline.length >= 8 ? 'Headline is present.' : 'Hero headline is missing or too short.'
		),
		check(
			'placeholder_copy',
			!PLACEHOLDER_PATTERN.test(copy),
			PLACEHOLDER_PATTERN.test(copy)
				? 'Placeholder copy is still on the page.'
				: 'No placeholder copy detected.'
		),
		check(
			'preview_noindex',
			!input.preview || input.document.seo.noindex,
			input.preview
				? input.document.seo.noindex
					? 'Preview is noindex.'
					: 'Preview must stay noindex.'
				: 'Production indexability is not part of this gate.'
		),
		check(
			'primary_cta',
			Boolean(cta?.label?.trim() && cta.href?.trim()),
			cta?.label && cta.href ? 'Primary CTA is present.' : 'Primary CTA is missing.'
		),
		check(
			'hero_identity',
			input.hasLogo || typographyLed,
			input.hasLogo
				? 'Logo is available for the header.'
				: typographyLed
					? 'Typography-led hero is an allowed fallback when no logo is present.'
					: 'Upload a logo or use a typography-led hero.'
		),
		check(
			'known_hero',
			knownHero,
			knownHero ? `Hero variant is ${hero?.type}.` : 'Page is missing an approved hero variant.'
		)
	];
	const ratio = contrastRatio(
		input.document.theme.tokens.background,
		input.document.theme.tokens.text
	);
	checks.push(
		check(
			'visual_contrast',
			ratio === null || ratio >= 3,
			ratio === null
				? 'Theme colors are completed at render when both are set.'
				: ratio >= 3
					? 'Text and background contrast is readable.'
					: 'Text and background are too close in color.'
		)
	);
	const form = input.document.sections.find((section) => section.type === 'lead-form');
	const formReady =
		!form ||
		(form.type === 'lead-form' &&
			form.heading.trim().length >= 3 &&
			form.submitLabel.trim().length >= 2 &&
			form.fields.length > 0);
	checks.push(
		check(
			'a11y_form',
			formReady,
			formReady
				? 'The request form has a heading, labels, and a submit action.'
				: 'The request form is incomplete.'
		)
	);
	const lightEnough = input.document.sections.length > 0 && input.document.sections.length <= 12;
	checks.push(
		check(
			'perf_weight',
			lightEnough,
			lightEnough
				? 'The page stays within a light section count.'
				: 'The page has too many sections for a first preview.'
		)
	);
	checks.push(
		check(
			'first_screen',
			headline.length >= 8 && Boolean(cta?.label?.trim()),
			headline.length >= 8 && cta?.label
				? `First screen: ${headline} — ${cta.label}.`
				: 'The first screen is missing a headline or action.'
		)
	);

	return {
		version: FIRST_REVEAL_GATE_VERSION,
		passed: checks.every((item) => item.passed),
		checks
	};
}
