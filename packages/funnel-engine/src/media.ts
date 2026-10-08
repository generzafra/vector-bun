import type { AssetMediaStrategy } from '@vector/contracts';
import { parsePageDocument, type PageDocument, type PageSection } from './schema';

export const WINNER_DERIVATIVE_WIDTHS = [640, 960, 1440] as const;
export type WinnerDerivativeWidth = (typeof WINNER_DERIVATIVE_WIDTHS)[number];

export type WinnerAssetGap = {
	slot: 'hero' | 'logo';
	status: 'ready' | 'missing' | 'typography_fallback';
	detail: string;
};

const PLAIN_ALT = /^[^<>]*$/;
const UNSAFE_ALT = /javascript:|\{@html/i;

export function winnerAssetGaps(input: {
	mediaStrategy: AssetMediaStrategy;
	hasLogo: boolean;
	approvedHeroAssetId: string | null;
	generationBlocked: boolean;
}): WinnerAssetGap[] {
	const hero = heroGap(input);
	return [
		hero,
		input.hasLogo
			? { slot: 'logo', status: 'ready', detail: 'An approved logo is on file.' }
			: { slot: 'logo', status: 'missing', detail: 'No approved logo is on file.' }
	];
}

function heroGap(input: {
	mediaStrategy: AssetMediaStrategy;
	approvedHeroAssetId: string | null;
	generationBlocked: boolean;
}): WinnerAssetGap {
	if (input.approvedHeroAssetId) {
		return {
			slot: 'hero',
			status: 'ready',
			detail: 'An approved photograph is placed on the winner.'
		};
	}
	if (input.mediaStrategy === 'typography_led' || input.generationBlocked) {
		return {
			slot: 'hero',
			status: 'typography_fallback',
			detail: 'The page stays typography-led.'
		};
	}
	if (input.mediaStrategy === 'authentic') {
		return {
			slot: 'hero',
			status: 'typography_fallback',
			detail:
				'Authentic media is not generated. The page stays typography-led until an approved photo exists.'
		};
	}
	return {
		slot: 'hero',
		status: 'missing',
		detail:
			'One supporting photo can be drafted for the winner. It is not placed until it is approved.'
	};
}

export function responsiveDerivativePlan(input: { focalX: number; focalY: number; alt: string }) {
	return WINNER_DERIVATIVE_WIDTHS.map((widthPx) => ({
		slot: 'hero' as const,
		widthPx,
		focalX: input.focalX,
		focalY: input.focalY,
		alt: input.alt,
		status: 'planned' as const
	}));
}

type HeroSection = Extract<PageSection, { type: 'hero-minimal' | 'hero-split' | 'hero-editorial' }>;

function isHero(section: PageSection): section is HeroSection {
	return (
		section.type === 'hero-minimal' ||
		section.type === 'hero-split' ||
		section.type === 'hero-editorial'
	);
}

export function placeWinnerMedia(
	document: PageDocument,
	decision:
		| { kind: 'typography' }
		| { kind: 'place'; assetId: string; alt: string; focalX: number; focalY: number }
): PageDocument {
	if (decision.kind === 'place') {
		if (!PLAIN_ALT.test(decision.alt) || UNSAFE_ALT.test(decision.alt)) {
			return placeWinnerMedia(document, { kind: 'typography' });
		}
	}
	const sections = document.sections.map((section) => {
		if (!isHero(section)) return section;
		if (decision.kind === 'typography') {
			const { mediaAssetId: _asset, mediaAlt: _alt, focalX: _x, focalY: _y, ...rest } = section;
			return { ...rest, mobileTreatment: 'typography_first' as const };
		}
		return {
			...section,
			mediaAssetId: decision.assetId,
			mediaAlt: decision.alt,
			focalX: decision.focalX,
			focalY: decision.focalY
		};
	});
	return parsePageDocument({ ...document, sections });
}
