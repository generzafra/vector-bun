import { ProviderError } from '@vector/contracts';
import { logError, logInfo } from '@vector/observability';
import { searchFetch, toPositionMilli } from './http';
import { measureGenerativeVisibility as measureGenerativeVisibilityAdapter } from './measurement/geo';
import type {
	GenerativeVisibilityResult,
	MeasureGenerativeVisibilityInput,
	SearchPageRow,
	SearchPropertyHealth,
	SearchProvider,
	SearchQueryRow,
	SubmitSitemapInput,
	SubmitSitemapResult,
	SyncPerformanceInput,
	SyncPerformanceResult,
	ValidatePropertyInput
} from './types';

const BING = 'https://ssl.bing.com/webmaster/api.svc/json';

type BingQueryStat = {
	Query?: string;
	query?: string;
	Clicks?: number;
	clicks?: number;
	Impressions?: number;
	impressions?: number;
	AvgClickPosition?: number;
	position?: number;
};

function bingUrl(method: string, siteUrl: string, extra: Record<string, string> = {}) {
	const url = new URL(`${BING}/${method}`);
	url.searchParams.set('siteUrl', siteUrl);
	for (const [key, value] of Object.entries(extra)) url.searchParams.set(key, value);
	return url;
}

function statQuery(row: BingQueryStat) {
	return (row.Query ?? row.query ?? '').trim();
}

function statClicks(row: BingQueryStat) {
	return Math.max(0, Math.round(row.Clicks ?? row.clicks ?? 0));
}

function statImpressions(row: BingQueryStat) {
	return Math.max(0, Math.round(row.Impressions ?? row.impressions ?? 0));
}

export class BingSearchProvider implements SearchProvider {
	readonly engine = 'bing' as const;

	constructor(private readonly sendHttp: typeof fetch = fetch) {}

	async validateProperty(input: ValidatePropertyInput): Promise<SearchPropertyHealth> {
		if (!input.credential || !input.siteUrl) {
			return {
				ok: false,
				adapter: 'bing',
				engine: this.engine,
				detail: 'Bing Webmaster credential or site URL is missing'
			};
		}
		try {
			const url = bingUrl('GetQueryStats', input.siteUrl);
			url.searchParams.set('apikey', input.credential);
			const response = await searchFetch(this.sendHttp, url.toString(), { method: 'GET' });
			if (!response.ok) {
				return {
					ok: false,
					adapter: 'bing',
					engine: this.engine,
					detail: `Bing Webmaster rejected the property (${response.status})`,
					siteUrl: input.siteUrl
				};
			}
			logInfo('search.bing.validate', { engine: this.engine, ok: true });
			return {
				ok: true,
				adapter: 'bing',
				engine: this.engine,
				detail: 'Bing Webmaster property is valid',
				siteUrl: input.siteUrl
			};
		} catch (error) {
			logError('search.bing.validate', error, { engine: this.engine });
			return {
				ok: false,
				adapter: 'bing',
				engine: this.engine,
				detail: 'Bing Webmaster connection check failed',
				siteUrl: input.siteUrl
			};
		}
	}

	async syncPerformance(input: SyncPerformanceInput): Promise<SyncPerformanceResult> {
		if (!input.credential || !input.siteUrl) {
			throw new ProviderError(
				'Bing Webmaster credential or site URL is missing',
				'PROVIDER_INVALID_PAYLOAD'
			);
		}
		const url = bingUrl('GetQueryStats', input.siteUrl);
		url.searchParams.set('apikey', input.credential);
		const response = await searchFetch(this.sendHttp, url.toString(), { method: 'GET' });
		if (!response.ok) {
			throw new ProviderError(
				`Bing Webmaster sync failed (${response.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		const payload = (await response.json()) as {
			d?: BingQueryStat[];
			QueryStats?: BingQueryStat[];
		};
		const rows = payload.d ?? payload.QueryStats ?? [];
		const queries: SearchQueryRow[] = [];
		const pages: SearchPageRow[] = [];
		for (const row of rows) {
			const query = statQuery(row);
			if (!query) continue;
			const clicks = statClicks(row);
			const impressions = statImpressions(row);
			queries.push({
				query,
				pageUrl: input.siteUrl,
				clicks,
				impressions,
				ctrBps: impressions ? Math.round((clicks * 10_000) / impressions) : 0,
				positionMilli: toPositionMilli(row.AvgClickPosition ?? row.position),
				date: input.endDate,
				country: null,
				device: null
			});
		}
		if (queries.length > 0) {
			pages.push({
				url: input.siteUrl,
				clicks: queries.reduce((sum, row) => sum + row.clicks, 0),
				impressions: queries.reduce((sum, row) => sum + row.impressions, 0),
				ctrBps: 0,
				positionMilli: 0
			});
			const page = pages[0];
			page.ctrBps = page.impressions ? Math.round((page.clicks * 10_000) / page.impressions) : 0;
		}
		logInfo('search.bing.sync', { engine: this.engine, queries: queries.length });
		return { queries, pages };
	}

	async submitSitemap(input: SubmitSitemapInput): Promise<SubmitSitemapResult> {
		if (!input.credential || !input.sitemapUrl) {
			throw new ProviderError('Bing sitemap submit is incomplete', 'PROVIDER_INVALID_PAYLOAD');
		}
		const url = bingUrl('SubmitFeed', input.siteUrl, { feedUrl: input.sitemapUrl });
		url.searchParams.set('apikey', input.credential);
		const response = await searchFetch(this.sendHttp, url.toString(), { method: 'GET' });
		if (!response.ok) {
			throw new ProviderError(
				`Bing sitemap submit failed (${response.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		logInfo('search.bing.sitemap', { engine: this.engine });
		return {
			accepted: true,
			detail: 'Bing Webmaster accepted the sitemap',
			sitemapUrl: input.sitemapUrl
		};
	}

	async measureGenerativeVisibility(
		input: MeasureGenerativeVisibilityInput
	): Promise<GenerativeVisibilityResult> {
		return measureGenerativeVisibilityAdapter(input);
	}
}
