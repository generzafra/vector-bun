import { expect, test } from 'bun:test';
import { ProviderError, ValidationError } from '@vector/contracts';
import { BingSearchProvider } from '../packages/search/src/bing';
import { GoogleSearchProvider } from '../packages/search/src/google';
import { MemorySearchProvider } from '../packages/search/src/memory';
import { detectTechnicalIssues } from '../packages/search/src/audits/technical';
import { canMarkPublishReady } from '../packages/search/src/opportunities/evidence';

function jsonResponse(status: number, body: unknown) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json' }
	});
}

test('memory SearchProvider validates, syncs, submits sitemaps, and records manual GEO only', async () => {
	const provider = new MemorySearchProvider('google');
	provider.setPerformance({
		queries: [
			{
				query: 'consult plan',
				pageUrl: 'https://memory.search.test/',
				clicks: 1,
				impressions: 10,
				ctrBps: 1000,
				positionMilli: 1500,
				date: '2026-08-20',
				country: '',
				device: ''
			}
		]
	});
	const health = await provider.validateProperty({
		clientId: '11111111-1111-4111-8111-111111111111',
		engine: 'google',
		siteUrl: 'https://memory.search.test/',
		credential: 'memory-credential'
	});
	expect(health.ok).toBe(true);
	const synced = await provider.syncPerformance({
		clientId: '11111111-1111-4111-8111-111111111111',
		engine: 'google',
		siteUrl: 'https://memory.search.test/',
		credential: 'memory-credential',
		startDate: '2026-08-16',
		endDate: '2026-08-23'
	});
	expect(synced.queries[0]?.query).toBe('consult plan');
	const sitemap = await provider.submitSitemap({
		clientId: '11111111-1111-4111-8111-111111111111',
		engine: 'google',
		siteUrl: 'https://memory.search.test/',
		credential: 'memory-credential',
		sitemapUrl: 'https://memory.search.test/sitemap.xml'
	});
	expect(sitemap.accepted).toBe(true);
	const geo = await provider.measureGenerativeVisibility({
		clientId: '11111111-1111-4111-8111-111111111111',
		query: 'best implant consult',
		engine: 'chatgpt'
	});
	expect(geo.supported).toBe(false);
	expect(geo.status).toBe('unsupported');
	const manual = await provider.measureGenerativeVisibility({
		clientId: '11111111-1111-4111-8111-111111111111',
		query: 'best implant consult',
		engine: 'chatgpt',
		method: 'manual',
		mentioned: true,
		ownedCitation: false,
		earnedCitation: false,
		represented: false
	});
	expect(manual.supported).toBe(true);
	if (manual.supported) {
		expect(manual.adapter).toBe('manual');
		expect(manual.mentionOnly ?? manual.mentioned).toBe(true);
		expect(manual.ownedCitation).toBe(false);
	}
});

test('official Search Console adapter uses official endpoints and records manual GEO without HTTP', async () => {
	const calls: string[] = [];
	const provider = new GoogleSearchProvider(async (input) => {
		const url = String(input);
		calls.push(url);
		if (url.includes('/searchAnalytics/query')) {
			return jsonResponse(200, {
				rows: [
					{
						keys: ['implant consult', 'https://gsc.example/', '2026-08-22'],
						clicks: 3,
						impressions: 30,
						ctr: 0.1,
						position: 2.4
					}
				]
			});
		}
		if (url.includes('/sitemaps/')) return jsonResponse(200, {});
		return jsonResponse(200, { siteUrl: 'https://gsc.example/' });
	});
	const health = await provider.validateProperty({
		clientId: '11111111-1111-4111-8111-111111111111',
		engine: 'google',
		siteUrl: 'https://gsc.example/',
		credential: 'gsc-token'
	});
	expect(health.ok).toBe(true);
	expect(calls[0]).toContain('https://searchconsole.googleapis.com/webmasters/v3/sites/');
	const synced = await provider.syncPerformance({
		clientId: '11111111-1111-4111-8111-111111111111',
		engine: 'google',
		siteUrl: 'https://gsc.example/',
		credential: 'gsc-token',
		startDate: '2026-08-16',
		endDate: '2026-08-23'
	});
	expect(synced.queries[0]?.query).toBe('implant consult');
	expect(synced.queries[0]?.ctrBps).toBe(1000);
	expect(synced.pages[0]?.url).toBe('https://gsc.example/');
	const sitemap = await provider.submitSitemap({
		clientId: '11111111-1111-4111-8111-111111111111',
		engine: 'google',
		siteUrl: 'https://gsc.example/',
		credential: 'gsc-token',
		sitemapUrl: 'https://gsc.example/sitemap.xml'
	});
	expect(sitemap.accepted).toBe(true);
	expect(calls.some((url) => url.includes('/sitemaps/'))).toBe(true);
	const geo = await provider.measureGenerativeVisibility({
		clientId: '11111111-1111-4111-8111-111111111111',
		query: 'who is the best dentist',
		engine: 'gemini'
	});
	expect(geo.supported).toBe(false);
	const beforeManual = calls.length;
	const manual = await provider.measureGenerativeVisibility({
		clientId: '11111111-1111-4111-8111-111111111111',
		query: 'who is the best dentist',
		engine: 'gemini',
		method: 'operator_assisted',
		mentioned: true,
		ownedCitation: true,
		earnedCitation: false,
		represented: true,
		citations: [{ kind: 'owned', url: 'https://gsc.example/' }]
	});
	expect(manual.supported).toBe(true);
	expect(calls.length).toBe(beforeManual);
});

test('official Bing adapter fails closed without a credential and maps query stats', async () => {
	const missing = new BingSearchProvider(async () => jsonResponse(200, { d: [] }));
	const health = await missing.validateProperty({
		clientId: '11111111-1111-4111-8111-111111111111',
		engine: 'bing',
		siteUrl: 'https://bing.example/',
		credential: ''
	});
	expect(health.ok).toBe(false);

	const calls: string[] = [];
	const provider = new BingSearchProvider(async (input) => {
		calls.push(String(input));
		return jsonResponse(200, {
			d: [{ Query: 'warehouse docks', Clicks: 5, Impressions: 50, AvgClickPosition: 1.8 }]
		});
	});
	const synced = await provider.syncPerformance({
		clientId: '11111111-1111-4111-8111-111111111111',
		engine: 'bing',
		siteUrl: 'https://bing.example/',
		credential: 'bing-key',
		startDate: '2026-08-16',
		endDate: '2026-08-23'
	});
	expect(synced.queries[0]?.query).toBe('warehouse docks');
	expect(calls[0]).toContain('https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats');
	await expect(
		provider.syncPerformance({
			clientId: '11111111-1111-4111-8111-111111111111',
			engine: 'bing',
			siteUrl: 'https://bing.example/',
			credential: '',
			startDate: '2026-08-16',
			endDate: '2026-08-23'
		})
	).rejects.toBeInstanceOf(ProviderError);
	const beforeManual = calls.length;
	const live = await provider.measureGenerativeVisibility({
		clientId: '11111111-1111-4111-8111-111111111111',
		query: 'warehouse docks',
		engine: 'perplexity'
	});
	expect(live.supported).toBe(false);
	const manual = await provider.measureGenerativeVisibility({
		clientId: '11111111-1111-4111-8111-111111111111',
		query: 'warehouse docks',
		engine: 'perplexity',
		method: 'manual',
		mentioned: true,
		ownedCitation: false,
		earnedCitation: false,
		represented: false
	});
	expect(manual.supported).toBe(true);
	expect(calls.length).toBe(beforeManual);
	await expect(
		provider.measureGenerativeVisibility({
			clientId: '11111111-1111-4111-8111-111111111111',
			query: 'warehouse docks',
			engine: 'perplexity',
			method: 'manual',
			mentioned: true,
			ownedCitation: false,
			earnedCitation: false,
			represented: false,
			retainedAnswer: 'A full model answer'
		})
	).rejects.toBeInstanceOf(ValidationError);
});

test('technical issues and publish-ready evidence stay deterministic', () => {
	const issues = detectTechnicalIssues([
		{ id: 'p1', path: 'about', title: '', seoTitle: '', seoDescription: '' }
	]);
	expect(issues.map((issue) => issue.code)).toContain('missing_title');
	expect(issues.map((issue) => issue.code)).toContain('missing_description');
	expect(issues.map((issue) => issue.code)).toContain('invalid_path');
	expect(canMarkPublishReady('knowledge_claim')).toBe(true);
	expect(canMarkPublishReady('official_query')).toBe(true);
	expect(canMarkPublishReady('technical_audit')).toBe(false);
});
