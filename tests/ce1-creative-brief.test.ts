import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	DEFAULT_PROHIBITED_STYLES,
	TenantContextError,
	acceptVisualDirectionProposal,
	creativeExperienceBriefSchema,
	deriveCreativeExperienceBrief,
	enumerateVisualDirectionCandidates,
	requireTenantContext,
	visualDirectionManifestSchema,
	type CreativeBriefSource,
	type VisualDirectionConstraints
} from '@vector/contracts';
import { clients, db, listVisualDirectionsForVersionForTenant } from '@vector/db';
import {
	addService,
	composeFunnel,
	contextFor,
	login,
	resolveSession,
	saveBrand,
	switchActiveClient
} from '@vector/domain';
import { composeLeadPage } from '@vector/funnel-engine';
import { CE0_FIXTURES, ce0Fixture, type Ce0Fixture } from './fixtures/ce0-industries';
import { createTestClient as createClient } from './support/tenant-cleanup';

function briefSource(fixture: Ce0Fixture, photographyDirection?: string): CreativeBriefSource {
	const brand = fixture.knowledge.brand;
	return {
		displayName: brand.displayName,
		audience: brand.audience ?? '',
		offer: brand.offer ?? '',
		primaryConversion: brand.primaryConversion ?? '',
		approvedClaims: fixture.knowledge.claims
			.filter((claim) => claim.kind === 'approved')
			.map((claim) => claim.statement),
		prohibitedClaims: [fixture.prohibitedStatement],
		photographyDirection: photographyDirection ?? null,
		prohibitedStyles: [...DEFAULT_PROHIBITED_STYLES]
	};
}

function constraintsFor(
	fixture: Ce0Fixture,
	photographyDirection?: string
): VisualDirectionConstraints {
	return {
		mediaStrategy: 'typography_led',
		hasLogo: false,
		personality: fixture.personality,
		hasApprovedClaims: true,
		brief: briefSource(fixture, photographyDirection)
	};
}

test('a stored direction without a brief still parses, and the page schema stays version 1', () => {
	const legacy = visualDirectionManifestSchema.safeParse({
		candidateIndex: 0,
		name: 'Editorial type and layout',
		rationale: 'A quieter first screen that leads with type.',
		layoutCharacter: 'editorial',
		density: 'air',
		headlineCharacter: 'editorial',
		heroVariant: 'hero-editorial',
		proofVariant: 'proof-featured',
		servicesVariant: 'services-editorial',
		ctaVariant: 'cta-minimal',
		mediaStrategy: 'typography_led'
	});
	expect(legacy.success).toBe(true);
	const hospitality = ce0Fixture('luxury-hospitality');
	const page = composeLeadPage(hospitality.knowledge, { preview: true });
	expect(page.schemaVersion).toBe(1);
	expect(page.sections.map((section) => section.type)).toEqual([
		'hero-editorial',
		'proof-featured',
		'services-editorial',
		'offer',
		'faq',
		'cta-minimal',
		'lead-form'
	]);
	expect(page).not.toHaveProperty('experience');
	expect(JSON.stringify(page)).not.toContain(hospitality.prohibitedStatement);
});

test('two premium hospitality brands get different briefs and the same allowlisted heroes', () => {
	const north = ce0Fixture('luxury-hospitality');
	const south = constraintsFor(north, 'Courtyard and linen, natural light');
	const other = constraintsFor(north, 'Cliff path and stone, natural light');
	other.brief = {
		...other.brief!,
		displayName: 'Southline Inn',
		audience: 'Guests booking a cliff stay',
		offer: 'Reserve a stone room above the path',
		primaryConversion: 'Check the cliff rooms'
	};
	const northCandidates = enumerateVisualDirectionCandidates(south);
	const southCandidates = enumerateVisualDirectionCandidates(other);
	expect(northCandidates).toHaveLength(3);
	expect(southCandidates).toHaveLength(3);
	expect(northCandidates.map((item) => item.heroVariant)).toEqual(
		southCandidates.map((item) => item.heroVariant)
	);
	expect(northCandidates.every((item) => item.heroVariant !== 'hero-split')).toBe(true);
	const northBrief = northCandidates[0]?.experience;
	const southBrief = southCandidates[0]?.experience;
	expect(northBrief?.schemaVersion).toBe(1);
	expect(southBrief?.schemaVersion).toBe(1);
	expect(northBrief?.emotionalPromise).toBe('prestige');
	expect(southBrief?.emotionalPromise).toBe('prestige');
	expect(northBrief?.confidence).toBe('inferred');
	expect(northBrief?.narrative.offer).not.toBe(southBrief?.narrative.offer);
	expect(northBrief?.visualMotifs).toEqual(['Courtyard and linen, natural light']);
	expect(southBrief?.visualMotifs).toEqual(['Cliff path and stone, natural light']);
	expect(northBrief?.statements.some((item) => item.kind === 'approved_claim')).toBe(true);
	expect(northBrief?.statements.some((item) => item.kind === 'inferred_tone')).toBe(true);
	expect(northBrief).not.toHaveProperty('clientId');
	expect(JSON.stringify(northCandidates)).not.toContain('Southline Inn');
	expect(JSON.stringify(southCandidates)).not.toContain('Northline House');
	expect(JSON.stringify(northCandidates)).not.toContain(north.prohibitedStatement);
	expect(JSON.stringify(northCandidates)).not.toContain('storageKey');
});

test('creative food and publishing briefs differ without leaving the current grammar', () => {
	const food = ce0Fixture('packaged-food');
	const books = ce0Fixture('childrens-publishing');
	const foodCandidates = enumerateVisualDirectionCandidates(constraintsFor(food));
	const bookCandidates = enumerateVisualDirectionCandidates(constraintsFor(books));
	expect(foodCandidates[0]?.experience?.emotionalPromise).toBe('warmth');
	expect(bookCandidates[0]?.experience?.emotionalPromise).toBe('warmth');
	expect(foodCandidates[0]?.experience?.narrative.offer).toContain('four-bar');
	expect(bookCandidates[0]?.experience?.narrative.offer).toContain('picture book');
	expect(foodCandidates[0]?.experience?.narrative.offer).not.toBe(
		bookCandidates[0]?.experience?.narrative.offer
	);
	expect(JSON.stringify(foodCandidates)).not.toContain(books.knowledge.brand.displayName);
	expect(JSON.stringify(bookCandidates)).not.toContain(food.prohibitedStatement);
	expect(JSON.stringify(foodCandidates)).not.toContain(food.prohibitedStatement);
	for (const fixture of [food, books]) {
		const page = composeLeadPage(fixture.knowledge, { preview: false });
		expect(page.schemaVersion).toBe(1);
		expect(page.sections.map((section) => section.type)).toEqual(
			composeLeadPage(CE0_FIXTURES[1]!.knowledge, { preview: false }).sections.map(
				(section) => section.type
			)
		);
	}
});

test('prohibited claims, unsafe text, and unknown experience fields fail closed', () => {
	const food = ce0Fixture('packaged-food');
	const constraints = constraintsFor(food);
	constraints.brief = {
		...constraints.brief!,
		approvedClaims: [food.prohibitedStatement, 'Bars are made in small batches.'],
		photographyDirection: 'neon lobby glow'
	};
	const derived = deriveCreativeExperienceBrief(constraints, 'editorial');
	expect(derived?.visualMotifs).toEqual([]);
	expect(JSON.stringify(derived)).not.toContain(food.prohibitedStatement);
	expect(derived?.statements.some((item) => item.text === 'Bars are made in small batches.')).toBe(
		true
	);
	expect(derived?.unknowns).toContain('No confirmed photography direction is on file.');

	const unsafe = constraintsFor(food);
	unsafe.brief = { ...unsafe.brief!, audience: '<script>alert(1)</script>' };
	expect(deriveCreativeExperienceBrief(unsafe, 'editorial')).toBeNull();
	const candidates = enumerateVisualDirectionCandidates(unsafe);
	expect(candidates.every((item) => item.experience === undefined)).toBe(true);
	expect(JSON.stringify(candidates)).not.toContain('<script>');

	expect(
		creativeExperienceBriefSchema.safeParse({
			...derived,
			clientId: crypto.randomUUID(),
			motionPreset: 'cinematic'
		}).success
	).toBe(false);
	expect(
		visualDirectionManifestSchema.safeParse({
			...candidates[0],
			artDirection: 'cinematic'
		}).success
	).toBe(false);

	const poisoned = enumerateVisualDirectionCandidates(constraintsFor(food)).map((item) => ({
		...item,
		rationale: `Doctors recommend this bar. ${item.rationale}`.slice(0, 400)
	}));
	const accepted = acceptVisualDirectionProposal(poisoned, constraintsFor(food));
	expect(accepted.ok).toBe(false);
	expect(accepted.source).toBe('deterministic');
	expect(JSON.stringify(accepted.candidates)).not.toContain(food.prohibitedStatement);
});

test('missing TenantContext cannot read a direction that now carries a brief', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(
		listVisualDirectionsForVersionForTenant(null as never, crypto.randomUUID())
	).rejects.toBeInstanceOf(TenantContextError);
});

test('compose stores the brief on this tenant direction and not on the other tenant', async () => {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.16.10'
	);
	async function clientNamed(name: string, offer: string) {
		const created = await createClient(
			session,
			{ name, slug: `ce1-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
			'ce1-create'
		);
		await switchActiveClient(session, session.token, created.id, 'ce1-switch');
		const actor = await resolveSession(session.token);
		if (!actor) throw new Error('session missing');
		const ctx = contextFor(actor, 'ce1-ctx');
		await saveBrand(
			actor,
			ctx,
			{
				displayName: name,
				audience: `Buyers considering ${name}`,
				offer,
				primaryConversion: 'Request a walkthrough',
				brandPersonality: 'premium',
				tokens: { accent: '#111111' }
			},
			'ce1-brand'
		);
		await addService(
			actor,
			ctx,
			{
				name: 'Walkthrough',
				slug: `walk-${crypto.randomUUID().slice(0, 8)}`,
				outcome: 'A clear next step',
				summary: 'One meeting about the confirmed offer.'
			},
			'ce1-service'
		);
		return { actor, ctx, created };
	}
	const north = await clientNamed('CE1 Northline House', 'Reserve a harbor room');
	const south = await clientNamed('CE1 Southline Inn', 'Reserve a cliff room');
	const northDraft = await composeFunnel(north.actor, north.ctx, 'ce1-north');
	const southDraft = await composeFunnel(south.actor, south.ctx, 'ce1-south');
	const northRows = await listVisualDirectionsForVersionForTenant(north.ctx, northDraft.draft.id);
	const southRows = await listVisualDirectionsForVersionForTenant(south.ctx, southDraft.draft.id);
	expect(northRows).toHaveLength(3);
	expect(southRows).toHaveLength(3);
	expect(northRows.every((row) => row.direction.clientId === north.created.id)).toBe(true);
	expect(JSON.stringify(northRows)).toContain('Reserve a harbor room');
	expect(JSON.stringify(northRows)).not.toContain('CE1 Southline Inn');
	expect(JSON.stringify(northRows)).not.toContain('Reserve a cliff room');
	expect(JSON.stringify(southRows)).not.toContain('CE1 Northline House');
	expect(northDraft.draft.document.schemaVersion).toBe(1);
	expect(await listVisualDirectionsForVersionForTenant(north.ctx, southDraft.draft.id)).toEqual([]);
	const [stored] = await db.select().from(clients).where(eq(clients.id, north.created.id)).limit(1);
	expect(stored?.id).toBe(north.created.id);
	const experience = northRows[0]?.direction.manifest as {
		experience?: { schemaVersion?: number };
	};
	expect(experience.experience?.schemaVersion).toBe(1);
});
