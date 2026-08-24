import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	CLIENT_DEFAULT_NAV_HREFS,
	DEFAULT_PROHIBITED_STYLES,
	ForbiddenError,
	TenantContextError,
	ValidationError,
	brandStyleIsProhibited,
	brandVisualProfileConfirmed,
	draftBrandVisualFromIntake,
	normalizeBrandColor,
	parseContract,
	requireTenantContext,
	saveBrandVisualProfileSchema
} from '@vector/contracts';
import {
	clients,
	db,
	getBrandForTenant,
	getBrandVisualProfileForTenant,
	getLatestLogoAssetForTenant,
	listBrandVisualVersionsForTenant,
	saveBrandVisualDraftForTenant
} from '@vector/db';
import {
	confirmBrandVisualProfile,
	contextFor,
	createClient,
	getBrandVisualProfile,
	listBrandVisualVersions,
	login,
	requireConfirmedBrandVisualProfile,
	resolveSession,
	saveBrandVisualProfile,
	switchActiveClient,
	uploadBrandAsset
} from '@vector/domain';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');

const PNG_1X1 = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
	0x42, 0x60, 0x82
]);

const validFields = {
	primaryLogoAssetId: null,
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

async function scopedActor(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `c1-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'c1-create'
	);
	await switchActiveClient(session, session.token, created.id, 'c1-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'c1-ctx') };
}

test('brand visual confirm stays off default client nav and uses business language', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/brand/+page.svelte'), 'utf8');
	const overview = readFileSync(
		join(root, 'apps/control/src/routes/overview/+page.svelte'),
		'utf8'
	);
	const domain = readFileSync(join(root, 'packages/domain/src/brand-visual.ts'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0034_c1_brand_visual.sql'),
		'utf8'
	);
	expect(page).toContain('not a design questionnaire');
	expect(page).toContain('We found the following brand direction');
	expect(page).toContain('Confirm');
	expect(page).toContain('Edit');
	expect(page).toContain('unconfirmed look is not a public reveal');
	expect(page).not.toContain('ImageProvider');
	expect(page).not.toContain('generateImage');
	expect(overview).toContain('Confirm brand look');
	expect([...CLIENT_DEFAULT_NAV_HREFS]).not.toContain('/brand');
	expect(domain).toContain('knowledge.read');
	expect(domain).toContain('knowledge.manage');
	expect(domain).not.toContain('creative.read');
	expect(domain).not.toContain('generateImage');
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect(migration).toContain('ON DELETE set null');
	expect(normalizeBrandColor('#0f4c5c')).toBe('#0F4C5C');
	expect(normalizeBrandColor('#abc')).toBe('#AABBCC');
	expect(
		saveBrandVisualProfileSchema.safeParse({
			...validFields,
			prohibitedStyles: []
		}).success
	).toBe(false);
	expect(
		saveBrandVisualProfileSchema.safeParse({
			...validFields,
			primaryColor: 'blue'
		}).success
	).toBe(false);
	expect(brandStyleIsProhibited('purple AI gradient', DEFAULT_PROHIBITED_STYLES)).toBe(true);
	expect(brandStyleIsProhibited('editorial photography', DEFAULT_PROHIBITED_STYLES)).toBe(false);
	const drafted = draftBrandVisualFromIntake({
		brand: {
			brandPersonality: 'premium',
			tokens: { accent: '#0f4c5c', text: '#1a1714', fontFamily: 'Georgia' }
		},
		logoAssetId: null
	});
	expect(drafted.primaryColor).toBe('#0F4C5C');
	expect(drafted.visualPersonality).toContain('Premium');
	expect(drafted.prohibitedStyles).toContain('cartoon');
});

test('missing TenantContext cannot read or write brand visual profiles', async () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(getBrandVisualProfileForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(listBrandVisualVersionsForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(
		saveBrandVisualDraftForTenant(null as never, { ...validFields, source: 'intake' })
	).rejects.toBeInstanceOf(TenantContextError);
});

test('GET drafts from brand intake without persisting a profile', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.11.10'
	);
	const ctx = contextFor(session, 'c1-draft');
	const before = await getBrandVisualProfileForTenant(ctx);
	const brand = await getBrandForTenant(ctx);
	const logo = await getLatestLogoAssetForTenant(ctx);
	const review = await getBrandVisualProfile(session, ctx);
	const after = await getBrandVisualProfileForTenant(ctx);
	const expected = draftBrandVisualFromIntake({
		brand: brand ? { brandPersonality: brand.brandPersonality, tokens: brand.tokens } : null,
		logoAssetId: logo?.id ?? null
	});
	expect(before).toBeNull();
	expect(after).toBeNull();
	expect(brand).not.toBeNull();
	expect(review.confirmed).toBe(false);
	expect(review.profile).toBeNull();
	expect(review.proposal.primaryColor).toBe(expected.primaryColor);
	expect(review.proposal.primaryLogoAssetId).toBe(expected.primaryLogoAssetId);
	expect(review.proposal.visualPersonality).toBe(expected.visualPersonality);
	expect(review.proposal.prohibitedStyles).toEqual(expect.arrayContaining(['cartoon']));
	expect(review.readyToConfirm).toBe(Boolean(expected.primaryColor && expected.visualPersonality));
	expect(JSON.stringify(review)).not.toContain('storageKey');
	expect(JSON.stringify(review)).not.toContain('clients/');
});

test('user on client A cannot read or write client B brand visual profile', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.11.11'
	);
	const ctx = contextFor(session, 'c1-read');
	expect(ctx.clientId).toBe(alpha.id);

	const { session: adminSession } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.11.12'
	);
	await switchActiveClient(adminSession, adminSession.token, beta.id, 'c1-beta-switch');
	const betaActor = await resolveSession(adminSession.token);
	if (!betaActor) throw new Error('beta session missing');
	const betaCtx = contextFor(betaActor, 'c1-beta');
	const personality = `Beta warehouse ${crypto.randomUUID().slice(0, 8)}`;
	await confirmBrandVisualProfile(
		betaActor,
		betaCtx,
		{
			...validFields,
			primaryColor: '#D4B06A',
			visualPersonality: personality
		},
		'c1-beta-confirm'
	);

	const own = await getBrandVisualProfile(session, ctx);
	const serialized = JSON.stringify(own);
	expect(serialized).not.toContain(beta.id);
	expect(serialized).not.toContain(personality);
	expect(own.profile?.clientId ?? alpha.id).toBe(alpha.id);
	expect(own.confirmed).toBe(false);

	await expect(getBrandVisualProfile(session, ctx, beta.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(
		saveBrandVisualProfile(
			session,
			{ ...ctx, clientId: beta.id },
			{ ...validFields, visualPersonality: 'Hijack' },
			'c1-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		confirmBrandVisualProfile(
			session,
			{ ...ctx, clientId: beta.id },
			{ ...validFields, visualPersonality: 'Hijack confirm' },
			'c1-hijack-confirm'
		)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant brand visual profile through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.11.16'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/brand-visual/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('#d4b06a');
});

test('confirm writes an immutable version and edit returns the profile to draft', async () => {
	const { actor, ctx } = await scopedActor('C1 Confirm Client', '10.0.11.13');
	const empty = await getBrandVisualProfile(actor, ctx);
	expect(empty.confirmed).toBe(false);
	expect(empty.readyToConfirm).toBe(false);
	await expect(requireConfirmedBrandVisualProfile(ctx)).rejects.toBeInstanceOf(ValidationError);
	await expect(
		confirmBrandVisualProfile(actor, ctx, { ...validFields, primaryColor: '' }, 'c1-empty-color')
	).rejects.toBeInstanceOf(ValidationError);

	const saved = await saveBrandVisualProfile(actor, ctx, validFields, 'c1-save');
	expect(saved.status).toBe('draft');
	expect(saved.confirmed).toBe(false);
	expect(brandVisualProfileConfirmed(saved)).toBe(false);

	const confirmed = await confirmBrandVisualProfile(actor, ctx, validFields, 'c1-confirm');
	expect(confirmed.profile.status).toBe('confirmed');
	expect(confirmed.profile.confirmed).toBe(true);
	expect(confirmed.version).toBe(1);
	const first = await requireConfirmedBrandVisualProfile(ctx);
	expect(first.primaryColor).toBe('#0F4C5C');

	const edited = await saveBrandVisualProfile(
		actor,
		ctx,
		{ ...validFields, primaryColor: '#123456', visualPersonality: 'Clean / editorial' },
		'c1-edit'
	);
	expect(edited.status).toBe('draft');
	expect(edited.confirmed).toBe(false);
	await expect(requireConfirmedBrandVisualProfile(ctx)).rejects.toBeInstanceOf(ValidationError);

	const again = await confirmBrandVisualProfile(
		actor,
		ctx,
		{
			...validFields,
			primaryColor: '#123456',
			visualPersonality: 'Clean / editorial',
			source: 'edited'
		},
		'c1-reconfirm'
	);
	expect(again.version).toBe(2);
	expect(again.profile.primaryColor).toBe('#123456');
	const versions = await listBrandVisualVersions(actor, ctx);
	expect(versions).toHaveLength(2);
	const v1 = versions.find((row) => row.version === 1);
	expect(v1?.snapshot.primaryColor).toBe('#0F4C5C');
	expect(v1?.snapshot.visualPersonality).toBe('Premium / clean / professional');
});

test('Alpha cannot attach Beta logo to an Alpha profile', async () => {
	const alpha = await scopedActor('C1 Logo Alpha', '10.0.11.14');
	const beta = await scopedActor('C1 Logo Beta', '10.0.11.15');
	const uploaded = await uploadBrandAsset(
		beta.actor,
		beta.ctx,
		{
			purpose: 'logo',
			filename: 'beta-logo.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'c1-beta-logo'
	);
	await expect(
		saveBrandVisualProfile(
			alpha.actor,
			alpha.ctx,
			{ ...validFields, primaryLogoAssetId: uploaded.id },
			'c1-steal-logo'
		)
	).rejects.toBeInstanceOf(ValidationError);
	const review = await getBrandVisualProfile(alpha.actor, alpha.ctx);
	expect(review.proposal.primaryLogoAssetId).toBeNull();
	expect(JSON.stringify(review)).not.toContain(uploaded.id);
});

test('missing capability cannot save or confirm a brand visual profile', async () => {
	const { actor, ctx } = await scopedActor('C1 Cap Client', '10.0.11.17');
	const reader = {
		...actor,
		permissions: actor.permissions.filter((cap) => cap !== 'knowledge.manage')
	};
	await expect(
		saveBrandVisualProfile(reader, ctx, validFields, 'c1-cap-save')
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		confirmBrandVisualProfile(reader, ctx, validFields, 'c1-cap-confirm')
	).rejects.toBeInstanceOf(ForbiddenError);
	const review = await getBrandVisualProfile(reader, ctx);
	expect(review.confirmed).toBe(false);
});

test('empty prohibited styles are rejected and defaults fail closed', () => {
	expect(() =>
		parseContract(saveBrandVisualProfileSchema, { ...validFields, prohibitedStyles: [] })
	).toThrow(ValidationError);
	expect(brandStyleIsProhibited('Cartoon', ['cartoon', 'neon'])).toBe(true);
});
