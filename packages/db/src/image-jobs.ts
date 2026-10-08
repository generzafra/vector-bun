import { and, desc, eq, sql } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { imageGenerationJobs } from './schema';

export function assertImageJobClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function listImageGenerationJobsForTenant(ctx: TenantContext, limit = 40) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(imageGenerationJobs)
		.where(eq(imageGenerationJobs.clientId, required.clientId))
		.orderBy(desc(imageGenerationJobs.createdAt))
		.limit(limit);
}

export async function getImageGenerationJobByIdempotencyForTenant(
	ctx: TenantContext,
	idempotencyKey: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(imageGenerationJobs)
		.where(
			and(
				eq(imageGenerationJobs.clientId, required.clientId),
				eq(imageGenerationJobs.idempotencyKey, idempotencyKey)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function sumSucceededImageCostMicrosForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({
			total: sql<number>`coalesce(sum(${imageGenerationJobs.costMicros}), 0)`
		})
		.from(imageGenerationJobs)
		.where(
			and(
				eq(imageGenerationJobs.clientId, required.clientId),
				eq(imageGenerationJobs.status, 'succeeded')
			)
		);
	return Number(row?.total ?? 0);
}

export async function insertImageGenerationJobForTenant(
	ctx: TenantContext,
	input: {
		status: 'succeeded' | 'failed' | 'denied';
		purpose: string;
		title: string;
		promptText: string;
		promptVersion: string;
		schemaVersion: string;
		adapter: string;
		model: string;
		providerRequestId?: string | null;
		idempotencyKey: string;
		costMicros: number;
		currency?: 'USD';
		denyReason?: string | null;
		error?: string | null;
		storageKey?: string | null;
		creativeAssetId?: string | null;
		visualDirectionId?: string | null;
		createdBy?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(imageGenerationJobs)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			status: input.status,
			purpose: input.purpose,
			title: input.title,
			promptText: input.promptText,
			promptVersion: input.promptVersion,
			schemaVersion: input.schemaVersion,
			adapter: input.adapter,
			model: input.model,
			providerRequestId: input.providerRequestId ?? null,
			idempotencyKey: input.idempotencyKey,
			costMicros: input.costMicros,
			currency: input.currency ?? 'USD',
			denyReason: input.denyReason ?? null,
			error: input.error ?? null,
			storageKey: input.storageKey ?? null,
			creativeAssetId: input.creativeAssetId ?? null,
			visualDirectionId: input.visualDirectionId ?? null,
			createdBy: input.createdBy ?? null
		})
		.returning();
	return row;
}

export async function attachImageJobDirectionForTenant(
	ctx: TenantContext,
	jobId: string,
	visualDirectionId: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(imageGenerationJobs)
		.set({ visualDirectionId, updatedAt: new Date() })
		.where(
			and(eq(imageGenerationJobs.id, jobId), eq(imageGenerationJobs.clientId, required.clientId))
		)
		.returning();
	return row ?? null;
}

export async function listImageJobsForDirectionForTenant(
	ctx: TenantContext,
	visualDirectionId: string
) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(imageGenerationJobs)
		.where(
			and(
				eq(imageGenerationJobs.clientId, required.clientId),
				eq(imageGenerationJobs.visualDirectionId, visualDirectionId)
			)
		);
}
