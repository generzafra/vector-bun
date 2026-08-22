import { expect, test } from 'bun:test';
import { resolveDeliveryRequest, unknownHostPayload } from '../apps/delivery/src/lib/server/host';

test('delivery health is allowed', () => {
	expect(resolveDeliveryRequest('/health', 'alpha.example')).toEqual({
		allow: true,
		kind: 'health'
	});
});

test('delivery unknown host returns 404 payload with no tenant data', () => {
	const decision = resolveDeliveryRequest('/', 'client-beta.example');
	expect(decision).toEqual({ allow: false, kind: 'unknown_host', host: 'client-beta.example' });
	const body = JSON.stringify(unknownHostPayload());
	expect(body).toContain('Unknown host');
	expect(body.toLowerCase()).not.toContain('alpha');
	expect(body.toLowerCase()).not.toContain('beta');
	expect(body).not.toContain('client');
});
