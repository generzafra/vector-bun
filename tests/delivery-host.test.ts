import { expect, test } from 'bun:test';
import {
	isHealthPath,
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
});
