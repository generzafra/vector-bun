import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { composeLeadPage, motionClass, motionFor, pageDocumentSchema } from '@vector/funnel-engine';
import { CE0_FIXTURES, ce0Fixture } from './fixtures/ce0-industries';

const root = join(import.meta.dir, '..');

test('the five industries keep M0 through M2, and a missing preset stays still', () => {
	const presets = Object.fromEntries(
		CE0_FIXTURES.map((fixture) => {
			const page = composeLeadPage(fixture.knowledge, { preview: true });
			return [fixture.id, page.theme.motionPreset];
		})
	);
	expect(presets['luxury-hospitality']).toBe('m2');
	expect(presets['packaged-food']).toBe('m1');
	expect(presets['childrens-publishing']).toBe('m1');
	expect(presets['enterprise-saas']).toBe('m0');
	expect(presets['local-professional']).toBe('m0');
	expect(motionFor('counsel')).toBe('m0');
	expect(motionFor('place')).toBe('m2');
	const hospitality = composeLeadPage(ce0Fixture('luxury-hospitality').knowledge, {
		preview: true
	});
	const legacy = structuredClone(hospitality);
	delete legacy.theme.motionPreset;
	expect(pageDocumentSchema.safeParse(legacy).success).toBe(true);
	expect(motionClass(undefined)).toBe('motion-m0');
	expect(motionClass('m2')).toBe('motion-m2');
	expect(
		pageDocumentSchema.safeParse({
			...hospitality,
			theme: { ...hospitality.theme, motionPreset: 'm3' }
		}).success
	).toBe(false);
	expect(
		pageDocumentSchema.safeParse({
			...hospitality,
			theme: { ...hospitality.theme, motionPreset: 'cinematic' }
		}).success
	).toBe(false);
	expect(JSON.stringify(hospitality)).not.toContain('webgl');
	expect(JSON.stringify(hospitality)).not.toContain(
		ce0Fixture('packaged-food').knowledge.brand.displayName
	);
});

test('motion is css only, stays readable, and turns off when reduced motion is requested', () => {
	const css = readFileSync(join(root, 'apps/delivery/src/app.css'), 'utf8');
	const page = readFileSync(join(root, 'apps/delivery/src/routes/+page.svelte'), 'utf8');
	const hero = readFileSync(
		join(root, 'apps/delivery/src/lib/sections/HeroEditorial.svelte'),
		'utf8'
	);
	expect(page).toContain('motionClass');
	expect(page).toContain('href="#lead"');
	expect(hero).toContain('<h1>{section.headline}</h1>');
	expect(css).toContain('@media (prefers-reduced-motion: no-preference)');
	expect(css).toContain('.motion-m1 h1');
	expect(css).toContain('.motion-m2 .lede');
	expect(css).toContain('animation-duration: 220ms');
	expect(css).toContain('animation-duration: 350ms');
	expect(css).toContain('translateY(-1px)');
	expect(css).toContain(':focus-visible');
	expect(css).toContain('animation: none !important');
	expect(css).toContain('transition: none !important');
	expect(css).not.toContain('scroll-behavior: smooth');
	expect(css).not.toContain('webgl');
	expect(css).not.toContain('motion-m3');
	expect(css).not.toContain('hero-cinematic');
});
