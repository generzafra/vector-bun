import { and, desc, eq } from 'drizzle-orm';
import {
	assertSameClient,
	requireTenantContext,
	type DefaultActionPolicy,
	type TenantContext
} from '@vector/contracts';
import { db } from './client';
import { aiActionPolicies, aiKillSwitchEvents } from './schema';

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
