import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { composeShell } from '@vector/compose';
import {
	DEFAULT_PROHIBITED_STYLES,
	ForbiddenError,
	TenantContextError,
	ValidationError,
	buildCompositionCopy,
	compositionSvgHitsProhibitedStyle,
	compositionTemplatesAvoidDefaultProhibited,
	requireTenantContext,
	resolveCompositionTokens
} from '@vector/contracts';
import {
	clients,
	creativeCompositions,
	db,
	listCreativeAssetsForTenant,
	listLatestCreativeCompositionsForTenant
} from '@vector/db';
import {
	composeCreativeShells,
	confirmBrandVisualProfile,
	contextFor,
	getCreativeCompositionBytes,
	getFunnel,
	listCreativeCompositions,
	login,
	resolveSession,
	saveBrand,
	switchActiveClient,
	uploadBrandAsset
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
import { inspectComposedSvg } from '@vector/storage';
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

async function scopedBrand(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `c3-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'c3-create'
	);
	await switchActiveClient(session, session.token, created.id, 'c3-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'c3-ctx');
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
		'c3-brand'
	);
	return { actor, created, ctx };
}

test('C3 composes logos and copy in trusted software, not image models', () => {
	const aiTypes = readFileSync(join(root, 'packages/ai/src/types.ts'), 'utf8');
	const composePkg = readFileSync(join(root, 'packages/compose/package.json'), 'utf8');
	const composeSrc = readFileSync(join(root, 'packages/compose/src/templates.ts'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/compositions.ts'), 'utf8');
	const page = readFileSync(join(root, 'apps/control/src/routes/funnel/+page.svelte'), 'utf8');
	const delivery = readFileSync(join(root, 'apps/delivery/src/routes/+page.svelte'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0038_c3_compositions.sql'),
		'utf8'
	);
	expect(aiTypes).toContain('interface AIProvider');
	expect(aiTypes).not.toContain('generateImage');
	expect(composePkg).not.toContain('sharp');
	expect(composeSrc).not.toContain('ImageProvider');
	expect(composeSrc).not.toContain('generateImage');
	expect(domain).toContain('pages.read');
	expect(domain).toContain('pages.manage');
	expect(domain).not.toContain('creative.manage');
	expect(domain).not.toContain('generateImage');
	expect(domain).not.toContain('@vector/images');
	expect(page).toContain('Share and email cards');
	expect(page).toContain('will not go live');
	expect(page).toContain('Compose share and email cards');
	expect(page).not.toContain('generateImage');
	expect(page).not.toContain('ImageProvider');
	expect(page).not.toContain('costMicros');
	expect(page).not.toContain('storageKey');
	expect(page).not.toContain('Sharp');
	expect(delivery).not.toContain('/funnel/composition');
	expect(delivery).not.toContain('creative_compositions');
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect(migration).toContain('ON DELETE set null');
	expect(compositionTemplatesAvoidDefaultProhibited()).toBe(true);
	const copy = buildCompositionCopy({
		displayName: 'North Clinic',
		tagline: 'Guided implant consults',
		primaryConversion: 'Book an implant consult'
	});
	const tokens = resolveCompositionTokens({
		brandTokens: { accent: '#111111' },
		profile: null
	});
	const composed = composeShell({ kind: 'og', copy, tokens });
	expect(composed.svg.startsWith('<svg')).toBe(true);
	expect(composed.svg).toContain('North Clinic');
	expect(composed.svg).toContain('Book an implant consult');
	expect(composed.hasLogo).toBe(false);
	expect(composed.svg).not.toContain('data:image');
	for (const style of DEFAULT_PROHIBITED_STYLES) {
		expect(compositionSvgHitsProhibitedStyle(composed.svg, [style])).toBeNull();
	}
	let scriptError: unknown;
	try {
		inspectComposedSvg(new TextEncoder().encode('<svg><script>alert(1)</script></svg>'));
	} catch (caught) {
		scriptError = caught;
	}
	expect(scriptError).toBeInstanceOf(ValidationError);
});

test('missing TenantContext cannot list compositions', async () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(listLatestCreativeCompositionsForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('composed cards reuse approved copy, stay drafts, and omit storage keys', async () => {
	const { actor, ctx, created } = await scopedBrand('North Clinic Cards', '10.0.17.10');
	const first = await composeCreativeShells(actor, ctx, 'c3-compose-1');
	expect(first.items).toHaveLength(3);
	expect(first.items.map((item) => item.kind).sort()).toEqual(['email', 'og', 'social']);
	expect(first.items.every((item) => item.status === 'draft')).toBe(true);
	expect(first.items.every((item) => item.headline === 'North Clinic Cards')).toBe(true);
	expect(JSON.stringify(first)).not.toContain('storageKey');
	expect(JSON.stringify(first)).not.toContain('costMicros');
	expect(await listCreativeAssetsForTenant(ctx)).toHaveLength(0);
	const [stored] = await db
		.select()
		.from(creativeCompositions)
		.where(eq(creativeCompositions.id, first.items[0]!.id))
		.limit(1);
	expect(stored?.storageKey.startsWith(`clients/${created.id}/creative/`)).toBe(true);
	expect(stored?.copySnapshot.headline).toBe('North Clinic Cards');
	const og = await getCreativeCompositionBytes(
		actor,
		ctx,
		first.items.find((item) => item.kind === 'og')!.id
	);
	const svg = new TextDecoder().decode(og.bytes);
	expect(svg).toContain('North Clinic Cards');
	expect(svg).toContain('Book an implant consult');
	expect(svg).toContain('#111111');
	expect(og.composition.hasLogo).toBe(false);
	const funnel = await getFunnel(actor, ctx);
	expect(funnel.shareCards).toHaveLength(3);
	expect(JSON.stringify(funnel.shareCards)).not.toContain('storageKey');
	expect(JSON.stringify(funnel.shareCards)).not.toContain(`clients/${created.id}`);
	const second = await composeCreativeShells(actor, ctx, 'c3-compose-2');
	expect(second.items.find((item) => item.kind === 'og')?.version).toBe(2);
});

test('existing logo bytes are embedded and confirmed colors are used', async () => {
	const { actor, ctx } = await scopedBrand('North Clinic Logo', '10.0.17.11');
	const logo = await uploadBrandAsset(
		actor,
		ctx,
		{
			purpose: 'logo',
			filename: 'mark.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'c3-logo'
	);
	await confirmBrandVisualProfile(
		actor,
		ctx,
		{ ...visualFields, primaryLogoAssetId: logo.id },
		'c3-confirm'
	);
	const composed = await composeCreativeShells(actor, ctx, 'c3-logo-compose');
	expect(composed.items.every((item) => item.hasLogo)).toBe(true);
	const og = composed.items.find((item) => item.kind === 'og')!;
	const bytes = await getCreativeCompositionBytes(actor, ctx, og.id);
	const svg = new TextDecoder().decode(bytes.bytes);
	expect(svg).toContain(`data:image/png;base64,${Buffer.from(PNG_1X1).toString('base64')}`);
	expect(svg).toContain('#0F4C5C');
	expect(svg).toContain('North Clinic Logo');
});

test('ai or social capability is not enough to compose share cards', async () => {
	const { actor, ctx } = await scopedBrand('C3 Authz Client', '10.0.17.12');
	await expect(
		composeCreativeShells(
			{ ...actor, permissions: ['ai.manage', 'social.manage'] },
			ctx,
			'c3-authz'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
});

test('user on client A cannot read client B compositions', async () => {
	const a = await scopedBrand('C3 Alpha Isolation', '10.0.17.13');
	const b = await scopedBrand('C3 Beta Isolation', '10.0.17.14');
	const created = await composeCreativeShells(b.actor, b.ctx, 'c3-iso-b');
	const own = await listCreativeCompositions(a.actor, a.ctx);
	const other = await listCreativeCompositions(b.actor, b.ctx);
	expect(own.find((card) => card.id === created.items[0]!.id)).toBeUndefined();
	expect(other.some((card) => card.id === created.items[0]!.id)).toBe(true);
	await expect(listCreativeCompositions(a.actor, a.ctx, b.created.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	const leaked = await listLatestCreativeCompositionsForTenant(a.ctx);
	expect(leaked.some((row) => row.id === created.items[0]!.id)).toBe(false);
	let missing: unknown;
	try {
		await getCreativeCompositionBytes(a.actor, a.ctx, created.items[0]!.id);
	} catch (caught) {
		missing = caught;
	}
	expect(missing).toMatchObject({ status: 404 });
});

test('route client id cannot leak the other tenant compositions through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.17.15'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/compositions/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
});
