import { and, eq } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { auditLogs, clientSettings, clients, memberships } from './schema';

export async function getClientForTenant(ctx: TenantContext, clientId: string) {
	const required = assertSameClient(ctx, clientId);
	const [row] = await db
		.select()
		.from(clients)
		.where(
			and(eq(clients.id, required.clientId), eq(clients.organizationId, required.organizationId))
		)
		.limit(1);
	return row ?? null;
}

export async function getClientSettingsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(clientSettings)
		.where(eq(clientSettings.clientId, required.clientId))
		.limit(1);
	return row ?? null;
}

export async function listMembershipsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(memberships)
		.where(
			and(
				eq(memberships.clientId, required.clientId),
				eq(memberships.organizationId, required.organizationId)
			)
		);
}

export async function updateClientSettingsForTenant(
	ctx: TenantContext,
	clientId: string,
	displayName: string
) {
	const required = assertSameClient(ctx, clientId);
	const [row] = await db
		.update(clientSettings)
		.set({ displayName, updatedAt: new Date() })
		.where(eq(clientSettings.clientId, required.clientId))
		.returning();
	return row ?? null;
}

export async function insertAudit(input: typeof auditLogs.$inferInsert) {
	if (input.clientId) {
		requireTenantContext({
			organizationId: input.organizationId ?? '',
			clientId: input.clientId,
			roleIds: [],
			requestId: input.requestId
		});
	}
	const [row] = await db.insert(auditLogs).values(input).returning();
	return row;
}
