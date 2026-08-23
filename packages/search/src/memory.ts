import { ProviderError, type SearchEngine } from '@vector/contracts';
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

export class MemorySearchProvider implements SearchProvider {
	readonly validated: ValidatePropertyInput[] = [];
	readonly synced: SyncPerformanceInput[] = [];
	readonly sitemaps: string[] = [];
	queries: SearchQueryRow[] = [];
	pages: SearchPageRow[] = [];
	validateFail = false;

	constructor(readonly engine: SearchEngine) {}

	async validateProperty(input: ValidatePropertyInput): Promise<SearchPropertyHealth> {
		this.validated.push(input);
		const ok = Boolean(input.credential && input.siteUrl) && !this.validateFail;
		return {
			ok,
			adapter: 'memory',
			engine: this.engine,
			detail: ok
				? 'Memory search property is valid'
				: 'Search property credential or site is missing',
			siteUrl: input.siteUrl
		};
	}

	async syncPerformance(input: SyncPerformanceInput): Promise<SyncPerformanceResult> {
		this.synced.push(input);
		if (!input.credential || !input.siteUrl) {
			throw new ProviderError('Memory search property is incomplete', 'PROVIDER_INVALID_PAYLOAD');
		}
		return {
			queries: this.queries.map((row) => ({ ...row })),
			pages: this.pages.map((row) => ({ ...row }))
		};
	}

	async submitSitemap(input: SubmitSitemapInput): Promise<SubmitSitemapResult> {
		if (!input.credential || !input.sitemapUrl) {
			throw new ProviderError('Memory sitemap submit is incomplete', 'PROVIDER_INVALID_PAYLOAD');
		}
		this.sitemaps.push(input.sitemapUrl);
		return {
			accepted: true,
			detail: 'Memory sitemap accepted',
			sitemapUrl: input.sitemapUrl
		};
	}

	async measureGenerativeVisibility(
		input: MeasureGenerativeVisibilityInput
	): Promise<GenerativeVisibilityResult> {
		return measureGenerativeVisibilityAdapter(input);
	}

	setPerformance(input: { queries?: SearchQueryRow[]; pages?: SearchPageRow[] }) {
		if (input.queries) this.queries = input.queries.map((row) => ({ ...row }));
		if (input.pages) this.pages = input.pages.map((row) => ({ ...row }));
	}

	reset() {
		this.validated.length = 0;
		this.synced.length = 0;
		this.sitemaps.length = 0;
		this.queries = [];
		this.pages = [];
		this.validateFail = false;
	}
}
