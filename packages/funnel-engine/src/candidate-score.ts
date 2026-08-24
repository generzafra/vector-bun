import { isHeroSection, type PageDocument } from './schema';
import { evaluateFirstRevealGate } from './first-reveal';
import type { VisualDirectionManifest, VisualDirectionScoreBreakdown } from '@vector/contracts';
import { overallVisualDirectionScore } from '@vector/contracts';

export function scoreVisualDirection(input: {
	document: PageDocument;
	manifest: VisualDirectionManifest;
	hasLogo: boolean;
	personality: string | null;
	preview: boolean;
}): { total: number; dimensions: VisualDirectionScoreBreakdown } {
	const gate = evaluateFirstRevealGate({
		document: input.document,
		preview: input.preview,
		hasLogo: input.hasLogo
	});
	const hero = input.document.sections.find(isHeroSection);
	const heroType = hero?.type ?? input.manifest.heroVariant;
	const placeholderFailed =
		gate.checks.find((item) => item.key === 'placeholder_copy')?.passed === false;
	const conversionPassed = Boolean(
		gate.checks.find((item) => item.key === 'primary_cta')?.passed &&
		gate.checks.find((item) => item.key === 'headline')?.passed
	);
	const knownHero = Boolean(gate.checks.find((item) => item.key === 'known_hero')?.passed);
	const editorialPersonality = input.personality === 'premium' || input.personality === 'creative';
	const quietPersonality = input.personality === 'technology' || input.personality === 'growth';

	let brand = 70;
	if (editorialPersonality && heroType === 'hero-editorial') brand = 95;
	else if (editorialPersonality && heroType === 'hero-minimal') brand = 75;
	else if (quietPersonality && heroType === 'hero-minimal') brand = 95;
	else if (input.personality === 'corporate' && heroType === 'hero-split' && input.hasLogo)
		brand = 90;
	else if (heroType === 'hero-split' && !input.hasLogo) brand = 20;

	const conversion = conversionPassed ? 90 : 40;
	let visual = knownHero ? 80 : 30;
	if (placeholderFailed) visual = 10;
	if (input.manifest.density === 'air' && heroType === 'hero-editorial')
		visual = Math.max(visual, 85);

	const content = input.document.narrative.audience && input.document.narrative.offer ? 90 : 40;

	let media = 70;
	if (input.manifest.mediaStrategy === 'typography_led') {
		media = heroType === 'hero-split' ? 10 : 90;
	} else if (heroType === 'hero-split' && input.hasLogo) {
		media = 85;
	}

	const originality =
		new Set([input.manifest.heroVariant, input.manifest.servicesVariant, input.manifest.density])
			.size >= 3
			? 80
			: 55;

	const mobile = heroType === 'hero-split' ? 70 : 85;
	const accessibility = input.document.sections.some((section) => section.type === 'lead-form')
		? 85
		: 40;
	const performance = heroType === 'hero-split' ? 70 : 90;

	const dimensions: VisualDirectionScoreBreakdown = {
		brand,
		conversion,
		visual,
		content,
		media,
		originality,
		mobile,
		accessibility,
		performance
	};
	return { total: overallVisualDirectionScore(dimensions), dimensions };
}
