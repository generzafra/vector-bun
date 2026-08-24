import { and, desc, eq } from 'drizzle-orm';
import {
	assertSameClient,
	requireTenantContext,
	type ClientGoalPeriod,
	type ClientGoalType,
	type DataHealthStatus,
	type TenantContext
} from '@vector/contracts';
import type { FirstRevealCheck } from '@vector/funnel-engine';
import { db } from './client';
import {
	clientGoals,
	clientNotificationPreferences,
	dataHealthChecks,
	firstRevealGateResults
} from './schema';

export function assertGoalClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function listClientGoalsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(clientGoals)
		.where(eq(clientGoals.clientId, required.clientId))
		.orderBy(desc(clientGoals.isPrimary), desc(clientGoals.createdAt));
}

export async function insertClientGoalForTenant(
	ctx: TenantContext,
	input: {
		name: string;
		goalType: ClientGoalType;
		targetValue: number;
		unit: string;
		currency: string | null;
		period: ClientGoalPeriod;
		isPrimary: boolean;
		startOn: Date | null;
		endOn: Date | null;
		createdBy: string | null;
		status?: 'active' | 'paused' | 'completed';
	}
) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		if (input.isPrimary) {
			await tx
				.update(clientGoals)
				.set({ isPrimary: false, updatedAt: new Date() })
				.where(and(eq(clientGoals.clientId, required.clientId), eq(clientGoals.isPrimary, true)));
		}
		const [row] = await tx
			.insert(clientGoals)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				name: input.name,
				goalType: input.goalType,
				targetValue: input.targetValue,
				unit: input.unit,
				currency: input.currency,
				period: input.period,
				isPrimary: input.isPrimary,
				startOn: input.startOn,
				endOn: input.endOn,
				status: input.status ?? 'active',
				createdBy: input.createdBy
			})
			.returning();
		return row;
	});
}

export async function getFirstRevealGateForVersionForTenant(
	ctx: TenantContext,
	pageVersionId: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(firstRevealGateResults)
		.where(
			and(
				eq(firstRevealGateResults.clientId, required.clientId),
				eq(firstRevealGateResults.pageVersionId, pageVersionId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function upsertFirstRevealGateForTenant(
	ctx: TenantContext,
	input: {
		pageVersionId: string;
		gateVersion: number;
		passed: boolean;
		checks: FirstRevealCheck[];
		overrideReason?: string | null;
		overriddenBy?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(firstRevealGateResults)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			pageVersionId: input.pageVersionId,
			gateVersion: input.gateVersion,
			passed: input.passed,
			checks: input.checks,
			overrideReason: input.overrideReason ?? null,
			overriddenBy: input.overriddenBy ?? null
		})
		.onConflictDoUpdate({
			target: [firstRevealGateResults.clientId, firstRevealGateResults.pageVersionId],
			set: {
				gateVersion: input.gateVersion,
				passed: input.passed,
				checks: input.checks,
				overrideReason: input.overrideReason ?? null,
				overriddenBy: input.overriddenBy ?? null,
				updatedAt: new Date()
			}
		})
		.returning();
	return row;
}

export async function overrideFirstRevealGateForTenant(
	ctx: TenantContext,
	input: { pageVersionId: string; reason: string; overriddenBy: string }
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(firstRevealGateResults)
		.set({
			overrideReason: input.reason,
			overriddenBy: input.overriddenBy,
			updatedAt: new Date()
		})
		.where(
			and(
				eq(firstRevealGateResults.clientId, required.clientId),
				eq(firstRevealGateResults.pageVersionId, input.pageVersionId)
			)
		)
		.returning();
	return row ?? null;
}

export async function listDataHealthChecksForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(dataHealthChecks)
		.where(eq(dataHealthChecks.clientId, required.clientId))
		.orderBy(dataHealthChecks.checkKey);
}

export async function upsertDataHealthCheckForTenant(
	ctx: TenantContext,
	input: {
		checkKey: string;
		status: DataHealthStatus;
		detail: string;
	}
) {
	const required = requireTenantContext(ctx);
	const now = new Date();
	const [row] = await db
		.insert(dataHealthChecks)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			checkKey: input.checkKey,
			status: input.status,
			detail: input.detail,
			checkedAt: now
		})
		.onConflictDoUpdate({
			target: [dataHealthChecks.clientId, dataHealthChecks.checkKey],
			set: {
				status: input.status,
				detail: input.detail,
				checkedAt: now,
				updatedAt: now
			}
		})
		.returning();
	return row;
}

export const DEFAULT_NOTIFICATION_PREFERENCES = [
	{ topic: 'high_intent_lead', enabled: true },
	{ topic: 'data_health_alert', enabled: true },
	{ topic: 'weekly_digest', enabled: false }
] as const;

export async function listNotificationPreferencesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(clientNotificationPreferences)
		.where(eq(clientNotificationPreferences.clientId, required.clientId))
		.orderBy(clientNotificationPreferences.topic);
}

export async function ensureNotificationPreferencesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const existing = await listNotificationPreferencesForTenant(required);
	const have = new Set(existing.map((row) => row.topic));
	const missing = DEFAULT_NOTIFICATION_PREFERENCES.filter((item) => !have.has(item.topic));
	if (missing.length > 0) {
		await db.insert(clientNotificationPreferences).values(
			missing.map((item) => ({
				organizationId: required.organizationId,
				clientId: required.clientId,
				topic: item.topic,
				channel: 'email',
				enabled: item.enabled
			}))
		);
	}
	return listNotificationPreferencesForTenant(required);
}

export async function updateNotificationPreferenceForTenant(
	ctx: TenantContext,
	input: { topic: string; enabled: boolean }
) {
	const required = requireTenantContext(ctx);
	await ensureNotificationPreferencesForTenant(required);
	const [row] = await db
		.update(clientNotificationPreferences)
		.set({ enabled: input.enabled, updatedAt: new Date() })
		.where(
			and(
				eq(clientNotificationPreferences.clientId, required.clientId),
				eq(clientNotificationPreferences.topic, input.topic)
			)
		)
		.returning();
	return row ?? null;
}
