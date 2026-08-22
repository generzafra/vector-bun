export type AttributionChannel = 'direct' | 'referral' | 'campaign';

export type TouchInput = {
	utmSource?: string | null;
	utmMedium?: string | null;
	utmCampaign?: string | null;
	utmTerm?: string | null;
	utmContent?: string | null;
	referrer?: string | null;
	landingUrl?: string | null;
	hostname?: string | null;
};

export type Touch = {
	channel: AttributionChannel;
	source: string | null;
	medium: string | null;
	campaign: string | null;
	term: string | null;
	content: string | null;
	referrer: string | null;
	landingUrl: string | null;
	isDirect: boolean;
};

function clean(value: string | null | undefined) {
	const trimmed = value?.trim();
	return trimmed ? trimmed : null;
}

function hostOf(value: string | null | undefined) {
	if (!value) return null;
	try {
		return new URL(value.includes('://') ? value : `https://${value}`).hostname.toLowerCase();
	} catch {
		return null;
	}
}

export function classifyTouch(input: TouchInput): Touch {
	const source = clean(input.utmSource);
	const medium = clean(input.utmMedium);
	const campaign = clean(input.utmCampaign);
	const term = clean(input.utmTerm);
	const content = clean(input.utmContent);
	const referrer = clean(input.referrer);
	const landingUrl = clean(input.landingUrl);
	const pageHost = hostOf(input.hostname) ?? hostOf(landingUrl);
	const referrerHost = hostOf(referrer);
	const sameHost = Boolean(pageHost && referrerHost && pageHost === referrerHost);
	const hasCampaign = Boolean(source || medium || campaign);
	const hasExternalReferrer = Boolean(referrerHost && !sameHost);
	const isDirect = !hasCampaign && !hasExternalReferrer;
	const channel: AttributionChannel = hasCampaign
		? 'campaign'
		: hasExternalReferrer
			? 'referral'
			: 'direct';
	return {
		channel,
		source,
		medium,
		campaign,
		term,
		content,
		referrer: sameHost ? null : referrer,
		landingUrl,
		isDirect
	};
}

export function resolveAttribution(touches: Touch[]) {
	if (touches.length === 0) {
		const empty = classifyTouch({});
		return { firstTouch: empty, lastNonDirect: empty };
	}
	const firstTouch = touches[0]!;
	const lastNonDirect = [...touches].reverse().find((touch) => !touch.isDirect) ?? firstTouch;
	return { firstTouch, lastNonDirect };
}

export function leadScoreV1(input: {
	hasPhone: boolean;
	hasCompany: boolean;
	hasMessage: boolean;
	isTest: boolean;
	lastNonDirectIsDirect: boolean;
}) {
	let score = 20;
	if (input.hasPhone) score += 10;
	if (input.hasCompany) score += 5;
	if (input.hasMessage) score += 5;
	if (!input.lastNonDirectIsDirect) score += 10;
	if (!input.isTest) score += 10;
	return score;
}
