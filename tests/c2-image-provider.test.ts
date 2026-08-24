import { afterEach, beforeEach, expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	TenantContextError,
	ValidationError,
	buildSupportingImagePrompt,
	promptHitsProhibitedStyle,
	promptRequestsInventedProof,
	promptRequestsLogo,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	db,
	imageGenerationJobs,
	insertImageGenerationJobForTenant,
	listImageGenerationJobsForTenant
} from '@vector/db';
import {
	contextFor,
	createClient,
	draftSupportingImage,
	listImageJobs,
	login,
	pauseIntelligence,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import { MemoryImageProvider, resetImageProvider, setImageProvider } from '@vector/images';
import { app } from '../apps/api/src/app';

const root = join(import.meta.dir, '..');
const memory = new MemoryImageProvider();

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
		{ name, slug: `c2-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
		'c2-create'
	);
	await switchActiveClient(session, session.token, created.id, 'c2-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return { actor, created, ctx: contextFor(actor, 'c2-ctx') };
}

beforeEach(() => {
	memory.reset();
	setImageProvider(memory);
});

afterEach(() => {
	resetImageProvider();
});

test('C2 stays off AIProvider and uses a tenant-owned job table', () => {
	const aiTypes = readFileSync(join(root, 'packages/ai/src/types.ts'), 'utf8');
	const imageTypes = readFileSync(join(root, 'packages/images/src/types.ts'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/images.ts'), 'utf8');
	const page = readFileSync(join(root, 'apps/control/src/routes/social/+page.svelte'), 'utf8');
	const migration = readFileSync(
		join(root, 'packages/db/migrations/0037_c2_image_generation.sql'),
		'utf8'
	);
	expect(aiTypes).toContain('interface AIProvider');
	expect(aiTypes).not.toContain('generateImage');
	expect(imageTypes).toContain('interface ImageProvider');
	expect(imageTypes).toContain('generate(');
	expect(imageTypes).toContain('edit(');
	expect(imageTypes).toContain('generateVariants(');
	expect(domain).toContain('ai.read');
	expect(domain).toContain('ai.manage');
	expect(domain).not.toContain('creative.read');
	expect(aiTypes).not.toContain('generateImage');
	expect(page).toContain('will not go live');
	expect(page).toContain('Draft supporting photo');
	expect(page).not.toContain('generateImage');
	expect(page).not.toContain('ImageProvider');
	expect(page).not.toContain('costMicros');
	expect(migration).not.toContain('ON DELETE CASCADE');
	expect(migration).toContain('ON DELETE set null');
	expect(promptRequestsLogo('recreate our logo in gold')).toBe(true);
	expect(promptRequestsInventedProof('five stars testimonial on a card')).toBe(true);
	expect(promptHitsProhibitedStyle('cartoon hallway', ['cartoon'])).toBe('cartoon');
	expect(
		buildSupportingImagePrompt({
			brandName: 'North Clinic',
			photographyDirection: 'Natural light',
			prohibitedStyles: ['cartoon'],
			brief: 'Quiet hallway'
		})
	).toContain('Do not include logos');
});

test('missing TenantContext cannot list image jobs', async () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	await expect(listImageGenerationJobsForTenant(null as never)).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('draft supporting photo stores a draft asset and integer cost, not a live image', async () => {
	const { actor, ctx, created } = await scopedActor('C2 Draft Client', '10.0.16.10');
	const result = await draftSupportingImage(
		actor,
		ctx,
		{
			title: 'Quiet hallway',
			brief: 'Natural light in a calm waiting room with no people or text',
			idempotencyKey: `c2-draft-${created.id.slice(0, 8)}`
		},
		'c2-draft'
	);
	expect(result.replayed).toBe(false);
	expect(result.job.status).toBe('succeeded');
	expect(result.job.denyReason).toBeNull();
	expect(JSON.stringify(result)).not.toContain('costMicros');
	expect(JSON.stringify(result)).not.toContain('promptText');
	expect(JSON.stringify(result)).not.toContain('storageKey');
	expect(result.asset?.status).toBe('draft');
	expect(result.asset?.sourceType).toBe('generated');
	expect(result.asset?.rightsStatus).toBe('unknown');
	const [row] = await db
		.select()
		.from(imageGenerationJobs)
		.where(eq(imageGenerationJobs.id, result.job.id))
		.limit(1);
	expect(row?.clientId).toBe(created.id);
	expect(row?.costMicros).toBeGreaterThan(0);
	expect(Number.isInteger(row?.costMicros)).toBe(true);
	expect(row?.currency).toBe('USD');
	expect(row?.storageKey?.startsWith(`clients/${created.id}/generated/`)).toBe(true);
	expect(row?.promptVersion).toBeTruthy();
	expect(row?.schemaVersion).toBeTruthy();
	const replay = await draftSupportingImage(
		actor,
		ctx,
		{
			title: 'Quiet hallway',
			brief: 'Natural light in a calm waiting room with no people or text',
			idempotencyKey: `c2-draft-${created.id.slice(0, 8)}`
		},
		'c2-draft-replay'
	);
	expect(replay.replayed).toBe(true);
	expect(replay.job.id).toBe(result.job.id);
});

async function expectPolicyDeny(
	actor: Awaited<ReturnType<typeof scopedActor>>['actor'],
	ctx: Awaited<ReturnType<typeof scopedActor>>['ctx'],
	brief: string,
	key: string
) {
	let error: unknown;
	try {
		await draftSupportingImage(actor, ctx, { brief, idempotencyKey: key }, key);
	} catch (caught) {
		error = caught;
	}
	expect(error).toBeInstanceOf(ValidationError);
}

test('logo, invented proof, and prohibited styles are denied and recorded', async () => {
	const { actor, ctx } = await scopedActor('C2 Policy Client', '10.0.16.11');
	await expectPolicyDeny(
		actor,
		ctx,
		'Please recreate our logo in a metallic finish',
		'c2-logo-deny'
	);
	await expectPolicyDeny(
		actor,
		ctx,
		'A five stars testimonial card with a named customer',
		'c2-proof-deny'
	);
	await expectPolicyDeny(
		actor,
		ctx,
		'A cartoon neon robot in a purple AI gradient lobby',
		'c2-style-deny'
	);
	const jobs = await listImageJobs(actor, ctx);
	expect(jobs.filter((job) => job.status === 'denied' && job.denyReason === 'policy')).toHaveLength(
		3
	);
	expect(JSON.stringify(jobs)).not.toContain('costMicros');
});

test('client kill switch records an image pause deny', async () => {
	const { actor, ctx } = await scopedActor('C2 Pause Client', '10.0.16.12');
	await pauseIntelligence(
		actor,
		ctx,
		{ paused: true, reason: 'Pause image drafts while reviewing brand look' },
		'c2-pause-on'
	);
	let pausedError: unknown;
	try {
		await draftSupportingImage(
			actor,
			ctx,
			{ brief: 'Natural light in a calm waiting room with plants', idempotencyKey: 'c2-paused' },
			'c2-paused'
		);
	} catch (caught) {
		pausedError = caught;
	}
	expect(pausedError).toMatchObject({ code: 'IMAGE_GENERATION_PAUSED' });
	const jobs = await listImageJobs(actor, ctx);
	expect(jobs.some((job) => job.status === 'denied' && job.denyReason === 'paused')).toBe(true);
	await pauseIntelligence(
		actor,
		ctx,
		{ paused: false, reason: 'Resume image drafts after the review' },
		'c2-pause-off'
	);
});

test('per-client image budget deny is recorded', async () => {
	const { actor, ctx, created } = await scopedActor('C2 Budget Client', '10.0.16.13');
	await insertImageGenerationJobForTenant(ctx, {
		status: 'succeeded',
		purpose: 'supporting',
		title: 'Prior draft',
		promptText: 'seed',
		promptVersion: 'image.supporting.v1',
		schemaVersion: 'image.generation.v1',
		adapter: 'memory',
		model: 'memory-image-v1',
		idempotencyKey: `c2-budget-seed-${created.id.slice(0, 8)}`,
		costMicros: env.IMAGE_COST_CEILING_MICROS,
		createdBy: actor.userId
	});
	let budgetError: unknown;
	try {
		await draftSupportingImage(
			actor,
			ctx,
			{ brief: 'Natural light in an empty consultation room', idempotencyKey: 'c2-budget-deny' },
			'c2-budget'
		);
	} catch (caught) {
		budgetError = caught;
	}
	expect(budgetError).toMatchObject({ code: 'IMAGE_BUDGET_DENIED' });
	const jobs = await listImageJobs(actor, ctx);
	expect(jobs.some((job) => job.denyReason === 'budget')).toBe(true);
});

test('pages or social capability is not enough to draft an image', async () => {
	const { actor, ctx } = await scopedActor('C2 Authz Client', '10.0.16.14');
	await expect(
		draftSupportingImage(
			{ ...actor, permissions: ['social.manage', 'pages.manage'] },
			ctx,
			{ brief: 'Natural light in a calm waiting room with plants' },
			'c2-authz'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
});

test('user on client A cannot list client B image jobs', async () => {
	const a = await scopedActor('C2 Alpha Isolation', '10.0.16.15');
	const b = await scopedActor('C2 Beta Isolation', '10.0.16.16');
	const created = await draftSupportingImage(
		b.actor,
		b.ctx,
		{
			brief: 'Natural light in a calm waiting room with wood floors',
			idempotencyKey: 'c2-iso-b'
		},
		'c2-iso-b'
	);
	const own = await listImageJobs(a.actor, a.ctx);
	const other = await listImageJobs(b.actor, b.ctx);
	expect(own.find((job) => job.id === created.job.id)).toBeUndefined();
	expect(other.some((job) => job.id === created.job.id)).toBe(true);
	expect(JSON.stringify(own)).not.toContain(created.job.id);
	await expect(listImageJobs(a.actor, a.ctx, b.created.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	const leaked = await listImageGenerationJobsForTenant(a.ctx);
	expect(leaked.some((row) => row.id === created.job.id)).toBe(false);
});

test('route client id cannot leak the other tenant image jobs through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: {
			'content-type': 'application/json',
			'x-forwarded-for': '10.0.16.17'
		},
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/images/jobs/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text).not.toContain('costMicros');
});
