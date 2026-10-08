import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	enumerateVisualDirectionCandidates,
	visualDirectionManifestSchema
} from '@vector/contracts';
import {
	APPROVED_SECTION_TYPES,
	FIRST_REVEAL_CHECK_KEYS,
	composeLeadPage,
	pageDocumentSchema,
	pageSectionSchema,
	parsePageDocument,
	scoreVisualDirection
} from '@vector/funnel-engine';
import { CE0_FIXTURES, CE0_INDUSTRY_IDS, type Ce0Fixture } from './fixtures/ce0-industries';

const baselinePath = join(import.meta.dir, '../docs/plans/CE0_BASELINE.md');

const EDITORIAL_SEQUENCE = [
	'hero-editorial',
	'proof-featured',
	'services-editorial',
	'offer',
	'faq',
	'cta-minimal',
	'lead-form'
] as const;

const MINIMAL_SEQUENCE = [
	'hero-minimal',
	'services',
	'offer',
	'proof',
	'lead-form',
	'faq',
	'cta'
] as const;

const SPLIT_SEQUENCE = [
	'hero-split',
	'proof',
	'services',
	'offer',
	'faq',
	'cta',
	'lead-form'
] as const;

function composeDefault(fixture: Ce0Fixture, preview = false) {
	return composeLeadPage(fixture.knowledge, { preview });
}

function sectionTypes(fixture: Ce0Fixture) {
	return composeDefault(fixture).sections.map((section) => section.type);
}

test('CE0 fixtures are five synthetic industries and are not persisted tenants', () => {
	expect(CE0_FIXTURES).toHaveLength(5);
	expect(CE0_FIXTURES.map((item) => item.id)).toEqual([...CE0_INDUSTRY_IDS]);
	const slugs = CE0_FIXTURES.map((item) => item.knowledge.clientSlug);
	expect(new Set(slugs).size).toBe(5);
	for (const fixture of CE0_FIXTURES) {
		expect(fixture.synthetic).toBe(true);
		expect(fixture.knowledge.clientSlug.startsWith('ce0-')).toBe(true);
		expect(fixture.knowledge.clientSlug).not.toBe('alpha');
		expect(fixture.knowledge.clientSlug).not.toBe('beta');
		expect(fixture).not.toHaveProperty('clientId');
		expect(fixture.knowledge).not.toHaveProperty('clientId');
	}
});

test('current composer renders every CE0 fixture on schema version 1', () => {
	for (const fixture of CE0_FIXTURES) {
		const page = composeDefault(fixture);
		const again = parsePageDocument(page);
		expect(page.schemaVersion).toBe(1);
		expect(again.sections.map((section) => section.type)).toEqual(
			page.sections.map((section) => section.type)
		);
		expect(page.identity.displayName).toBe(fixture.knowledge.brand.displayName);
		expect(page.seo.noindex).toBe(false);
		const preview = composeDefault(fixture, true);
		expect(preview.seo.noindex).toBe(true);
		expect(JSON.stringify(preview)).toContain('Preview host');
	}
});

test('personality picks the section sequence and industry does not', () => {
	const byId = Object.fromEntries(CE0_FIXTURES.map((item) => [item.id, sectionTypes(item)]));
	expect(byId['luxury-hospitality']).toEqual([...EDITORIAL_SEQUENCE]);
	expect(byId['packaged-food']).toEqual([...EDITORIAL_SEQUENCE]);
	expect(byId['childrens-publishing']).toEqual([...EDITORIAL_SEQUENCE]);
	expect(byId['enterprise-saas']).toEqual([...MINIMAL_SEQUENCE]);
	expect(byId['local-professional']).toEqual([...SPLIT_SEQUENCE]);
	expect(byId['luxury-hospitality']).toEqual(byId['packaged-food']);
	expect(byId['packaged-food']).toEqual(byId['childrens-publishing']);
	expect(byId['luxury-hospitality']).not.toEqual(byId['enterprise-saas']);
	expect(byId['enterprise-saas']).not.toEqual(byId['local-professional']);
});

test('heroes have no media slot and submitted photos never reach the page', () => {
	for (const fixture of CE0_FIXTURES) {
		const page = composeDefault(fixture);
		const serialized = JSON.stringify(page);
		const hero = page.sections[0];
		expect(hero).toBeDefined();
		expect(serialized).not.toContain('image');
		expect(serialized).not.toContain('asset');
		for (const caption of fixture.submittedMedia) {
			expect(serialized).not.toContain(caption);
		}
		expect(
			pageSectionSchema.safeParse({ ...hero, imageAssetId: 'ce0-should-reject' }).success
		).toBe(false);
	}
	expect(pageDocumentSchema.safeParse({ widthMode: 'full-bleed' }).success).toBe(false);
	expect(
		pageSectionSchema.safeParse({
			id: 'hero',
			type: 'hero-mosaic',
			headline: 'This variant is not approved',
			lede: 'CE0 records that the grammar cannot render it.',
			primaryCta: { label: 'Continue', href: '#lead' }
		}).success
	).toBe(false);
});

test('approved claims render and prohibited claims never do', () => {
	for (const fixture of CE0_FIXTURES) {
		const page = composeDefault(fixture);
		const serialized = JSON.stringify(page);
		const approved = fixture.knowledge.claims.find((claim) => claim.kind === 'approved');
		expect(approved).toBeDefined();
		expect(serialized).toContain(approved?.statement);
		expect(serialized).not.toContain(fixture.prohibitedStatement);
	}
});

test('one fixture page does not contain another fixture identity', () => {
	const pages = CE0_FIXTURES.map((fixture) => ({
		id: fixture.id,
		text: JSON.stringify(composeDefault(fixture))
	}));
	for (const page of pages) {
		for (const other of CE0_FIXTURES) {
			if (other.id === page.id) continue;
			expect(page.text).not.toContain(other.knowledge.brand.displayName);
			expect(page.text).not.toContain(other.knowledge.clientSlug);
			expect(page.text).not.toContain(other.prohibitedStatement);
		}
	}
});

test('offer prices stay integer minor units and shared headings stay generic', () => {
	const hospitality = composeDefault(CE0_FIXTURES[0]!);
	const offer = hospitality.sections.find((section) => section.type === 'offer');
	expect(offer?.type).toBe('offer');
	if (offer?.type === 'offer') expect(offer.priceLabel).toBe('From USD 480.00');
	for (const fixture of CE0_FIXTURES) {
		const page = composeDefault(fixture);
		const faq = page.sections.find((section) => section.type === 'faq');
		const services = page.sections.find(
			(section) => section.type === 'services' || section.type === 'services-editorial'
		);
		expect(faq?.type).toBe('faq');
		if (faq?.type === 'faq') expect(faq.heading).toBe('Before you book');
		expect(services && 'heading' in services && services.heading).toBe(
			`How ${fixture.knowledge.brand.displayName} works`
		);
	}
});

test('a high visual score is still a manifest heuristic, not a screenshot review', () => {
	const hospitality = CE0_FIXTURES[0]!;
	const [candidate] = enumerateVisualDirectionCandidates({
		mediaStrategy: 'typography_led',
		hasLogo: false,
		personality: 'premium',
		hasApprovedClaims: true
	});
	expect(candidate?.heroVariant).toBe('hero-editorial');
	expect(candidate?.density).toBe('air');
	const page = composeLeadPage(hospitality.knowledge, {
		preview: true,
		mediaStrategy: 'typography_led',
		direction: {
			heroVariant: candidate!.heroVariant,
			proofVariant: candidate!.proofVariant,
			servicesVariant: candidate!.servicesVariant,
			ctaVariant: candidate!.ctaVariant
		}
	});
	const score = scoreVisualDirection({
		document: page,
		manifest: candidate!,
		hasLogo: false,
		personality: 'premium',
		preview: true
	});
	expect(score.dimensions.visual).toBeGreaterThanOrEqual(85);
	expect(score).not.toHaveProperty('screenshot');
	expect([...FIRST_REVEAL_CHECK_KEYS]).not.toContain('screenshot');
	expect([...FIRST_REVEAL_CHECK_KEYS]).not.toContain('crop');
	expect([...FIRST_REVEAL_CHECK_KEYS]).not.toContain('fingerprint');
	expect(
		visualDirectionManifestSchema.safeParse({ ...candidate, artDirection: 'cinematic' }).success
	).toBe(false);
});

test('the approved section catalog is still the twelve current types', () => {
	expect([...APPROVED_SECTION_TYPES]).toEqual([
		'hero-minimal',
		'hero-split',
		'hero-editorial',
		'proof',
		'proof-featured',
		'services',
		'services-editorial',
		'offer',
		'cta',
		'cta-minimal',
		'faq',
		'lead-form'
	]);
});

test('CE0 baseline notes record the fixtures, the gaps, and the CE1 path', () => {
	const notes = readFileSync(baselinePath, 'utf8');
	expect(notes).toContain('No production behavior change');
	expect(notes).toContain('No migration');
	expect(notes).toContain('CE5');
	expect(notes).toContain('visualDirectionManifestSchema');
	expect(notes).toContain('0036_fr4_visual_directions.sql');
	for (const id of CE0_INDUSTRY_IDS) expect(notes).toContain(id);
	for (const type of APPROVED_SECTION_TYPES) expect(notes).toContain(type);
	expect(notes).toContain(EDITORIAL_SEQUENCE.join(', '));
	expect(notes).toContain(MINIMAL_SEQUENCE.join(', '));
	expect(notes).toContain(SPLIT_SEQUENCE.join(', '));
});
