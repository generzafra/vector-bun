import { expect, test } from 'bun:test';
import {
	composeLeadPage,
	isCtaSectionType,
	isHeroSectionType,
	isProofSectionType,
	isServicesSectionType,
	publicPageMeta
} from '@vector/funnel-engine';

const alpha = composeLeadPage(
	{
		clientSlug: 'alpha',
		brand: {
			displayName: 'Client Alpha Dental',
			tagline: null,
			audience: 'Local patients who need implant consults',
			offer: 'Guided implant consults with a clear treatment plan',
			primaryConversion: 'Book an implant consult',
			brandPersonality: 'premium',
			tokens: { accent: '#0f4c5c', background: '#111111', text: '#f4f4f0' }
		},
		services: [
			{
				name: 'Implant consult',
				outcome: 'A clear implant plan in one visit',
				summary: 'Assessment, imaging review, and next-step recommendation.'
			}
		],
		offers: [
			{
				name: 'Consult package',
				summary: 'Exam and written treatment plan',
				startingPriceMinor: 15000,
				currency: 'USD'
			}
		],
		claims: [
			{
				kind: 'approved',
				statement: 'Plans are written after imaging review',
				evidence: 'Chart note'
			},
			{ kind: 'prohibited', statement: 'Guaranteed implant success', evidence: null }
		]
	},
	{ preview: true }
);

test('preview metadata stays noindex and has no public canonical', () => {
	const meta = publicPageMeta({
		title: alpha.seo.title,
		description: alpha.seo.description,
		origin: 'http://preview-alpha.localhost:5184',
		domainKind: 'preview'
	});
	expect(meta.robots).toBe('noindex, nofollow');
	expect(meta.canonical).toBeNull();
	expect(meta.title.length).toBeGreaterThan(8);
	expect(meta.description.length).toBeGreaterThan(20);
});

test('production metadata is indexable and canonical to the request origin', () => {
	const meta = publicPageMeta({
		title: alpha.seo.title,
		description: alpha.seo.description,
		origin: 'https://alpha.example',
		domainKind: 'production'
	});
	expect(meta.robots).toBe('index, follow');
	expect(meta.canonical).toBe('https://alpha.example/');
});

test('production canonical is path-aware', () => {
	const meta = publicPageMeta({
		title: alpha.seo.title,
		description: alpha.seo.description,
		origin: 'https://alpha.example',
		domainKind: 'production',
		pathname: '/about'
	});
	expect(meta.canonical).toBe('https://alpha.example/about');
});

test('Phase 1 funnel has one hero, proof or services, CTA path, and crawlable copy', () => {
	const types = alpha.sections.map((section) => section.type);
	expect(types.filter((type) => isHeroSectionType(type))).toHaveLength(1);
	expect(types.some((type) => isServicesSectionType(type))).toBe(true);
	expect(types.some((type) => isProofSectionType(type))).toBe(true);
	expect(types.some((type) => isCtaSectionType(type))).toBe(true);
	expect(types).toContain('lead-form');
	expect(JSON.stringify(alpha)).toContain('implant');
	expect(JSON.stringify(alpha)).not.toContain('Guaranteed implant success');
	expect(alpha.narrative.audience).toContain('patients');
	expect(alpha.narrative.primaryConversion).toBe('Book an implant consult');
	expect(alpha.theme.tokens.accent).toBe('#0f4c5c');
});
