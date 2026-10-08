import type { KnowledgeSnapshot } from '@vector/funnel-engine';

/**
 * Synthetic Wave D CE0 clients. They are not tenants, they are not seeded,
 * and they must never be copied from another client's records.
 */
export const CE0_INDUSTRY_IDS = [
	'luxury-hospitality',
	'packaged-food',
	'enterprise-saas',
	'local-professional',
	'childrens-publishing'
] as const;

export type Ce0IndustryId = (typeof CE0_INDUSTRY_IDS)[number];

export type Ce0Fixture = {
	id: Ce0IndustryId;
	label: string;
	synthetic: true;
	personality: 'premium' | 'creative' | 'technology' | 'corporate';
	/** Materials the current composer does not read. */
	submittedMedia: readonly string[];
	prohibitedStatement: string;
	knowledge: KnowledgeSnapshot;
};

function fixture(input: Omit<Ce0Fixture, 'synthetic'>): Ce0Fixture {
	return { ...input, synthetic: true };
}

export const CE0_FIXTURES: readonly Ce0Fixture[] = [
	fixture({
		id: 'luxury-hospitality',
		label: 'Luxury hospitality',
		personality: 'premium',
		submittedMedia: ['ce0-northline-courtyard-dusk.png', 'ce0-northline-linen-suite.png'],
		prohibitedStatement: 'Every suite is the best room in the country',
		knowledge: {
			clientSlug: 'ce0-northline-house',
			brand: {
				displayName: 'Northline House',
				tagline: 'A twelve-room house on a quiet harbor.',
				audience: 'Travelers booking a slow stay',
				offer: 'Reserve a room with breakfast and a harbor view',
				primaryConversion: 'Check availability',
				brandPersonality: 'premium',
				tokens: { background: '#1A1714', text: '#F4F1EA', accent: '#8C6A4A' }
			},
			services: [
				{
					name: 'Overnight stay',
					outcome: 'A quiet room and breakfast the next morning',
					summary: 'Twelve guest rooms, a shared dining table, and a courtyard.'
				}
			],
			offers: [
				{
					name: 'Harbor room',
					summary: 'One night, breakfast, and late checkout when the book allows it.',
					startingPriceMinor: 48000,
					currency: 'USD'
				}
			],
			claims: [
				{
					kind: 'approved',
					statement: 'The house has twelve guest rooms.',
					evidence: 'Fixture floor count'
				},
				{
					kind: 'prohibited',
					statement: 'Every suite is the best room in the country',
					evidence: null
				}
			]
		}
	}),
	fixture({
		id: 'packaged-food',
		label: 'Packaged food',
		personality: 'creative',
		submittedMedia: ['ce0-harbor-rye-bar-wrap.png'],
		prohibitedStatement: 'Doctors recommend this bar',
		knowledge: {
			clientSlug: 'ce0-harbor-rye',
			brand: {
				displayName: 'Harbor and Rye Pantry',
				tagline: 'Rye, fruit, and salt in a small-batch bar.',
				audience: 'Shoppers who want a pantry bar',
				offer: 'Order a four-bar box of rye and apricot',
				primaryConversion: 'Order a box',
				brandPersonality: 'creative',
				tokens: { background: '#F7F3EC', text: '#1C1917', accent: '#9A3412' }
			},
			services: [
				{
					name: 'Pantry boxes',
					outcome: 'A box of four bars at the door',
					summary: 'Rye, apricot, and sea salt. Packed in one kitchen.'
				}
			],
			offers: [
				{
					name: 'Four-bar box',
					summary: 'Four rye and apricot bars, shipped when the batch is ready.',
					startingPriceMinor: 1800,
					currency: 'USD'
				}
			],
			claims: [
				{
					kind: 'approved',
					statement: 'Bars are made in small batches.',
					evidence: 'Fixture batch note'
				},
				{
					kind: 'prohibited',
					statement: 'Doctors recommend this bar',
					evidence: null
				}
			]
		}
	}),
	fixture({
		id: 'enterprise-saas',
		label: 'Enterprise SaaS',
		personality: 'technology',
		submittedMedia: ['ce0-ledgerline-forecast-screen.png'],
		prohibitedStatement: 'Guaranteed pipeline increase',
		knowledge: {
			clientSlug: 'ce0-ledgerline',
			brand: {
				displayName: 'Ledgerline',
				tagline: 'A weekly forecast for finance teams.',
				audience: 'Finance leads at mid-size companies',
				offer: 'See a weekly cash forecast before the Monday meeting',
				primaryConversion: 'Book a product walkthrough',
				brandPersonality: 'technology',
				tokens: { background: '#0B1220', text: '#F8FAFC', accent: '#38BDF8' }
			},
			services: [
				{
					name: 'Forecast workspace',
					outcome: 'One weekly cash view for the finance meeting',
					summary: 'Imports the ledger the team already keeps and shows the next four weeks.'
				}
			],
			offers: [
				{
					name: 'Team walkthrough',
					summary: 'A working session on the weekly forecast with your own sample file.',
					startingPriceMinor: 240000,
					currency: 'USD'
				}
			],
			claims: [
				{
					kind: 'approved',
					statement: 'The product exports a weekly forecast.',
					evidence: 'Fixture product note'
				},
				{
					kind: 'prohibited',
					statement: 'Guaranteed pipeline increase',
					evidence: null
				}
			]
		}
	}),
	fixture({
		id: 'local-professional',
		label: 'Local professional service',
		personality: 'corporate',
		submittedMedia: ['ce0-calder-pine-office.png'],
		prohibitedStatement: 'We win every case',
		knowledge: {
			clientSlug: 'ce0-calder-pine',
			brand: {
				displayName: 'Calder and Pine Counsel',
				tagline: 'Counsel for local owners selling a business.',
				audience: 'Owners preparing a business sale',
				offer: 'Book a consult before you sign a letter of intent',
				primaryConversion: 'Book a consult',
				brandPersonality: 'corporate',
				tokens: { background: '#F4F4F0', text: '#1A1714', accent: '#1F4D3A' }
			},
			services: [
				{
					name: 'Sale consult',
					outcome: 'A written list of issues before you sign',
					summary: 'Review of the letter of intent and the questions to ask next.'
				}
			],
			offers: [
				{
					name: 'First consult',
					summary: 'One meeting and a short written note of open issues.',
					startingPriceMinor: 35000,
					currency: 'USD'
				}
			],
			claims: [
				{
					kind: 'approved',
					statement: 'Consults are scheduled by the office.',
					evidence: 'Fixture scheduling note'
				},
				{
					kind: 'prohibited',
					statement: 'We win every case',
					evidence: null
				}
			]
		}
	}),
	fixture({
		id: 'childrens-publishing',
		label: "Creative children's publishing",
		personality: 'creative',
		submittedMedia: ['ce0-meadow-press-cover.png'],
		prohibitedStatement: 'National bestseller since 1999',
		knowledge: {
			clientSlug: 'ce0-meadow-press',
			brand: {
				displayName: 'Meadow Press',
				tagline: 'Picture books for reading aloud.',
				audience: 'Caregivers reading with young children',
				offer: 'Preview a picture book made for reading aloud',
				primaryConversion: 'Request a reading copy',
				brandPersonality: 'creative',
				tokens: { background: '#FFF8F0', text: '#2A2118', accent: '#C2410C' }
			},
			services: [
				{
					name: 'Picture books',
					outcome: 'A book a child can follow while someone reads',
					summary: 'Stories written for ages four to eight, with pictures on every spread.'
				}
			],
			offers: [
				{
					name: 'Reading copy',
					summary: 'One paperback sent to a school or a caregiver.',
					startingPriceMinor: 1600,
					currency: 'USD'
				}
			],
			claims: [
				{
					kind: 'approved',
					statement: 'Stories are written for ages four to eight.',
					evidence: 'Fixture age note'
				},
				{
					kind: 'prohibited',
					statement: 'National bestseller since 1999',
					evidence: null
				}
			]
		}
	})
];

export function ce0Fixture(id: Ce0IndustryId): Ce0Fixture {
	const found = CE0_FIXTURES.find((item) => item.id === id);
	if (!found) throw new Error(`Missing CE0 fixture ${id}`);
	return found;
}
