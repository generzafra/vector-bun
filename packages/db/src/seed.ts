import { and, eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { CAPABILITIES, ROLE_CAPABILITIES, ROLE_KEYS } from '@vector/contracts';
import { db } from './client';
import {
	brands,
	claims,
	clientSettings,
	clients,
	memberships,
	offers,
	services,
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

	async function upsertBrand(
		clientId: string,
		displayName: string,
		audience: string,
		offer: string,
		primaryConversion: string
	) {
		const [existing] = await db.select().from(brands).where(eq(brands.clientId, clientId)).limit(1);
		if (existing) return existing;
		const [row] = await db
			.insert(brands)
			.values({
				organizationId: org.id,
				clientId,
				displayName,
				audience,
				offer,
				primaryConversion,
				brandPersonality: 'corporate',
				tokens: { accent: '#3b6fd9' }
			})
			.returning();
		return row;
	}

	await upsertBrand(
		clientA.id,
		'Client Alpha Dental',
		'Local patients who need implant consults',
		'Guided implant consults with a clear treatment plan',
		'Book an implant consult'
	);
	await upsertBrand(
		clientB.id,
		'Client Beta Logistics',
		'Warehouse operators who need faster throughput',
		'Automation that reduces dock-to-stock time',
		'Request a warehouse assessment'
	);

	async function upsertService(
		clientId: string,
		name: string,
		slug: string,
		outcome: string,
		summary: string
	) {
		const [existing] = await db
			.select()
			.from(services)
			.where(and(eq(services.clientId, clientId), eq(services.slug, slug)))
			.limit(1);
		if (existing) return;
		await db.insert(services).values({
			organizationId: org.id,
			clientId,
			name,
			slug,
			outcome,
			summary
		});
	}

	await upsertService(
		clientA.id,
		'Implant consult',
		'implant-consult',
		'A clear implant plan in one visit',
		'Assessment, imaging review, and next-step recommendation.'
	);
	await upsertService(
		clientB.id,
		'Warehouse assessment',
		'warehouse-assessment',
		'Faster dock-to-stock without extra headcount',
		'Process review and automation recommendation.'
	);

	async function upsertOffer(clientId: string, name: string, summary: string, price: number) {
		const rows = await db.select().from(offers).where(eq(offers.clientId, clientId));
		if (rows.some((row) => row.name === name)) return;
		await db.insert(offers).values({
			organizationId: org.id,
			clientId,
			name,
			summary,
			startingPriceMinor: price,
			currency: 'USD'
		});
	}

	await upsertOffer(clientA.id, 'Consult package', 'Exam and written treatment plan', 15000);
	await upsertOffer(clientB.id, 'Assessment sprint', 'Two-week operations review', 750000);

	async function upsertClaim(
		clientId: string,
		kind: 'approved' | 'prohibited',
		statement: string,
		evidence?: string
	) {
		const rows = await db.select().from(claims).where(eq(claims.clientId, clientId));
		if (rows.some((row) => row.statement === statement)) return;
		await db.insert(claims).values({
			organizationId: org.id,
			clientId,
			kind,
			statement,
			evidence: evidence ?? null
		});
	}

	await upsertClaim(
		clientA.id,
		'approved',
		'Consults include a written treatment plan',
		'Clinic protocol 2026'
	);
	await upsertClaim(clientA.id, 'prohibited', 'Guaranteed implant success');
	await upsertClaim(clientB.id, 'approved', 'Assessment covers inbound and outbound docks');
	await upsertClaim(clientB.id, 'prohibited', 'Guaranteed 50 percent cost reduction');

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
