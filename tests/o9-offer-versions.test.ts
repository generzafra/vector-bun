import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	NotFoundError,
	TenantContextError,
	ValidationError
} from '@vector/contracts';
import { db, listOfferVersionsForTenant, offers } from '@vector/db';
import {
	addOffer,
	addService,
	contextFor,
	getKnowledge,
	login,
	removeOffer,
	resolveSession,
	reviseOffer,
	switchActiveClient
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function scopedActor(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `o9-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'o9-create'
	);
	await switchActiveClient(session, session.token, created.id, 'o9-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'o9-ctx') };
}

const revision = {
	name: 'Implant consult, October',
	summary: 'A booked consult with a written estimate.',
	offerType: 'consultation' as const,
	priceMinor: 15000,
	discountMinor: 0,
	currency: 'usd',
	validFrom: '2026-10-01',
	validUntil: '2026-10-31',
	eligibility: 'New patients',
	terms: 'One consult per person.',
	primaryCta: 'Book the consult'
};

test('offer versions are append-only and the live offer keeps the latest terms', async () => {
	const schema = readFileSync(join(root, 'packages/db/src/schema.ts'), 'utf8');
	expect(schema).toContain("pgTable(\n\t'offers'");
	const versionsTable = schema.slice(
		schema.indexOf('export const offerVersions'),
		schema.indexOf('export const claims')
	);
	expect(versionsTable).toContain("pgTable(\n\t'offer_versions'");
	expect(versionsTable).not.toContain('updatedAt');
	const dbSource = readFileSync(join(root, 'packages/db/src/knowledge.ts'), 'utf8');
	expect(dbSource).not.toContain('update(offerVersions)');
	const page = readFileSync(join(root, 'apps/control/src/routes/knowledge/+page.svelte'), 'utf8');
	expect(page).toContain('Record a new version');
	expect(page).toContain('Earlier versions stay as recorded.');

	const { actor, ctx, created } = await scopedActor('O9 Offers', '10.0.23.10');
	const [legacy] = await db
		.insert(offers)
		.values({
			organizationId: created.organizationId,
			clientId: created.id,
			name: 'Original consult',
			summary: 'The first wording.',
			startingPriceMinor: 9000,
			currency: 'USD'
		})
		.returning();
	if (!legacy) throw new Error('offer missing');

	const createdVersion = await reviseOffer(actor, ctx, legacy.id, revision, 'o9-revise');
	expect(createdVersion.version).toBe(2);
	expect(createdVersion.priceMinor).toBe(15000);
	expect(createdVersion.currency).toBe('USD');

	const rows = await listOfferVersionsForTenant(ctx, legacy.id);
	expect(rows.map((row) => row.version)).toEqual([1, 2]);
	expect(rows[0]?.name).toBe('Original consult');
	expect(rows[0]?.priceMinor).toBe(9000);
	expect(rows[1]?.name).toBe('Implant consult, October');

	const knowledge = await getKnowledge(actor, ctx);
	const live = knowledge.offers.find((offer) => offer.id === legacy.id);
	expect(live?.name).toBe('Implant consult, October');
	expect(live?.startingPriceMinor).toBe(15000);
	expect(live?.versions).toHaveLength(2);

	await expect(removeOffer(actor, ctx, legacy.id, 'o9-remove')).rejects.toBeInstanceOf(
		ValidationError
	);
	const still = await getKnowledge(actor, ctx);
	expect(still.offers.some((offer) => offer.id === legacy.id)).toBe(true);

	await expect(
		reviseOffer(
			actor,
			ctx,
			legacy.id,
			{ ...revision, priceMinor: 10, discountMinor: 11 },
			'o9-discount'
		)
	).rejects.toBeInstanceOf(ValidationError);
	await expect(
		reviseOffer(
			actor,
			ctx,
			legacy.id,
			{ ...revision, validFrom: '2026-11-02', validUntil: '2026-11-01' },
			'o9-dates'
		)
	).rejects.toBeInstanceOf(ValidationError);
	await expect(
		reviseOffer(actor, ctx, legacy.id, { ...revision, priceMinor: 1.5 }, 'o9-float')
	).rejects.toBeInstanceOf(ValidationError);

	const afterRejects = await listOfferVersionsForTenant(ctx, legacy.id);
	expect(afterRejects).toHaveLength(2);
	expect(afterRejects[0]?.priceMinor).toBe(9000);
});

test('a service from another client cannot be attached, and history stays on this client', async () => {
	const { actor, ctx } = await scopedActor('O9 Owner', '10.0.23.11');
	const offer = await addOffer(
		actor,
		ctx,
		{
			name: 'Cleaning visit',
			summary: 'A booked cleaning.',
			startingPriceMinor: 8000,
			currency: 'USD'
		},
		'o9-add'
	);
	const first = await listOfferVersionsForTenant(ctx, offer.id);
	expect(first.map((row) => row.version)).toEqual([1]);

	const other = await scopedActor('O9 Other', '10.0.23.12');
	const service = await addService(
		other.actor,
		other.ctx,
		{
			name: 'Other service',
			slug: 'other-service',
			outcome: 'A booked visit',
			summary: 'Belongs to the other client.'
		},
		'o9-service'
	);
	await expect(
		reviseOffer(actor, ctx, offer.id, { ...revision, serviceId: service.id }, 'o9-cross-service')
	).rejects.toBeInstanceOf(NotFoundError);
	await expect(reviseOffer(actor, ctx, offer.id, revision, 'o9-own')).resolves.toMatchObject({
		version: 2,
		serviceId: null
	});

	await expect(
		reviseOffer(other.actor, other.ctx, offer.id, revision, 'o9-other')
	).rejects.toBeInstanceOf(NotFoundError);
	const ownRows = await listOfferVersionsForTenant(ctx, offer.id);
	expect(ownRows).toHaveLength(2);
	const otherRows = await listOfferVersionsForTenant(other.ctx, offer.id);
	expect(otherRows).toHaveLength(0);

	const limited = {
		...actor,
		permissions: actor.permissions.filter((permission) => permission !== 'knowledge.manage')
	};
	await expect(reviseOffer(limited, ctx, offer.id, revision, 'o9-cap')).rejects.toBeInstanceOf(
		ForbiddenError
	);
	await expect(
		listOfferVersionsForTenant({
			organizationId: ctx.organizationId,
			clientId: '',
			requestId: 'missing'
		})
	).rejects.toBeInstanceOf(TenantContextError);

	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.23.13'
	);
	await expect(
		reviseOffer(session, contextFor(session, 'o9-alpha'), offer.id, revision, 'o9-alpha')
	).rejects.toBeInstanceOf(NotFoundError);
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json', 'x-forwarded-for': '10.0.23.14' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const body = (await loginRes.json()) as { data: { csrf: string } };
	const res = await app.request(`/v1/knowledge/offers/${offer.id}/versions`, {
		method: 'POST',
		headers: {
			cookie: sessionCookie(loginRes),
			'content-type': 'application/json',
			'x-csrf-token': body.data.csrf
		},
		body: JSON.stringify(revision)
	});
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text).not.toContain('Cleaning visit');
	expect(text).not.toContain(offer.id);
});
