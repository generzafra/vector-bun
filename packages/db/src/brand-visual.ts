import { and, desc, eq } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import {
	brandVisualProfileVersions,
	brandVisualProfiles,
	type BrandVisualSnapshot
} from './schema';

export type BrandVisualWriteInput = BrandVisualSnapshot & {
	source: 'intake' | 'edited';
};

export function assertBrandVisualClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function getBrandVisualProfileForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(brandVisualProfiles)
		.where(eq(brandVisualProfiles.clientId, required.clientId))
		.limit(1);
	return row ?? null;
}

export async function listBrandVisualVersionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(brandVisualProfileVersions)
		.where(eq(brandVisualProfileVersions.clientId, required.clientId))
		.orderBy(desc(brandVisualProfileVersions.version));
}

function snapshotFrom(input: BrandVisualSnapshot): BrandVisualSnapshot {
	return {
		primaryLogoAssetId: input.primaryLogoAssetId,
		primaryColor: input.primaryColor,
		accentColor: input.accentColor,
		primaryFont: input.primaryFont,
		visualPersonality: input.visualPersonality,
		photographyDirection: input.photographyDirection,
		prohibitedStyles: input.prohibitedStyles
	};
}

export async function saveBrandVisualDraftForTenant(
	ctx: TenantContext,
	input: BrandVisualWriteInput
) {
	const required = requireTenantContext(ctx);
	const existing = await getBrandVisualProfileForTenant(required);
	const values = {
		source: input.source,
		status: 'draft' as const,
		primaryLogoAssetId: input.primaryLogoAssetId,
		primaryColor: input.primaryColor,
		accentColor: input.accentColor,
		primaryFont: input.primaryFont,
		visualPersonality: input.visualPersonality,
		photographyDirection: input.photographyDirection,
		prohibitedStyles: input.prohibitedStyles,
		confirmedBy: null,
		confirmedAt: null,
		updatedAt: new Date()
	};
	if (existing) {
		const [row] = await db
			.update(brandVisualProfiles)
			.set(values)
			.where(
				and(
					eq(brandVisualProfiles.id, existing.id),
					eq(brandVisualProfiles.clientId, required.clientId)
				)
			)
			.returning();
		return row;
	}
	const [row] = await db
		.insert(brandVisualProfiles)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			currentVersion: 0,
			...values
		})
		.returning();
	return row;
}

export async function confirmBrandVisualProfileForTenant(
	ctx: TenantContext,
	input: BrandVisualWriteInput & { confirmedBy: string }
) {
	const required = requireTenantContext(ctx);
	const snapshot = snapshotFrom(input);
	return db.transaction(async (tx) => {
		const [existing] = await tx
			.select()
			.from(brandVisualProfiles)
			.where(eq(brandVisualProfiles.clientId, required.clientId))
			.limit(1);
		const nextVersion = (existing?.currentVersion ?? 0) + 1;
		const now = new Date();
		const values = {
			source: input.source,
			status: 'confirmed' as const,
			currentVersion: nextVersion,
			primaryLogoAssetId: input.primaryLogoAssetId,
			primaryColor: input.primaryColor,
			accentColor: input.accentColor,
			primaryFont: input.primaryFont,
			visualPersonality: input.visualPersonality,
			photographyDirection: input.photographyDirection,
			prohibitedStyles: input.prohibitedStyles,
			confirmedBy: input.confirmedBy,
			confirmedAt: now,
			updatedAt: now
		};
		const [profile] = existing
			? await tx
					.update(brandVisualProfiles)
					.set(values)
					.where(
						and(
							eq(brandVisualProfiles.id, existing.id),
							eq(brandVisualProfiles.clientId, required.clientId)
						)
					)
					.returning()
			: await tx
					.insert(brandVisualProfiles)
					.values({
						organizationId: required.organizationId,
						clientId: required.clientId,
						...values
					})
					.returning();
		const [version] = await tx
			.insert(brandVisualProfileVersions)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				profileId: profile.id,
				version: nextVersion,
				snapshot,
				confirmedBy: input.confirmedBy
			})
			.returning();
		return { profile, version };
	});
}
