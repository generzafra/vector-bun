import { expect, test } from 'bun:test';
import {
	TenantContextError,
	assertActorOwnsContext,
	assertSameClient,
	requireTenantContext
} from '@vector/contracts';

test('missing TenantContext fails closed', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(() => requireTenantContext({} as never)).toThrow(TenantContextError);
	expect(() =>
		requireTenantContext({
			organizationId: '',
			clientId: '',
			roleIds: [],
			requestId: ''
		})
	).toThrow(TenantContextError);
});

test('route ids without tenant verification fail', () => {
	const ctx = {
		organizationId: '11111111-1111-4111-8111-111111111111',
		clientId: '22222222-2222-4222-8222-222222222222',
		roleIds: [],
		requestId: 'req-1'
	};
	expect(() => assertSameClient(ctx, '33333333-3333-4333-8333-333333333333')).toThrow(
		TenantContextError
	);
	expect(assertSameClient(ctx, ctx.clientId).clientId).toBe(ctx.clientId);
});

test('actor cannot bind tenant context for another client', () => {
	const ctx = {
		organizationId: '11111111-1111-4111-8111-111111111111',
		clientId: '22222222-2222-4222-8222-222222222222',
		roleIds: [],
		requestId: 'req-2'
	};
	expect(() =>
		assertActorOwnsContext(
			{ organizationId: ctx.organizationId, clientId: '33333333-3333-4333-8333-333333333333' },
			ctx
		)
	).toThrow(TenantContextError);
	expect(() =>
		assertActorOwnsContext({ organizationId: ctx.organizationId, clientId: null }, ctx)
	).toThrow(TenantContextError);
});
