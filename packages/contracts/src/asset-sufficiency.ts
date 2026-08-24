import type { BrandTokens } from './schemas';

export const ASSET_MEDIA_STRATEGIES = ['authentic', 'hybrid', 'typography_led'] as const;
export type AssetMediaStrategy = (typeof ASSET_MEDIA_STRATEGIES)[number];

export const INDUSTRY_VISUAL_DEPENDENCIES = ['low', 'medium', 'high', 'very_high'] as const;
export type IndustryVisualDependency = (typeof INDUSTRY_VISUAL_DEPENDENCIES)[number];

export type AssetSufficiencyDimensions = {
	brandIdentity: number;
	heroMedia: number;
	serviceMedia: number;
	proofMedia: number;
	teamOrLocationMedia: number;
	productMedia: number;
	caseStudyMedia: number;
	rightsConfidence: number;
};

export type AssetSufficiencyEvaluation = {
	overallScore: number;
	dimensions: AssetSufficiencyDimensions;
	mediaStrategy: AssetMediaStrategy;
	industryVisualDependency: IndustryVisualDependency;
	profileConfirmed: boolean;
	summary: string;
};

function clampScore(value: number) {
	if (value < 0) return 0;
	if (value > 100) return 100;
	return Math.round(value);
}

function mediaAverage(dimensions: AssetSufficiencyDimensions) {
	return Math.round(
		(dimensions.serviceMedia +
			dimensions.proofMedia +
			dimensions.teamOrLocationMedia +
			dimensions.productMedia +
			dimensions.caseStudyMedia) /
			5
	);
}

export function overallAssetSufficiencyScore(dimensions: AssetSufficiencyDimensions) {
	return clampScore(
		dimensions.brandIdentity * 0.3 +
			dimensions.heroMedia * 0.2 +
			mediaAverage(dimensions) * 0.3 +
			dimensions.rightsConfidence * 0.2
	);
}

export function mediaStrategyFromScore(
	score: number,
	dependency: IndustryVisualDependency = 'medium'
): AssetMediaStrategy {
	if (dependency === 'high' || dependency === 'very_high') {
		if (score >= 80) return 'authentic';
		if (score >= 50) return 'hybrid';
		return 'typography_led';
	}
	if (dependency === 'low') {
		if (score >= 80) return 'authentic';
		if (score >= 35) return 'hybrid';
		return 'typography_led';
	}
	if (score >= 80) return 'authentic';
	if (score >= 40) return 'hybrid';
	return 'typography_led';
}

export function parseAssetMediaStrategy(value: string): AssetMediaStrategy {
	if (value === 'authentic' || value === 'hybrid' || value === 'typography_led') return value;
	return 'typography_led';
}

export function assetMediaStrategyLabel(strategy: AssetMediaStrategy) {
	if (strategy === 'authentic') return 'Authentic photos';
	if (strategy === 'hybrid') return 'Brand plus photos';
	return 'Type and layout';
}

export function applyConfirmedBrandVisualToTokens(
	tokens: BrandTokens,
	profile:
		| {
				status: string;
				primaryColor: string | null;
				primaryFont: string | null;
		  }
		| null
		| undefined
): BrandTokens {
	if (profile?.status !== 'confirmed') return tokens;
	return {
		...tokens,
		...(profile.primaryColor ? { accent: profile.primaryColor } : {}),
		...(profile.primaryFont ? { fontFamily: profile.primaryFont } : {})
	};
}

export function assetSufficiencySummary(input: {
	profileConfirmed: boolean;
	mediaStrategy: AssetMediaStrategy;
}) {
	if (!input.profileConfirmed) {
		return 'Confirm brand look first. Vector can still compose a typography-led operator preview.';
	}
	if (input.mediaStrategy === 'typography_led') {
		return 'Your brand is ready. We can create the first direction with type and layout. Adding a few real photos later would make the site stronger.';
	}
	if (input.mediaStrategy === 'hybrid') {
		return 'Your brand is ready. We can create the first direction now. Adding 3–5 real project photos later would make the final site even stronger.';
	}
	return 'Brand look and approved media are ready for an authentic first direction.';
}

export function evaluateAssetSufficiency(input: {
	profileConfirmed: boolean;
	hasLogo: boolean;
	hasPrimaryColor: boolean;
	hasVisualPersonality: boolean;
	publishableCreativeImages: number;
	unknownRightsCreative: number;
	industryVisualDependency?: IndustryVisualDependency;
}): AssetSufficiencyEvaluation {
	const dependency = input.industryVisualDependency ?? 'medium';
	let brandIdentity = 0;
	if (input.profileConfirmed && input.hasPrimaryColor && input.hasVisualPersonality) {
		brandIdentity = input.hasLogo ? 95 : 60;
	}
	const extraImages = Math.max(0, input.publishableCreativeImages);
	let heroMedia = 0;
	if (input.hasLogo && extraImages > 0) heroMedia = 70;
	else if (input.hasLogo) heroMedia = 35;
	else if (extraImages > 0) heroMedia = 40;
	const spread = extraImages >= 2 ? 40 : extraImages === 1 ? 20 : 0;
	let rightsConfidence = 100;
	if (input.unknownRightsCreative > 0 && extraImages === 0) rightsConfidence = 40;
	else if (input.unknownRightsCreative > 0) rightsConfidence = 80;
	const dimensions: AssetSufficiencyDimensions = {
		brandIdentity,
		heroMedia,
		serviceMedia: spread,
		proofMedia: 0,
		teamOrLocationMedia: 0,
		productMedia: extraImages >= 3 ? 20 : 0,
		caseStudyMedia: 0,
		rightsConfidence
	};
	const overallScore = overallAssetSufficiencyScore(dimensions);
	const mediaStrategy = mediaStrategyFromScore(overallScore, dependency);
	return {
		overallScore,
		dimensions,
		mediaStrategy,
		industryVisualDependency: dependency,
		profileConfirmed: input.profileConfirmed,
		summary: assetSufficiencySummary({
			profileConfirmed: input.profileConfirmed,
			mediaStrategy
		})
	};
}
