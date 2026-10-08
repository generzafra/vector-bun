import { expect, test } from 'bun:test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { env } from '@vector/config';
import { NotFoundError, TenantContextError, ValidationError } from '@vector/contracts';
import {
	getCreativeAssetForTenant,
	insertCreativeAssetForTenant,
	insertVideoGenerationJobForTenant
} from '@vector/db';
import {
	contextFor,
	draftShortVideo,
	listVideoJobs,
	login,
	resolveSession,
	switchActiveClient
} from '@vector/domain';
import { MEMORY_PNG_1X1 } from '@vector/images';
import { buildStorageKey, storageProvider } from '@vector/storage';
import {
	DisabledVideoProvider,
	MEMORY_MP4,
	MemoryVideoProvider,
	resetVideoProvider,
	setVideoProvider
} from '@vector/video';
import { createTestClient as createClient } from './support/tenant-cleanup';

const root = join(import.meta.dir, '..');

test('video drafts stay off the text model and off publication', async () => {
	const ai = readFileSync(join(root, 'packages/ai/src/types.ts'), 'utf8');
	const domain = readFileSync(join(root, 'packages/domain/src/video.ts'), 'utf8');
	expect(ai).not.toContain('generateVideo');
	expect(domain).not.toContain('@vector/social');
	expect(domain).toContain('does not publish');
	const provider = new MemoryVideoProvider();
	const draft = await provider.generate({
		clientId: '00000000-0000-4000-8000-000000000001',
		requestId: 'c9',
		idempotencyKey: 'c9-memory',
		prompt: 'A quiet courtyard at dusk',
		durationSeconds: 6
	});
	expect(draft.contentType).toBe('video/mp4');
	expect(draft.bytes[4]).toBe(MEMORY_MP4[4]);
	expect(draft.durationSeconds).toBe(6);
	const paused = new DisabledVideoProvider();
	try {
		await paused.generate({
			clientId: '00000000-0000-4000-8000-000000000001',
			requestId: 'c9',
			idempotencyKey: 'c9-paused',
			prompt: 'A quiet courtyard at dusk',
			durationSeconds: 6
		});
		throw new Error('expected a paused provider');
	} catch (error) {
		expect(error).toBeInstanceOf(Error);
		expect((error as Error).message).toContain('paused');
	}
	expect((await paused.health()).ok).toBe(false);
});

test(
	'a short video draft is tenant scoped, unapproved, and replayed',
	async () => {
		const provider = new MemoryVideoProvider();
		setVideoProvider(provider);
		try {
			const { session } = await login(
				{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
				'10.0.27.10'
			);
			const north = await createClient(
				session,
				{
					name: 'C9 Northline House',
					slug: `c9n-${crypto.randomUUID().slice(0, 8)}`,
					timezone: 'UTC'
				},
				'c9-north'
			);
			const south = await createClient(
				session,
				{
					name: 'C9 Southline Inn',
					slug: `c9s-${crypto.randomUUID().slice(0, 8)}`,
					timezone: 'UTC'
				},
				'c9-south'
			);
			await switchActiveClient(session, session.token, north.id, 'c9-switch');
			const actor = await resolveSession(session.token);
			if (!actor) throw new Error('session missing');
			const ctx = contextFor(actor, 'c9-ctx');
			const key = `c9-${crypto.randomUUID().slice(0, 8)}`;
			const drafted = await draftShortVideo(
				actor,
				ctx,
				{
					title: 'Courtyard dusk',
					brief: 'A quiet courtyard at dusk',
					durationSeconds: 6,
					mode: 'generate',
					idempotencyKey: key
				},
				'c9-draft'
			);
			expect(drafted.replayed).toBe(false);
			expect(drafted.asset?.status).toBe('draft');
			expect(drafted.asset?.kind).toBe('video');
			expect(drafted.asset?.rightsStatus).toBe('unknown');
			expect(JSON.stringify(drafted)).not.toContain('storageKey');
			expect(JSON.stringify(drafted)).not.toContain('C9 Southline Inn');
			const again = await draftShortVideo(
				actor,
				ctx,
				{
					title: 'Courtyard dusk',
					brief: 'A quiet courtyard at dusk',
					durationSeconds: 6,
					mode: 'generate',
					idempotencyKey: key
				},
				'c9-replay'
			);
			expect(again.replayed).toBe(true);
			expect(again.job.creativeAssetId).toBe(drafted.asset?.id);
			expect(provider.generateRequests).toHaveLength(1);

			try {
				await draftShortVideo(
					actor,
					ctx,
					{
						title: 'Logo film',
						brief: 'Replace the logo on the door',
						durationSeconds: 4,
						idempotencyKey: `c9-logo-${crypto.randomUUID().slice(0, 8)}`
					},
					'c9-logo'
				);
				throw new Error('expected a validation error');
			} catch (error) {
				expect(error).toBeInstanceOf(ValidationError);
			}
			expect(provider.generateRequests).toHaveLength(1);

			await switchActiveClient(session, session.token, south.id, 'c9-south-switch');
			const southActor = await resolveSession(session.token);
			if (!southActor) throw new Error('session missing');
			const southCtx = contextFor(southActor, 'c9-south');
			const southKey = buildStorageKey(southCtx.clientId, 'generated', 'video', 'still.png');
			await storageProvider().putObject({
				clientId: southCtx.clientId,
				key: southKey,
				bytes: MEMORY_PNG_1X1,
				contentType: 'image/png'
			});
			const southImage = await insertCreativeAssetForTenant(southCtx, {
				title: 'South still',
				kind: 'image',
				storageKey: southKey,
				originalFilename: 'still.png',
				mimeType: 'image/png',
				sizeBytes: MEMORY_PNG_1X1.byteLength,
				checksum: 'c9-south',
				sourceType: 'operator_upload'
			});
			await switchActiveClient(session, session.token, north.id, 'c9-back');
			const northActor = await resolveSession(session.token);
			if (!northActor) throw new Error('session missing');
			const northCtx = contextFor(northActor, 'c9-back');
			try {
				await draftShortVideo(
					northActor,
					northCtx,
					{
						title: 'Borrowed still',
						brief: 'Animate the courtyard still',
						mode: 'image_to_video',
						sourceAssetId: southImage.asset.id,
						idempotencyKey: `c9-cross-${crypto.randomUUID().slice(0, 8)}`
					},
					'c9-cross'
				);
				throw new Error('expected a missing asset');
			} catch (error) {
				expect(error).toBeInstanceOf(NotFoundError);
			}
			const northKey = buildStorageKey(northCtx.clientId, 'generated', 'video', 'still.png');
			await storageProvider().putObject({
				clientId: northCtx.clientId,
				key: northKey,
				bytes: MEMORY_PNG_1X1,
				contentType: 'image/png'
			});
			const northImage = await insertCreativeAssetForTenant(northCtx, {
				title: 'North still',
				kind: 'image',
				storageKey: northKey,
				originalFilename: 'still.png',
				mimeType: 'image/png',
				sizeBytes: MEMORY_PNG_1X1.byteLength,
				checksum: 'c9-north',
				sourceType: 'operator_upload'
			});
			const animated = await draftShortVideo(
				northActor,
				northCtx,
				{
					title: 'Animate the still',
					brief: 'Move the courtyard light slowly',
					mode: 'image_to_video',
					sourceAssetId: northImage.asset.id,
					idempotencyKey: `c9-i2v-${crypto.randomUUID().slice(0, 8)}`
				},
				'c9-i2v'
			);
			expect(animated.job.mode).toBe('image_to_video');
			expect(animated.asset?.status).toBe('draft');
			expect(provider.imageToVideoRequests).toHaveLength(1);

			expect(await getCreativeAssetForTenant(southCtx, drafted.asset!.id)).toBeNull();
			const southJobs = await listVideoJobs(southActor, southCtx);
			expect(southJobs.some((job) => job.title === 'Courtyard dusk')).toBe(false);

			try {
				await insertVideoGenerationJobForTenant(undefined as never, {
					status: 'denied',
					mode: 'generate',
					title: 'Missing',
					promptText: 'A quiet courtyard at dusk',
					promptVersion: 'video.short.v1',
					schemaVersion: 'video.generation.v1',
					durationSeconds: 6,
					adapter: 'memory',
					model: 'memory-video-v1',
					idempotencyKey: 'c9-missing-tenant'
				});
				throw new Error('expected a tenant error');
			} catch (error) {
				expect(error).toBeInstanceOf(TenantContextError);
			}
		} finally {
			resetVideoProvider();
		}
	},
	{ timeout: 20_000 }
);
