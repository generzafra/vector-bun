import type { GeoSurface, SearchReferralChannel } from '@vector/contracts';

export const SEARCH_ATTRIBUTION_MEDIUM_ORGANIC = 'organic';
export const GEO_ATTRIBUTION_MEDIUM = 'generative';
export const SEARCH_ATTRIBUTION_CAMPAIGN = 'vector-search';
export const GEO_ATTRIBUTION_CAMPAIGN = 'vector-geo';

const GEO_SOURCES = new Set(['chatgpt', 'google_ai_overview', 'gemini', 'perplexity', 'other']);
const ORGANIC_SOURCES = new Set(['google', 'bing']);

export function geoAttributionContent(queryId: string) {
	return `query:${queryId}`;
}

export function parseGeoAttributionContent(content: string | null | undefined) {
	const match = content?.trim().match(/^query:([0-9a-f-]{36})$/i);
	return match?.[1] ?? null;
}

export function geoAttributionParams(engine: GeoSurface, queryId: string) {
	return {
		utmSource: engine,
		utmMedium: GEO_ATTRIBUTION_MEDIUM,
		utmCampaign: GEO_ATTRIBUTION_CAMPAIGN,
		utmContent: geoAttributionContent(queryId)
	};
}

export function searchAttributionParams(engine: 'google' | 'bing') {
	return {
		utmSource: engine,
		utmMedium: SEARCH_ATTRIBUTION_MEDIUM_ORGANIC,
		utmCampaign: SEARCH_ATTRIBUTION_CAMPAIGN
	};
}

export function classifySearchReferral(input: {
	source?: string | null;
	medium?: string | null;
	campaign?: string | null;
	content?: string | null;
	utmSource?: string | null;
	utmMedium?: string | null;
	utmCampaign?: string | null;
	utmContent?: string | null;
}): { channel: SearchReferralChannel; engine: string } | null {
	const source = (input.source ?? input.utmSource)?.trim().toLowerCase() ?? '';
	const medium = (input.medium ?? input.utmMedium)?.trim().toLowerCase() ?? '';
	const campaign = (input.campaign ?? input.utmCampaign)?.trim().toLowerCase() ?? '';
	if (
		medium === GEO_ATTRIBUTION_MEDIUM ||
		medium === 'ai' ||
		campaign === GEO_ATTRIBUTION_CAMPAIGN
	) {
		return {
			channel: 'generative',
			engine: GEO_SOURCES.has(source) ? source : 'other'
		};
	}
	if (
		(medium === SEARCH_ATTRIBUTION_MEDIUM_ORGANIC && ORGANIC_SOURCES.has(source)) ||
		campaign === SEARCH_ATTRIBUTION_CAMPAIGN
	) {
		return {
			channel: 'organic_search',
			engine: ORGANIC_SOURCES.has(source) ? source : 'google'
		};
	}
	return null;
}
