import { z } from 'zod';
import type { AssetMediaStrategy } from './asset-sufficiency';

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
};

export type VisualDirectionConstraints = {
	mediaStrategy: AssetMediaStrategy;
	hasLogo: boolean;
	personality: string | null;
	hasApprovedClaims: boolean;
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
	return reindex(picked);
}

export function acceptVisualDirectionProposal(
	candidates: VisualDirectionManifest[],
	constraints: VisualDirectionConstraints
) {
	const compatible = candidates.filter((item) => directionIsCompatible(item, constraints).ok);
	if (compatible.length >= 2 && candidatesAreDiverse(compatible)) {
		return { ok: true as const, source: 'ai_proposed' as const, candidates: reindex(compatible) };
	}
	return {
		ok: false as const,
		source: 'deterministic' as const,
		candidates: enumerateVisualDirectionCandidates(constraints)
	};
}

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
		mediaStrategy: z.enum(['authentic', 'hybrid', 'typography_led'])
	})
	.strict();

export const visualDirectionProposalSchema = z
	.object({
		candidates: z.array(visualDirectionManifestSchema).min(2).max(4)
	})
	.strict();

export type VisualDirectionProposal = z.infer<typeof visualDirectionProposalSchema>;
