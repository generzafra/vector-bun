import { ProviderError } from '@vector/contracts';
import { logError, logInfo } from '@vector/observability';
import { encodeSitePath, searchFetch, toCtrBps, toPositionMilli } from './http';
import { unsupportedGenerativeVisibility } from './measurement/geo';
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

const SITES = 'https://searchconsole.googleapis.com/webmasters/v3/sites';

type SearchAnalyticsRow = {
	keys?: string[];
	clicks?: number;
	impressions?: number;
	ctr?: number;
	position?: number;
};

export class GoogleSearchProvider implements SearchProvider {
	readonly engine = 'google' as const;

	constructor(private readonly sendHttp: typeof fetch = fetch) {}

	async validateProperty(input: ValidatePropertyInput): Promise<SearchPropertyHealth> {
		if (!input.credential || !input.siteUrl) {
			return {
				ok: false,
				adapter: 'google',
				engine: this.engine,
				detail: 'Search Console credential or site URL is missing'
			};
		}
		try {
			const response = await searchFetch(
				this.sendHttp,
				`${SITES}/${encodeSitePath(input.siteUrl)}`,
				{
					method: 'GET',
					headers: { authorization: `Bearer ${input.credential}` }
				}
			);
			if (!response.ok) {
				return {
					ok: false,
					adapter: 'google',
					engine: this.engine,
					detail: `Search Console rejected the property (${response.status})`,
					siteUrl: input.siteUrl
				};
			}
			logInfo('search.google.validate', { engine: this.engine, ok: true });
			return {
				ok: true,
				adapter: 'google',
				engine: this.engine,
				detail: 'Search Console property is valid',
				siteUrl: input.siteUrl
			};
		} catch (error) {
			logError('search.google.validate', error, { engine: this.engine });
			return {
				ok: false,
				adapter: 'google',
				engine: this.engine,
				detail: 'Search Console connection check failed',
				siteUrl: input.siteUrl
			};
		}
	}

	async syncPerformance(input: SyncPerformanceInput): Promise<SyncPerformanceResult> {
		if (!input.credential || !input.siteUrl) {
			throw new ProviderError(
				'Search Console credential or site URL is missing',
				'PROVIDER_INVALID_PAYLOAD'
			);
		}
		const response = await searchFetch(
			this.sendHttp,
			`${SITES}/${encodeSitePath(input.siteUrl)}/searchAnalytics/query`,
			{
				method: 'POST',
				headers: {
					authorization: `Bearer ${input.credential}`,
					'content-type': 'application/json'
				},
				body: JSON.stringify({
					startDate: input.startDate,
					endDate: input.endDate,
					dimensions: ['query', 'page', 'date'],
					rowLimit: 250
				})
			}
		);
		if (!response.ok) {
			throw new ProviderError(
				`Search Console sync failed (${response.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		const payload = (await response.json()) as { rows?: SearchAnalyticsRow[] };
		const queries: SearchQueryRow[] = [];
		const pages = new Map<string, SearchPageRow>();
		for (const row of payload.rows ?? []) {
			const query = row.keys?.[0]?.trim();
			const pageUrl = row.keys?.[1]?.trim() || null;
			const date = row.keys?.[2]?.trim() || input.endDate;
			if (!query) continue;
			queries.push({
				query,
				pageUrl,
				clicks: Math.max(0, Math.round(row.clicks ?? 0)),
				impressions: Math.max(0, Math.round(row.impressions ?? 0)),
				ctrBps: toCtrBps(row.ctr),
				positionMilli: toPositionMilli(row.position),
				date,
				country: null,
				device: null
			});
			if (pageUrl) {
				const existing = pages.get(pageUrl) ?? {
					url: pageUrl,
					clicks: 0,
					impressions: 0,
					ctrBps: 0,
					positionMilli: 0
				};
				existing.clicks += Math.max(0, Math.round(row.clicks ?? 0));
				existing.impressions += Math.max(0, Math.round(row.impressions ?? 0));
				existing.ctrBps = existing.impressions
					? Math.round((existing.clicks * 10_000) / existing.impressions)
					: 0;
				existing.positionMilli = toPositionMilli(row.position);
				pages.set(pageUrl, existing);
			}
		}
		logInfo('search.google.sync', { engine: this.engine, queries: queries.length });
		return { queries, pages: [...pages.values()] };
	}

	async submitSitemap(input: SubmitSitemapInput): Promise<SubmitSitemapResult> {
		if (!input.credential || !input.sitemapUrl) {
			throw new ProviderError(
				'Search Console sitemap submit is incomplete',
				'PROVIDER_INVALID_PAYLOAD'
			);
		}
		const response = await searchFetch(
			this.sendHttp,
			`${SITES}/${encodeSitePath(input.siteUrl)}/sitemaps/${encodeSitePath(input.sitemapUrl)}`,
			{
				method: 'PUT',
				headers: { authorization: `Bearer ${input.credential}` }
			}
		);
		if (!response.ok) {
			throw new ProviderError(
				`Search Console sitemap submit failed (${response.status})`,
				'PROVIDER_TEMPORARY_FAILURE'
			);
		}
		logInfo('search.google.sitemap', { engine: this.engine });
		return {
			accepted: true,
			detail: 'Search Console accepted the sitemap',
			sitemapUrl: input.sitemapUrl
		};
	}

	async measureGenerativeVisibility(
		_input: MeasureGenerativeVisibilityInput
	): Promise<GenerativeVisibilityResult> {
		return unsupportedGenerativeVisibility();
	}
}
