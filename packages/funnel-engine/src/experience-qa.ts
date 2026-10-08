import { isHeroSection, type PageDocument } from './schema';

export const GEOMETRY_VIEWPORTS = [320, 390, 768, 1440] as const;
export type GeometryViewport = (typeof GEOMETRY_VIEWPORTS)[number];

export type GeometryCheck = {
	viewport: GeometryViewport;
	key: 'form_fits' | 'action_target' | 'subject_anchor';
	status: 'pass' | 'fail' | 'warning';
	detail: string;
};

export type GeometryReport = {
	version: 1;
	pixelScreenshot: false;
	checks: GeometryCheck[];
	passed: boolean;
};

export type DesignFingerprintV1 = {
	version: 1;
	hero: string;
	sections: string;
	widths: string;
	motion: 'm0' | 'm1' | 'm2' | 'unset';
	media: 'photo' | 'type';
};

export type ExperienceBlocker = {
	key:
		'prohibited_claim' | 'primary_cta' | 'preview_noindex' | 'visual_contrast' | 'other_identity';
	detail: string;
};

const PHONE_VIEWPORTS = new Set<GeometryViewport>([320, 390]);

function leadForm(document: PageDocument) {
	return document.sections.find((section) => section.type === 'lead-form');
}

function primaryCta(document: PageDocument) {
	const hero = document.sections.find(isHeroSection);
	if (hero && 'primaryCta' in hero) return hero.primaryCta;
	return null;
}

function pageText(document: PageDocument) {
	return JSON.stringify(document).toLowerCase();
}

export function evaluateViewportGeometry(document: PageDocument): GeometryReport {
	const checks = GEOMETRY_VIEWPORTS.flatMap((viewport) => [
		formFits(document, viewport),
		actionTarget(document, viewport),
		subjectAnchor(document, viewport)
	]);
	return {
		version: 1,
		pixelScreenshot: false,
		checks,
		passed: checks.every((item) => item.status !== 'fail')
	};
}

function formFits(document: PageDocument, viewport: GeometryViewport): GeometryCheck {
	const form = leadForm(document);
	if (!form || form.type !== 'lead-form') {
		return { viewport, key: 'form_fits', status: 'pass', detail: 'No request form to fit.' };
	}
	const width = form.widthMode ?? 'contained';
	const phone = PHONE_VIEWPORTS.has(viewport);
	if (phone && width !== 'contained') {
		return {
			viewport,
			key: 'form_fits',
			status: 'fail',
			detail: `The request form is ${width} at ${viewport}px.`
		};
	}
	return {
		viewport,
		key: 'form_fits',
		status: 'pass',
		detail: `The request form stays contained at ${viewport}px.`
	};
}

function actionTarget(document: PageDocument, viewport: GeometryViewport): GeometryCheck {
	const cta = primaryCta(document);
	const href = cta?.href?.trim() ?? '';
	if (!href.startsWith('#')) {
		return {
			viewport,
			key: 'action_target',
			status: href ? 'pass' : 'fail',
			detail: href ? 'The action leaves this page.' : 'The primary action has no target.'
		};
	}
	const id = href.slice(1);
	const found = document.sections.some((section) => section.id === id);
	return {
		viewport,
		key: 'action_target',
		status: found ? 'pass' : 'fail',
		detail: found
			? `The action reaches #${id} at ${viewport}px.`
			: `The action points at #${id}, which is not on the page.`
	};
}

function subjectAnchor(document: PageDocument, viewport: GeometryViewport): GeometryCheck {
	const hero = document.sections.find(isHeroSection);
	if (!hero || !('mediaAssetId' in hero) || !hero.mediaAssetId) {
		return {
			viewport,
			key: 'subject_anchor',
			status: 'pass',
			detail: 'No placed photo to crop.'
		};
	}
	const x = hero.focalX ?? 5000;
	const y = hero.focalY ?? 5000;
	const edge = x <= 1000 || x >= 9000 || y <= 1000 || y >= 9000;
	if (PHONE_VIEWPORTS.has(viewport) && edge) {
		return {
			viewport,
			key: 'subject_anchor',
			status: 'warning',
			detail: `The focal point sits on the edge at ${viewport}px.`
		};
	}
	return {
		viewport,
		key: 'subject_anchor',
		status: 'pass',
		detail: `The focal point stays in frame at ${viewport}px.`
	};
}

export function designFingerprint(document: PageDocument): DesignFingerprintV1 {
	const hero = document.sections.find(isHeroSection);
	const photo = Boolean(hero && 'mediaAssetId' in hero && hero.mediaAssetId);
	return {
		version: 1,
		hero: hero?.type ?? 'none',
		sections: document.sections.map((section) => section.type).join('>'),
		widths: document.sections
			.map((section) => ('widthMode' in section ? (section.widthMode ?? 'contained') : 'contained'))
			.join('>'),
		motion: document.theme.motionPreset ?? 'unset',
		media: photo ? 'photo' : 'type'
	};
}

export function fingerprintSimilarity(left: DesignFingerprintV1, right: DesignFingerprintV1) {
	let score = 0;
	if (left.hero === right.hero) score += 25;
	if (left.sections === right.sections) score += 25;
	if (left.widths === right.widths) score += 20;
	if (left.motion === right.motion) score += 15;
	if (left.media === right.media) score += 15;
	return score;
}

export function similarityWarning(score: number) {
	return score >= 85;
}

export function experienceHardBlockers(input: {
	document: PageDocument;
	preview: boolean;
	prohibitedClaims: string[];
	otherIdentities: string[];
}): ExperienceBlocker[] {
	const text = pageText(input.document);
	const blockers: ExperienceBlocker[] = [];
	for (const claim of input.prohibitedClaims) {
		const needle = claim.trim().toLowerCase();
		if (needle.length >= 8 && text.includes(needle)) {
			blockers.push({ key: 'prohibited_claim', detail: 'A prohibited claim is on the page.' });
			break;
		}
	}
	for (const name of input.otherIdentities) {
		const needle = name.trim().toLowerCase();
		if (needle.length >= 4 && text.includes(needle)) {
			blockers.push({ key: 'other_identity', detail: 'Another client identity is on the page.' });
			break;
		}
	}
	const cta = primaryCta(input.document);
	if (!cta?.label?.trim() || !cta.href?.trim()) {
		blockers.push({ key: 'primary_cta', detail: 'The primary action is missing.' });
	}
	if (input.preview && !input.document.seo.noindex) {
		blockers.push({ key: 'preview_noindex', detail: 'A preview page is indexable.' });
	}
	const background = input.document.theme.tokens.background;
	const foreground = input.document.theme.tokens.text;
	if (background && foreground && background.toLowerCase() === foreground.toLowerCase()) {
		blockers.push({ key: 'visual_contrast', detail: 'Text and background are the same color.' });
	}
	return blockers;
}

export function revealAllowed(input: { visualScore: number; blockers: ExperienceBlocker[] }) {
	if (input.blockers.length > 0) {
		return {
			allowed: false as const,
			visualScore: input.visualScore,
			reason: 'A hard blocker overrides the visual score.'
		};
	}
	return {
		allowed: true as const,
		visualScore: input.visualScore,
		reason: 'No hard blocker is present.'
	};
}
