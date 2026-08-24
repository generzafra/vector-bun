import { ValidationError } from '@vector/contracts';
import {
	isApprovedSectionType,
	isCtaSection,
	isHeroSection,
	parsePageDocument,
	sectionFamily,
	type ApprovedSectionType,
	type PageDocument,
	type PageSection
} from './schema';

export type FunnelPlanApplication = {
	audience: string;
	primaryConversion: string;
	sections: { type: string; purpose: string }[];
};

export type CopyDraftApplication = {
	kind: 'headline' | 'page' | 'cta' | 'email' | 'brief';
	variants: { label: string; text: string }[];
};

function pickSection(base: PageDocument, type: ApprovedSectionType): PageSection | undefined {
	const family = sectionFamily(type);
	if (family !== type) {
		return base.sections.find((section) => sectionFamily(section.type) === family);
	}
	return base.sections.find((section) => section.type === type);
}

export function canMaterializeCopyDraft(kind: CopyDraftApplication['kind']) {
	return kind === 'headline' || kind === 'page' || kind === 'cta';
}

export function applyApprovedFunnelPlan(
	base: PageDocument,
	plan: FunnelPlanApplication
): PageDocument {
	if (plan.sections.length === 0) {
		throw new ValidationError('Funnel plan has no sections');
	}
	const used = new Set<string>();
	const sections: PageSection[] = [];
	for (const item of plan.sections) {
		if (!isApprovedSectionType(item.type)) {
			throw new ValidationError('Funnel plan contains an unapproved section type');
		}
		const section = pickSection(base, item.type);
		if (!section) continue;
		const key = sectionFamily(section.type);
		if (used.has(key)) continue;
		used.add(key);
		sections.push(section);
	}

	if (!sections.some((section) => section.type === 'lead-form')) {
		const lead = base.sections.find((section) => section.type === 'lead-form');
		if (lead) sections.push(lead);
	}

	if (sections.length < 2) {
		throw new ValidationError('Approved plan did not produce a valid page document');
	}

	const audience = (plan.audience || base.narrative.audience).slice(0, 400);
	const primaryConversion = (plan.primaryConversion || base.narrative.primaryConversion).slice(
		0,
		160
	);
	if (!audience || !primaryConversion) {
		throw new ValidationError('Approved plan is missing narrative fields');
	}

	return parsePageDocument({
		...base,
		narrative: {
			audience,
			primaryConversion,
			offer: base.narrative.offer
		},
		seo: {
			...base.seo,
			noindex: true
		},
		sections
	});
}

export function applyApprovedCopy(base: PageDocument, copy: CopyDraftApplication): PageDocument {
	if (!canMaterializeCopyDraft(copy.kind)) {
		throw new ValidationError('This copy kind does not create a page draft');
	}
	const primary = copy.variants[0]?.text.trim();
	if (!primary) {
		throw new ValidationError('Copy draft has no variant text');
	}

	const sections = base.sections.map((section) => {
		if (isHeroSection(section)) {
			if (copy.kind === 'headline' || copy.kind === 'page') {
				return { ...section, headline: primary.slice(0, 160) };
			}
			return {
				...section,
				primaryCta: { ...section.primaryCta, label: primary.slice(0, 80) }
			};
		}
		if (isCtaSection(section) && copy.kind === 'cta') {
			return { ...section, heading: primary.slice(0, 120) };
		}
		return section;
	});

	return parsePageDocument({
		...base,
		seo: {
			...base.seo,
			noindex: true
		},
		sections
	});
}
