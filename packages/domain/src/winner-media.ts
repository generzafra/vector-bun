import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	type TenantContext
} from '@vector/contracts';
import {
	attachImageJobDirectionForTenant,
	getAssetSufficiencyForVersionForTenant,
	getBrandForTenant,
	getBrandVisualProfileForTenant,
	getLatestDraftForTenant,
	listImageJobsForDirectionForTenant,
	listVisualDirectionsForVersionForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { draftSupportingImage } from './images';

/** FR6 spends one ImageProvider job on the selected direction. Other directions stay cheap. */

function winnerBrief(displayName: string, photography: string) {
	const place = photography.trim() || 'the real workplace';
	return `Supporting photograph for ${displayName}. ${place}. Natural light, no lettering.`;
}

export async function completeWinnerMedia(actor: Actor, ctx: TenantContext, requestId: string) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const draft = await getLatestDraftForTenant(required);
	if (!draft) throw new NotFoundError('Draft funnel not found');
	const directions = await listVisualDirectionsForVersionForTenant(required, draft.id);
	const selected = directions.find((row) => row.direction.status === 'selected');
	if (!selected) throw new ValidationError('Compose a funnel before adding a photo');
	const sufficiency = await getAssetSufficiencyForVersionForTenant(required, draft.id);
	const strategy = sufficiency?.mediaStrategy ?? 'typography_led';
	if (strategy !== 'hybrid') {
		return {
			generated: false as const,
			reason: strategy === 'authentic' ? 'authentic' : 'typography',
			directionName: selected.direction.name,
			job: null
		};
	}
	const brand = await getBrandForTenant(required);
	const profile = await getBrandVisualProfileForTenant(required);
	const brief = winnerBrief(
		brand?.displayName?.trim() || 'this business',
		profile?.photographyDirection ?? ''
	);
	const idempotencyKey = `fr6-${selected.direction.id}`;
	const drafted = await draftSupportingImage(
		actor,
		required,
		{
			title: `${selected.direction.name} photo`,
			brief,
			purpose: 'supporting',
			aspectRatio: '16:9',
			idempotencyKey
		},
		requestId
	);
	await attachImageJobDirectionForTenant(required, drafted.job.id, selected.direction.id);
	const linked = await listImageJobsForDirectionForTenant(required, selected.direction.id);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'pages.winner_media.complete',
		entityType: 'visual_direction',
		entityId: selected.direction.id,
		requestId
	});
	return {
		generated: true as const,
		reason: 'hybrid' as const,
		directionName: selected.direction.name,
		job: drafted.job,
		replayed: drafted.replayed,
		jobCount: linked.length
	};
}

export async function winnerMediaDirectionIds(ctx: TenantContext) {
	const draft = await getLatestDraftForTenant(ctx);
	if (!draft) return [];
	const directions = await listVisualDirectionsForVersionForTenant(ctx, draft.id);
	const ids = [];
	for (const row of directions) {
		const jobs = await listImageJobsForDirectionForTenant(ctx, row.direction.id);
		if (jobs.length > 0) ids.push(row.direction.id);
	}
	return ids;
}
