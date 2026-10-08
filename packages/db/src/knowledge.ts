import { and, desc, eq } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { brands, claims, offerVersions, offers, services, type BrandTokens } from './schema';

export async function getBrandForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(brands)
		.where(eq(brands.clientId, required.clientId))
		.limit(1);
	return row ?? null;
}

export async function getBrandLabelForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({
			displayName: brands.displayName,
			audience: brands.audience
		})
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
	},
	createdBy?: string | null
) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		const [row] = await tx
			.insert(offers)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				...input
			})
			.returning();
		if (!row) return row;
		await tx.insert(offerVersions).values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			offerId: row.id,
			version: 1,
			name: row.name,
			summary: row.summary,
			offerType: 'other',
			priceMinor: row.startingPriceMinor,
			currency: row.currency,
			createdBy: createdBy ?? null
		});
		return row;
	});
}

export async function listOfferVersionsForTenant(ctx: TenantContext, offerId?: string) {
	const required = requireTenantContext(ctx);
	const where = offerId
		? and(eq(offerVersions.clientId, required.clientId), eq(offerVersions.offerId, offerId))
		: eq(offerVersions.clientId, required.clientId);
	return db.select().from(offerVersions).where(where).orderBy(offerVersions.version);
}

export async function appendOfferVersionForTenant(
	ctx: TenantContext,
	offerId: string,
	input: {
		name: string;
		summary: string;
		offerType: 'consultation' | 'package' | 'promotion' | 'other';
		serviceId?: string | null;
		priceMinor?: number | null;
		discountMinor?: number | null;
		currency: string;
		validFrom?: Date | null;
		validUntil?: Date | null;
		eligibility?: string | null;
		terms?: string | null;
		primaryCta?: string | null;
		createdBy?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		const [offer] = await tx
			.select()
			.from(offers)
			.where(and(eq(offers.id, offerId), eq(offers.clientId, required.clientId)))
			.limit(1);
		if (!offer) return null;
		if (input.serviceId) {
			const [service] = await tx
				.select({ id: services.id })
				.from(services)
				.where(and(eq(services.id, input.serviceId), eq(services.clientId, required.clientId)))
				.limit(1);
			if (!service) return { missingService: true as const };
		}
		const [latest] = await tx
			.select({ version: offerVersions.version })
			.from(offerVersions)
			.where(and(eq(offerVersions.offerId, offerId), eq(offerVersions.clientId, required.clientId)))
			.orderBy(desc(offerVersions.version))
			.limit(1);
		let next = (latest?.version ?? 0) + 1;
		if (!latest) {
			await tx.insert(offerVersions).values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				offerId,
				version: 1,
				name: offer.name,
				summary: offer.summary,
				offerType: 'other',
				priceMinor: offer.startingPriceMinor,
				currency: offer.currency,
				createdBy: null
			});
			next = 2;
		}
		const [version] = await tx
			.insert(offerVersions)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				offerId,
				version: next,
				name: input.name,
				summary: input.summary,
				offerType: input.offerType,
				serviceId: input.serviceId ?? null,
				priceMinor: input.priceMinor ?? null,
				discountMinor: input.discountMinor ?? null,
				currency: input.currency,
				validFrom: input.validFrom ?? null,
				validUntil: input.validUntil ?? null,
				eligibility: input.eligibility ?? null,
				terms: input.terms ?? null,
				primaryCta: input.primaryCta ?? null,
				createdBy: input.createdBy ?? null
			})
			.returning();
		await tx
			.update(offers)
			.set({
				name: input.name,
				summary: input.summary,
				startingPriceMinor: input.priceMinor ?? null,
				currency: input.currency,
				updatedAt: new Date()
			})
			.where(and(eq(offers.id, offerId), eq(offers.clientId, required.clientId)));
		return version ?? null;
	});
}

export async function deleteOfferForTenant(ctx: TenantContext, offerId: string) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		const [offer] = await tx
			.select()
			.from(offers)
			.where(and(eq(offers.id, offerId), eq(offers.clientId, required.clientId)))
			.limit(1);
		if (!offer) return null;
		const versions = await tx
			.select({ version: offerVersions.version })
			.from(offerVersions)
			.where(
				and(eq(offerVersions.offerId, offerId), eq(offerVersions.clientId, required.clientId))
			);
		if (versions.some((row) => row.version > 1)) return { blocked: true as const };
		if (versions.length > 0) {
			await tx
				.delete(offerVersions)
				.where(
					and(eq(offerVersions.offerId, offerId), eq(offerVersions.clientId, required.clientId))
				);
		}
		const [row] = await tx
			.delete(offers)
			.where(and(eq(offers.id, offerId), eq(offers.clientId, required.clientId)))
			.returning();
		return row ?? null;
	});
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
