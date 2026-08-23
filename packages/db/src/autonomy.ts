import { and, count, desc, eq } from 'drizzle-orm';
import {
	LAUNCH_AUTOMATION_ACTIONS,
	assertSameClient,
	requireTenantContext,
	type DefaultActionPolicy,
	type TenantContext
} from '@vector/contracts';
import { db } from './client';
import { ensureLaunchRecordsForTenant } from './launch';
import {
	aiActionExecutions,
	aiActionPolicies,
	aiKillSwitchEvents,
	launchAutomationPolicies,
	type AiActionExecutionOutput
} from './schema';

export function assertAutonomyClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function listAiActionPolicies() {
	return db.select().from(aiActionPolicies).orderBy(aiActionPolicies.actionType);
}

export async function upsertAiActionPolicy(input: DefaultActionPolicy) {
	const [existing] = await db
		.select()
		.from(aiActionPolicies)
		.where(eq(aiActionPolicies.actionType, input.actionType))
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(aiActionPolicies)
			.set({
				name: input.name,
				description: input.description,
				riskClass: input.riskClass,
				defaultAutonomy: input.defaultAutonomy,
				maxAutonomy: input.maxAutonomy,
				autoExecuteAllowed: input.autoExecuteAllowed,
				forbidden: input.forbidden,
				financialLimitMinor: input.financialLimitMinor,
				contentLimit: input.contentLimit,
				providerLimit: input.providerLimit,
				approvalExpirySeconds: input.approvalExpirySeconds,
				rollbackSupported: input.rollbackSupported,
				updatedAt: new Date()
			})
			.where(eq(aiActionPolicies.id, existing.id))
			.returning();
		return row ?? existing;
	}
	const [row] = await db
		.insert(aiActionPolicies)
		.values({
			actionType: input.actionType,
			name: input.name,
			description: input.description,
			riskClass: input.riskClass,
			defaultAutonomy: input.defaultAutonomy,
			maxAutonomy: input.maxAutonomy,
			autoExecuteAllowed: input.autoExecuteAllowed,
			forbidden: input.forbidden,
			financialLimitMinor: input.financialLimitMinor,
			contentLimit: input.contentLimit,
			providerLimit: input.providerLimit,
			approvalExpirySeconds: input.approvalExpirySeconds,
			rollbackSupported: input.rollbackSupported
		})
		.returning();
	return row;
}

export async function insertKillSwitchEventForTenant(
	ctx: TenantContext,
	input: {
		paused: boolean;
		previousPaused: boolean;
		reason: string;
		actorId?: string | null;
		requestId: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(aiKillSwitchEvents)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			scope: 'client',
			paused: input.paused,
			previousPaused: input.previousPaused,
			reason: input.reason,
			actorId: input.actorId ?? null,
			privileged: true,
			requestId: input.requestId
		})
		.returning();
	return row;
}

export async function listKillSwitchEventsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(aiKillSwitchEvents)
		.where(
			and(
				eq(aiKillSwitchEvents.clientId, required.clientId),
				eq(aiKillSwitchEvents.scope, 'client')
			)
		)
		.orderBy(desc(aiKillSwitchEvents.createdAt));
}

export async function getAiActionPolicyByType(actionType: string) {
	const [row] = await db
		.select()
		.from(aiActionPolicies)
		.where(eq(aiActionPolicies.actionType, actionType))
		.limit(1);
	return row ?? null;
}

export async function getAiActionExecutionByIdempotency(
	ctx: TenantContext,
	idempotencyKey: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(aiActionExecutions)
		.where(
			and(
				eq(aiActionExecutions.clientId, required.clientId),
				eq(aiActionExecutions.idempotencyKey, idempotencyKey)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function listAiActionExecutionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(aiActionExecutions)
		.where(eq(aiActionExecutions.clientId, required.clientId))
		.orderBy(desc(aiActionExecutions.createdAt));
}

export async function countSucceededAiActionExecutionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({ total: count() })
		.from(aiActionExecutions)
		.where(
			and(
				eq(aiActionExecutions.clientId, required.clientId),
				eq(aiActionExecutions.status, 'succeeded')
			)
		);
	return Number(row?.total ?? 0);
}

export async function insertAiActionExecutionForTenant(
	ctx: TenantContext,
	input: {
		actionType: string;
		status: 'succeeded' | 'blocked' | 'failed';
		autonomyLevel?: number;
		blockedBy?: string | null;
		idempotencyKey: string;
		requestId: string;
		actorId?: string | null;
		output?: AiActionExecutionOutput | null;
		error?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(aiActionExecutions)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actionType: input.actionType,
			status: input.status,
			autonomyLevel: input.autonomyLevel ?? 3,
			blockedBy: input.blockedBy ?? null,
			confidenceIgnored: true,
			idempotencyKey: input.idempotencyKey,
			requestId: input.requestId,
			actorId: input.actorId ?? null,
			output: input.output ?? undefined,
			error: input.error ?? null
		})
		.returning();
	return row;
}

export async function listLaunchAutomationPoliciesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(launchAutomationPolicies)
		.where(eq(launchAutomationPolicies.clientId, required.clientId))
		.orderBy(launchAutomationPolicies.actionType);
}

export async function ensureLaunchAutomationPoliciesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const { launch } = await ensureLaunchRecordsForTenant(required);
	if (!launch) {
		throw new Error('Launch record missing after ensure');
	}
	const existing = await listLaunchAutomationPoliciesForTenant(required);
	const have = new Set(existing.map((row) => row.actionType));
	const missing = LAUNCH_AUTOMATION_ACTIONS.filter((actionType) => !have.has(actionType));
	if (missing.length > 0) {
		await db.insert(launchAutomationPolicies).values(
			missing.map((actionType) => ({
				organizationId: required.organizationId,
				clientId: required.clientId,
				launchId: launch.id,
				actionType,
				enabled: false,
				unpublishedDraftsOnly: true
			}))
		);
	}
	return listLaunchAutomationPoliciesForTenant(required);
}

export async function updateLaunchAutomationPolicyForTenant(
	ctx: TenantContext,
	input: { actionType: string; enabled: boolean }
) {
	const required = requireTenantContext(ctx);
	await ensureLaunchAutomationPoliciesForTenant(required);
	const [row] = await db
		.update(launchAutomationPolicies)
		.set({
			enabled: input.enabled,
			unpublishedDraftsOnly: true,
			updatedAt: new Date()
		})
		.where(
			and(
				eq(launchAutomationPolicies.clientId, required.clientId),
				eq(launchAutomationPolicies.actionType, input.actionType)
			)
		)
		.returning();
	return row ?? null;
}
