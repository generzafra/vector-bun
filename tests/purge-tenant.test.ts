import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	auditLogs,
	clients,
	db,
	offerVersions,
	offers,
	orderTenantDeletes,
	purgeTenants,
	services
} from '@vector/db';
import { login } from '@vector/domain';
import { createTestClient } from './support/tenant-cleanup';

test('delete order removes children before parents and refuses a cycle', () => {
	const order = orderTenantDeletes(
		['clients', 'offers', 'offer_versions'],
		[
			{ child: 'offer_versions', parent: 'offers' },
			{ child: 'offer_versions', parent: 'clients' },
			{ child: 'offers', parent: 'clients' }
		]
	);
	expect(order.indexOf('offer_versions')).toBeLessThan(order.indexOf('offers'));
	expect(order.indexOf('offers')).toBeLessThan(order.indexOf('clients'));
	expect(order.at(-1)).toBe('clients');
	expect(() =>
		orderTenantDeletes(
			['a', 'b'],
			[
				{ child: 'a', parent: 'b' },
				{ child: 'b', parent: 'a' }
			]
		)
	).toThrow(/cycle/);
});

test('purge removes a throwaway tenant and keeps the seed clients', async () => {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.99.1'
	);
	const created = await createTestClient(
		session,
		{ name: 'Purge Client', slug: `iso-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'purge-create'
	);
	const [service] = await db
		.insert(services)
		.values({
			organizationId: created.organizationId,
			clientId: created.id,
			name: 'Story hour',
			slug: 'story-hour',
			outcome: 'One reading',
			summary: 'A short visit'
		})
		.returning();
	const [offer] = await db
		.insert(offers)
		.values({
			organizationId: created.organizationId,
			clientId: created.id,
			name: 'Signed copy',
			summary: 'One book',
			startingPriceMinor: 1800,
			currency: 'USD'
		})
		.returning();
	if (!service || !offer) throw new Error('Purge fixture rows were not inserted');
	await db.insert(offerVersions).values({
		organizationId: created.organizationId,
		clientId: created.id,
		offerId: offer.id,
		version: 1,
		name: 'Signed copy',
		summary: 'One book',
		offerType: 'other',
		serviceId: service.id,
		priceMinor: 1800,
		currency: 'USD'
	});
	const before = await db.select().from(auditLogs).where(eq(auditLogs.clientId, created.id));
	expect(before.length).toBeGreaterThan(0);

	expect(await purgeTenants([created.id])).toBe(1);

	const [client] = await db.select().from(clients).where(eq(clients.id, created.id)).limit(1);
	const [serviceRow] = await db
		.select()
		.from(services)
		.where(eq(services.clientId, created.id))
		.limit(1);
	const [offerRow] = await db.select().from(offers).where(eq(offers.clientId, created.id)).limit(1);
	const [versionRow] = await db
		.select()
		.from(offerVersions)
		.where(eq(offerVersions.clientId, created.id))
		.limit(1);
	const audits = await db.select().from(auditLogs).where(eq(auditLogs.clientId, created.id));
	expect(client).toBeUndefined();
	expect(serviceRow).toBeUndefined();
	expect(offerRow).toBeUndefined();
	expect(versionRow).toBeUndefined();
	expect(audits).toHaveLength(0);

	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	expect(alpha?.name).toBe('Client Alpha');
	expect(beta?.name).toBe('Client Beta');
	const alphaServices = await db.select().from(services).where(eq(services.clientId, alpha.id));
	expect(alphaServices.some((row) => row.name === 'Implant consult')).toBe(true);
	await expect(purgeTenants([alpha.id])).rejects.toThrow(/alpha/);
	await expect(purgeTenants([beta.id])).rejects.toThrow(/beta/);
}, 20000);
