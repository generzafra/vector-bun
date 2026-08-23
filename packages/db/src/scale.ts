import { and, eq, inArray, or, sql } from 'drizzle-orm';
import {
	DEFAULT_USAGE_LIMIT_MODE,
	DEFAULT_USAGE_LIMITS,
	assertSameClient,
	requireTenantContext,
	usageWindowStart,
	type DefaultUsageLimit,
	type TenantContext,
	type UsageLimitMode,
	type UsageResourceFamily
} from '@vector/contracts';
import { db } from './client';
import { tenantUsageEvents, tenantUsageLimits } from './schema';

export function assertScaleClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function listTenantUsageLimitsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(tenantUsageLimits)
		.where(eq(tenantUsageLimits.clientId, required.clientId))
		.orderBy(tenantUsageLimits.resourceFamily);
}

export async function ensureTenantUsageLimitsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const existing = await listTenantUsageLimitsForTenant(required);
	const have = new Set(existing.map((row) => row.resourceFamily));
	const missing = DEFAULT_USAGE_LIMITS.filter((limit) => !have.has(limit.resourceFamily));
	if (missing.length > 0) {
		await db.insert(tenantUsageLimits).values(
			missing.map((limit) => ({
				organizationId: required.organizationId,
				clientId: required.clientId,
				resourceFamily: limit.resourceFamily,
				window: limit.window,
				hardLimit: limit.hardLimit,
				warningPercent: limit.warningPercent,
				mode: DEFAULT_USAGE_LIMIT_MODE
			}))
		);
	}
	return listTenantUsageLimitsForTenant(required);
}

export async function getTenantUsageLimitForTenant(
	ctx: TenantContext,
	resourceFamily: UsageResourceFamily
) {
	const required = requireTenantContext(ctx);
	await ensureTenantUsageLimitsForTenant(required);
	const [row] = await db
		.select()
		.from(tenantUsageLimits)
		.where(
			and(
				eq(tenantUsageLimits.clientId, required.clientId),
				eq(tenantUsageLimits.resourceFamily, resourceFamily)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function updateTenantUsageLimitForTenant(
	ctx: TenantContext,
	input: {
		resourceFamily: UsageResourceFamily;
		hardLimit: number;
		warningPercent: number;
		mode: UsageLimitMode;
		overrideReason: string;
	}
) {
	const required = requireTenantContext(ctx);
	await ensureTenantUsageLimitsForTenant(required);
	const [row] = await db
		.update(tenantUsageLimits)
		.set({
			hardLimit: input.hardLimit,
			warningPercent: input.warningPercent,
			mode: input.mode,
			overrideReason: input.overrideReason,
			updatedAt: new Date()
		})
		.where(
			and(
				eq(tenantUsageLimits.clientId, required.clientId),
				eq(tenantUsageLimits.resourceFamily, input.resourceFamily)
			)
		)
		.returning();
	return row ?? null;
}

export async function sumTenantUsageForWindow(
	ctx: TenantContext,
	input: { resourceFamily: UsageResourceFamily; windowStartedAt: Date }
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({
			total: sql<number>`coalesce(sum(${tenantUsageEvents.quantity}), 0)`
		})
		.from(tenantUsageEvents)
		.where(
			and(
				eq(tenantUsageEvents.clientId, required.clientId),
				eq(tenantUsageEvents.resourceFamily, input.resourceFamily),
				eq(tenantUsageEvents.windowStartedAt, input.windowStartedAt)
			)
		);
	return Number(row?.total ?? 0);
}

export async function getTenantUsageEventByIdempotency(
	ctx: TenantContext,
	input: { requestId: string; resourceFamily: UsageResourceFamily }
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(tenantUsageEvents)
		.where(
			and(
				eq(tenantUsageEvents.clientId, required.clientId),
				eq(tenantUsageEvents.requestId, input.requestId),
				eq(tenantUsageEvents.resourceFamily, input.resourceFamily)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function insertTenantUsageEventForTenant(
	ctx: TenantContext,
	input: {
		resourceFamily: UsageResourceFamily;
		window: DefaultUsageLimit['window'];
		windowStartedAt: Date;
		quantity: number;
		usedBefore: number;
		hardLimit: number;
		warningPercent: number;
		mode: 'evaluate_only' | 'enforce';
		outcome: 'recorded' | 'would_deny';
		requestId: string;
		actorId?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(tenantUsageEvents)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			resourceFamily: input.resourceFamily,
			window: input.window,
			windowStartedAt: input.windowStartedAt,
			quantity: input.quantity,
			usedBefore: input.usedBefore,
			hardLimit: input.hardLimit,
			warningPercent: input.warningPercent,
			mode: input.mode,
			outcome: input.outcome,
			requestId: input.requestId,
			actorId: input.actorId ?? null
		})
		.returning();
	return row;
}

export async function listTenantUsageEventsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(tenantUsageEvents)
		.where(eq(tenantUsageEvents.clientId, required.clientId));
}

export async function listTenantUsageLimitsForClientIds(
	organizationId: string,
	clientIds: string[]
) {
	if (clientIds.length === 0) return [];
	return db
		.select()
		.from(tenantUsageLimits)
		.where(
			and(
				eq(tenantUsageLimits.organizationId, organizationId),
				inArray(tenantUsageLimits.clientId, clientIds)
			)
		);
}

export async function listTenantUsageTotalsForCurrentWindows(
	organizationId: string,
	clientIds: string[],
	now = new Date()
) {
	if (clientIds.length === 0) return [];
	const starts = new Map(
		DEFAULT_USAGE_LIMITS.map(
			(limit) => [limit.resourceFamily, usageWindowStart(limit.window, now)] as const
		)
	);
	const windowFilters = DEFAULT_USAGE_LIMITS.map((limit) =>
		and(
			eq(tenantUsageEvents.resourceFamily, limit.resourceFamily),
			eq(tenantUsageEvents.windowStartedAt, starts.get(limit.resourceFamily)!)
		)
	);
	return db
		.select({
			clientId: tenantUsageEvents.clientId,
			resourceFamily: tenantUsageEvents.resourceFamily,
			total: sql<number>`coalesce(sum(${tenantUsageEvents.quantity}), 0)`
		})
		.from(tenantUsageEvents)
		.where(
			and(
				eq(tenantUsageEvents.organizationId, organizationId),
				inArray(tenantUsageEvents.clientId, clientIds),
				or(...windowFilters)
			)
		)
		.groupBy(tenantUsageEvents.clientId, tenantUsageEvents.resourceFamily);
}

export async function deleteTenantUsageForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	await db.delete(tenantUsageEvents).where(eq(tenantUsageEvents.clientId, required.clientId));
	await db.delete(tenantUsageLimits).where(eq(tenantUsageLimits.clientId, required.clientId));
}
