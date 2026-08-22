import { and, eq, isNull } from 'drizzle-orm';
import { requireCapability } from '@vector/auth';
import {
	ForbiddenError,
	NotFoundError,
	createClientSchema,
	parseContract,
	updateClientSettingsSchema,
	type TenantContext
} from '@vector/contracts';
import {
	clientSettings,
	clients,
	db,
	getClientForTenant,
	memberships,
	updateClientSettingsForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

async function hasOrgWideMembership(actor: Actor) {
	const rows = await db
		.select({ id: memberships.id })
		.from(memberships)
		.where(
			and(
				eq(memberships.userId, actor.userId),
				eq(memberships.organizationId, actor.organizationId),
				isNull(memberships.clientId)
			)
		)
		.limit(1);
	return rows.length > 0;
}

export async function listClientsForActor(actor: Actor) {
	requireCapability(actor.permissions, 'clients.read');
	if (await hasOrgWideMembership(actor)) {
		return db.select().from(clients).where(eq(clients.organizationId, actor.organizationId));
	}
	if (actor.clientId) {
		return db
			.select()
			.from(clients)
			.where(and(eq(clients.organizationId, actor.organizationId), eq(clients.id, actor.clientId)));
	}
	return [];
}

export async function getClient(ctx: TenantContext, clientId: string) {
	const row = await getClientForTenant(ctx, clientId);
	if (!row) throw new NotFoundError('Client not found');
	return row;
}

export async function createClient(actor: Actor, input: unknown, requestId: string) {
	requireCapability(actor.permissions, 'clients.manage');
	if (!(await hasOrgWideMembership(actor))) {
		throw new ForbiddenError('Client-scoped actors cannot create clients');
	}
	const parsed = parseContract(createClientSchema, input);
	const [client] = await db
		.insert(clients)
		.values({
			organizationId: actor.organizationId,
			name: parsed.name,
			slug: parsed.slug
		})
		.returning();
	await db.insert(clientSettings).values({
		clientId: client.id,
		displayName: parsed.name,
		timezone: parsed.timezone
	});
	await recordAudit({
		organizationId: actor.organizationId,
		clientId: client.id,
		actorType: 'human',
		actorId: actor.userId,
		action: 'client.create',
		entityType: 'client',
		entityId: client.id,
		requestId
	});
	return client;
}

export async function updateClientSettings(
	actor: Actor,
	ctx: TenantContext,
	clientId: string,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'clients.manage');
	const parsed = parseContract(updateClientSettingsSchema, input);
	const row = await updateClientSettingsForTenant(ctx, clientId, parsed.displayName);
	if (!row) throw new NotFoundError('Client not found');
	await recordAudit({
		organizationId: ctx.organizationId,
		clientId: row.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'client.settings.update',
		entityType: 'client_settings',
		entityId: row.id,
		requestId
	});
	return row;
}
