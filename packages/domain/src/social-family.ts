import { requireCapability } from '@vector/auth';
import {
	ValidationError,
	assertActorOwnsContext,
	parseSocialFamilyKey,
	parseSocialFamilySlots,
	socialFamilyPreview,
	type TenantContext
} from '@vector/contracts';
import { replaceCreativeFamilyForTenant } from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { resolveAttachableCreativeAsset } from './creative';

export async function assignSocialFamily(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'social.manage');
	const required = assertActorOwnsContext(actor, ctx);
	if (!input || typeof input !== 'object') {
		throw new ValidationError('Choose an approved asset for at least one channel');
	}
	const record = input as { familyKey?: unknown; slots?: unknown };
	const familyKey = parseSocialFamilyKey(record.familyKey);
	const slots = parseSocialFamilySlots(record.slots);
	const resolved = [];
	const seenAssets = new Set<string>();
	for (const slot of slots) {
		if (seenAssets.has(slot.assetId)) throw new ValidationError('Choose each asset once');
		seenAssets.add(slot.assetId);
		const attached = await resolveAttachableCreativeAsset(required, slot.assetId);
		if (attached.asset.familyKey && attached.asset.familyKey !== familyKey) {
			throw new ValidationError('This asset already belongs to a campaign family');
		}
		resolved.push({ asset: attached.asset, channel: slot.channel });
	}
	await replaceCreativeFamilyForTenant(required, {
		familyKey,
		slots: resolved.map((slot) => ({ assetId: slot.asset.id, channel: slot.channel }))
	});
	const preview = socialFamilyPreview({
		familyKey,
		members: resolved.map((slot) => ({
			channel: slot.channel,
			assetId: slot.asset.id,
			title: slot.asset.title
		}))
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'social.family.assign',
		entityType: 'creative_family',
		entityId: familyKey,
		requestId,
		reason: slots.map((slot) => slot.channel).join(',')
	});
	return preview;
}
