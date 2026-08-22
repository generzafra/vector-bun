import { and, eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { CAPABILITIES, ROLE_CAPABILITIES, ROLE_KEYS } from '@vector/contracts';
import { db } from './client';
import {
	clientSettings,
	clients,
	memberships,
	organizations,
	permissions,
	rolePermissions,
	roles,
	users
} from './schema';

async function hashPassword(password: string) {
	return Bun.password.hash(password, { algorithm: 'argon2id' });
}

async function upsertRole(key: string, name: string) {
	const [existing] = await db.select().from(roles).where(eq(roles.key, key)).limit(1);
	if (existing) return existing;
	const [row] = await db.insert(roles).values({ key, name }).returning();
	return row;
}

async function upsertPermission(key: string) {
	const [existing] = await db.select().from(permissions).where(eq(permissions.key, key)).limit(1);
	if (existing) return existing;
	const [row] = await db.insert(permissions).values({ key, name: key }).returning();
	return row;
}

async function main() {
	const permissionRows = [];
	for (const key of CAPABILITIES) {
		permissionRows.push(await upsertPermission(key));
	}
	const roleRows = [];
	for (const key of ROLE_KEYS) {
		const name = key.replaceAll('_', ' ');
		roleRows.push(await upsertRole(key, name));
	}
	for (const role of roleRows) {
		const caps = ROLE_CAPABILITIES[role.key as keyof typeof ROLE_CAPABILITIES];
		for (const cap of caps) {
			const permission = permissionRows.find((row) => row.key === cap);
			if (!permission) continue;
			const existing = await db
				.select()
				.from(rolePermissions)
				.where(
					and(eq(rolePermissions.roleId, role.id), eq(rolePermissions.permissionId, permission.id))
				)
				.limit(1);
			if (existing.length) continue;
			await db.insert(rolePermissions).values({ roleId: role.id, permissionId: permission.id });
		}
	}

	let [org] = await db.select().from(organizations).where(eq(organizations.slug, 'mge')).limit(1);
	if (!org) {
		[org] = await db
			.insert(organizations)
			.values({ name: 'Maximum Global Exposure', slug: 'mge' })
			.returning();
	}

	async function upsertClient(name: string, slug: string) {
		const [existing] = await db.select().from(clients).where(eq(clients.slug, slug)).limit(1);
		if (existing) return existing;
		const [client] = await db
			.insert(clients)
			.values({ organizationId: org.id, name, slug })
			.returning();
		await db.insert(clientSettings).values({
			clientId: client.id,
			displayName: name,
			timezone: 'Asia/Manila'
		});
		return client;
	}

	const clientA = await upsertClient('Client Alpha', 'alpha');
	const clientB = await upsertClient('Client Beta', 'beta');
	const superAdminRole = roleRows.find((row) => row.key === 'mge_super_admin')!;
	const clientAdminRole = roleRows.find((row) => row.key === 'client_admin')!;

	async function upsertUser(email: string, name: string, password: string) {
		const [existing] = await db.select().from(users).where(eq(users.email, email)).limit(1);
		if (existing) return existing;
		const [user] = await db
			.insert(users)
			.values({
				email,
				name,
				passwordHash: await hashPassword(password)
			})
			.returning();
		return user;
	}

	const admin = await upsertUser(
		env.SEED_ADMIN_EMAIL.toLowerCase(),
		'Vector Admin',
		env.SEED_ADMIN_PASSWORD
	);
	const userA = await upsertUser(
		env.SEED_USER_A_EMAIL.toLowerCase(),
		'User Alpha',
		env.SEED_USER_A_PASSWORD
	);

	async function upsertMembership(userId: string, roleId: string, clientId: string | null) {
		const rows = await db.select().from(memberships).where(eq(memberships.userId, userId));
		if (rows.some((row) => row.roleId === roleId && row.clientId === clientId)) return;
		await db.insert(memberships).values({
			userId,
			organizationId: org.id,
			clientId,
			roleId
		});
	}

	await upsertMembership(admin.id, superAdminRole.id, null);
	await upsertMembership(userA.id, clientAdminRole.id, clientA.id);

	console.info(
		JSON.stringify({
			organizationId: org.id,
			clientA: clientA.id,
			clientB: clientB.id,
			admin: admin.email,
			userA: userA.email
		})
	);
}

await main();
