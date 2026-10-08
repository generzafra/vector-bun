import { createHash } from 'node:crypto';
import { consumeRateLimit, requireCapability } from '@vector/auth';
import { env } from '@vector/config';
import {
	NotFoundError,
	ProviderError,
	ValidationError,
	VIDEO_PROMPT_VERSION,
	VIDEO_SCHEMA_VERSION,
	assertActorOwnsContext,
	draftShortVideoSchema,
	parseContract,
	promptHitsProhibitedStyle,
	promptRequestsInventedProof,
	promptRequestsLogo,
	resolvedProhibitedStyles,
	type TenantContext
} from '@vector/contracts';
import {
	ensureAiSettingsForTenant,
	getBrandVisualProfileForTenant,
	getCreativeAssetForTenant,
	getCreativeAssetRightsForTenant,
	getCreativeAssetVersionForTenant,
	getVideoGenerationJobByIdempotencyForTenant,
	insertCreativeAssetForTenant,
	insertVideoGenerationJobForTenant,
	listVideoGenerationJobsForTenant,
	sumSucceededVideoCostMicrosForTenant
} from '@vector/db';
import { buildStorageKey, inspectCreativeUpload, storageProvider } from '@vector/storage';
import { videoProvider } from '@vector/video';
import { logInfo } from '@vector/observability';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { consumeTenantUsage } from './scale';

/** C9 drafts stay unapproved. Video generation is not on AIProvider and does not publish. */

function publicVideoJob(row: {
	id: string;
	title: string;
	mode: string;
	status: string;
	durationSeconds: number;
	denyReason: string | null;
	creativeAssetId: string | null;
}) {
	return {
		id: row.id,
		title: row.title,
		mode: row.mode,
		status: row.status,
		durationSeconds: row.durationSeconds,
		denyReason: row.denyReason,
		creativeAssetId: row.creativeAssetId
	};
}

export async function listVideoJobs(actor: Actor, ctx: TenantContext) {
	requireCapability(actor.permissions, 'ai.read');
	const required = assertActorOwnsContext(actor, ctx);
	const rows = await listVideoGenerationJobsForTenant(required);
	return rows.map(publicVideoJob);
}

export async function draftShortVideo(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`video:${required.clientId}`, 8, 60_000);
	const parsed = parseContract(draftShortVideoSchema, input);
	const idempotencyKey = parsed.idempotencyKey ?? crypto.randomUUID();
	const existing = await getVideoGenerationJobByIdempotencyForTenant(required, idempotencyKey);
	if (existing) return { job: publicVideoJob(existing), asset: null, replayed: true as const };

	const policyHit = promptRequestsLogo(parsed.brief)
		? 'logo'
		: promptRequestsInventedProof(parsed.brief)
			? 'proof'
			: null;
	if (policyHit) {
		await deny(required, parsed, idempotencyKey, actor.userId, requestId, 'policy', policyHit);
	}
	const profile = await getBrandVisualProfileForTenant(required);
	const styleHit = promptHitsProhibitedStyle(
		parsed.brief,
		resolvedProhibitedStyles(profile?.prohibitedStyles)
	);
	if (styleHit) {
		await deny(required, parsed, idempotencyKey, actor.userId, requestId, 'policy', styleHit);
	}

	const settings = await ensureAiSettingsForTenant(required);
	if (env.AI_EXECUTION_PAUSED || env.VIDEO_GENERATION_PAUSED || settings.paused) {
		await deny(required, parsed, idempotencyKey, actor.userId, requestId, 'paused', 'paused');
	}

	const used = await sumSucceededVideoCostMicrosForTenant(required);
	const remaining = env.VIDEO_COST_CEILING_MICROS - used;
	if (remaining < env.VIDEO_COST_PER_VIDEO_MICROS) {
		await deny(required, parsed, idempotencyKey, actor.userId, requestId, 'budget', 'budget');
	}

	let sourceBytes: Uint8Array | null = null;
	let sourceType = '';
	if (parsed.mode === 'image_to_video') {
		const source = await getCreativeAssetForTenant(required, parsed.sourceAssetId ?? '');
		if (!source || (source.kind !== 'image' && source.kind !== 'graphic')) {
			throw new NotFoundError('Creative asset not found');
		}
		const version = await getCreativeAssetVersionForTenant(
			required,
			source.id,
			source.currentVersion
		);
		if (!version) throw new NotFoundError('Creative asset not found');
		const object = await storageProvider().getObject(required.clientId, version.storageKey);
		if (!version.mimeType.startsWith('image/')) {
			throw new ValidationError('Choose an image to animate');
		}
		sourceBytes = object.bytes;
		sourceType = version.mimeType;
	}

	await consumeTenantUsage(
		{ ...required, requestId },
		{ resourceFamily: 'ai', actorId: actor.userId }
	);

	const provider = videoProvider();
	let generated;
	try {
		const request = {
			clientId: required.clientId,
			requestId,
			idempotencyKey,
			prompt: parsed.brief,
			durationSeconds: parsed.durationSeconds,
			promptVersion: VIDEO_PROMPT_VERSION,
			schemaVersion: VIDEO_SCHEMA_VERSION,
			costCeilingMicros: Math.min(remaining, env.VIDEO_COST_CEILING_MICROS)
		};
		generated =
			parsed.mode === 'image_to_video'
				? await provider.imageToVideo({
						...request,
						sourceBytes: sourceBytes ?? new Uint8Array(),
						sourceContentType: sourceType
					})
				: await provider.generate(request);
	} catch (error) {
		const paused = error instanceof ProviderError && error.code === 'VIDEO_GENERATION_PAUSED';
		await insertVideoGenerationJobForTenant(required, {
			status: paused ? 'denied' : 'failed',
			mode: parsed.mode,
			title: parsed.title,
			promptText: parsed.brief,
			promptVersion: VIDEO_PROMPT_VERSION,
			schemaVersion: VIDEO_SCHEMA_VERSION,
			durationSeconds: parsed.durationSeconds,
			adapter: paused ? 'disabled' : 'unknown',
			model: paused ? 'paused' : 'unknown',
			idempotencyKey,
			costMicros: 0,
			denyReason: paused ? 'paused' : null,
			error: error instanceof Error ? error.message.slice(0, 240) : 'Video provider failed',
			sourceAssetId: parsed.sourceAssetId ?? null,
			createdBy: actor.userId
		});
		throw error;
	}

	const inspected = inspectCreativeUpload({
		filename: 'draft.mp4',
		declaredType: generated.contentType,
		bytes: generated.bytes
	});
	const key = buildStorageKey(required.clientId, 'generated', 'video', 'draft.mp4');
	const checksum = createHash('sha256').update(generated.bytes).digest('hex');
	await storageProvider().putObject({
		clientId: required.clientId,
		key,
		bytes: generated.bytes,
		contentType: inspected.mime
	});

	try {
		const created = await insertCreativeAssetForTenant(required, {
			title: parsed.title,
			kind: 'video',
			storageKey: key,
			originalFilename: 'draft.mp4',
			mimeType: inspected.mime,
			sizeBytes: inspected.sizeBytes,
			checksum,
			createdBy: actor.userId,
			sourceType: 'generated'
		});
		const job = await insertVideoGenerationJobForTenant(required, {
			status: 'succeeded',
			mode: parsed.mode,
			title: parsed.title,
			promptText: parsed.brief,
			promptVersion: generated.promptVersion,
			schemaVersion: generated.schemaVersion,
			durationSeconds: generated.durationSeconds,
			adapter: generated.adapter,
			model: generated.model,
			providerRequestId: generated.providerRequestId,
			idempotencyKey,
			costMicros: generated.costMicros,
			storageKey: key,
			creativeAssetId: created.asset.id,
			sourceAssetId: parsed.sourceAssetId ?? null,
			createdBy: actor.userId
		});
		if (!job) throw new Error('video job write failed');
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'ai',
			actorId: actor.userId,
			action: 'video.job.succeeded',
			entityType: 'video_generation_job',
			entityId: job.id,
			requestId,
			reason: parsed.mode
		});
		logInfo('video.job.succeeded', {
			clientId: required.clientId,
			adapter: generated.adapter,
			costMicros: generated.costMicros
		});
		return {
			job: publicVideoJob(job),
			asset: {
				id: created.asset.id,
				status: created.asset.status,
				kind: created.asset.kind,
				rightsStatus: created.rights.rightsStatus
			},
			replayed: false as const
		};
	} catch (error) {
		await storageProvider().deleteObject(required.clientId, key);
		throw error;
	}
}

async function deny(
	ctx: TenantContext,
	parsed: {
		title: string;
		brief: string;
		mode: 'generate' | 'image_to_video';
		durationSeconds: number;
		sourceAssetId?: string;
	},
	idempotencyKey: string,
	actorId: string,
	requestId: string,
	reason: 'policy' | 'paused' | 'budget',
	detail: string
): Promise<never> {
	const message =
		reason === 'paused'
			? 'Video generation is paused'
			: reason === 'budget'
				? 'Video generation budget exceeded for this client'
				: detail === 'logo'
					? 'Vector will not generate or replace the client logo'
					: detail === 'proof'
						? 'Vector will not invent testimonials or proof'
						: 'That visual style is blocked for this client';
	const row = await insertVideoGenerationJobForTenant(ctx, {
		status: 'denied',
		mode: parsed.mode,
		title: parsed.title,
		promptText: parsed.brief,
		promptVersion: VIDEO_PROMPT_VERSION,
		schemaVersion: VIDEO_SCHEMA_VERSION,
		durationSeconds: parsed.durationSeconds,
		adapter: 'disabled',
		model: reason,
		idempotencyKey,
		costMicros: 0,
		denyReason: reason,
		error: message,
		sourceAssetId: parsed.sourceAssetId ?? null,
		createdBy: actorId
	});
	await recordAudit({
		organizationId: ctx.organizationId,
		clientId: ctx.clientId,
		actorType: 'human',
		actorId,
		action: 'video.job.denied',
		entityType: 'video_generation_job',
		entityId: row?.id ?? idempotencyKey,
		requestId,
		reason
	});
	if (reason === 'policy') throw new ValidationError(message);
	throw new ProviderError(
		message,
		reason === 'paused' ? 'VIDEO_GENERATION_PAUSED' : 'VIDEO_BUDGET_DENIED'
	);
}

export async function videoAssetRights(actor: Actor, ctx: TenantContext, assetId: string) {
	requireCapability(actor.permissions, 'ai.read');
	const required = assertActorOwnsContext(actor, ctx);
	const asset = await getCreativeAssetForTenant(required, assetId);
	if (!asset) return null;
	const rights = await getCreativeAssetRightsForTenant(required, asset.id);
	return { status: asset.status, kind: asset.kind, rightsStatus: rights?.rightsStatus ?? null };
}
