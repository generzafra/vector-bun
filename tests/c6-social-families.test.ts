import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import {
	NotFoundError,
	TenantContextError,
	ValidationError,
	type TenantContext
} from '@vector/contracts';
import {
	getCreativeAssetForTenant,
	getCreativeAssetVersionForTenant,
	replaceCreativeFamilyForTenant
} from '@vector/db';
import {
	approveCreativeAsset,
	assignSocialFamily,
	confirmCreativeRights,
	contextFor,
	createSocialPost,
	getSocialOverview,
	login,
	resolveSession,
	switchActiveClient,
	uploadCreativeAsset
} from '@vector/domain';
import { createTestClient as createClient } from './support/tenant-cleanup';

const root = join(import.meta.dir, '..');
const PNG_1X1 = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
	0x42, 0x60, 0x82
]);

test('the social page previews a family and keeps text-only posts', () => {
	const page = readFileSync(join(root, 'apps/control/src/routes/social/+page.svelte'), 'utf8');
	const source = readFileSync(join(root, 'packages/contracts/src/social-family.ts'), 'utf8');
	expect(page).toContain('Text only');
	expect(page).toContain('Save family');
	expect(page).toContain('does not publish');
	expect(source).not.toContain('storageKey');
});

test(
	'a campaign family stays on this tenant and does not publish',
	async () => {
		const { session } = await login(
			{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
			'10.0.22.10'
		);
		async function clientNamed(name: string) {
			const created = await createClient(
				session,
				{ name, slug: `c6s-${crypto.randomUUID().slice(0, 8)}`, timezone: 'UTC' },
				'c6-create'
			);
			await switchActiveClient(session, session.token, created.id, 'c6-switch');
			const actor = await resolveSession(session.token);
			if (!actor) throw new Error('session missing');
			return { actor, ctx: contextFor(actor, 'c6-ctx') };
		}
		async function approvedImage(
			actor: Awaited<ReturnType<typeof clientNamed>>['actor'],
			ctx: TenantContext,
			title: string
		) {
			const uploaded = await uploadCreativeAsset(
				actor,
				ctx,
				{ title, kind: 'image', filename: 'social.png', declaredType: 'image/png', bytes: PNG_1X1 },
				`c6-upload-${title}`
			);
			await confirmCreativeRights(
				actor,
				ctx,
				{ id: uploaded.asset.id, rightsStatus: 'client_owned' },
				`c6-rights-${title}`
			);
			await approveCreativeAsset(actor, ctx, { id: uploaded.asset.id }, `c6-approve-${title}`);
			return uploaded;
		}
		const north = await clientNamed('C6 Northline House');
		const south = await clientNamed('C6 Southline Inn');
		const courtyard = await approvedImage(north.actor, north.ctx, 'Courtyard');
		const lobby = await approvedImage(north.actor, north.ctx, 'Lobby');
		const draft = await uploadCreativeAsset(
			north.actor,
			north.ctx,
			{
				title: 'Unapproved',
				kind: 'image',
				filename: 'social.png',
				declaredType: 'image/png',
				bytes: PNG_1X1
			},
			'c6-draft'
		);
		let badKey: unknown;
		try {
			await assignSocialFamily(
				north.actor,
				north.ctx,
				{
					familyKey: 'Spring Launch',
					slots: [{ channel: 'linkedin', assetId: courtyard.asset.id }]
				},
				'c6-bad-key'
			);
		} catch (error) {
			badKey = error;
		}
		expect(badKey).toBeInstanceOf(ValidationError);
		let draftError: unknown;
		try {
			await assignSocialFamily(
				north.actor,
				north.ctx,
				{ familyKey: 'spring-launch', slots: [{ channel: 'linkedin', assetId: draft.asset.id }] },
				'c6-draft-slot'
			);
		} catch (error) {
			draftError = error;
		}
		expect(draftError).toBeInstanceOf(ValidationError);
		let crossError: unknown;
		try {
			await assignSocialFamily(
				south.actor,
				south.ctx,
				{
					familyKey: 'spring-launch',
					slots: [{ channel: 'linkedin', assetId: courtyard.asset.id }]
				},
				'c6-cross'
			);
		} catch (error) {
			crossError = error;
		}
		expect(crossError).toBeInstanceOf(NotFoundError);

		const preview = await assignSocialFamily(
			north.actor,
			north.ctx,
			{
				familyKey: 'spring-launch',
				slots: [
					{ channel: 'linkedin', assetId: courtyard.asset.id },
					{ channel: 'facebook', assetId: lobby.asset.id }
				]
			},
			'c6-assign'
		);
		expect(preview.slots.find((slot) => slot.channel === 'linkedin')?.label).toBe('Courtyard');
		expect(preview.slots.find((slot) => slot.channel === 'x')?.mode).toBe('text_only');
		expect(JSON.stringify(preview)).not.toContain('storageKey');
		const version = await getCreativeAssetVersionForTenant(
			north.ctx,
			courtyard.asset.id,
			courtyard.asset.currentVersion
		);
		expect(version?.storageKey).toBeTruthy();
		expect(JSON.stringify(preview)).not.toContain(version?.storageKey ?? 'missing-key');
		expect(JSON.stringify(preview)).not.toContain('C6 Southline Inn');

		let secondFamily: unknown;
		try {
			await assignSocialFamily(
				north.actor,
				north.ctx,
				{
					familyKey: 'fall-launch',
					slots: [{ channel: 'x', assetId: courtyard.asset.id }]
				},
				'c6-second-family'
			);
		} catch (error) {
			secondFamily = error;
		}
		expect(secondFamily).toBeInstanceOf(ValidationError);

		const narrowed = await assignSocialFamily(
			north.actor,
			north.ctx,
			{
				familyKey: 'spring-launch',
				slots: [{ channel: 'linkedin', assetId: courtyard.asset.id }]
			},
			'c6-narrow'
		);
		expect(narrowed.slots.find((slot) => slot.channel === 'facebook')?.mode).toBe('text_only');
		expect((await getCreativeAssetForTenant(north.ctx, lobby.asset.id))?.familyKey).toBeNull();

		const northOverview = await getSocialOverview(north.actor, north.ctx);
		expect(northOverview.families.map((family) => family.familyKey)).toEqual(['spring-launch']);
		const southOverview = await getSocialOverview(south.actor, south.ctx);
		expect(southOverview.families).toEqual([]);
		expect(JSON.stringify(southOverview.families)).not.toContain('Courtyard');

		const post = await createSocialPost(
			north.actor,
			north.ctx,
			{ body: 'A text-only note about the courtyard.', status: 'draft' },
			'c6-text'
		);
		expect(post.assetId).toBeNull();
		expect(post.body).toBe('A text-only note about the courtyard.');
		let missingTenant: unknown;
		try {
			await replaceCreativeFamilyForTenant(null as unknown as TenantContext, {
				familyKey: 'spring-launch',
				slots: []
			});
		} catch (error) {
			missingTenant = error;
		}
		expect(missingTenant).toBeInstanceOf(TenantContextError);
	},
	{ timeout: 20_000 }
);
