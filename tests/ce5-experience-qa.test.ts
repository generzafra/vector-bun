import { expect, test } from 'bun:test';
import {
	composeLeadPage,
	designFingerprint,
	evaluateViewportGeometry,
	experienceHardBlockers,
	fingerprintSimilarity,
	GEOMETRY_VIEWPORTS,
	revealAllowed,
	similarityWarning
} from '@vector/funnel-engine';
import { CE0_FIXTURES, ce0Fixture } from './fixtures/ce0-industries';

test('viewport geometry is structural, and a high score cannot hide a hard blocker', () => {
	expect([...GEOMETRY_VIEWPORTS]).toEqual([320, 390, 768, 1440]);
	for (const fixture of CE0_FIXTURES) {
		const page = composeLeadPage(fixture.knowledge, { preview: true });
		const geometry = evaluateViewportGeometry(page);
		expect(geometry.pixelScreenshot).toBe(false);
		expect(geometry.passed).toBe(true);
		expect(geometry.checks.some((item) => item.viewport === 320 && item.key === 'form_fits')).toBe(
			true
		);
		const fingerprint = designFingerprint(page);
		const serialized = JSON.stringify(fingerprint);
		expect(serialized).not.toContain(fixture.knowledge.brand.displayName);
		expect(serialized).not.toContain(fixture.prohibitedStatement);
		expect(serialized).not.toContain('mediaAssetId');
		for (const other of CE0_FIXTURES) {
			if (other.id === fixture.id) continue;
			expect(serialized).not.toContain(other.knowledge.brand.displayName);
		}
	}
	const hospitality = composeLeadPage(ce0Fixture('luxury-hospitality').knowledge, {
		preview: true
	});
	const food = composeLeadPage(ce0Fixture('packaged-food').knowledge, { preview: true });
	const same = fingerprintSimilarity(
		designFingerprint(hospitality),
		designFingerprint(hospitality)
	);
	expect(same).toBe(100);
	expect(similarityWarning(same)).toBe(true);
	expect(
		similarityWarning(
			fingerprintSimilarity(designFingerprint(hospitality), designFingerprint(food))
		)
	).toBe(false);
	const stretched = structuredClone(hospitality);
	const form = stretched.sections.find((section) => section.type === 'lead-form');
	if (form && form.type === 'lead-form') form.widthMode = 'full-bleed';
	const broken = evaluateViewportGeometry(stretched);
	expect(broken.passed).toBe(false);
	expect(
		broken.checks
			.filter((item) => item.key === 'form_fits' && item.status === 'fail')
			.map((item) => item.viewport)
	).toEqual([320, 390]);
	expect(broken.pixelScreenshot).toBe(false);
	const blocked = experienceHardBlockers({
		document: hospitality,
		preview: true,
		prohibitedClaims: [ce0Fixture('luxury-hospitality').prohibitedStatement],
		otherIdentities: []
	});
	expect(blocked).toEqual([]);
	const poisoned = structuredClone(hospitality);
	poisoned.narrative.offer = ce0Fixture('luxury-hospitality').prohibitedStatement;
	const blockers = experienceHardBlockers({
		document: poisoned,
		preview: true,
		prohibitedClaims: [ce0Fixture('luxury-hospitality').prohibitedStatement],
		otherIdentities: [ce0Fixture('packaged-food').knowledge.brand.displayName]
	});
	expect(blockers.map((item) => item.key)).toContain('prohibited_claim');
	expect(revealAllowed({ visualScore: 95, blockers }).allowed).toBe(false);
	expect(revealAllowed({ visualScore: 95, blockers }).reason).toContain('hard blocker');
	expect(revealAllowed({ visualScore: 95, blockers: [] }).allowed).toBe(true);
});
