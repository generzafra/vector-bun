import { and, eq } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { brands, claims, offers, services, type BrandTokens } from './schema';

export async function getBrandForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(brands)
		.where(eq(brands.clientId, required.clientId))
		.limit(1);
	return row ?? null;
}

export async function upsertBrandForTenant(
	ctx: TenantContext,
	input: {
		displayName: string;
		tagline?: string | null;
		audience?: string | null;
		offer?: string | null;
		primaryConversion?: string | null;
		secondaryConversion?: string | null;
		brandPersonality?: string | null;
		tokens: BrandTokens;
	}
) {
	const required = requireTenantContext(ctx);
	const existing = await getBrandForTenant(required);
	if (existing) {
		const [row] = await db
			.update(brands)
			.set({
				...input,
				updatedAt: new Date()
			})
			.where(and(eq(brands.id, existing.id), eq(brands.clientId, required.clientId)))
			.returning();
		return row;
	}
	const [row] = await db
		.insert(brands)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function listServicesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db.select().from(services).where(eq(services.clientId, required.clientId));
}

export async function insertServiceForTenant(
	ctx: TenantContext,
	input: { name: string; slug: string; outcome: string; summary: string }
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(services)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function getServiceForTenant(ctx: TenantContext, serviceId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(services)
		.where(and(eq(services.id, serviceId), eq(services.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function deleteServiceForTenant(ctx: TenantContext, serviceId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.delete(services)
		.where(and(eq(services.id, serviceId), eq(services.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function listOffersForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db.select().from(offers).where(eq(offers.clientId, required.clientId));
}

export async function insertOfferForTenant(
	ctx: TenantContext,
	input: {
		name: string;
		summary: string;
		startingPriceMinor?: number | null;
		currency: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(offers)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function deleteOfferForTenant(ctx: TenantContext, offerId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.delete(offers)
		.where(and(eq(offers.id, offerId), eq(offers.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function listClaimsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db.select().from(claims).where(eq(claims.clientId, required.clientId));
}

export async function insertClaimForTenant(
	ctx: TenantContext,
	input: { kind: 'approved' | 'prohibited'; statement: string; evidence?: string | null }
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(claims)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function deleteClaimForTenant(ctx: TenantContext, claimId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.delete(claims)
		.where(and(eq(claims.id, claimId), eq(claims.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export function assertKnowledgeClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}
