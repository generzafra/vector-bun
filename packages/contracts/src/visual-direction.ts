import { z } from 'zod';
import type { AssetMediaStrategy } from './asset-sufficiency';
import { DEFAULT_PROHIBITED_STYLES } from './brand-visual';

export const DEFAULT_VISUAL_DIRECTION_CANDIDATES = 3;
export const VISUAL_DIRECTION_SCORING_VERSION = 1;

export const VISUAL_DIRECTION_SOURCES = ['deterministic', 'ai_proposed'] as const;
export type VisualDirectionSource = (typeof VISUAL_DIRECTION_SOURCES)[number];

export const VISUAL_DIRECTION_STATUSES = ['proposed', 'scored', 'selected', 'rejected'] as const;
export type VisualDirectionStatus = (typeof VISUAL_DIRECTION_STATUSES)[number];

export const VISUAL_DIRECTION_LAYOUTS = ['editorial', 'minimal', 'split'] as const;
export type VisualDirectionLayout = (typeof VISUAL_DIRECTION_LAYOUTS)[number];

export const VISUAL_DIRECTION_DENSITIES = ['air', 'balanced', 'compact'] as const;
export type VisualDirectionDensity = (typeof VISUAL_DIRECTION_DENSITIES)[number];

export const VISUAL_DIRECTION_HEADLINE_CHARS = ['restrained', 'direct', 'editorial'] as const;
export type VisualDirectionHeadlineCharacter = (typeof VISUAL_DIRECTION_HEADLINE_CHARS)[number];

export const VISUAL_DIRECTION_HERO_VARIANTS = [
	'hero-minimal',
	'hero-split',
	'hero-editorial'
] as const;
export type VisualDirectionHeroVariant = (typeof VISUAL_DIRECTION_HERO_VARIANTS)[number];

export const VISUAL_DIRECTION_PROOF_VARIANTS = ['proof', 'proof-featured', 'none'] as const;
export type VisualDirectionProofVariant = (typeof VISUAL_DIRECTION_PROOF_VARIANTS)[number];

export const VISUAL_DIRECTION_SERVICES_VARIANTS = ['services', 'services-editorial'] as const;
export type VisualDirectionServicesVariant = (typeof VISUAL_DIRECTION_SERVICES_VARIANTS)[number];

export const VISUAL_DIRECTION_CTA_VARIANTS = ['cta', 'cta-minimal'] as const;
export type VisualDirectionCtaVariant = (typeof VISUAL_DIRECTION_CTA_VARIANTS)[number];

export const VISUAL_DIRECTION_FIT_LABELS = ['strong', 'ready', 'needs_work'] as const;
export type VisualDirectionFitLabel = (typeof VISUAL_DIRECTION_FIT_LABELS)[number];

export const CREATIVE_EXPERIENCE_BRIEF_VERSION = 1;

export const CREATIVE_BRIEF_EMOTIONS = [
	'trust',
	'desire',
	'clarity',
	'prestige',
	'warmth'
] as const;
export type CreativeBriefEmotion = (typeof CREATIVE_BRIEF_EMOTIONS)[number];

export const CREATIVE_BRIEF_STATEMENT_KINDS = [
	'confirmed_fact',
	'approved_claim',
	'inferred_tone',
	'suggestion'
] as const;
export type CreativeBriefStatementKind = (typeof CREATIVE_BRIEF_STATEMENT_KINDS)[number];

export const CREATIVE_BRIEF_NARRATIVE_STEPS = [
	'promise',
	'mechanism',
	'proof',
	'offer',
	'action'
] as const;

export const CREATIVE_BRIEF_MOBILE_HEROES = ['typography_first', 'stack'] as const;
export type CreativeBriefMobileHero = (typeof CREATIVE_BRIEF_MOBILE_HEROES)[number];

export type CreativeBriefSource = {
	displayName: string;
	audience: string;
	offer: string;
	primaryConversion: string;
	approvedClaims?: readonly string[];
	prohibitedClaims?: readonly string[];
	photographyDirection?: string | null;
	prohibitedStyles?: readonly string[];
};

export type CreativeExperienceBrief = {
	schemaVersion: typeof CREATIVE_EXPERIENCE_BRIEF_VERSION;
	provenance: {
		source: 'confirmed_knowledge';
		inputLabels: string[];
	};
	narrative: {
		audience: string;
		primaryConversion: string;
		offer: string;
	};
	statements: Array<{ kind: CreativeBriefStatementKind; text: string }>;
	emotionalPromise: CreativeBriefEmotion;
	visualMotifs: string[];
	prohibitedTreatments: string[];
	narrativePlan: Array<(typeof CREATIVE_BRIEF_NARRATIVE_STEPS)[number]>;
	unknowns: string[];
	confidence: 'inferred';
	fitRationale: string;
	mobileHero: CreativeBriefMobileHero;
};

export type VisualDirectionManifest = {
	candidateIndex: number;
	name: string;
	rationale: string;
	layoutCharacter: VisualDirectionLayout;
	density: VisualDirectionDensity;
	headlineCharacter: VisualDirectionHeadlineCharacter;
	heroVariant: VisualDirectionHeroVariant;
	proofVariant: VisualDirectionProofVariant;
	servicesVariant: VisualDirectionServicesVariant;
	ctaVariant: VisualDirectionCtaVariant;
	mediaStrategy: AssetMediaStrategy;
	experience?: CreativeExperienceBrief;
};

export type VisualDirectionConstraints = {
	mediaStrategy: AssetMediaStrategy;
	hasLogo: boolean;
	personality: string | null;
	hasApprovedClaims: boolean;
	brief?: CreativeBriefSource;
};

export type VisualDirectionScoreBreakdown = {
	brand: number;
	conversion: number;
	visual: number;
	content: number;
	media: number;
	originality: number;
	mobile: number;
	accessibility: number;
	performance: number;
};

function clampScore(value: number) {
	if (value < 0) return 0;
	if (value > 100) return 100;
	return Math.round(value);
}

export function overallVisualDirectionScore(dimensions: VisualDirectionScoreBreakdown) {
	return clampScore(
		dimensions.brand * 0.2 +
			dimensions.conversion * 0.2 +
			dimensions.visual * 0.2 +
			dimensions.content * 0.1 +
			dimensions.media * 0.1 +
			dimensions.originality * 0.05 +
			dimensions.mobile * 0.05 +
			dimensions.accessibility * 0.05 +
			dimensions.performance * 0.05
	);
}

export function visualDirectionFitLabel(total: number): VisualDirectionFitLabel {
	if (total >= 80) return 'strong';
	if (total >= 60) return 'ready';
	return 'needs_work';
}

export function visualDirectionFitCopy(fit: VisualDirectionFitLabel) {
	if (fit === 'strong') return 'Strong fit';
	if (fit === 'ready') return 'Ready';
	return 'Needs work';
}

export function directionIsCompatible(
	manifest: VisualDirectionManifest,
	constraints: Pick<VisualDirectionConstraints, 'mediaStrategy' | 'hasLogo'>
) {
	if (manifest.heroVariant === 'hero-split' && constraints.mediaStrategy === 'typography_led') {
		return { ok: false as const, reason: 'Typography-led previews cannot use a split hero.' };
	}
	if (manifest.heroVariant === 'hero-split' && !constraints.hasLogo) {
		return { ok: false as const, reason: 'A split hero needs a confirmed logo.' };
	}
	if (manifest.mediaStrategy === 'typography_led' && manifest.heroVariant === 'hero-split') {
		return { ok: false as const, reason: 'Typography-led directions cannot use a split hero.' };
	}
	return { ok: true as const };
}

function identityKey(manifest: VisualDirectionManifest) {
	return [
		manifest.heroVariant,
		manifest.servicesVariant,
		manifest.ctaVariant,
		manifest.density,
		manifest.layoutCharacter
	].join(':');
}

export function candidatesAreDiverse(candidates: VisualDirectionManifest[]) {
	if (candidates.length < 2) return false;
	const keys = new Set(candidates.map(identityKey));
	if (keys.size !== candidates.length) return false;
	const heroes = new Set(candidates.map((item) => item.heroVariant));
	if (heroes.size < 2) return false;
	return true;
}

export function selectWinningCandidateIndex(
	scored: Array<{ candidateIndex: number; total: number }>
) {
	if (scored.length === 0) return 0;
	const ranked = [...scored].sort(
		(left, right) => right.total - left.total || left.candidateIndex - right.candidateIndex
	);
	return ranked[0]?.candidateIndex ?? 0;
}

const UNSAFE_BRIEF_TEXT = /[<>]|javascript:|\{@html/i;

function plainBriefText(value: string, max: number) {
	const trimmed = value.trim().slice(0, max);
	if (!trimmed || UNSAFE_BRIEF_TEXT.test(trimmed)) return null;
	return trimmed;
}

function overlapsProhibited(value: string, prohibited: readonly string[]) {
	const hay = value.toLowerCase();
	return prohibited.some((item) => {
		const needle = item.trim().toLowerCase();
		return needle.length > 0 && hay.includes(needle);
	});
}

function emotionForPersonality(personality: string | null): CreativeBriefEmotion {
	if (personality === 'premium') return 'prestige';
	if (personality === 'creative') return 'warmth';
	if (personality === 'technology' || personality === 'growth') return 'clarity';
	return 'trust';
}

function fitRationale(layout: VisualDirectionLayout, displayName: string) {
	const who = displayName || 'This business';
	if (layout === 'editorial') {
		return `${who} gets a quieter first screen that follows the confirmed offer.`;
	}
	if (layout === 'split') {
		return `${who} gets the offer beside a short supporting note.`;
	}
	return `${who} gets a direct first screen with the next step easy to find.`;
}

export function deriveCreativeExperienceBrief(
	constraints: VisualDirectionConstraints,
	layoutCharacter: VisualDirectionLayout
): CreativeExperienceBrief | null {
	const source = constraints.brief;
	if (!source) return null;
	const audience = plainBriefText(source.audience, 400);
	const offer = plainBriefText(source.offer, 400);
	const primaryConversion = plainBriefText(source.primaryConversion, 160);
	if (!audience || !offer || !primaryConversion) return null;
	const prohibited = (source.prohibitedClaims ?? [])
		.map((item) => plainBriefText(item, 400))
		.filter((item): item is string => Boolean(item));
	if (
		overlapsProhibited(audience, prohibited) ||
		overlapsProhibited(offer, prohibited) ||
		overlapsProhibited(primaryConversion, prohibited)
	) {
		return null;
	}
	const displayName = plainBriefText(source.displayName, 120) ?? 'This business';
	const approved = (source.approvedClaims ?? [])
		.map((item) => plainBriefText(item, 400))
		.filter((item): item is string => Boolean(item))
		.filter((item) => !overlapsProhibited(item, prohibited))
		.slice(0, 3);
	const styleList =
		source.prohibitedStyles && source.prohibitedStyles.length > 0
			? source.prohibitedStyles
			: DEFAULT_PROHIBITED_STYLES;
	const prohibitedTreatments = styleList
		.map((item) => plainBriefText(item, 80))
		.filter((item): item is string => Boolean(item))
		.slice(0, 12);
	const photography = source.photographyDirection
		? plainBriefText(source.photographyDirection, 80)
		: null;
	const motif =
		photography &&
		!overlapsProhibited(photography, prohibited) &&
		!overlapsProhibited(photography, prohibitedTreatments)
			? photography
			: null;
	const emotion = emotionForPersonality(constraints.personality);
	const statements: CreativeExperienceBrief['statements'] = [
		{ kind: 'confirmed_fact', text: audience },
		{ kind: 'confirmed_fact', text: offer },
		{ kind: 'confirmed_fact', text: primaryConversion },
		...approved.map((text) => ({ kind: 'approved_claim' as const, text })),
		{
			kind: 'inferred_tone',
			text: `The page should feel like ${emotion}.`
		}
	];
	const unknowns: string[] = [];
	if (approved.length === 0) unknowns.push('No approved claim is on file.');
	if (!motif) unknowns.push('No confirmed photography direction is on file.');
	if (!constraints.hasLogo || constraints.mediaStrategy === 'typography_led') {
		statements.push({
			kind: 'suggestion',
			text: 'Keep the first screen typographic until a confirmed photo is available.'
		});
		if (!constraints.hasLogo) unknowns.push('No logo is confirmed.');
	}
	const inputLabels = ['audience', 'offer', 'primary_conversion'];
	if (approved.length > 0) inputLabels.push('approved_claims');
	if (motif) inputLabels.push('photography_direction');
	if (prohibitedTreatments.length > 0) inputLabels.push('prohibited_styles');
	const brief: CreativeExperienceBrief = {
		schemaVersion: CREATIVE_EXPERIENCE_BRIEF_VERSION,
		provenance: { source: 'confirmed_knowledge', inputLabels },
		narrative: { audience, offer, primaryConversion },
		statements,
		emotionalPromise: emotion,
		visualMotifs: motif ? [motif] : [],
		prohibitedTreatments,
		narrativePlan: ['promise', 'mechanism', 'proof', 'offer', 'action'],
		unknowns,
		confidence: 'inferred',
		fitRationale: fitRationale(layoutCharacter, displayName),
		mobileHero:
			constraints.mediaStrategy === 'typography_led' || !constraints.hasLogo
				? 'typography_first'
				: 'stack'
	};
	return creativeExperienceBriefSchema.safeParse(brief).success ? brief : null;
}

function briefTextOf(manifest: VisualDirectionManifest) {
	return [manifest.name, manifest.rationale].join('\n');
}

function attachBrief(
	candidates: VisualDirectionManifest[],
	constraints: VisualDirectionConstraints
) {
	if (!constraints.brief) return candidates;
	return candidates.map((item) => {
		const experience = deriveCreativeExperienceBrief(constraints, item.layoutCharacter);
		if (!experience) {
			const { experience: _ignored, ...rest } = item;
			return rest;
		}
		return { ...item, experience };
	});
}

function manifest(
	input: Omit<VisualDirectionManifest, 'candidateIndex'> & { candidateIndex?: number }
): VisualDirectionManifest {
	return {
		candidateIndex: input.candidateIndex ?? 0,
		name: input.name,
		rationale: input.rationale,
		layoutCharacter: input.layoutCharacter,
		density: input.density,
		headlineCharacter: input.headlineCharacter,
		heroVariant: input.heroVariant,
		proofVariant: input.proofVariant,
		servicesVariant: input.servicesVariant,
		ctaVariant: input.ctaVariant,
		mediaStrategy: input.mediaStrategy
	};
}

function typeLedCandidates(constraints: VisualDirectionConstraints): VisualDirectionManifest[] {
	const proof = constraints.hasApprovedClaims ? 'proof-featured' : 'none';
	const compactProof = constraints.hasApprovedClaims ? 'proof' : 'none';
	return [
		manifest({
			candidateIndex: 0,
			name: 'Editorial type and layout',
			rationale:
				'A quieter first screen that leads with type so the offer is clear without extra photos.',
			layoutCharacter: 'editorial',
			density: 'air',
			headlineCharacter: 'editorial',
			heroVariant: 'hero-editorial',
			proofVariant: proof,
			servicesVariant: 'services-editorial',
			ctaVariant: 'cta-minimal',
			mediaStrategy: 'typography_led'
		}),
		manifest({
			candidateIndex: 1,
			name: 'Clear conversion',
			rationale:
				'A direct path from the offer to the request form, still using type and layout instead of a photo hero.',
			layoutCharacter: 'minimal',
			density: 'balanced',
			headlineCharacter: 'direct',
			heroVariant: 'hero-minimal',
			proofVariant: compactProof,
			servicesVariant: 'services',
			ctaVariant: 'cta',
			mediaStrategy: 'typography_led'
		}),
		manifest({
			candidateIndex: 2,
			name: 'Structured proof',
			rationale:
				'Keeps the page compact and puts confirmed statements near the offer so the next step is obvious.',
			layoutCharacter: 'minimal',
			density: 'compact',
			headlineCharacter: 'restrained',
			heroVariant: 'hero-minimal',
			proofVariant: proof,
			servicesVariant: 'services-editorial',
			ctaVariant: 'cta-minimal',
			mediaStrategy: 'typography_led'
		})
	];
}

function mediaLedCandidates(constraints: VisualDirectionConstraints): VisualDirectionManifest[] {
	const proof = constraints.hasApprovedClaims ? 'proof-featured' : 'none';
	const compactProof = constraints.hasApprovedClaims ? 'proof' : 'none';
	return [
		manifest({
			candidateIndex: 0,
			name: 'Editorial premium',
			rationale: 'A calmer, type-forward layout that still leaves room for your brand and proof.',
			layoutCharacter: 'editorial',
			density: 'air',
			headlineCharacter: 'editorial',
			heroVariant: 'hero-editorial',
			proofVariant: proof,
			servicesVariant: 'services-editorial',
			ctaVariant: 'cta-minimal',
			mediaStrategy: constraints.mediaStrategy
		}),
		manifest({
			candidateIndex: 1,
			name: 'Clear conversion',
			rationale: 'Puts the offer beside a supporting panel so the next step is obvious.',
			layoutCharacter: 'split',
			density: 'balanced',
			headlineCharacter: 'direct',
			heroVariant: 'hero-split',
			proofVariant: compactProof,
			servicesVariant: 'services',
			ctaVariant: 'cta',
			mediaStrategy: constraints.mediaStrategy
		}),
		manifest({
			candidateIndex: 2,
			name: 'Quiet type-led',
			rationale: 'A simpler first screen if photos should stay supporting rather than dominant.',
			layoutCharacter: 'minimal',
			density: 'compact',
			headlineCharacter: 'restrained',
			heroVariant: 'hero-minimal',
			proofVariant: compactProof,
			servicesVariant: 'services',
			ctaVariant: 'cta-minimal',
			mediaStrategy: constraints.mediaStrategy
		})
	];
}

function reindex(candidates: VisualDirectionManifest[]) {
	return candidates.slice(0, DEFAULT_VISUAL_DIRECTION_CANDIDATES).map((item, index) => ({
		...item,
		candidateIndex: index
	}));
}

export function enumerateVisualDirectionCandidates(constraints: VisualDirectionConstraints) {
	const raw =
		constraints.mediaStrategy === 'typography_led' || !constraints.hasLogo
			? typeLedCandidates(constraints)
			: mediaLedCandidates(constraints);
	const compatible = raw.filter((item) => directionIsCompatible(item, constraints).ok);
	const fallback = typeLedCandidates({ ...constraints, mediaStrategy: 'typography_led' }).filter(
		(item) => directionIsCompatible(item, { ...constraints, mediaStrategy: 'typography_led' }).ok
	);
	const picked = compatible.length >= 2 ? compatible : fallback;
	return attachBrief(reindex(picked), constraints);
}

export function acceptVisualDirectionProposal(
	candidates: VisualDirectionManifest[],
	constraints: VisualDirectionConstraints
) {
	const prohibited = constraints.brief?.prohibitedClaims ?? [];
	const compatible = candidates.filter((item) => {
		if (!directionIsCompatible(item, constraints).ok) return false;
		return !overlapsProhibited(briefTextOf(item), prohibited);
	});
	if (compatible.length >= 2 && candidatesAreDiverse(compatible)) {
		return {
			ok: true as const,
			source: 'ai_proposed' as const,
			candidates: attachBrief(reindex(compatible), constraints)
		};
	}
	return {
		ok: false as const,
		source: 'deterministic' as const,
		candidates: enumerateVisualDirectionCandidates(constraints)
	};
}

const briefPlain = (min: number, max: number) =>
	z
		.string()
		.trim()
		.min(min)
		.max(max)
		.refine((value) => !UNSAFE_BRIEF_TEXT.test(value), 'Plain text only');

export const creativeExperienceBriefSchema = z
	.object({
		schemaVersion: z.literal(CREATIVE_EXPERIENCE_BRIEF_VERSION),
		provenance: z
			.object({
				source: z.literal('confirmed_knowledge'),
				inputLabels: z.array(briefPlain(2, 40)).min(1).max(8)
			})
			.strict(),
		narrative: z
			.object({
				audience: briefPlain(1, 400),
				primaryConversion: briefPlain(1, 160),
				offer: briefPlain(1, 400)
			})
			.strict(),
		statements: z
			.array(
				z
					.object({
						kind: z.enum(CREATIVE_BRIEF_STATEMENT_KINDS),
						text: briefPlain(1, 400)
					})
					.strict()
			)
			.min(1)
			.max(8),
		emotionalPromise: z.enum(CREATIVE_BRIEF_EMOTIONS),
		visualMotifs: z.array(briefPlain(1, 80)).max(4),
		prohibitedTreatments: z.array(briefPlain(2, 80)).max(12),
		narrativePlan: z.array(z.enum(CREATIVE_BRIEF_NARRATIVE_STEPS)).min(3).max(5),
		unknowns: z.array(briefPlain(1, 200)).max(6),
		confidence: z.literal('inferred'),
		fitRationale: briefPlain(12, 400),
		mobileHero: z.enum(CREATIVE_BRIEF_MOBILE_HEROES)
	})
	.strict();

export const visualDirectionManifestSchema = z
	.object({
		candidateIndex: z.number().int().min(0).max(7),
		name: z.string().trim().min(2).max(80),
		rationale: z.string().trim().min(12).max(400),
		layoutCharacter: z.enum(VISUAL_DIRECTION_LAYOUTS),
		density: z.enum(VISUAL_DIRECTION_DENSITIES),
		headlineCharacter: z.enum(VISUAL_DIRECTION_HEADLINE_CHARS),
		heroVariant: z.enum(VISUAL_DIRECTION_HERO_VARIANTS),
		proofVariant: z.enum(VISUAL_DIRECTION_PROOF_VARIANTS),
		servicesVariant: z.enum(VISUAL_DIRECTION_SERVICES_VARIANTS),
		ctaVariant: z.enum(VISUAL_DIRECTION_CTA_VARIANTS),
		mediaStrategy: z.enum(['authentic', 'hybrid', 'typography_led']),
		experience: creativeExperienceBriefSchema.optional()
	})
	.strict();

export const visualDirectionProposalSchema = z
	.object({
		candidates: z.array(visualDirectionManifestSchema).min(2).max(4)
	})
	.strict();

export type VisualDirectionProposal = z.infer<typeof visualDirectionProposalSchema>;
