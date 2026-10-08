import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	DEFAULT_PROHIBITED_STYLES,
	ForbiddenError,
	TenantContextError,
	applyConfirmedBrandVisualToTokens,
	evaluateAssetSufficiency,
	mediaStrategyFromScore,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	db,
	getAssetSufficiencyForVersionForTenant,
	getLatestLogoAssetForTenant
} from '@vector/db';
import {
	addService,
	composeFunnel,
	confirmBrandVisualProfile,
	contextFor,
	getDeliveryBrandLogoBytes,
	getFunnel,
	login,
	resolveSession,
	saveBrand,
	switchActiveClient,
	uploadBrandAsset
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
import { composeLeadPage } from '@vector/funnel-engine';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

const PNG_1X1 = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
	0x42, 0x60, 0x82
]);

const visualFields = {
	primaryLogoAssetId: null as string | null,
	primaryColor: '#0F4C5C',
	accentColor: '#1A1714',
	primaryFont: 'Georgia, serif',
	visualPersonality: 'Premium / clean / professional',
	photographyDirection: 'Real people, natural lighting',
	prohibitedStyles: [...DEFAULT_PROHIBITED_STYLES]
};

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function scopedComposable(
	name: string,
	ip: string,
	personality: 'corporate' | 'premium' = 'corporate'
) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `fr3-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'fr3-create'
	);
	await switchActiveClient(session, session.token, created.id, 'fr3-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'fr3-ctx');
	await saveBrand(
		actor,
		ctx,
		{
			displayName: name,
			audience: 'Local patients who need implant consults',
			offer: 'Guided implant consults with a clear treatment plan',
			primaryConversion: 'Book an implant consult',
			brandPersonality: personality,
			tokens: { accent: '#111111' }
		},
		'fr3-brand'
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
		'fr3-service'
	);
	return { actor, created, ctx };
}

test('Funnel media readiness stays in business language and hides the numeric score', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/funnel/+page.svelte'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0035_fr3_asset_sufficiency.sql'),
		'utf8'
	);
	const domain = readFileSync(join(root, 'packages/domain/src/pages.ts'), 'utf8');
	expect(page).toContain('Media readiness');
	expect(page).toContain('Confirm brand look');
	expect(page).not.toContain('overallScore');
	expect(page).not.toContain('Asset Sufficiency Score');
	expect(page).not.toContain('ImageProvider');
	expect(page).not.toContain('generateImage');
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect(migration).toContain('ON DELETE set null');
	expect(domain).toContain('pages.read');
	expect(domain).toContain('pages.manage');
	expect(domain).not.toContain('creative.read');
	expect(
		evaluateAssetSufficiency({
			profileConfirmed: false,
			hasLogo: false,
			hasPrimaryColor: false,
			hasVisualPersonality: false,
			publishableCreativeImages: 0,
			unknownRightsCreative: 0
		}).mediaStrategy
	).toBe('typography_led');
	expect(
		evaluateAssetSufficiency({
			profileConfirmed: true,
			hasLogo: true,
			hasPrimaryColor: true,
			hasVisualPersonality: true,
			publishableCreativeImages: 0,
			unknownRightsCreative: 0
		}).mediaStrategy
	).toBe('hybrid');
	expect(mediaStrategyFromScore(80)).toBe('authentic');
	expect(mediaStrategyFromScore(39)).toBe('typography_led');
	expect(
		applyConfirmedBrandVisualToTokens(
			{ accent: '#111111', background: '#FAFAFA' },
			{ status: 'confirmed', primaryColor: '#0F4C5C', primaryFont: 'Georgia, serif' }
		)
	).toEqual({
		accent: '#0F4C5C',
		background: '#FAFAFA',
		fontFamily: 'Georgia, serif'
	});
	const corporate = composeLeadPage(
		{
			clientSlug: 'thin',
			brand: {
				displayName: 'Thin Co',
				tagline: null,
				audience: 'Local patients who need implant consults',
				offer: 'Guided implant consults with a clear treatment plan',
				primaryConversion: 'Book an implant consult',
				brandPersonality: 'corporate',
				tokens: { accent: '#111111' }
			},
			services: [
				{
					name: 'Implant consult',
					outcome: 'A clear implant plan in one visit',
					summary: 'Assessment, imaging review, and next-step recommendation.'
				}
			],
			offers: [],
			claims: []
		},
		{ preview: true, mediaStrategy: 'typography_led' }
	);
	expect(corporate.sections[0]?.type).toBe('hero-minimal');
});

test('missing TenantContext cannot read sufficiency snapshots', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(
		getAssetSufficiencyForVersionForTenant(null as never, crypto.randomUUID())
	).rejects.toBeInstanceOf(TenantContextError);
});

test('user on client A cannot read client B sufficiency through getFunnel', async () => {
	const a = await scopedComposable('FR3 Alpha Isolation', '10.0.13.10');
	const b = await scopedComposable('FR3 Beta Isolation', '10.0.13.11');
	await composeFunnel(a.actor, a.ctx, 'fr3-iso-a');
	await composeFunnel(b.actor, b.ctx, 'fr3-iso-b');
	const own = await getFunnel(a.actor, a.ctx);
	const other = await getFunnel(b.actor, b.ctx);
	expect(own.assetSufficiency?.mediaStrategy).toBe('typography_led');
	expect(JSON.stringify(own)).not.toContain(b.created.id);
	expect(JSON.stringify(own.assetSufficiency)).not.toContain('storageKey');
	if (!other.draft) throw new Error('beta draft missing');
	expect(await getAssetSufficiencyForVersionForTenant(a.ctx, other.draft.id)).toBeNull();
	await expect(getFunnel(a.actor, a.ctx, b.created.id)).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant funnel through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.13.12'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/funnel/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
});

test('unconfirmed C1 still composes a typography-led preview', async () => {
	const { actor, ctx, created } = await scopedComposable(
		'FR3 Dental Studio',
		'10.0.13.13',
		'corporate'
	);
	const composed = await composeFunnel(actor, ctx, 'fr3-unconfirmed');
	expect(['hero-minimal', 'hero-editorial']).toContain(composed.draft.document.sections[0]?.type);
	expect(composed.draft.document.sections[0]?.type).not.toBe('hero-split');
	const funnel = await getFunnel(actor, ctx);
	expect(funnel.assetSufficiency?.profileConfirmed).toBe(false);
	expect(funnel.assetSufficiency?.mediaStrategy).toBe('typography_led');
	expect(funnel.assetSufficiency?.industryVisualDependency).toBe('medium');
	expect(funnel.assetSufficiency?.label).toBe('Type and layout');
	expect(funnel.assetSufficiency?.summary).toContain('Confirm brand look first');
	expect(JSON.stringify(funnel)).not.toContain('storageKey');
	expect(JSON.stringify(funnel)).not.toContain('overallScore');
	expect(JSON.stringify(funnel.draft)).not.toContain(created.id + '/');
	if (!funnel.draft) throw new Error('draft missing');
	const snapshot = await getAssetSufficiencyForVersionForTenant(ctx, funnel.draft.id);
	expect(snapshot?.clientId).toBe(created.id);
	expect(snapshot?.industryVisualDependency).toBe('medium');
});

test('confirmed C1 color and font land on the composed theme without inventing surfaces', async () => {
	const { actor, ctx } = await scopedComposable('FR3 Color Client', '10.0.13.14', 'corporate');
	await confirmBrandVisualProfile(actor, ctx, visualFields, 'fr3-confirm-color');
	const composed = await composeFunnel(actor, ctx, 'fr3-color');
	expect(composed.draft.document.theme.tokens.accent).toBe('#0F4C5C');
	expect(composed.draft.document.theme.tokens.fontFamily).toBe('Georgia, serif');
	expect(composed.draft.document.theme.tokens.background).toBeUndefined();
	expect(composed.draft.document.theme.tokens.surface).toBeUndefined();
	const funnel = await getFunnel(actor, ctx);
	expect(funnel.assetSufficiency?.profileConfirmed).toBe(true);
	expect(funnel.assetSufficiency?.mediaStrategy).toBe('typography_led');
});

test('confirmed look plus logo can keep a split hero', async () => {
	const { actor, ctx } = await scopedComposable('FR3 Logo Client', '10.0.13.15', 'corporate');
	const first = await uploadBrandAsset(
		actor,
		ctx,
		{
			purpose: 'logo',
			filename: 'chosen-logo.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'fr3-logo-1'
	);
	await uploadBrandAsset(
		actor,
		ctx,
		{
			purpose: 'logo',
			filename: 'later-logo.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'fr3-logo-2'
	);
	await confirmBrandVisualProfile(
		actor,
		ctx,
		{ ...visualFields, primaryLogoAssetId: first.id },
		'fr3-confirm-logo'
	);
	const latest = await getLatestLogoAssetForTenant(ctx);
	expect(latest?.id).not.toBe(first.id);
	const resolved = await getDeliveryBrandLogoBytes(ctx);
	expect(resolved.asset.id).toBe(first.id);
	expect(resolved.asset.storageKey).toContain(ctx.clientId);
	const composed = await composeFunnel(actor, ctx, 'fr3-logo-compose');
	expect(composed.draft.document.sections[0]?.type).toBe('hero-split');
	const funnel = await getFunnel(actor, ctx);
	expect(funnel.assetSufficiency?.mediaStrategy).toBe('hybrid');
	expect(funnel.assetSufficiency?.label).toBe('Brand plus photos');
	expect(JSON.stringify(funnel)).not.toContain('storageKey');
});

test('missing pages.manage cannot compose a sufficiency snapshot', async () => {
	const { actor, ctx } = await scopedComposable('FR3 Cap Client', '10.0.13.16');
	await expect(
		composeFunnel(
			{ ...actor, permissions: actor.permissions.filter((cap) => cap !== 'pages.manage') },
			ctx,
			'fr3-cap'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
});
