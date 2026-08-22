import { and, eq } from 'drizzle-orm';
import { hashPassword, requireCapability } from '@vector/auth';
import {
	NotFoundError,
	createMembershipSchema,
	parseContract,
	requireTenantContext
} from '@vector/contracts';
import { db, listMembershipsForTenant, memberships, roles, users } from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

export async function listMemberships(actor: Actor, ctx: ReturnType<typeof requireTenantContext>) {
	requireCapability(actor.permissions, 'users.manage');
	requireTenantContext(ctx);
	return listMembershipsForTenant(ctx);
}

export async function addMembership(
	actor: Actor,
	ctx: ReturnType<typeof requireTenantContext>,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'users.manage');
	const required = requireTenantContext(ctx);
	const parsed = parseContract(createMembershipSchema, input);
	const [role] = await db.select().from(roles).where(eq(roles.key, parsed.roleKey)).limit(1);
	if (!role) throw new NotFoundError('Role not found');
	let [user] = await db
		.select()
		.from(users)
		.where(eq(users.email, parsed.email.toLowerCase()))
		.limit(1);
	if (!user) {
		const passwordHash = await hashPassword(crypto.randomUUID() + '!Vector');
		[user] = await db
			.insert(users)
			.values({
				email: parsed.email.toLowerCase(),
				name: parsed.name,
				passwordHash
			})
			.returning();
	}
	const [existing] = await db
		.select()
		.from(memberships)
		.where(
			and(
				eq(memberships.userId, user.id),
				eq(memberships.organizationId, required.organizationId),
				eq(memberships.clientId, required.clientId),
				eq(memberships.roleId, role.id)
			)
		)
		.limit(1);
	if (existing) return existing;
	const [row] = await db
		.insert(memberships)
		.values({
			userId: user.id,
			organizationId: required.organizationId,
			clientId: required.clientId,
			roleId: role.id
		})
		.returning();
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'membership.create',
		entityType: 'membership',
		entityId: row.id,
		requestId
	});
	return row;
}
