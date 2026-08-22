import { and, desc, eq, ne } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { normalizeHostname } from '@vector/funnel-engine';
import { db } from './client';
import { clientDomains } from './schema';

export function assertDomainClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

function isUniqueViolation(error: unknown) {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as { code?: string }).code === '23505'
	);
}

export async function findRoutableDomainByHostname(host: string | null | undefined) {
	const hostname = normalizeHostname(host);
	if (!hostname) return null;
	const [row] = await db
		.select()
		.from(clientDomains)
		.where(and(eq(clientDomains.hostname, hostname), ne(clientDomains.status, 'disabled')))
		.limit(1);
	return row ?? null;
}

export async function listClientDomainsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(clientDomains)
		.where(eq(clientDomains.clientId, required.clientId))
		.orderBy(desc(clientDomains.createdAt));
}

export async function getClientDomainForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(clientDomains)
		.where(and(eq(clientDomains.id, id), eq(clientDomains.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function getManagedDomainForTenant(
	ctx: TenantContext,
	kind: 'production' | 'redirect'
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(clientDomains)
		.where(
			and(
				eq(clientDomains.clientId, required.clientId),
				eq(clientDomains.kind, kind),
				ne(clientDomains.status, 'disabled')
			)
		)
		.limit(1);
	return row ?? null;
}

export async function insertClientDomainForTenant(
	ctx: TenantContext,
	input: {
		hostname: string;
		kind: 'production' | 'redirect';
		verificationToken: string;
		isCanonical: boolean;
	}
) {
	const required = requireTenantContext(ctx);
	try {
		const [row] = await db
			.insert(clientDomains)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				hostname: input.hostname,
				kind: input.kind,
				status: 'pending',
				isCanonical: input.isCanonical,
				verificationToken: input.verificationToken
			})
			.returning();
		return row;
	} catch (error) {
		if (isUniqueViolation(error)) return null;
		throw error;
	}
}

export async function replacePendingDomainForTenant(
	ctx: TenantContext,
	id: string,
	input: { hostname: string; verificationToken: string }
) {
	const required = requireTenantContext(ctx);
	try {
		const [row] = await db
			.update(clientDomains)
			.set({
				hostname: input.hostname,
				verificationToken: input.verificationToken,
				status: 'pending',
				verifiedAt: null,
				activatedAt: null,
				updatedAt: new Date()
			})
			.where(
				and(
					eq(clientDomains.id, id),
					eq(clientDomains.clientId, required.clientId),
					ne(clientDomains.status, 'active')
				)
			)
			.returning();
		return row ?? null;
	} catch (error) {
		if (isUniqueViolation(error)) return null;
		throw error;
	}
}

export async function markClientDomainVerifiedForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const now = new Date();
	const [row] = await db
		.update(clientDomains)
		.set({ status: 'verified', verifiedAt: now, updatedAt: now })
		.where(and(eq(clientDomains.id, id), eq(clientDomains.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function markClientDomainActiveForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const now = new Date();
	const [row] = await db
		.update(clientDomains)
		.set({ status: 'active', activatedAt: now, updatedAt: now })
		.where(
			and(
				eq(clientDomains.id, id),
				eq(clientDomains.clientId, required.clientId),
				eq(clientDomains.status, 'verified')
			)
		)
		.returning();
	return row ?? null;
}

export async function disableClientDomainForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(clientDomains)
		.set({ status: 'disabled', updatedAt: new Date() })
		.where(
			and(
				eq(clientDomains.id, id),
				eq(clientDomains.clientId, required.clientId),
				ne(clientDomains.kind, 'preview')
			)
		)
		.returning();
	return row ?? null;
}
