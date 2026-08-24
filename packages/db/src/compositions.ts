import { and, desc, eq, max } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { creativeCompositions } from './schema';

export function assertCompositionClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function nextCompositionVersionForTenant(ctx: TenantContext, kind: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({ version: max(creativeCompositions.version) })
		.from(creativeCompositions)
		.where(
			and(eq(creativeCompositions.clientId, required.clientId), eq(creativeCompositions.kind, kind))
		);
	return Number(row?.version ?? 0) + 1;
}

export async function listLatestCreativeCompositionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const kinds = ['og', 'social', 'email'] as const;
	const rows = [];
	for (const kind of kinds) {
		const [row] = await db
			.select()
			.from(creativeCompositions)
			.where(
				and(
					eq(creativeCompositions.clientId, required.clientId),
					eq(creativeCompositions.kind, kind)
				)
			)
			.orderBy(desc(creativeCompositions.version))
			.limit(1);
		if (row) rows.push(row);
	}
	return rows;
}

export async function getCreativeCompositionForTenant(ctx: TenantContext, id: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(creativeCompositions)
		.where(
			and(eq(creativeCompositions.id, id), eq(creativeCompositions.clientId, required.clientId))
		)
		.limit(1);
	return row ?? null;
}

export async function insertCreativeCompositionForTenant(
	ctx: TenantContext,
	input: {
		kind: string;
		templateKey: string;
		schemaVersion: string;
		status?: string;
		version: number;
		width: number;
		height: number;
		headline: string;
		copySnapshot: { headline: string; lede: string; cta: string };
		tokenSnapshot: { background: string; text: string; accent: string; fontFamily: string };
		hasLogo: boolean;
		sourceLogoAssetId?: string | null;
		storageKey: string;
		mimeType?: string;
		createdBy?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(creativeCompositions)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			kind: input.kind,
			templateKey: input.templateKey,
			schemaVersion: input.schemaVersion,
			status: input.status ?? 'draft',
			version: input.version,
			width: input.width,
			height: input.height,
			headline: input.headline,
			copySnapshot: input.copySnapshot,
			tokenSnapshot: input.tokenSnapshot,
			hasLogo: input.hasLogo,
			sourceLogoAssetId: input.sourceLogoAssetId ?? null,
			storageKey: input.storageKey,
			mimeType: input.mimeType ?? 'image/svg+xml',
			createdBy: input.createdBy ?? null
		})
		.returning();
	return row;
}
