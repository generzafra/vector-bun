import { createHash } from 'node:crypto';
import { consumeRateLimit, requireCapability } from '@vector/auth';
import { env } from '@vector/config';
import {
	ForbiddenError,
	ProviderError,
	ValidationError,
	assertActorOwnsContext,
	buildSupportingImagePrompt,
	draftSupportingImageSchema,
	IMAGE_PROMPT_VERSION,
	IMAGE_SCHEMA_VERSION,
	parseContract,
	promptHitsProhibitedStyle,
	promptRequestsInventedProof,
	promptRequestsLogo,
	publicImageDenyLabel,
	resolvedProhibitedStyles,
	type TenantContext
} from '@vector/contracts';
import {
	assertImageJobClient,
	ensureAiSettingsForTenant,
	getBrandForTenant,
	getBrandVisualProfileForTenant,
	getImageGenerationJobByIdempotencyForTenant,
	insertCreativeAssetForTenant,
	insertImageGenerationJobForTenant,
	listImageGenerationJobsForTenant,
	sumSucceededImageCostMicrosForTenant
} from '@vector/db';
import { imageProvider } from '@vector/images';
import { logInfo } from '@vector/observability';
import { buildStorageKey, inspectCreativeUpload, storageProvider } from '@vector/storage';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { consumeTenantUsage } from './scale';

/** C2 authorizes image jobs with ai.read / ai.manage. Image generation stays off AIProvider. */

function publicImageJob(row: {
	id: string;
	title: string;
	purpose: string;
	status: string;
	denyReason: string | null;
	creativeAssetId: string | null;
	createdAt: Date;
}) {
	const denyReason =
		row.denyReason === 'budget' || row.denyReason === 'paused' || row.denyReason === 'policy'
			? row.denyReason
			: null;
	return {
		id: row.id,
		title: row.title,
		purpose: row.purpose,
		status: row.status,
		denyReason,
		denyLabel: publicImageDenyLabel(denyReason),
		creativeAssetId: row.creativeAssetId,
		createdAt: row.createdAt
	};
}

async function denyPolicyJob(
	required: TenantContext,
	input: {
		purpose: string;
		title: string;
		brief: string;
		idempotencyKey: string;
		actorId: string;
		requestId: string;
		policyHit: string;
	}
): Promise<never> {
	const denied = await insertImageGenerationJobForTenant(required, {
		status: 'denied',
		purpose: input.purpose,
		title: input.title,
		promptText: input.brief,
		promptVersion: IMAGE_PROMPT_VERSION,
		schemaVersion: IMAGE_SCHEMA_VERSION,
		adapter: 'disabled',
		model: 'policy',
		idempotencyKey: input.idempotencyKey,
		costMicros: 0,
		denyReason: 'policy',
		error:
			input.policyHit === 'logo'
				? 'Models must not overwrite approved logos'
				: input.policyHit === 'proof'
					? 'Models must not invent testimonials or proof'
					: `Prohibited style: ${input.policyHit}`,
		createdBy: input.actorId
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: input.actorId,
		action: 'image.job.denied',
		entityType: 'image_generation_job',
		entityId: denied.id,
		requestId: input.requestId,
		reason: 'policy'
	});
	throw new ValidationError(
		input.policyHit === 'logo'
			? 'Vector will not generate or replace the client logo'
			: input.policyHit === 'proof'
				? 'Vector will not invent testimonials or proof photos'
				: 'That visual style is blocked for this client'
	);
}

export async function listImageJobs(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'ai.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertImageJobClient(required, clientId);
	const rows = await listImageGenerationJobsForTenant(required);
	return rows.map(publicImageJob);
}

export async function draftSupportingImage(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`image:${required.clientId}`, 8, 60_000);
	const parsed = parseContract(draftSupportingImageSchema, input);
	const idempotencyKey = parsed.idempotencyKey ?? crypto.randomUUID();
	const existing = await getImageGenerationJobByIdempotencyForTenant(required, idempotencyKey);
	if (existing) return { job: publicImageJob(existing), replayed: true as const };

	const title = parsed.title?.trim() || parsed.brief.slice(0, 80);
	const logoOrProof =
		parsed.purpose === 'supporting' && promptRequestsLogo(parsed.brief)
			? 'logo'
			: promptRequestsInventedProof(parsed.brief)
				? 'proof'
				: null;
	if (logoOrProof) {
		await denyPolicyJob(required, {
			purpose: parsed.purpose,
			title,
			brief: parsed.brief,
			idempotencyKey,
			actorId: actor.userId,
			requestId,
			policyHit: logoOrProof
		});
	}

	const brand = await getBrandForTenant(required);
	const profile = await getBrandVisualProfileForTenant(required);
	const settings = await ensureAiSettingsForTenant(required);
	const prohibited = resolvedProhibitedStyles(profile?.prohibitedStyles);
	const prohibitedHit = promptHitsProhibitedStyle(parsed.brief, prohibited);
	if (prohibitedHit) {
		await denyPolicyJob(required, {
			purpose: parsed.purpose,
			title,
			brief: parsed.brief,
			idempotencyKey,
			actorId: actor.userId,
			requestId,
			policyHit: prohibitedHit
		});
	}

	const paused = env.AI_EXECUTION_PAUSED || env.IMAGE_GENERATION_PAUSED || settings.paused;
	if (paused) {
		const denied = await insertImageGenerationJobForTenant(required, {
			status: 'denied',
			purpose: parsed.purpose,
			title,
			promptText: parsed.brief,
			promptVersion: IMAGE_PROMPT_VERSION,
			schemaVersion: IMAGE_SCHEMA_VERSION,
			adapter: 'disabled',
			model: 'paused',
			idempotencyKey,
			costMicros: 0,
			denyReason: 'paused',
			error: 'Image generation is paused',
			createdBy: actor.userId
		});
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'ai',
			actorId: actor.userId,
			action: 'image.job.denied',
			entityType: 'image_generation_job',
			entityId: denied.id,
			requestId,
			reason: 'paused'
		});
		throw new ProviderError('Image generation is paused', 'IMAGE_GENERATION_PAUSED');
	}

	const used = await sumSucceededImageCostMicrosForTenant(required);
	const remaining = env.IMAGE_COST_CEILING_MICROS - used;
	if (remaining < env.IMAGE_COST_PER_IMAGE_MICROS) {
		const denied = await insertImageGenerationJobForTenant(required, {
			status: 'denied',
			purpose: parsed.purpose,
			title,
			promptText: parsed.brief,
			promptVersion: IMAGE_PROMPT_VERSION,
			schemaVersion: IMAGE_SCHEMA_VERSION,
			adapter: 'disabled',
			model: 'budget',
			idempotencyKey,
			costMicros: 0,
			denyReason: 'budget',
			error: 'Per-client image generation budget exceeded',
			createdBy: actor.userId
		});
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'ai',
			actorId: actor.userId,
			action: 'image.job.denied',
			entityType: 'image_generation_job',
			entityId: denied.id,
			requestId,
			reason: 'budget'
		});
		throw new ProviderError(
			'Image generation budget exceeded for this client',
			'IMAGE_BUDGET_DENIED'
		);
	}

	await consumeTenantUsage(
		{ ...required, requestId },
		{ resourceFamily: 'ai', actorId: actor.userId }
	);

	const prompt = buildSupportingImagePrompt({
		brandName: brand?.displayName?.trim() || 'this client',
		photographyDirection: profile?.photographyDirection ?? '',
		prohibitedStyles: prohibited,
		brief: parsed.brief
	});

	let generated;
	try {
		generated = await imageProvider().generate({
			clientId: required.clientId,
			requestId,
			idempotencyKey,
			prompt,
			purpose: parsed.purpose,
			promptVersion: IMAGE_PROMPT_VERSION,
			schemaVersion: IMAGE_SCHEMA_VERSION,
			aspectRatio: parsed.aspectRatio,
			costCeilingMicros: Math.min(remaining, env.IMAGE_COST_CEILING_MICROS)
		});
	} catch (error) {
		const pausedByProvider =
			error instanceof ProviderError && error.code === 'IMAGE_GENERATION_PAUSED';
		const failed = await insertImageGenerationJobForTenant(required, {
			status: pausedByProvider ? 'denied' : 'failed',
			purpose: parsed.purpose,
			title,
			promptText: prompt,
			promptVersion: IMAGE_PROMPT_VERSION,
			schemaVersion: IMAGE_SCHEMA_VERSION,
			adapter: pausedByProvider ? 'disabled' : 'unknown',
			model: pausedByProvider ? 'paused' : 'unknown',
			idempotencyKey,
			costMicros: 0,
			denyReason: pausedByProvider ? 'paused' : null,
			error: error instanceof Error ? error.message.slice(0, 240) : 'Image provider failed',
			createdBy: actor.userId
		});
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'ai',
			actorId: actor.userId,
			action: pausedByProvider ? 'image.job.denied' : 'image.job.failed',
			entityType: 'image_generation_job',
			entityId: failed.id,
			requestId,
			reason: pausedByProvider ? 'paused' : 'provider'
		});
		throw error;
	}

	const filename =
		generated.contentType === 'image/jpeg'
			? 'draft.jpg'
			: generated.contentType === 'image/webp'
				? 'draft.webp'
				: 'draft.png';
	const inspected = inspectCreativeUpload({
		filename,
		declaredType: generated.contentType,
		bytes: generated.bytes
	});
	const key = buildStorageKey(required.clientId, 'generated', parsed.purpose, filename);
	if (!key.startsWith(`clients/${required.clientId}/generated/`)) {
		throw new ForbiddenError('Storage key is not authorized for this tenant');
	}
	const checksum = createHash('sha256').update(generated.bytes).digest('hex');
	await storageProvider().putObject({
		clientId: required.clientId,
		key,
		bytes: generated.bytes,
		contentType: inspected.mime
	});

	try {
		const created = await insertCreativeAssetForTenant(required, {
			title,
			kind: 'image',
			storageKey: key,
			originalFilename: filename,
			mimeType: inspected.mime,
			sizeBytes: inspected.sizeBytes,
			checksum,
			createdBy: actor.userId,
			sourceType: 'generated'
		});
		const job = await insertImageGenerationJobForTenant(required, {
			status: 'succeeded',
			purpose: parsed.purpose,
			title,
			promptText: prompt,
			promptVersion: generated.promptVersion,
			schemaVersion: generated.schemaVersion,
			adapter: generated.adapter,
			model: generated.model,
			providerRequestId: generated.providerRequestId,
			idempotencyKey,
			costMicros: generated.costMicros,
			storageKey: key,
			creativeAssetId: created.asset.id,
			createdBy: actor.userId
		});
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'ai',
			actorId: actor.userId,
			action: 'image.job.succeeded',
			entityType: 'image_generation_job',
			entityId: job.id,
			requestId,
			reason: parsed.purpose
		});
		logInfo('image.job.succeeded', {
			clientId: required.clientId,
			adapter: generated.adapter,
			costMicros: generated.costMicros
		});
		return {
			job: publicImageJob(job),
			asset: {
				id: created.asset.id,
				status: created.asset.status,
				sourceType: created.asset.sourceType,
				rightsStatus: created.rights.rightsStatus
			},
			replayed: false as const
		};
	} catch (error) {
		await storageProvider().deleteObject(required.clientId, key);
		throw error;
	}
}
