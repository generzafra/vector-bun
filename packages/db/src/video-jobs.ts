import { and, desc, eq, sql } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { videoGenerationJobs } from './schema';

export async function listVideoGenerationJobsForTenant(ctx: TenantContext, limit = 40) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			id: videoGenerationJobs.id,
			mode: videoGenerationJobs.mode,
			title: videoGenerationJobs.title,
			status: videoGenerationJobs.status,
			durationSeconds: videoGenerationJobs.durationSeconds,
			denyReason: videoGenerationJobs.denyReason,
			creativeAssetId: videoGenerationJobs.creativeAssetId,
			createdAt: videoGenerationJobs.createdAt
		})
		.from(videoGenerationJobs)
		.where(eq(videoGenerationJobs.clientId, required.clientId))
		.orderBy(desc(videoGenerationJobs.createdAt))
		.limit(limit);
}

export async function getVideoGenerationJobByIdempotencyForTenant(
	ctx: TenantContext,
	idempotencyKey: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(videoGenerationJobs)
		.where(
			and(
				eq(videoGenerationJobs.clientId, required.clientId),
				eq(videoGenerationJobs.idempotencyKey, idempotencyKey)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function sumSucceededVideoCostMicrosForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({
			total: sql<number>`coalesce(sum(${videoGenerationJobs.costMicros}), 0)`
		})
		.from(videoGenerationJobs)
		.where(
			and(
				eq(videoGenerationJobs.clientId, required.clientId),
				eq(videoGenerationJobs.status, 'succeeded')
			)
		);
	return Number(row?.total ?? 0);
}

export async function insertVideoGenerationJobForTenant(
	ctx: TenantContext,
	input: {
		status: 'succeeded' | 'failed' | 'denied';
		mode: 'generate' | 'image_to_video';
		title: string;
		promptText: string;
		promptVersion: string;
		schemaVersion: string;
		durationSeconds: number;
		adapter: string;
		model: string;
		providerRequestId?: string | null;
		idempotencyKey: string;
		costMicros: number;
		denyReason?: string | null;
		error?: string | null;
		storageKey?: string | null;
		creativeAssetId?: string | null;
		sourceAssetId?: string | null;
		createdBy?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(videoGenerationJobs)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			status: input.status,
			mode: input.mode,
			title: input.title,
			promptText: input.promptText,
			promptVersion: input.promptVersion,
			schemaVersion: input.schemaVersion,
			durationSeconds: input.durationSeconds,
			adapter: input.adapter,
			model: input.model,
			providerRequestId: input.providerRequestId ?? null,
			idempotencyKey: input.idempotencyKey,
			costMicros: input.costMicros,
			denyReason: input.denyReason ?? null,
			error: input.error ?? null,
			storageKey: input.storageKey ?? null,
			creativeAssetId: input.creativeAssetId ?? null,
			sourceAssetId: input.sourceAssetId ?? null,
			createdBy: input.createdBy ?? null
		})
		.returning();
	return row ?? null;
}
