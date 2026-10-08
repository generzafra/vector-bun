import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { NotFoundError, TenantContextError, requireTenantContext } from '@vector/contracts';
import {
	creativeAssetVersions,
	db,
	listCreativeDerivativesForTenant,
	updatePageVersionDocumentForTenant
} from '@vector/db';
import {
	addService,
	approveCreativeAsset,
	completeWinnerMedia,
	composeFunnel,
	confirmCreativeRights,
	contextFor,
	getDeliveryHeroImageBytes,
	login,
	placeWinnerPhotography,
	publishFunnel,
	resolveDeliveryPage,
	resolveSession,
	saveBrand,
	switchActiveClient,
	uploadCreativeAsset,
	winnerDerivativesForTenant
} from '@vector/domain';
import {
	composeLeadPage,
	isHeroImagePath,
	pageDocumentSchema,
	placeWinnerMedia,
	winnerAssetGaps,
	WINNER_DERIVATIVE_WIDTHS
} from '@vector/funnel-engine';
import { ce0Fixture } from './fixtures/ce0-industries';
import { createTestClient as createClient } from './support/tenant-cleanup';

const PNG_1X1 = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
	0x42, 0x60, 0x82
]);

test('winner gaps stay typography-led unless an approved photo or a hybrid draft is still open', () => {
	const blocked = winnerAssetGaps({
		mediaStrategy: 'hybrid',
		hasLogo: false,
		approvedHeroAssetId: null,
		generationBlocked: true
	});
	expect(blocked[0]).toEqual({
		slot: 'hero',
		status: 'typography_fallback',
		detail: 'The page stays typography-led.'
	});
	const hybrid = winnerAssetGaps({
		mediaStrategy: 'hybrid',
		hasLogo: true,
		approvedHeroAssetId: null,
		generationBlocked: false
	});
	expect(hybrid[0]?.status).toBe('missing');
	expect(hybrid[1]?.status).toBe('ready');
	const authentic = winnerAssetGaps({
		mediaStrategy: 'authentic',
		hasLogo: false,
		approvedHeroAssetId: null,
		generationBlocked: false
	});
	expect(authentic[0]?.status).toBe('typography_fallback');
	expect(authentic[0]?.detail).toContain('not generated');
	const hospitality = ce0Fixture('luxury-hospitality');
	const food = ce0Fixture('packaged-food');
	const placed = winnerAssetGaps({
		mediaStrategy: 'typography_led',
		hasLogo: false,
		approvedHeroAssetId: '00000000-0000-4000-8000-000000000001',
		generationBlocked: true
	});
	expect(placed[0]?.status).toBe('ready');
	const page = placeWinnerMedia(composeLeadPage(hospitality.knowledge, { preview: true }), {
		kind: 'place',
		assetId: '00000000-0000-4000-8000-000000000001',
		alt: hospitality.knowledge.brand.displayName,
		focalX: 2500,
		focalY: 7500
	});
	const hero = page.sections[0];
	expect(hero && 'mediaAssetId' in hero ? hero.focalX : 0).toBe(2500);
	expect(JSON.stringify(page)).not.toContain(food.knowledge.brand.displayName);
	expect(JSON.stringify(page)).not.toContain('storage');
	const fallback = placeWinnerMedia(page, { kind: 'typography' });
	expect(JSON.stringify(fallback)).not.toContain('mediaAssetId');
	expect(
		fallback.sections[0] && 'mobileTreatment' in fallback.sections[0]
			? fallback.sections[0].mobileTreatment
			: ''
	).toBe('typography_first');
	expect(
		pageDocumentSchema.safeParse({
			...page,
			sections: page.sections.map((section, index) =>
				index === 0 ? { ...section, mediaAssetId: 'clients/other/photo.jpg' } : section
			)
		}).success
	).toBe(false);
	expect(isHeroImagePath('/hero-image')).toBe(true);
	expect(isHeroImagePath('/hero-image/')).toBe(true);
	expect(WINNER_DERIVATIVE_WIDTHS).toEqual([640, 960, 1440]);
});

test('an unknown host does not resolve a hero image', async () => {
	const resolved = await resolveDeliveryPage('not-a-client.example', '/hero-image', 'ce3-host');
	expect(resolved.kind).toBe('unknown_host');
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(
		listCreativeDerivativesForTenant(null as never, crypto.randomUUID())
	).rejects.toBeInstanceOf(TenantContextError);
});

test('an approved photo is placed for this tenant only, and a blocked draft stays typography-led', async () => {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.18.10'
	);
	async function clientNamed(name: string) {
		const created = await createClient(
			session,
			{ name, slug: `ce3-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
			'ce3-create'
		);
		await switchActiveClient(session, session.token, created.id, 'ce3-switch');
		const actor = await resolveSession(session.token);
		if (!actor) throw new Error('session missing');
		const ctx = contextFor(actor, 'ce3-ctx');
		await saveBrand(
			actor,
			ctx,
			{
				displayName: name,
				audience: `Buyers considering ${name}`,
				offer: `A confirmed offer from ${name}`,
				primaryConversion: 'Request a walkthrough',
				brandPersonality: 'premium',
				tokens: { accent: '#111111' }
			},
			'ce3-brand'
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
			'ce3-service'
		);
		const draft = await composeFunnel(actor, ctx, `ce3-compose-${created.id}`);
		return { actor, ctx, created, draft };
	}
	const north = await clientNamed('CE3 Northline House');
	const south = await clientNamed('CE3 Southline Inn');
	const media = await completeWinnerMedia(north.actor, north.ctx, 'ce3-fr6');
	expect(media.generated).toBe(false);
	expect(media.reason).toBe('typography');
	const uploaded = await uploadCreativeAsset(
		north.actor,
		north.ctx,
		{
			title: 'Courtyard at Northline',
			kind: 'image',
			filename: 'courtyard.png',
			declaredType: 'image/png',
			bytes: PNG_1X1
		},
		'ce3-upload'
	);
	const unapproved = await placeWinnerPhotography(
		north.actor,
		north.ctx,
		{ assetId: uploaded.asset.id },
		'ce3-unapproved'
	);
	expect(unapproved.placed).toBe(false);
	expect(JSON.stringify(unapproved.document)).not.toContain('mediaAssetId');
	await confirmCreativeRights(
		north.actor,
		north.ctx,
		{ id: uploaded.asset.id, rightsStatus: 'client_owned' },
		'ce3-rights'
	);
	await approveCreativeAsset(north.actor, north.ctx, { id: uploaded.asset.id }, 'ce3-approve');
	const placed = await placeWinnerPhotography(
		north.actor,
		north.ctx,
		{ assetId: uploaded.asset.id, focalX: 2500, focalY: 7500 },
		'ce3-place'
	);
	expect(placed.placed).toBe(true);
	expect(placed.derivatives.map((row) => row.widthPx).sort((left, right) => left - right)).toEqual([
		640, 960, 1440
	]);
	expect(placed.derivatives.every((row) => row.clientId === north.created.id)).toBe(true);
	expect(placed.derivatives.every((row) => row.status === 'planned')).toBe(true);
	expect(JSON.stringify(placed.derivatives)).not.toContain('storageKey');
	expect(JSON.stringify(placed.document)).toContain('Courtyard at Northline');
	expect(JSON.stringify(placed.document)).not.toContain('CE3 Southline Inn');
	const [version] = await db
		.select()
		.from(creativeAssetVersions)
		.where(eq(creativeAssetVersions.assetId, uploaded.asset.id))
		.limit(1);
	expect(version?.storageKey).toBeTruthy();
	expect(JSON.stringify(placed.document)).not.toContain(version?.storageKey ?? 'missing-key');
	const ownRows = await winnerDerivativesForTenant(north.ctx, north.draft.draft.id);
	expect(ownRows).toHaveLength(3);
	expect(await winnerDerivativesForTenant(south.ctx, north.draft.draft.id)).toEqual([]);
	const stolen = await placeWinnerPhotography(
		south.actor,
		south.ctx,
		{ assetId: uploaded.asset.id, generationBlocked: true },
		'ce3-stolen'
	);
	expect(stolen.placed).toBe(false);
	expect(stolen.gaps[0]?.status).toBe('typography_fallback');
	expect(JSON.stringify(stolen.document)).not.toContain(uploaded.asset.id);
	expect(await listCreativeDerivativesForTenant(south.ctx, south.draft.draft.id)).toEqual([]);
	await updatePageVersionDocumentForTenant(south.ctx, south.draft.draft.id, {
		...stolen.document,
		sections: stolen.document.sections.map((section, index) =>
			index === 0
				? {
						...section,
						mediaAssetId: uploaded.asset.id,
						mediaAlt: 'Courtyard at Northline',
						focalX: 5000,
						focalY: 5000,
						mobileTreatment: 'stack'
					}
				: section
		)
	});
	await publishFunnel(north.actor, north.ctx, 'ce3-publish-north');
	await publishFunnel(south.actor, south.ctx, 'ce3-publish-south');
	const served = await getDeliveryHeroImageBytes(north.ctx);
	expect(served.bytes).toEqual(PNG_1X1);
	expect(served.mimeType).toBe('image/png');
	expect(getDeliveryHeroImageBytes(south.ctx)).rejects.toBeInstanceOf(NotFoundError);
});
