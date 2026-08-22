import { ValidationError, type BrandTokens } from '@vector/contracts';
import { formatMoneyLabel } from './money';
import { parsePageDocument, type PageDocument, type PageSection } from './schema';

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

function personalityOf(value: string | null): (typeof personalities)[number] | undefined {
	return personalities.find((item) => item === value);
}

function heroVariant(personality: string | undefined): 'hero-minimal' | 'hero-split' {
	return personality === 'technology' || personality === 'growth' ? 'hero-minimal' : 'hero-split';
}

export function composeLeadPage(
	input: KnowledgeSnapshot,
	options: { preview: boolean }
): PageDocument {
	const { brand, services, offers, claims } = input;
	if (!brand.audience || !brand.offer || !brand.primaryConversion) {
		throw new ValidationError('Brand narrative is incomplete');
	}
	if (services.length === 0) {
		throw new ValidationError('At least one service is required');
	}

	const personality = personalityOf(brand.brandPersonality);
	const approved = claims.filter((claim) => claim.kind === 'approved');
	const offer = offers[0];
	const primary = { label: brand.primaryConversion, href: '#lead' };
	const headline = brand.offer;
	const lede = brand.tagline || `${brand.audience}. ${brand.offer}`;
	const eyebrow = brand.audience.slice(0, 80);

	const hero: PageSection =
		heroVariant(personality) === 'hero-minimal'
			? {
					id: 'hero',
					type: 'hero-minimal',
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

	const serviceSection: PageSection = {
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

	const cta: PageSection = {
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

	const sections: PageSection[] = [hero];
	if (hero.type === 'hero-split' && approved.length > 0) {
		sections.push({
			id: 'proof',
			type: 'proof',
			heading: 'What we can state',
			items: approved.slice(0, 6).map((claim) => ({
				statement: claim.statement,
				evidence: claim.evidence ?? undefined
			}))
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
		if (approved.length > 0) {
			sections.push({
				id: 'proof',
				type: 'proof',
				heading: 'Scope we will confirm',
				items: approved.slice(0, 6).map((claim) => ({
					statement: claim.statement,
					evidence: claim.evidence ?? undefined
				}))
			});
		}
		sections.push(lead, faq, cta);
	}

	const title = `${brand.displayName} · ${brand.primaryConversion}`.slice(0, 70);
	const description = brand.offer.slice(0, 160);

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
			tokens: brand.tokens
		},
		seo: {
			title,
			description,
			noindex: options.preview
		},
		sections
	});
}
