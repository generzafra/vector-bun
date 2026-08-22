import { and, eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { CAPABILITIES, ROLE_CAPABILITIES, ROLE_KEYS } from '@vector/contracts';
import { composeLeadPage, previewHostname } from '@vector/funnel-engine';
import { db } from './client';
import { listClaimsForTenant, listOffersForTenant, listServicesForTenant } from './knowledge';
import { ensureLaunchRecordsForTenant } from './launch';
import {
	composeLeadFunnelForTenant,
	getPreviewDomainForTenant,
	publishLatestDraftForTenant
} from './pages';
import {
	brands,
	claims,
	clientSettings,
	clients,
	emailSequenceSteps,
	emailSequences,
	emailTopics,
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
		primaryConversion: string,
		brandPersonality: 'premium' | 'technology',
		tokens: {
			background: string;
			surface: string;
			text: string;
			accent: string;
			fontFamily: string;
		}
	) {
		const values = {
			displayName,
			audience,
			offer,
			primaryConversion,
			brandPersonality,
			tokens,
			updatedAt: new Date()
		};
		const [existing] = await db.select().from(brands).where(eq(brands.clientId, clientId)).limit(1);
		if (existing) {
			const [row] = await db
				.update(brands)
				.set(values)
				.where(eq(brands.id, existing.id))
				.returning();
			return row;
		}
		const [row] = await db
			.insert(brands)
			.values({
				organizationId: org.id,
				clientId,
				...values
			})
			.returning();
		return row;
	}

	const brandA = await upsertBrand(
		clientA.id,
		'Client Alpha Dental',
		'Local patients who need implant consults',
		'Guided implant consults with a clear treatment plan',
		'Book an implant consult',
		'premium',
		{
			background: '#f4efe6',
			surface: '#fffaf2',
			text: '#1a1714',
			accent: '#0f4c5c',
			fontFamily: 'Georgia, "Times New Roman", serif'
		}
	);
	const brandB = await upsertBrand(
		clientB.id,
		'Client Beta Logistics',
		'Warehouse operators who need faster throughput',
		'Automation that reduces dock-to-stock time',
		'Request a warehouse assessment',
		'technology',
		{
			background: '#101412',
			surface: '#171c19',
			text: '#e7eee8',
			accent: '#d4b06a',
			fontFamily: 'Segoe UI, system-ui, sans-serif'
		}
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

	async function seedPreviewFunnel(
		clientId: string,
		slug: string,
		brand: NonNullable<typeof brandA>
	) {
		const ctx = {
			organizationId: org.id,
			clientId,
			roleIds: [],
			requestId: 'seed'
		};
		if (await getPreviewDomainForTenant(ctx)) return;
		const [serviceRows, offerRows, claimRows] = await Promise.all([
			listServicesForTenant(ctx),
			listOffersForTenant(ctx),
			listClaimsForTenant(ctx)
		]);
		const document = composeLeadPage(
			{
				clientSlug: slug,
				brand,
				services: serviceRows,
				offers: offerRows,
				claims: claimRows
			},
			{ preview: true }
		);
		await composeLeadFunnelForTenant(ctx, {
			siteName: brand.displayName,
			title: document.seo.title,
			hostname: previewHostname(slug, env.DELIVERY_PREVIEW_PARENT_HOST),
			document
		});
		await publishLatestDraftForTenant(ctx);
	}

	await seedPreviewFunnel(clientA.id, 'alpha', brandA);
	await seedPreviewFunnel(clientB.id, 'beta', brandB);

	await ensureLaunchRecordsForTenant({
		organizationId: org.id,
		clientId: clientA.id,
		roleIds: [],
		requestId: 'seed'
	});
	await ensureLaunchRecordsForTenant({
		organizationId: org.id,
		clientId: clientB.id,
		roleIds: [],
		requestId: 'seed'
	});

	async function seedWelcomeSequence(
		clientId: string,
		fromName: string,
		subjects: [string, string],
		bodies: [string, string]
	) {
		const [topic] = await db
			.select()
			.from(emailTopics)
			.where(and(eq(emailTopics.clientId, clientId), eq(emailTopics.slug, 'welcome')))
			.limit(1);
		if (!topic) {
			await db.insert(emailTopics).values({
				organizationId: org.id,
				clientId,
				slug: 'welcome',
				name: 'Welcome'
			});
		}
		let [sequence] = await db
			.select()
			.from(emailSequences)
			.where(and(eq(emailSequences.clientId, clientId), eq(emailSequences.key, 'welcome_v1')))
			.limit(1);
		if (!sequence) {
			[sequence] = await db
				.insert(emailSequences)
				.values({
					organizationId: org.id,
					clientId,
					key: 'welcome_v1',
					name: 'Welcome nurture',
					status: 'approved',
					version: 1,
					approvedAt: new Date()
				})
				.returning();
		}
		const steps = await db
			.select()
			.from(emailSequenceSteps)
			.where(eq(emailSequenceSteps.sequenceId, sequence.id));
		if (steps.length === 0) {
			await db.insert(emailSequenceSteps).values([
				{
					organizationId: org.id,
					clientId,
					sequenceId: sequence.id,
					stepIndex: 0,
					delayMinutes: 0,
					topic: 'welcome',
					subject: subjects[0],
					textBody: bodies[0],
					htmlBody: `<p>${bodies[0]}</p>`
				},
				{
					organizationId: org.id,
					clientId,
					sequenceId: sequence.id,
					stepIndex: 1,
					delayMinutes: 1440,
					topic: 'welcome',
					subject: subjects[1],
					textBody: bodies[1],
					htmlBody: `<p>${bodies[1]}</p>`
				}
			]);
		}
		return fromName;
	}

	await seedWelcomeSequence(
		clientA.id,
		'Client Alpha Dental',
		['We received your consult request', 'Next step for your implant consult'],
		[
			'Thanks for contacting Client Alpha Dental. A teammate will review your request.',
			'If you still want an implant consult, reply to this email with a preferred time.'
		]
	);
	await seedWelcomeSequence(
		clientB.id,
		'Client Beta Logistics',
		['We received your assessment request', 'Next step for your warehouse assessment'],
		[
			'Thanks for contacting Client Beta Logistics. A teammate will review your request.',
			'If you still want a warehouse assessment, reply with the site address and dock hours.'
		]
	);

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
