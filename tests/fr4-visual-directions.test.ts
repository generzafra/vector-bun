import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	DEFAULT_PROHIBITED_STYLES,
	ForbiddenError,
	TenantContextError,
	acceptVisualDirectionProposal,
	candidatesAreDiverse,
	directionIsCompatible,
	enumerateVisualDirectionCandidates,
	requireTenantContext,
	selectWinningCandidateIndex,
	visualDirectionProposalSchema
} from '@vector/contracts';
import { clients, db, listVisualDirectionsForVersionForTenant, pageVersions } from '@vector/db';
import {
	addService,
	composeFunnel,
	confirmBrandVisualProfile,
	contextFor,
	createClient,
	getFunnel,
	login,
	resolveSession,
	saveBrand,
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
		{ name, slug: `fr4-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'fr4-create'
	);
	await switchActiveClient(session, session.token, created.id, 'fr4-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'fr4-ctx');
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
		'fr4-brand'
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
		'fr4-service'
	);
	return { actor, created, ctx };
}

test('Funnel layout directions stay in business language and do not show numeric scores', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/funnel/+page.svelte'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0036_fr4_visual_directions.sql'),
		'utf8'
	);
	const domain = readFileSync(join(root, 'packages/domain/src/pages.ts'), 'utf8');
	expect(page).toContain('Layout directions');
	expect(page).toContain('not three websites');
	expect(page).not.toContain('score_total');
	expect(page).not.toContain('overallScore');
	expect(page).not.toContain('ImageProvider');
	expect(page).not.toContain('generateImage');
	expect(page).not.toContain('hero-mosaic');
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect(domain).toContain('pages.read');
	expect(domain).toContain('pages.manage');
	expect(domain).not.toContain('creative.read');
	expect(
		visualDirectionProposalSchema.safeParse({
			candidates: [
				{
					candidateIndex: 0,
					name: 'Illegal',
					rationale: 'This should not invent a component Vector cannot render.',
					layoutCharacter: 'editorial',
					density: 'air',
					headlineCharacter: 'editorial',
					heroVariant: 'hero-mosaic',
					proofVariant: 'none',
					servicesVariant: 'services',
					ctaVariant: 'cta',
					mediaStrategy: 'typography_led'
				}
			]
		}).success
	).toBe(false);
});

test('cheap candidates stay diverse and never propose split without a logo', () => {
	const thin = enumerateVisualDirectionCandidates({
		mediaStrategy: 'typography_led',
		hasLogo: false,
		personality: 'corporate',
		hasApprovedClaims: true
	});
	expect(thin).toHaveLength(3);
	expect(candidatesAreDiverse(thin)).toBe(true);
	expect(thin.every((item) => item.heroVariant !== 'hero-split')).toBe(true);
	expect(
		directionIsCompatible(
			{
				...thin[0]!,
				heroVariant: 'hero-split',
				layoutCharacter: 'split'
			},
			{ mediaStrategy: 'typography_led', hasLogo: false }
		).ok
	).toBe(false);

	const rich = enumerateVisualDirectionCandidates({
		mediaStrategy: 'hybrid',
		hasLogo: true,
		personality: 'corporate',
		hasApprovedClaims: true
	});
	expect(rich.some((item) => item.heroVariant === 'hero-split')).toBe(true);
	expect(candidatesAreDiverse(rich)).toBe(true);
	expect(
		selectWinningCandidateIndex([
			{ candidateIndex: 2, total: 80 },
			{ candidateIndex: 0, total: 80 }
		])
	).toBe(0);

	const clones = acceptVisualDirectionProposal([rich[0]!, { ...rich[0]!, candidateIndex: 1 }], {
		mediaStrategy: 'hybrid',
		hasLogo: true,
		personality: 'corporate',
		hasApprovedClaims: true
	});
	expect(clones.ok).toBe(false);
	expect(clones.source).toBe('deterministic');
	expect(clones.candidates).toHaveLength(3);
});

test('missing TenantContext cannot read visual directions', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(
		listVisualDirectionsForVersionForTenant(null as never, crypto.randomUUID())
	).rejects.toBeInstanceOf(TenantContextError);
});

test('user on client A cannot read client B visual directions through getFunnel', async () => {
	const a = await scopedComposable('FR4 Alpha Isolation', '10.0.14.10');
	const b = await scopedComposable('FR4 Beta Isolation', '10.0.14.11');
	await composeFunnel(a.actor, a.ctx, 'fr4-iso-a');
	await composeFunnel(b.actor, b.ctx, 'fr4-iso-b');
	const own = await getFunnel(a.actor, a.ctx);
	const other = await getFunnel(b.actor, b.ctx);
	expect(own.visualDirections?.items.length).toBe(3);
	expect(own.visualDirections?.items.filter((item) => item.selected)).toHaveLength(1);
	expect(JSON.stringify(own)).not.toContain(b.created.id);
	expect(JSON.stringify(own)).not.toContain('score_total');
	expect(JSON.stringify(own.visualDirections)).not.toContain('storageKey');
	if (!other.draft) throw new Error('beta draft missing');
	expect(await listVisualDirectionsForVersionForTenant(a.ctx, other.draft.id)).toEqual([]);
	await expect(getFunnel(a.actor, a.ctx, b.created.id)).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant funnel directions through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.14.12'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/funnel/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
});

test('compose persists three cheap directions and one winner draft', async () => {
	const { actor, ctx, created } = await scopedComposable('FR4 Compose Client', '10.0.14.13');
	const before = await db
		.select({ id: pageVersions.id })
		.from(pageVersions)
		.where(eq(pageVersions.clientId, created.id));
	const composed = await composeFunnel(actor, ctx, 'fr4-compose');
	const after = await db
		.select({ id: pageVersions.id })
		.from(pageVersions)
		.where(eq(pageVersions.clientId, created.id));
	expect(after.length).toBe(before.length + 1);
	expect(['hero-minimal', 'hero-editorial']).toContain(composed.draft.document.sections[0]?.type);
	expect(composed.draft.document.sections[0]?.type).not.toBe('hero-split');
	const funnel = await getFunnel(actor, ctx);
	expect(funnel.visualDirections?.items.length).toBe(3);
	expect(funnel.visualDirections?.source).toBe('deterministic');
	expect(funnel.visualDirections?.selectedName).toBeTruthy();
	expect(funnel.visualDirections?.items.some((item) => item.selected)).toBe(true);
	expect(JSON.stringify(funnel)).not.toContain('scoreTotal');
	expect(JSON.stringify(funnel)).not.toContain('overallScore');
	const rows = await listVisualDirectionsForVersionForTenant(ctx, composed.draft.id);
	expect(rows).toHaveLength(3);
	expect(rows.filter((row) => row.direction.status === 'selected')).toHaveLength(1);
	expect(rows.every((row) => row.score && row.score.clientId === created.id)).toBe(true);
	const winner = rows.find((row) => row.direction.status === 'selected');
	expect(winner?.direction.manifest).toMatchObject({
		heroVariant: composed.draft.document.sections[0]?.type
	});
});

test('confirmed look plus logo can keep a split winner', async () => {
	const { actor, ctx } = await scopedComposable('FR4 Logo Client', '10.0.14.14', 'corporate');
	const logo = await uploadBrandAsset(
		actor,
		ctx,
		{
			purpose: 'logo',
			filename: 'fr4-logo.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'fr4-logo'
	);
	await confirmBrandVisualProfile(
		actor,
		ctx,
		{ ...visualFields, primaryLogoAssetId: logo.id },
		'fr4-confirm-logo'
	);
	const composed = await composeFunnel(actor, ctx, 'fr4-logo-compose');
	const funnel = await getFunnel(actor, ctx);
	expect(funnel.visualDirections?.items.length).toBe(3);
	expect(funnel.visualDirections?.items.some((item) => item.name === 'Clear conversion')).toBe(
		true
	);
	const rows = await listVisualDirectionsForVersionForTenant(ctx, composed.draft.id);
	expect(
		rows.some(
			(row) => (row.direction.manifest as { heroVariant?: string }).heroVariant === 'hero-split'
		)
	).toBe(true);
	expect(composed.draft.document.sections[0]?.type).toBe('hero-split');
});

test('missing pages.manage cannot compose visual directions', async () => {
	const { actor, ctx } = await scopedComposable('FR4 Cap Client', '10.0.14.15');
	await expect(
		composeFunnel(
			{ ...actor, permissions: actor.permissions.filter((cap) => cap !== 'pages.manage') },
			ctx,
			'fr4-cap'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
});
