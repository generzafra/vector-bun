import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	DEFAULT_PROHIBITED_STYLES,
	ForbiddenError,
	TenantContextError,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	db,
	getCreativeQaReviewForVersionForTenant,
	imageGenerationJobs
} from '@vector/db';
import {
	completeWinnerMedia,
	composeFunnel,
	confirmBrandVisualProfile,
	confirmCreativeRights,
	contextFor,
	decideClientReveal,
	getClientReveal,
	login,
	resolveSession,
	runCreativeQa,
	saveBrand,
	addService,
	switchActiveClient,
	uploadBrandAsset,
	winnerMediaDirectionIds
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';
import { composeLeadPage, evaluateFirstRevealGate } from '@vector/funnel-engine';
import { listVisualDirectionsForVersionForTenant } from '@vector/db';

const root = join(import.meta.dir, '..');

const PNG_1X1 = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
	0x42, 0x60, 0x82
]);

async function scoped(name: string, ip: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	const created = await createClient(
		session,
		{ name, slug: `wb-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'wb-create'
	);
	await switchActiveClient(session, session.token, created.id, 'wb-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'wb-ctx');
	await saveBrand(
		actor,
		ctx,
		{
			displayName: name,
			audience: 'Local patients who need implant consults',
			offer: 'Guided implant consults with a clear treatment plan',
			primaryConversion: 'Book an implant consult',
			brandPersonality: 'premium',
			tokens: { accent: '#111111', background: '#111111', text: '#F7F7F5' }
		},
		'wb-brand'
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
		'wb-service'
	);
	return { actor, created, ctx };
}

test('first reveal remainder checks cover contrast, form, weight, and the first screen', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/reveal/+page.svelte'), 'utf8');
	const funnel = readFileSync(join(root, 'apps/control/src/routes/funnel/+page.svelte'), 'utf8');
	const nav = readFileSync(join(root, 'packages/contracts/src/control-nav.ts'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0041_c7_creative_qa.sql'),
		'utf8'
	);
	expect(funnel).toContain('Add one supporting photo');
	expect(funnel).toContain('kept direction only');
	expect(page).toContain('Approving does not publish');
	expect(page).toContain('Request changes');
	expect(page).not.toContain('scoreTotal');
	expect(page).not.toContain('storageKey');
	expect(page).not.toContain('generateImage');
	expect(page).not.toContain('promptText');
	expect(nav).not.toContain("label: 'Reveal'");
	expect(migration).not.toContain('ON DELETE CASCADE');
	const document = composeLeadPage(
		{
			clientSlug: 'wave',
			brand: {
				displayName: 'North Clinic',
				tagline: null,
				audience: 'Local patients who need implant consults',
				offer: 'Guided implant consults with a clear treatment plan',
				primaryConversion: 'Book an implant consult',
				brandPersonality: 'premium',
				tokens: { accent: '#111111', background: '#111111', text: '#F7F7F5' }
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
		{ preview: true }
	);
	const gate = evaluateFirstRevealGate({ document, preview: true, hasLogo: false });
	expect(gate.version).toBe(2);
	expect(gate.checks.find((item) => item.key === 'visual_contrast')?.passed).toBe(true);
	expect(gate.checks.find((item) => item.key === 'a11y_form')?.passed).toBe(true);
	expect(gate.checks.find((item) => item.key === 'perf_weight')?.passed).toBe(true);
	expect(gate.checks.find((item) => item.key === 'first_screen')?.passed).toBe(true);
	expect(gate.passed).toBe(true);
});

test('missing TenantContext cannot read a creative review', async () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(getCreativeQaReviewForVersionForTenant(null as never, 'x')).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('typography-led previews do not spend on a photo, and a passed check can be approved', async () => {
	const { actor, ctx } = await scoped('North Clinic Type', '10.0.19.10');
	await composeFunnel(actor, ctx, 'wb-type-compose');
	const media = await completeWinnerMedia(actor, ctx, 'wb-type-media');
	expect(media.generated).toBe(false);
	expect(media.reason).toBe('typography');
	expect(await winnerMediaDirectionIds(ctx)).toEqual([]);
	const review = await runCreativeQa(actor, ctx, {}, 'wb-type-qa');
	expect(review.passed).toBe(true);
	expect(JSON.stringify(review)).not.toContain('storageKey');
	const reveal = await getClientReveal(actor, ctx);
	expect(reveal.ready).toBe(true);
	if (!reveal.ready) return;
	expect(reveal.directionName.length).toBeGreaterThan(0);
	const decided = await decideClientReveal(actor, ctx, { decision: 'approved' }, 'wb-type-approve');
	expect(decided.status).toBe('approved');
	const after = await getClientReveal(actor, ctx);
	expect(after.ready).toBe(true);
	if (after.ready) expect(after.status).toBe('approved');
});

test('hybrid winner media generates one photo and ignores the other directions', async () => {
	const { actor, ctx, created } = await scoped('North Clinic Hybrid', '10.0.19.11');
	const logo = await uploadBrandAsset(
		actor,
		ctx,
		{ purpose: 'logo', filename: 'mark.png', declaredType: 'image/png', bytes: PNG_1X1 },
		'wb-logo'
	);
	await confirmBrandVisualProfile(
		actor,
		ctx,
		{
			primaryLogoAssetId: logo.id,
			primaryColor: '#0F4C5C',
			accentColor: '#F7F7F5',
			primaryFont: 'Georgia, serif',
			visualPersonality: 'Premium / clean / professional',
			photographyDirection: 'Natural light interiors',
			prohibitedStyles: [...DEFAULT_PROHIBITED_STYLES]
		},
		'wb-confirm'
	);
	const composed = await composeFunnel(actor, ctx, 'wb-hybrid-compose');
	const directions = await listVisualDirectionsForVersionForTenant(ctx, composed.draft.id);
	expect(directions.some((row) => row.direction.status === 'selected')).toBe(true);
	const first = await completeWinnerMedia(actor, ctx, 'wb-hybrid-1');
	expect(first.generated).toBe(true);
	if (!first.generated) return;
	expect(first.jobCount).toBe(1);
	expect(JSON.stringify(first.job)).not.toContain('storageKey');
	expect(JSON.stringify(first.job)).not.toContain('costMicros');
	const second = await completeWinnerMedia(actor, ctx, 'wb-hybrid-2');
	expect(second.generated).toBe(true);
	if (second.generated) expect(second.replayed).toBe(true);
	const linked = await winnerMediaDirectionIds(ctx);
	expect(linked).toHaveLength(1);
	const selected = directions.find((row) => row.direction.status === 'selected');
	expect(linked[0]).toBe(selected?.direction.id);
	const jobs = await db
		.select()
		.from(imageGenerationJobs)
		.where(eq(imageGenerationJobs.clientId, created.id));
	expect(jobs.filter((job) => job.visualDirectionId).length).toBe(1);
	const blocked = await runCreativeQa(
		actor,
		ctx,
		{ altText: 'A quiet treatment room in natural light' },
		'wb-qa-blocked'
	);
	expect(blocked.passed).toBe(false);
	expect(blocked.checks.find((item) => item.key === 'rights')?.passed).toBe(false);
	const assetId = jobs.find((job) => job.creativeAssetId)?.creativeAssetId;
	expect(assetId).toBeTruthy();
	await confirmCreativeRights(
		actor,
		ctx,
		{ id: assetId!, rightsStatus: 'client_owned', usageNotes: 'Client owns this supporting photo' },
		'wb-rights'
	);
	const ready = await runCreativeQa(
		actor,
		ctx,
		{ altText: 'A quiet treatment room in natural light' },
		'wb-qa-ready'
	);
	expect(ready.passed).toBe(true);
	const reveal = await getClientReveal(
		{ ...actor, permissions: actor.permissions.filter((cap) => cap !== 'pages.manage') },
		ctx
	);
	expect(reveal.ready).toBe(true);
});

test('another tenant cannot approve this reveal', async () => {
	const a = await scoped('Wave Alpha', '10.0.19.12');
	const b = await scoped('Wave Beta', '10.0.19.13');
	await composeFunnel(a.actor, a.ctx, 'wb-iso-compose');
	await runCreativeQa(a.actor, a.ctx, {}, 'wb-iso-qa');
	const own = await getClientReveal(a.actor, a.ctx);
	const other = await getClientReveal(b.actor, b.ctx);
	expect(own.ready).toBe(true);
	expect(other.ready).toBe(false);
	let leaked: unknown;
	try {
		await decideClientReveal(b.actor, a.ctx, { decision: 'approved' }, 'wb-iso-decide');
	} catch (caught) {
		leaked = caught;
	}
	expect(leaked).toBeInstanceOf(TenantContextError);
	let denied: unknown;
	try {
		await runCreativeQa(
			{ ...a.actor, permissions: ['social.manage', 'ai.read'] },
			a.ctx,
			{},
			'wb-authz'
		);
	} catch (caught) {
		denied = caught;
	}
	expect(denied).toBeInstanceOf(ForbiddenError);
});
