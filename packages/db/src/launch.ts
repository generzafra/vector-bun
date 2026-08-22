import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import {
	READINESS_CATALOG,
	assertSameClient,
	requireTenantContext,
	type LaunchClass,
	type LaunchState,
	type ReadinessItemStatus,
	type TenantContext
} from '@vector/contracts';
import { db } from './client';
import {
	clientLaunchApprovals,
	clientLaunchBlocks,
	clientLaunchEvents,
	clientLaunches,
	clientReadiness,
	clientReadinessItems
} from './schema';

export function assertLaunchClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function getReadinessForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(clientReadiness)
		.where(eq(clientReadiness.clientId, required.clientId))
		.limit(1);
	return row ?? null;
}

export async function listReadinessItemsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(clientReadinessItems)
		.where(eq(clientReadinessItems.clientId, required.clientId));
}

export async function getLaunchForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(clientLaunches)
		.where(eq(clientLaunches.clientId, required.clientId))
		.limit(1);
	return row ?? null;
}

export async function listLaunchEventsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(clientLaunchEvents)
		.where(eq(clientLaunchEvents.clientId, required.clientId))
		.orderBy(desc(clientLaunchEvents.createdAt));
}

export async function listLaunchBlocksForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(clientLaunchBlocks)
		.where(eq(clientLaunchBlocks.clientId, required.clientId))
		.orderBy(desc(clientLaunchBlocks.createdAt));
}

export async function listLaunchApprovalsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(clientLaunchApprovals)
		.where(eq(clientLaunchApprovals.clientId, required.clientId))
		.orderBy(desc(clientLaunchApprovals.createdAt));
}

export async function ensureLaunchRecordsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const existingReadiness = await getReadinessForTenant(required);
	const existingItems = await listReadinessItemsForTenant(required);
	const existingLaunch = await getLaunchForTenant(required);
	const have = new Set(existingItems.map((item) => item.key));
	const missing = READINESS_CATALOG.filter((item) => !have.has(item.key));
	if (existingReadiness && existingLaunch && missing.length === 0) {
		return { readiness: existingReadiness, launch: existingLaunch };
	}

	return db.transaction(async (tx) => {
		let [readiness] = await tx
			.select()
			.from(clientReadiness)
			.where(eq(clientReadiness.clientId, required.clientId))
			.limit(1);
		if (!readiness) {
			[readiness] = await tx
				.insert(clientReadiness)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId
				})
				.returning();
		}

		const rows = await tx
			.select()
			.from(clientReadinessItems)
			.where(eq(clientReadinessItems.clientId, required.clientId));
		const present = new Set(rows.map((item) => item.key));
		const toInsert = READINESS_CATALOG.filter((item) => !present.has(item.key));
		if (toInsert.length > 0) {
			await tx.insert(clientReadinessItems).values(
				toInsert.map((item) => ({
					organizationId: required.organizationId,
					clientId: required.clientId,
					key: item.key,
					category: item.category,
					label: item.label,
					blocking: item.blocking,
					source: item.source,
					status: 'pending' as const
				}))
			);
		}

		let [launch] = await tx
			.select()
			.from(clientLaunches)
			.where(eq(clientLaunches.clientId, required.clientId))
			.limit(1);
		if (!launch) {
			[launch] = await tx
				.insert(clientLaunches)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					launchClass: 'B',
					status: 'draft'
				})
				.returning();
		}

		return { readiness, launch };
	});
}

export async function updateReadinessItemForTenant(
	ctx: TenantContext,
	key: string,
	input: { status: ReadinessItemStatus; detail?: string | null }
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(clientReadinessItems)
		.set({
			status: input.status,
			detail: input.detail ?? null,
			completedAt: input.status === 'complete' ? new Date() : null,
			updatedAt: new Date()
		})
		.where(
			and(eq(clientReadinessItems.clientId, required.clientId), eq(clientReadinessItems.key, key))
		)
		.returning();
	return row ?? null;
}

export async function updateReadinessItemsForTenant(
	ctx: TenantContext,
	updates: { key: string; status: ReadinessItemStatus; detail?: string | null }[]
) {
	requireTenantContext(ctx);
	if (updates.length === 0) return [];
	const rows = [];
	for (const item of updates) {
		rows.push(await updateReadinessItemForTenant(ctx, item.key, item));
	}
	return rows.filter((row): row is NonNullable<typeof row> => row !== null);
}

export async function updateReadinessSummaryForTenant(
	ctx: TenantContext,
	input: {
		scorePercent: number;
		blockingComplete: number;
		blockingTotal: number;
		optionalComplete: number;
		optionalTotal: number;
		vectorReady: boolean;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(clientReadiness)
		.set({
			...input,
			computedAt: new Date(),
			updatedAt: new Date()
		})
		.where(eq(clientReadiness.clientId, required.clientId))
		.returning();
	return row ?? null;
}

export async function updateLaunchForTenant(
	ctx: TenantContext,
	input: Partial<{
		launchClass: LaunchClass;
		status: LaunchState;
		signedAt: Date | null;
		onboardingStartedAt: Date | null;
		vectorReadyAt: Date | null;
		generationStartedAt: Date | null;
		qaStartedAt: Date | null;
		approvalRequestedAt: Date | null;
		approvalReceivedAt: Date | null;
		domainReadyAt: Date | null;
		launchStartedAt: Date | null;
		liveAt: Date | null;
		pausedAt: Date | null;
		pausedSeconds: number;
		resumeStatus: LaunchState | null;
		failureReason: string | null;
	}>
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(clientLaunches)
		.set({ ...input, updatedAt: new Date() })
		.where(eq(clientLaunches.clientId, required.clientId))
		.returning();
	return row ?? null;
}

export async function insertLaunchEventForTenant(
	ctx: TenantContext,
	input: {
		launchId: string;
		fromStatus: LaunchState;
		toStatus: LaunchState;
		reason: string;
		actorId?: string | null;
		requestId: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(clientLaunchEvents)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			launchId: input.launchId,
			fromStatus: input.fromStatus,
			toStatus: input.toStatus,
			reason: input.reason,
			actorId: input.actorId ?? null,
			requestId: input.requestId
		})
		.returning();
	return row;
}

export async function syncLaunchBlocksForTenant(
	ctx: TenantContext,
	launchId: string,
	blocks: { itemKey: string; message: string }[]
) {
	const required = requireTenantContext(ctx);
	const open = await db
		.select()
		.from(clientLaunchBlocks)
		.where(
			and(eq(clientLaunchBlocks.clientId, required.clientId), isNull(clientLaunchBlocks.resolvedAt))
		);
	const wanted = new Set(blocks.map((block) => block.itemKey));
	const staleIds = open.filter((row) => !wanted.has(row.itemKey)).map((row) => row.id);
	if (staleIds.length > 0) {
		await db
			.update(clientLaunchBlocks)
			.set({ resolvedAt: new Date() })
			.where(
				and(
					eq(clientLaunchBlocks.clientId, required.clientId),
					inArray(clientLaunchBlocks.id, staleIds)
				)
			);
	}
	const openKeys = new Set(open.map((row) => row.itemKey));
	const fresh = blocks.filter((block) => !openKeys.has(block.itemKey));
	if (fresh.length > 0) {
		await db.insert(clientLaunchBlocks).values(
			fresh.map((block) => ({
				organizationId: required.organizationId,
				clientId: required.clientId,
				launchId,
				itemKey: block.itemKey,
				message: block.message
			}))
		);
	}
}

export async function insertLaunchApprovalForTenant(
	ctx: TenantContext,
	input: {
		launchId: string;
		kind: 'client_launch' | 'internal_qa';
		status: 'pending' | 'approved' | 'rejected';
		actorId?: string | null;
		note?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(clientLaunchApprovals)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			launchId: input.launchId,
			kind: input.kind,
			status: input.status,
			actorId: input.actorId ?? null,
			note: input.note ?? null,
			decidedAt: input.status === 'pending' ? null : new Date()
		})
		.returning();
	return row;
}

export async function approvePendingLaunchApprovalForTenant(
	ctx: TenantContext,
	kind: 'client_launch' | 'internal_qa',
	actorId: string,
	note: string
) {
	const required = requireTenantContext(ctx);
	const [pending] = await db
		.select()
		.from(clientLaunchApprovals)
		.where(
			and(
				eq(clientLaunchApprovals.clientId, required.clientId),
				eq(clientLaunchApprovals.kind, kind),
				eq(clientLaunchApprovals.status, 'pending')
			)
		)
		.orderBy(desc(clientLaunchApprovals.createdAt))
		.limit(1);
	if (!pending) return null;
	const [row] = await db
		.update(clientLaunchApprovals)
		.set({
			status: 'approved',
			actorId,
			note,
			decidedAt: new Date()
		})
		.where(
			and(
				eq(clientLaunchApprovals.id, pending.id),
				eq(clientLaunchApprovals.clientId, required.clientId)
			)
		)
		.returning();
	return row ?? null;
}
