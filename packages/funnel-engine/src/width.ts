import type { HeroMobileTreatment, PageSection, SectionWidthMode } from './schema';

export const SECTION_RHYTHMS = ['place', 'product', 'reading', 'system', 'counsel'] as const;
export type SectionRhythm = (typeof SECTION_RHYTHMS)[number];

export type WidthRole = 'hero' | 'story' | 'proof' | 'conversion' | 'support';

const WIDTH: Record<SectionRhythm, Record<WidthRole, SectionWidthMode>> = {
	place: {
		hero: 'full-bleed',
		story: 'wide',
		proof: 'contained',
		conversion: 'contained',
		support: 'contained'
	},
	product: {
		hero: 'wide',
		story: 'wide',
		proof: 'contained',
		conversion: 'contained',
		support: 'contained'
	},
	reading: {
		hero: 'wide',
		story: 'contained',
		proof: 'wide',
		conversion: 'wide',
		support: 'contained'
	},
	system: {
		hero: 'contained',
		story: 'contained',
		proof: 'contained',
		conversion: 'contained',
		support: 'contained'
	},
	counsel: {
		hero: 'split-bleed',
		story: 'contained',
		proof: 'contained',
		conversion: 'contained',
		support: 'contained'
	}
};

export function sectionRhythm(input: {
	primaryConversion: string;
	personality?: string | null;
}): SectionRhythm {
	const action = input.primaryConversion.trim().toLowerCase();
	if (action.startsWith('order')) return 'product';
	if (action.startsWith('request') || action.startsWith('preview')) return 'reading';
	if (input.personality === 'technology' || input.personality === 'growth') return 'system';
	if (input.personality === 'corporate') return 'counsel';
	if (input.personality === 'premium') return 'place';
	return 'reading';
}

export function heroMobileFor(rhythm: SectionRhythm): HeroMobileTreatment {
	return rhythm === 'place' || rhythm === 'counsel' ? 'stack' : 'typography_first';
}

export function widthFor(rhythm: SectionRhythm, role: WidthRole): SectionWidthMode {
	return WIDTH[rhythm][role];
}

export function widthRoleFor(type: PageSection['type']): WidthRole {
	if (type === 'hero-minimal' || type === 'hero-split' || type === 'hero-editorial') return 'hero';
	if (type === 'services' || type === 'services-editorial') return 'story';
	if (type === 'proof' || type === 'proof-featured') return 'proof';
	if (type === 'offer' || type === 'cta' || type === 'cta-minimal') return 'conversion';
	return 'support';
}

export function sectionFrameClass(section: {
	type: string;
	widthMode?: SectionWidthMode;
	mobileTreatment?: HeroMobileTreatment;
}) {
	const width = section.widthMode ?? 'contained';
	const hero = section.type.startsWith('hero-');
	const mobile = !hero
		? ''
		: section.mobileTreatment === 'typography_first'
			? 'mobile-type'
			: 'mobile-stack';
	return ['section-frame', `width-${width}`, mobile].filter(Boolean).join(' ');
}
