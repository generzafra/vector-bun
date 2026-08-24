import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	NotFoundError,
	TenantContextError,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	db,
	funnelAssetManifests,
	getFunnelAssetManifestForVersionForTenant
} from '@vector/db';
import {
	addService,
	composeCreativeShells,
	composeFunnel,
	contextFor,
	createClient,
	getDeliveryOgImageBytes,
	getFunnel,
	getFunnelAssetManifest,
	hasPlacedOgImageForTenant,
	login,
	placeFunnelShareCards,
	publishFunnel,
	resolveDeliveryPage,
	resolveSession,
	saveBrand,
	switchActiveClient
} from '@vector/domain';
import { isOgImagePath, previewHostname, unknownHostPayload } from '@vector/funnel-engine';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function scopedFunnel(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `c5-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'c5-create'
	);
	await switchActiveClient(session, session.token, created.id, 'c5-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'c5-ctx');
	await saveBrand(
		actor,
		ctx,
		{
			displayName: name,
			audience: 'Local patients who need implant consults',
			offer: 'Guided implant consults with a clear treatment plan',
			primaryConversion: 'Book an implant consult',
			brandPersonality: 'premium',
			tokens: { accent: '#111111' }
		},
		'c5-brand'
	);
	await addService(
		actor,
		ctx,
		{
			name: 'Implant consult',
			slug: `consult-${crypto.randomUUID().slice(0, 8)}`,
			outcome: 'A clear implant plan in one visit',
			summary: 'Assessment, imaging review, and next-step recommendation.'
		},
		'c5-service'
	);
	return { actor, created, ctx };
}

test('C5 places composition ids, not storage keys, and Delivery uses hostname-scoped /og-image', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/funnel/+page.svelte'), 'utf8');
	const delivery = readFileSync(join(root, 'apps/delivery/src/routes/+page.svelte'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/funnel-manifests.ts'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0039_c5_funnel_manifests.sql'),
		'utf8'
	);
	const jsonLd = readFileSync(join(root, 'packages/funnel-engine/src/discoverability.ts'), 'utf8');
	expect(page).toContain('Use these cards on the preview');
	expect(page).toContain('will not go live');
	expect(page).not.toContain('generateImage');
	expect(page).not.toContain('ImageProvider');
	expect(page).not.toContain('storageKey');
	expect(page).not.toContain('Sharp');
	expect(page).not.toContain('creative.manage');
	expect(delivery).toContain('/og-image');
	expect(delivery).not.toContain('clients/');
	expect(delivery).not.toContain('storageKey');
	expect(delivery).not.toContain('generateImage');
	expect(delivery).not.toContain('creative_compositions');
	expect(domain).toContain('pages.read');
	expect(domain).toContain('pages.manage');
	expect(domain).not.toContain('creative.manage');
	expect(domain).not.toContain('generateImage');
	expect(domain).not.toContain('@vector/images');
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect(migration).toContain('ON DELETE set null');
	expect(migration).not.toContain('storage_key');
	expect(jsonLd).not.toContain('og-image');
	expect(jsonLd).not.toContain('creative_compositions');
	expect(isOgImagePath('/og-image')).toBe(true);
	expect(isOgImagePath('/og-image/')).toBe(true);
	expect(isOgImagePath('/brand-logo')).toBe(false);
});

test('missing TenantContext cannot list funnel manifests', async () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(
		getFunnelAssetManifestForVersionForTenant(null as never, 'x')
	).rejects.toBeInstanceOf(TenantContextError);
});

test('unplaced C3 drafts stay off Delivery until place and publish', async () => {
	const { actor, ctx, created } = await scopedFunnel('North Clinic Cards', '10.0.18.10');
	await composeFunnel(actor, ctx, 'c5-compose-funnel');
	await composeCreativeShells(actor, ctx, 'c5-compose-cards');
	await publishFunnel(actor, ctx, 'c5-publish-unplaced');
	expect(await hasPlacedOgImageForTenant(ctx)).toBe(false);
	let missing: unknown;
	try {
		await getDeliveryOgImageBytes(ctx);
	} catch (caught) {
		missing = caught;
	}
	expect(missing).toBeInstanceOf(NotFoundError);
	const placed = await placeFunnelShareCards(actor, ctx, 'c5-place');
	expect(placed.placed).toBe(true);
	expect(placed.live).toBe(false);
	expect(placed.slots.og?.compositionId).toBeTruthy();
	expect(JSON.stringify(placed)).not.toContain('storageKey');
	expect(JSON.stringify(placed)).not.toContain(`clients/${created.id}`);
	expect(await hasPlacedOgImageForTenant(ctx)).toBe(false);
	const funnel = await getFunnel(actor, ctx);
	expect(funnel.shareCardPlacement.placed).toBe(true);
	expect(funnel.shareCardPlacement.live).toBe(false);
	expect(JSON.stringify(funnel.shareCardPlacement)).not.toContain('storageKey');
	const [row] = await db
		.select()
		.from(funnelAssetManifests)
		.where(eq(funnelAssetManifests.pageVersionId, funnel.draft!.id))
		.limit(1);
	expect(row?.ogCompositionId).toBe(placed.slots.og?.compositionId);
	expect(JSON.stringify(row)).not.toContain('storageKey');
	expect(JSON.stringify(row)).not.toContain(`clients/${created.id}`);
	await publishFunnel(actor, ctx, 'c5-publish-placed');
	expect(await hasPlacedOgImageForTenant(ctx)).toBe(true);
	const bytes = await getDeliveryOgImageBytes(ctx);
	const svg = new TextDecoder().decode(bytes.bytes);
	expect(svg).toContain('North Clinic Cards');
	expect(bytes.composition.kind).toBe('og');
	expect(JSON.stringify(bytes)).not.toContain('storageKey');
	expect(JSON.stringify(bytes)).not.toContain(`clients/${created.id}`);
	const live = await getFunnel(actor, ctx);
	expect(live.shareCardPlacement.live).toBe(true);
});

test('ai or social capability is not enough to place share cards', async () => {
	const { actor, ctx } = await scopedFunnel('C5 Authz Client', '10.0.18.11');
	await composeFunnel(actor, ctx, 'c5-authz-funnel');
	await composeCreativeShells(actor, ctx, 'c5-authz-cards');
	let denied: unknown;
	try {
		await placeFunnelShareCards(
			{ ...actor, permissions: ['ai.manage', 'social.manage', 'pages.read'] },
			ctx,
			'c5-authz'
		);
	} catch (caught) {
		denied = caught;
	}
	expect(denied).toBeInstanceOf(ForbiddenError);
});

test('user on client A cannot read or serve client B funnel manifests', async () => {
	const a = await scopedFunnel('C5 Alpha Isolation', '10.0.18.12');
	const b = await scopedFunnel('C5 Beta Isolation', '10.0.18.13');
	await composeFunnel(a.actor, a.ctx, 'c5-iso-a-funnel');
	await composeCreativeShells(a.actor, a.ctx, 'c5-iso-a-cards');
	await placeFunnelShareCards(a.actor, a.ctx, 'c5-iso-a-place');
	await publishFunnel(a.actor, a.ctx, 'c5-iso-a-pub');
	await composeFunnel(b.actor, b.ctx, 'c5-iso-b-funnel');
	await composeCreativeShells(b.actor, b.ctx, 'c5-iso-b-cards');
	await placeFunnelShareCards(b.actor, b.ctx, 'c5-iso-b-place');
	await publishFunnel(b.actor, b.ctx, 'c5-iso-b-pub');
	const own = await getFunnelAssetManifest(a.actor, a.ctx);
	const other = await getFunnelAssetManifest(b.actor, b.ctx);
	expect(own.slots.og?.compositionId).toBeTruthy();
	expect(other.slots.og?.compositionId).toBeTruthy();
	expect(own.slots.og?.compositionId).not.toBe(other.slots.og?.compositionId);
	let leaked: unknown;
	try {
		await getFunnelAssetManifest(a.actor, a.ctx, b.created.id);
	} catch (caught) {
		leaked = caught;
	}
	expect(leaked).toBeInstanceOf(TenantContextError);
	const aBytes = await getDeliveryOgImageBytes(a.ctx);
	const bBytes = await getDeliveryOgImageBytes(b.ctx);
	expect(new TextDecoder().decode(aBytes.bytes)).toContain('C5 Alpha Isolation');
	expect(new TextDecoder().decode(aBytes.bytes)).not.toContain('C5 Beta Isolation');
	expect(new TextDecoder().decode(bBytes.bytes)).toContain('C5 Beta Isolation');
	expect(JSON.stringify(aBytes)).not.toContain(b.created.id);
	const aHost = `${previewHostname(a.created.slug, env.DELIVERY_PREVIEW_PARENT_HOST)}:5184`;
	const bHost = previewHostname(b.created.slug, env.DELIVERY_PREVIEW_PARENT_HOST);
	const aOg = await resolveDeliveryPage(aHost, '/og-image', 'c5-iso-a-res');
	const bOg = await resolveDeliveryPage(bHost, '/og-image', 'c5-iso-b-res');
	expect(aOg.kind).toBe('og_image');
	expect(bOg.kind).toBe('og_image');
	if (aOg.kind !== 'og_image' || bOg.kind !== 'og_image') {
		throw new Error('expected og image resolutions');
	}
	expect(aOg.clientId).toBe(a.created.id);
	expect(bOg.clientId).toBe(b.created.id);
	expect(JSON.stringify(bOg)).not.toContain(a.created.id);
});

test('unknown host og-image 404 payload has no tenant data', async () => {
	const unknown = await resolveDeliveryPage('evil.example', '/og-image', 'c5-unknown');
	expect(unknown.kind).toBe('unknown_host');
	expect(JSON.stringify(unknown).toLowerCase()).not.toContain('alpha');
	expect(JSON.stringify(unknown).toLowerCase()).not.toContain('beta');
	const body = JSON.stringify(unknownHostPayload());
	expect(body).toContain('Unknown host');
	expect(body.toLowerCase()).not.toContain('alpha');
});

test('route client id cannot leak the other tenant funnel manifest through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.18.15'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/funnel-manifests/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
});
