import { requireCapability } from '@vector/auth';
import { env } from '@vector/config';
import {
	ForbiddenError,
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	promptHitsProhibitedStyle,
	promptRequestsInventedProof,
	resolvedProhibitedStyles,
	type TenantContext
} from '@vector/contracts';
import {
	decideCreativeQaReviewForTenant,
	getBrandVisualProfileForTenant,
	getCreativeAssetForTenant,
	getCreativeAssetRightsForTenant,
	getCreativeAssetVersionForTenant,
	getCreativeQaReviewForVersionForTenant,
	getFirstRevealGateForVersionForTenant,
	getLatestDraftForTenant,
	getPreviewDomainForTenant,
	listImageJobsForDirectionForTenant,
	listVisualDirectionsForVersionForTenant,
	upsertCreativeQaReviewForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { previewOrigin } from '@vector/funnel-engine';

const MAX_ASSET_BYTES = 8_000_000;

function hasAny(actor: Actor, capabilities: string[]) {
	if (!capabilities.some((capability) => actor.permissions.includes(capability))) {
		throw new ForbiddenError();
	}
}

export function evaluateCreativeQaChecks(input: {
	altText: string;
	title: string;
	rightsStatus: string | null;
	sizeBytes: number | null;
	prohibited: readonly string[];
	hasAsset: boolean;
}) {
	const alt = input.altText.trim();
	const prohibited = promptHitsProhibitedStyle(`${input.title} ${alt}`, input.prohibited);
	const invented = promptRequestsInventedProof(`${input.title} ${alt}`);
	const checks = [
		{
			key: 'rights',
			passed:
				!input.hasAsset ||
				input.rightsStatus === 'client_owned' ||
				input.rightsStatus === 'client_approved',
			detail: !input.hasAsset
				? 'No generated photo is attached.'
				: input.rightsStatus === 'client_owned' || input.rightsStatus === 'client_approved'
					? 'Rights are confirmed.'
					: 'Rights are not confirmed.'
		},
		{
			key: 'size',
			passed:
				!input.hasAsset ||
				(input.sizeBytes !== null && input.sizeBytes > 0 && input.sizeBytes <= MAX_ASSET_BYTES),
			detail: !input.hasAsset
				? 'Size applies when a photo is attached.'
				: input.sizeBytes !== null && input.sizeBytes > 0 && input.sizeBytes <= MAX_ASSET_BYTES
					? 'File size is within the limit.'
					: 'File size is missing or too large.'
		},
		{
			key: 'alt_text',
			passed: !input.hasAsset || (alt.length >= 8 && alt.length <= 160),
			detail: !input.hasAsset
				? 'Alt text applies when a photo is attached.'
				: alt.length >= 8
					? 'Alt text is present.'
					: 'Describe the photo in plain language.'
		},
		{
			key: 'prohibited_style',
			passed: !prohibited,
			detail: prohibited
				? 'That visual style is blocked for this client.'
				: 'No blocked visual style.'
		},
		{
			key: 'invented_proof',
			passed: !invented,
			detail: invented ? 'The description invents proof.' : 'No invented proof in the description.'
		}
	];
	return checks;
}

function publicReview(row: {
	pageVersionId: string;
	passed: boolean;
	status: string;
	summary: string;
	altText: string | null;
	revisionNote: string | null;
	checks: { key: string; passed: boolean; detail: string }[];
}) {
	return {
		pageVersionId: row.pageVersionId,
		passed: row.passed,
		status: row.status,
		summary: row.summary,
		altText: row.altText,
		revisionNote: row.revisionNote,
		checks: row.checks
	};
}

export async function runCreativeQa(
	actor: Actor,
	ctx: TenantContext,
	input: { altText?: string },
	requestId: string
) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const draft = await getLatestDraftForTenant(required);
	if (!draft) throw new NotFoundError('Draft funnel not found');
	const gate = await getFirstRevealGateForVersionForTenant(required, draft.id);
	const ready = Boolean(gate?.passed || gate?.overrideReason);
	const directions = await listVisualDirectionsForVersionForTenant(required, draft.id);
	const selected = directions.find((row) => row.direction.status === 'selected');
	const profile = await getBrandVisualProfileForTenant(required);
	const altText = input.altText?.trim() ?? '';
	let assetId: string | null = null;
	let rightsStatus: string | null = null;
	let sizeBytes: number | null = null;
	let title = selected?.direction.name ?? draft.document.identity.displayName;
	if (selected) {
		const jobs = await listImageJobsForDirectionForTenant(required, selected.direction.id);
		const job = jobs.find((row) => row.status === 'succeeded' && row.creativeAssetId);
		if (job?.creativeAssetId) {
			assetId = job.creativeAssetId;
			const asset = await getCreativeAssetForTenant(required, assetId);
			const rights = await getCreativeAssetRightsForTenant(required, assetId);
			const version = asset
				? await getCreativeAssetVersionForTenant(required, asset.id, asset.currentVersion)
				: null;
			title = asset?.title ?? title;
			rightsStatus = rights?.rightsStatus ?? null;
			sizeBytes = version?.sizeBytes ?? null;
		}
	}
	const checks = evaluateCreativeQaChecks({
		altText,
		title,
		rightsStatus,
		sizeBytes,
		prohibited: resolvedProhibitedStyles(profile?.prohibitedStyles),
		hasAsset: Boolean(assetId)
	});
	if (!ready) {
		checks.push({
			key: 'reveal_gate',
			passed: false,
			detail: 'The first preview check has not passed.'
		});
	}
	const passed = checks.every((item) => item.passed);
	const summary = passed
		? 'This preview is ready for the client to approve or request changes.'
		: 'This preview still needs a fix before the client sees it.';
	const row = await upsertCreativeQaReviewForTenant(required, {
		pageVersionId: draft.id,
		creativeAssetId: assetId,
		checks,
		passed,
		summary,
		altText: altText || null
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'pages.creative_qa.run',
		entityType: 'creative_qa_review',
		entityId: row.id,
		requestId
	});
	return publicReview(row);
}

export async function getClientReveal(actor: Actor, ctx: TenantContext) {
	hasAny(actor, ['pages.read', 'ai.read']);
	const required = assertActorOwnsContext(actor, ctx);
	const draft = await getLatestDraftForTenant(required);
	if (!draft) return { ready: false as const, reason: 'missing' as const };
	const gate = await getFirstRevealGateForVersionForTenant(required, draft.id);
	const review = await getCreativeQaReviewForVersionForTenant(required, draft.id);
	const directions = await listVisualDirectionsForVersionForTenant(required, draft.id);
	const selected = directions.find((row) => row.direction.status === 'selected');
	const effectivePass = Boolean(gate?.passed || gate?.overrideReason);
	if (!effectivePass || !review?.passed) {
		return {
			ready: false as const,
			reason: 'not_ready' as const,
			directionName: selected?.direction.name ?? null
		};
	}
	const domain = await getPreviewDomainForTenant(required);
	const previewUrl =
		domain?.status === 'active' ? previewOrigin(domain.hostname, env.DELIVERY_ORIGIN) : null;
	return {
		ready: true as const,
		directionName: selected?.direction.name ?? 'Your site',
		rationale: selected?.direction.rationale ?? 'This direction leads with your offer.',
		summary: review.summary,
		status: review.status,
		revisionNote: review.revisionNote,
		previewUrl
	};
}

export async function decideClientReveal(
	actor: Actor,
	ctx: TenantContext,
	input: { decision: 'approved' | 'changes_requested'; note?: string },
	requestId: string
) {
	hasAny(actor, ['pages.manage', 'ai.manage']);
	const required = assertActorOwnsContext(actor, ctx);
	const draft = await getLatestDraftForTenant(required);
	if (!draft) throw new NotFoundError('Draft funnel not found');
	const note = input.note?.trim() ?? '';
	if (input.decision === 'changes_requested' && note.length < 8) {
		throw new ValidationError('Say what you want changed');
	}
	const row = await decideCreativeQaReviewForTenant(required, {
		pageVersionId: draft.id,
		status: input.decision,
		revisionNote: input.decision === 'changes_requested' ? note : null,
		decidedBy: actor.userId
	});
	if (!row) throw new ValidationError('This preview is not ready for a decision');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'pages.reveal.decide',
		entityType: 'creative_qa_review',
		entityId: row.id,
		requestId,
		reason: input.decision
	});
	return publicReview(row);
}
