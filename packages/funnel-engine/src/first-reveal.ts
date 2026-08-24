import { isHeroSection, isTypographyLedHeroType, type PageDocument } from './schema';

export const FIRST_REVEAL_GATE_VERSION = 1;

export const FIRST_REVEAL_CHECK_KEYS = [
	'headline',
	'placeholder_copy',
	'preview_noindex',
	'primary_cta',
	'hero_identity',
	'known_hero'
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

	return {
		version: FIRST_REVEAL_GATE_VERSION,
		passed: checks.every((item) => item.passed),
		checks
	};
}
