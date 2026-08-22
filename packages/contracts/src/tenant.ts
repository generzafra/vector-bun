import { TenantContextError } from './errors';

export type ActorType = 'human' | 'system' | 'automation' | 'ai' | 'provider_webhook';

export type TenantContext = {
	organizationId: string;
	clientId: string;
	userId?: string;
	roleIds: string[];
	requestId: string;
};

export function requireTenantContext(ctx: TenantContext | null | undefined): TenantContext {
	if (!ctx?.organizationId || !ctx?.clientId || !ctx?.requestId) {
		throw new TenantContextError();
	}
	return ctx;
}

export function assertSameClient(ctx: TenantContext, clientId: string) {
	const required = requireTenantContext(ctx);
	if (required.clientId !== clientId) {
		throw new TenantContextError('Route client id does not match tenant context');
	}
	return required;
}
