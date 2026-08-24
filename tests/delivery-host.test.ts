import { expect, test } from 'bun:test';
import {
	isDomainChallengePath,
	isHealthPath,
	isLlmsTxtPath,
	isBrandLogoPath,
	isOgImagePath,
	isRobotsPath,
	isSitemapPath,
	isValidPublicHostname,
	normalizeHostname,
	previewHostname,
	unknownHostPayload
} from '@vector/funnel-engine';

test('delivery health is allowed', () => {
	expect(isHealthPath('/health')).toBe(true);
	expect(isHealthPath('/health/')).toBe(true);
	expect(isHealthPath('/')).toBe(false);
});

test('delivery unknown host returns 404 payload with no tenant data', () => {
	const body = JSON.stringify(unknownHostPayload());
	expect(body).toContain('Unknown host');
	expect(body.toLowerCase()).not.toContain('alpha');
	expect(body.toLowerCase()).not.toContain('beta');
	expect(body).not.toContain('client');
});

test('hostname normalization strips port and rejects empty hosts', () => {
	expect(normalizeHostname('Preview-Alpha.localhost:5184')).toBe('preview-alpha.localhost');
	expect(normalizeHostname(null)).toBeNull();
	expect(previewHostname('alpha', 'localhost')).toBe('preview-alpha.localhost');
	expect(previewHostname('beta', 'vector.maxglobalexpo.com')).toBe(
		'preview-beta.vector.maxglobalexpo.com'
	);
	expect(isDomainChallengePath('/.well-known/vector-domain')).toBe(true);
	expect(isRobotsPath('/robots.txt')).toBe(true);
	expect(isSitemapPath('/sitemap.xml')).toBe(true);
	expect(isLlmsTxtPath('/llms.txt')).toBe(true);
	expect(isBrandLogoPath('/brand-logo')).toBe(true);
	expect(isBrandLogoPath('/brand-logo/')).toBe(true);
	expect(isOgImagePath('/og-image')).toBe(true);
	expect(isOgImagePath('/og-image/')).toBe(true);
	expect(isValidPublicHostname('www.client.com')).toBe(true);
	expect(isValidPublicHostname('preview-client.localhost')).toBe(false);
});
