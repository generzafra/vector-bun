import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
	composeLeadPage,
	pageSectionSchema,
	parsePageDocument,
	sectionFrameClass
} from '@vector/funnel-engine';
import { CE0_FIXTURES } from './fixtures/ce0-industries';

const root = join(import.meta.dir, '..');

function signature(id: (typeof CE0_FIXTURES)[number]['id']) {
	const fixture = CE0_FIXTURES.find((item) => item.id === id);
	if (!fixture) throw new Error(id);
	const page = composeLeadPage(fixture.knowledge, { preview: true });
	const hero = page.sections[0];
	const story = page.sections.find(
		(section) => section.type === 'services' || section.type === 'services-editorial'
	);
	const conversion = page.sections.find(
		(section) => section.type === 'cta' || section.type === 'cta-minimal'
	);
	const lead = page.sections.find((section) => section.type === 'lead-form');
	return {
		page,
		hero: hero && 'widthMode' in hero ? `${hero.widthMode}:${hero.mobileTreatment}` : '',
		story: story && 'widthMode' in story ? story.widthMode : '',
		conversion: conversion && 'widthMode' in conversion ? conversion.widthMode : '',
		lead: lead && 'widthMode' in lead ? lead.widthMode : ''
	};
}

test('the five CE0 industries get different width rhythms on the current sections', () => {
	const place = signature('luxury-hospitality');
	const product = signature('packaged-food');
	const reading = signature('childrens-publishing');
	const system = signature('enterprise-saas');
	const counsel = signature('local-professional');
	expect(place.hero).toBe('full-bleed:stack');
	expect(place.story).toBe('wide');
	expect(product.hero).toBe('wide:typography_first');
	expect(product.story).toBe('wide');
	expect(product.conversion).toBe('contained');
	expect(reading.hero).toBe('wide:typography_first');
	expect(reading.story).toBe('contained');
	expect(reading.conversion).toBe('wide');
	expect(system.hero).toBe('contained:typography_first');
	expect(system.story).toBe('contained');
	expect(counsel.hero).toBe('split-bleed:stack');
	expect(counsel.story).toBe('contained');
	for (const item of [place, product, reading, system, counsel]) {
		expect(item.page.schemaVersion).toBe(1);
		expect(item.lead).toBe('contained');
		expect(item.page.seo.noindex).toBe(true);
	}
	const signatures = [place, product, reading, system, counsel].map(
		(item) => `${item.hero}|${item.story}|${item.conversion}`
	);
	expect(new Set(signatures).size).toBe(5);
});

test('legacy pages without a width mode still parse and render as contained', () => {
	const fixture = CE0_FIXTURES[0]!;
	const current = composeLeadPage(fixture.knowledge, { preview: false });
	const legacy = structuredClone(current);
	for (const section of legacy.sections) {
		delete section.widthMode;
		if ('mobileTreatment' in section) delete section.mobileTreatment;
	}
	const parsed = parsePageDocument(legacy);
	expect(parsed.schemaVersion).toBe(1);
	expect(parsed.sections[0]?.type).toBe('hero-editorial');
	expect(sectionFrameClass(parsed.sections[0]!)).toBe('section-frame width-contained mobile-stack');
	expect(
		pageSectionSchema.safeParse({
			...parsed.sections[0],
			widthMode: 'cinematic'
		}).success
	).toBe(false);
	expect(
		pageSectionSchema.safeParse({
			id: 'hero',
			type: 'hero-cinematic',
			headline: 'This variant stays out of the grammar',
			lede: 'CE2 does not add a cinematic hero.',
			primaryCta: { label: 'Continue', href: '#lead' }
		}).success
	).toBe(false);
});

test('one industry page does not carry another industry name or a prohibited claim', () => {
	for (const fixture of CE0_FIXTURES) {
		const page = composeLeadPage(fixture.knowledge, { preview: true });
		const text = JSON.stringify(page);
		expect(text).not.toContain(fixture.prohibitedStatement);
		expect(text).not.toContain('clientId');
		expect(text).not.toContain('storageKey');
		for (const other of CE0_FIXTURES) {
			if (other.id === fixture.id) continue;
			expect(text).not.toContain(other.knowledge.brand.displayName);
		}
	}
});

test('the delivery frame keeps a narrow form and stacks below 800px', () => {
	const css = readFileSync(join(root, 'apps/delivery/src/app.css'), 'utf8');
	const renderer = readFileSync(
		join(root, 'apps/delivery/src/lib/sections/PageRenderer.svelte'),
		'utf8'
	);
	expect(renderer).toContain('sectionFrameClass');
	expect(css).toContain('.width-contained');
	expect(css).toContain('.width-wide');
	expect(css).toContain('.width-full-bleed');
	expect(css).toContain('.width-split-bleed');
	expect(css).toContain('max-width: min(28rem, 100%)');
	expect(css).toContain('@media (max-width: 799px)');
	expect(css).toContain('padding-inline: 1rem');
	expect(css).toContain('overflow-wrap: anywhere');
	expect(css).toContain('prefers-reduced-motion');
	expect(css).not.toContain('hero-cinematic');
});
