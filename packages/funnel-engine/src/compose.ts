import {
	ValidationError,
	type AssetMediaStrategy,
	type BrandTokens,
	type VisualDirectionCtaVariant,
	type VisualDirectionHeroVariant,
	type VisualDirectionProofVariant,
	type VisualDirectionServicesVariant
} from '@vector/contracts';
import { formatMoneyLabel } from './money';
import { parsePageDocument, type PageDocument, type PageSection } from './schema';
import { motionFor } from './motion';
import { heroMobileFor, sectionRhythm, widthFor, widthRoleFor } from './width';

export type KnowledgeSnapshot = {
	clientSlug: string;
	brand: {
		displayName: string;
		tagline: string | null;
		audience: string | null;
		offer: string | null;
		primaryConversion: string | null;
		brandPersonality: string | null;
		tokens: BrandTokens;
	};
	services: { name: string; outcome: string; summary: string }[];
	offers: { name: string; summary: string; startingPriceMinor: number | null; currency: string }[];
	claims: { kind: 'approved' | 'prohibited'; statement: string; evidence: string | null }[];
};

const personalities = ['premium', 'technology', 'growth', 'creative', 'corporate'] as const;

type LayoutKind = 'editorial' | 'minimal' | 'split';

function personalityOf(value: string | null): (typeof personalities)[number] | undefined {
	return personalities.find((item) => item === value);
}

function layoutKind(
	personality: string | undefined,
	mediaStrategy?: AssetMediaStrategy
): LayoutKind {
	if (mediaStrategy === 'typography_led') {
		if (personality === 'premium' || personality === 'creative') return 'editorial';
		return 'minimal';
	}
	if (personality === 'technology' || personality === 'growth') return 'minimal';
	if (personality === 'premium' || personality === 'creative') return 'editorial';
	return 'split';
}

export type ComposeDirectionInput = {
	heroVariant: VisualDirectionHeroVariant;
	proofVariant: VisualDirectionProofVariant;
	servicesVariant: VisualDirectionServicesVariant;
	ctaVariant: VisualDirectionCtaVariant;
};

function composePlan(
	personality: string | undefined,
	mediaStrategy: AssetMediaStrategy | undefined,
	direction?: ComposeDirectionInput
): {
	layout: LayoutKind;
	heroType: VisualDirectionHeroVariant;
	proofType: Exclude<VisualDirectionProofVariant, 'none'> | null;
	servicesType: VisualDirectionServicesVariant;
	ctaType: VisualDirectionCtaVariant;
} {
	if (direction) {
		let heroType = direction.heroVariant;
		if (mediaStrategy === 'typography_led' && heroType === 'hero-split') {
			heroType =
				personality === 'premium' || personality === 'creative' ? 'hero-editorial' : 'hero-minimal';
		}
		const layout: LayoutKind =
			heroType === 'hero-editorial'
				? 'editorial'
				: heroType === 'hero-minimal'
					? 'minimal'
					: 'split';
		return {
			layout,
			heroType,
			proofType: direction.proofVariant === 'none' ? null : direction.proofVariant,
			servicesType: direction.servicesVariant,
			ctaType: direction.ctaVariant
		};
	}
	const layout = layoutKind(personality, mediaStrategy);
	return {
		layout,
		heroType:
			layout === 'editorial'
				? 'hero-editorial'
				: layout === 'minimal'
					? 'hero-minimal'
					: 'hero-split',
		proofType: layout === 'editorial' ? 'proof-featured' : 'proof',
		servicesType: layout === 'editorial' ? 'services-editorial' : 'services',
		ctaType: layout === 'editorial' ? 'cta-minimal' : 'cta'
	};
}

export function composeLeadPage(
	input: KnowledgeSnapshot,
	options: {
		preview: boolean;
		mediaStrategy?: AssetMediaStrategy;
		direction?: ComposeDirectionInput;
	}
): PageDocument {
	const { brand, services, offers, claims } = input;
	if (!brand.audience || !brand.offer || !brand.primaryConversion) {
		throw new ValidationError('Brand narrative is incomplete');
	}
	if (services.length === 0) {
		throw new ValidationError('At least one service is required');
	}

	const personality = personalityOf(brand.brandPersonality);
	const plan = composePlan(personality, options.mediaStrategy, options.direction);
	const layout = plan.layout;
	const approved = claims.filter((claim) => claim.kind === 'approved');
	const offer = offers[0];
	const primary = { label: brand.primaryConversion, href: '#lead' };
	const headline = brand.offer;
	const lede = brand.tagline || `${brand.audience}. ${brand.offer}`;
	const eyebrow = brand.audience.slice(0, 80);

	const hero: PageSection =
		plan.heroType === 'hero-minimal'
			? {
					id: 'hero',
					type: 'hero-minimal',
					eyebrow,
					headline,
					lede,
					primaryCta: primary
				}
			: plan.heroType === 'hero-editorial'
				? {
						id: 'hero',
						type: 'hero-editorial',
						eyebrow,
						headline,
						lede,
						primaryCta: primary
					}
				: {
						id: 'hero',
						type: 'hero-split',
						eyebrow,
						headline,
						lede,
						asideTitle: offer?.name ?? services[0].name,
						asideBody: offer?.summary ?? services[0].outcome,
						primaryCta: primary
					};

	const serviceSection: PageSection =
		plan.servicesType === 'services-editorial'
			? {
					id: 'services',
					type: 'services-editorial',
					heading: `How ${brand.displayName} works`,
					items: services.map((service) => ({
						name: service.name,
						outcome: service.outcome,
						summary: service.summary
					}))
				}
			: {
					id: 'services',
					type: 'services',
					heading: `How ${brand.displayName} works`,
					items: services.map((service) => ({
						name: service.name,
						outcome: service.outcome,
						summary: service.summary
					}))
				};

	const faqItems = [
		{
			question: `What outcome does ${services[0].name} produce?`,
			answer: `${services[0].outcome} ${services[0].summary}`.slice(0, 400)
		}
	];
	if (offer) {
		faqItems.push({
			question: `What is ${offer.name}?`,
			answer: offer.summary
		});
	}
	if (approved[0]) {
		faqItems.push({
			question: 'What can we confirm today?',
			answer: approved[0].evidence
				? `${approved[0].statement} (${approved[0].evidence})`.slice(0, 400)
				: approved[0].statement
		});
	}

	const faq: PageSection = {
		id: 'faq',
		type: 'faq',
		heading: 'Before you book',
		items: faqItems.slice(0, 8)
	};

	const cta: PageSection =
		plan.ctaType === 'cta-minimal'
			? {
					id: 'cta',
					type: 'cta-minimal',
					heading: brand.primaryConversion,
					body: brand.offer,
					primaryCta: primary
				}
			: {
					id: 'cta',
					type: 'cta',
					heading: brand.primaryConversion,
					body: brand.offer,
					primaryCta: primary
				};

	const lead: PageSection = {
		id: 'lead',
		type: 'lead-form',
		heading: brand.primaryConversion,
		body: options.preview
			? 'Preview host. Requests stay on this tenant and do not send production email.'
			: undefined,
		submitLabel: brand.primaryConversion,
		fields: ['name', 'email', 'message']
	};

	const proofItems = approved.slice(0, 6).map((claim) => ({
		statement: claim.statement,
		evidence: claim.evidence ?? undefined
	}));

	const sections: PageSection[] = [hero];
	const proofType = approved.length > 0 ? plan.proofType : null;
	if (layout !== 'minimal' && proofType) {
		sections.push({
			id: 'proof',
			type: proofType,
			heading: 'What we can state',
			items: proofItems
		});
		sections.push(serviceSection);
		if (offer) {
			sections.push({
				id: 'offer',
				type: 'offer',
				heading: 'The offer',
				name: offer.name,
				summary: offer.summary,
				priceLabel: formatMoneyLabel(offer.startingPriceMinor, offer.currency)
			});
		}
		sections.push(faq, cta, lead);
	} else {
		sections.push(serviceSection);
		if (offer) {
			sections.push({
				id: 'offer',
				type: 'offer',
				heading: 'Engagement',
				name: offer.name,
				summary: offer.summary,
				priceLabel: formatMoneyLabel(offer.startingPriceMinor, offer.currency)
			});
		}
		if (proofType) {
			sections.push({
				id: 'proof',
				type: proofType,
				heading: 'Scope we will confirm',
				items: proofItems
			});
		}
		sections.push(lead, faq, cta);
	}

	const title = `${brand.displayName} · ${brand.primaryConversion}`.slice(0, 70);
	const description = brand.offer.slice(0, 160);
	const rhythm = sectionRhythm({
		primaryConversion: brand.primaryConversion,
		personality
	});
	const framed = sections.map((section) => {
		const role = widthRoleFor(section.type);
		const widthMode = widthFor(rhythm, role);
		if (role !== 'hero') return { ...section, widthMode };
		return { ...section, widthMode, mobileTreatment: heroMobileFor(rhythm) };
	});

	return parsePageDocument({
		schemaVersion: 1,
		identity: { displayName: brand.displayName },
		narrative: {
			audience: brand.audience,
			primaryConversion: brand.primaryConversion,
			offer: brand.offer
		},
		theme: {
			personality,
			tokens: brand.tokens,
			motionPreset: motionFor(rhythm)
		},
		seo: {
			title,
			description,
			noindex: options.preview
		},
		sections: framed
	});
}
