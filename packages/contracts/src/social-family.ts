import { ValidationError } from './errors';
import { SOCIAL_PLATFORMS, type SocialPlatform } from './schemas';

const FAMILY_KEY = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const CHANNELS = new Set<string>(SOCIAL_PLATFORMS);

export type SocialFamilySlotInput = {
	channel: string;
	assetId: string;
};

export type SocialFamilyPreviewSlot = {
	channel: SocialPlatform;
	mode: 'asset' | 'text_only';
	assetId: string | null;
	title: string | null;
	label: string;
};

export function parseSocialFamilyKey(value: unknown) {
	if (
		typeof value !== 'string' ||
		value.length < 2 ||
		value.length > 40 ||
		!FAMILY_KEY.test(value)
	) {
		throw new ValidationError('Use a short family name like spring-launch');
	}
	return value;
}

export function parseSocialFamilySlots(
	value: unknown
): { channel: SocialPlatform; assetId: string }[] {
	if (!Array.isArray(value) || value.length === 0) {
		throw new ValidationError('Choose an approved asset for at least one channel');
	}
	const seen = new Set<string>();
	const slots: { channel: SocialPlatform; assetId: string }[] = [];
	for (const item of value) {
		if (!item || typeof item !== 'object') throw new ValidationError('Choose a listed channel');
		const channel = 'channel' in item ? item.channel : null;
		const assetId = 'assetId' in item ? item.assetId : null;
		if (typeof channel !== 'string' || !CHANNELS.has(channel)) {
			throw new ValidationError('Choose a listed channel');
		}
		if (typeof assetId !== 'string' || assetId.length < 8) {
			throw new ValidationError('Choose an approved asset for at least one channel');
		}
		if (seen.has(channel)) throw new ValidationError('Choose each channel once');
		seen.add(channel);
		slots.push({ channel: channel as SocialPlatform, assetId });
	}
	return slots;
}

export function socialFamilyPreview(input: {
	familyKey: string;
	members: { channel: string; assetId: string; title: string }[];
}): { familyKey: string; slots: SocialFamilyPreviewSlot[] } {
	const byChannel = new Map(input.members.map((member) => [member.channel, member]));
	return {
		familyKey: input.familyKey,
		slots: SOCIAL_PLATFORMS.map((channel) => {
			const member = byChannel.get(channel);
			if (!member) {
				return {
					channel,
					mode: 'text_only' as const,
					assetId: null,
					title: null,
					label: 'Text only until this channel has an approved asset.'
				};
			}
			return {
				channel,
				mode: 'asset' as const,
				assetId: member.assetId,
				title: member.title,
				label: member.title
			};
		})
	};
}

export function socialFamiliesFromAssets(
	assets: {
		id: string;
		title: string;
		status: string;
		familyKey: string | null;
		channel: string | null;
	}[]
) {
	const grouped = new Map<string, { channel: string; assetId: string; title: string }[]>();
	for (const asset of assets) {
		if (!asset.familyKey || !asset.channel || asset.status !== 'approved') continue;
		const members = grouped.get(asset.familyKey) ?? [];
		members.push({ channel: asset.channel, assetId: asset.id, title: asset.title });
		grouped.set(asset.familyKey, members);
	}
	return [...grouped.entries()].map(([familyKey, members]) =>
		socialFamilyPreview({ familyKey, members })
	);
}
