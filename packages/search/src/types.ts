import type {
	GeoAccuracy,
	GeoCitationKind,
	GeoMeasurementMethod,
	GeoProminence,
	SearchEngine
} from '@vector/contracts';

export type SearchAdapterName = 'memory' | 'google' | 'bing';

export type SearchPropertyHealth = {
	ok: boolean;
	adapter: SearchAdapterName;
	engine: SearchEngine;
	detail: string;
	siteUrl?: string;
};

export type ValidatePropertyInput = {
	clientId: string;
	engine: SearchEngine;
	siteUrl: string;
	credential: string;
};

export type SyncPerformanceInput = ValidatePropertyInput & {
	startDate: string;
	endDate: string;
};

export type SearchQueryRow = {
	query: string;
	pageUrl: string | null;
	clicks: number;
	impressions: number;
	ctrBps: number;
	positionMilli: number;
	date: string;
	country: string | null;
	device: string | null;
};

export type SearchPageRow = {
	url: string;
	clicks: number;
	impressions: number;
	ctrBps: number;
	positionMilli: number;
};

export type SyncPerformanceResult = {
	queries: SearchQueryRow[];
	pages: SearchPageRow[];
};

export type SubmitSitemapInput = ValidatePropertyInput & {
	sitemapUrl: string;
};

export type SubmitSitemapResult = {
	accepted: boolean;
	detail: string;
	sitemapUrl: string;
};

export type MeasureGenerativeVisibilityInput = {
	clientId: string;
	query: string;
	engine: string;
	locale?: string;
	method?: GeoMeasurementMethod;
	mentioned?: boolean;
	ownedCitation?: boolean;
	earnedCitation?: boolean;
	represented?: boolean;
	accurate?: GeoAccuracy;
	prominence?: GeoProminence;
	confidence?: number;
	detail?: string | null;
	retainedAnswer?: string | null;
	citations?: { kind: GeoCitationKind; url?: string | null; domain?: string | null }[];
};

export type UnsupportedGenerativeVisibility = {
	supported: false;
	status: 'unsupported';
	detail: string;
};

export type RecordedGenerativeVisibility = {
	supported: true;
	status: 'recorded';
	method: GeoMeasurementMethod;
	adapter: 'manual';
	mentioned: boolean;
	ownedCitation: boolean;
	earnedCitation: boolean;
	represented: boolean;
	accurate: GeoAccuracy;
	prominence: GeoProminence;
	confidence: number;
	detail: string | null;
	citations: { kind: GeoCitationKind; url?: string | null; domain?: string | null }[];
};

export type GenerativeVisibilityResult =
	UnsupportedGenerativeVisibility | RecordedGenerativeVisibility;

export interface SearchProvider {
	engine: SearchEngine;
	validateProperty(input: ValidatePropertyInput): Promise<SearchPropertyHealth>;
	syncPerformance(input: SyncPerformanceInput): Promise<SyncPerformanceResult>;
	submitSitemap(input: SubmitSitemapInput): Promise<SubmitSitemapResult>;
	measureGenerativeVisibility(
		input: MeasureGenerativeVisibilityInput
	): Promise<GenerativeVisibilityResult>;
}
