import { expect, test } from 'bun:test';
import { ProviderError } from '@vector/contracts';
import { LinkedInSocialProvider } from '../packages/social/src/linkedin';
import { MetaSocialProvider } from '../packages/social/src/meta';
import { XSocialProvider } from '../packages/social/src/x';

function jsonResponse(status: number, body: unknown, headers: Record<string, string> = {}) {
	return new Response(JSON.stringify(body), {
		status,
		headers: { 'content-type': 'application/json', ...headers }
	});
}

test('official LinkedIn refresh fails closed without OAuth client credentials', async () => {
	const provider = new LinkedInSocialProvider(async () =>
		jsonResponse(200, { access_token: 'nope' })
	);
	const result = await provider.refreshConnection({
		clientId: '11111111-1111-4111-8111-111111111111',
		platform: 'linkedin',
		refreshToken: 'refresh-token-value'
	});
	expect(result.ok).toBe(false);
	expect(result.detail).toContain('not configured');
});

test('official LinkedIn and X refresh rotate tokens through official OAuth endpoints', async () => {
	const linkedinCalls: string[] = [];
	const linkedin = new LinkedInSocialProvider(
		async (input) => {
			linkedinCalls.push(String(input));
			return jsonResponse(200, {
				access_token: 'linkedin-access-rotated',
				refresh_token: 'linkedin-refresh-rotated',
				expires_in: 3600
			});
		},
		{ clientId: 'li-client', clientSecret: 'li-secret' }
	);
	const linkedinResult = await linkedin.refreshConnection({
		clientId: '11111111-1111-4111-8111-111111111111',
		platform: 'linkedin',
		refreshToken: 'old-linkedin-refresh'
	});
	expect(linkedinResult.ok).toBe(true);
	expect(linkedinResult.accessToken).toBe('linkedin-access-rotated');
	expect(linkedinResult.refreshToken).toBe('linkedin-refresh-rotated');
	expect(linkedinCalls[0]).toContain('https://www.linkedin.com/oauth/v2/accessToken');

	const x = new XSocialProvider(
		async (input) => {
			expect(String(input)).toContain('https://api.x.com/2/oauth2/token');
			return jsonResponse(200, {
				access_token: 'x-access-rotated',
				refresh_token: 'x-refresh-rotated',
				expires_in: 7200
			});
		},
		{ clientId: 'x-client', clientSecret: 'x-secret' }
	);
	const xResult = await x.refreshConnection({
		clientId: '11111111-1111-4111-8111-111111111111',
		platform: 'x',
		refreshToken: 'old-x-refresh'
	});
	expect(xResult.ok).toBe(true);
	expect(xResult.accessToken).toBe('x-access-rotated');
});

test('official X metrics map public_metrics and fail closed to zeros', async () => {
	const ok = new XSocialProvider(async () =>
		jsonResponse(200, {
			data: {
				public_metrics: {
					impression_count: 40,
					like_count: 5,
					reply_count: 2,
					retweet_count: 1
				}
			}
		})
	);
	expect(
		await ok.fetchPostMetrics({
			clientId: '11111111-1111-4111-8111-111111111111',
			platform: 'x',
			accessToken: 'token-value',
			providerPostId: 'tweet-1'
		})
	).toEqual({ impressions: 40, likes: 5, comments: 2, shares: 1, clicks: 0 });

	const failed = new XSocialProvider(async () => jsonResponse(401, { title: 'Unauthorized' }));
	expect(
		await failed.fetchPostMetrics({
			clientId: '11111111-1111-4111-8111-111111111111',
			platform: 'x',
			accessToken: 'token-value',
			providerPostId: 'tweet-2'
		})
	).toEqual({ impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 });
});

test('official Meta refresh fails closed without app credentials', async () => {
	const provider = new MetaSocialProvider('facebook', async () =>
		jsonResponse(200, { access_token: 'nope' })
	);
	const result = await provider.refreshConnection({
		clientId: '11111111-1111-4111-8111-111111111111',
		platform: 'facebook',
		refreshToken: 'short-lived-token'
	});
	expect(result.ok).toBe(false);
	expect(result.detail).toContain('not configured');
});

test('official Meta Facebook publish and refresh use Graph endpoints', async () => {
	const calls: string[] = [];
	const facebook = new MetaSocialProvider(
		'facebook',
		async (input, init) => {
			const url = String(input);
			calls.push(`${init?.method ?? 'GET'} ${url}`);
			if (url.includes('/feed')) {
				return jsonResponse(200, { id: 'page_123' });
			}
			if (url.includes('oauth/access_token')) {
				return jsonResponse(200, { access_token: 'meta-long-lived', expires_in: 5184000 });
			}
			if (url.includes('fields=id')) {
				return jsonResponse(200, { id: 'page-1' });
			}
			return jsonResponse(404, { error: { message: 'unexpected' } });
		},
		{ appId: 'meta-app', appSecret: 'meta-secret' }
	);
	const health = await facebook.validateConnection({
		accessToken: 'page-token',
		externalAccountId: 'page-1'
	});
	expect(health.ok).toBe(true);
	const published = await facebook.publish({
		clientId: '11111111-1111-4111-8111-111111111111',
		publicationId: '22222222-2222-4222-8222-222222222222',
		idempotencyKey: 'meta-pub-1',
		platform: 'facebook',
		accessToken: 'page-token',
		externalAccountId: 'page-1',
		body: 'Hello from Vector'
	});
	expect(published.providerPostId).toBe('page_123');
	const refreshed = await facebook.refreshConnection({
		clientId: '11111111-1111-4111-8111-111111111111',
		platform: 'facebook',
		refreshToken: 'short-lived-token'
	});
	expect(refreshed.ok).toBe(true);
	expect(refreshed.accessToken).toBe('meta-long-lived');
	expect(calls.some((call) => call.includes('/page-1/feed'))).toBe(true);
	expect(calls.some((call) => call.includes('fb_exchange_token'))).toBe(true);
});

test('official Instagram publish fails closed without media', async () => {
	const instagram = new MetaSocialProvider('instagram', async () => jsonResponse(200, {}));
	let error: unknown;
	try {
		await instagram.publish({
			clientId: '11111111-1111-4111-8111-111111111111',
			publicationId: '22222222-2222-4222-8222-222222222222',
			idempotencyKey: 'ig-pub-1',
			platform: 'instagram',
			accessToken: 'ig-token',
			externalAccountId: 'ig-user-1',
			body: 'Caption only'
		});
	} catch (caught) {
		error = caught;
	}
	expect(error).toBeInstanceOf(ProviderError);
	expect((error as ProviderError).code).toBe('SOCIAL_MEDIA_UNSUPPORTED');
});

test('official Meta metrics map Graph fields and fail closed to zeros', async () => {
	const facebook = new MetaSocialProvider('facebook', async () =>
		jsonResponse(200, {
			shares: { count: 3 },
			reactions: { summary: { total_count: 11 } },
			comments: { summary: { total_count: 4 } }
		})
	);
	expect(
		await facebook.fetchPostMetrics({
			clientId: '11111111-1111-4111-8111-111111111111',
			platform: 'facebook',
			accessToken: 'page-token',
			providerPostId: 'page_123'
		})
	).toEqual({ impressions: 0, likes: 11, comments: 4, shares: 3, clicks: 0 });

	const instagram = new MetaSocialProvider('instagram', async () =>
		jsonResponse(200, {
			data: [
				{ name: 'impressions', values: [{ value: 90 }] },
				{ name: 'likes', values: [{ value: 8 }] },
				{ name: 'comments', values: [{ value: 1 }] }
			]
		})
	);
	expect(
		await instagram.fetchPostMetrics({
			clientId: '11111111-1111-4111-8111-111111111111',
			platform: 'instagram',
			accessToken: 'ig-token',
			providerPostId: 'ig-media-1'
		})
	).toEqual({ impressions: 90, likes: 8, comments: 1, shares: 0, clicks: 0 });

	const failed = new MetaSocialProvider('facebook', async () => jsonResponse(401, { error: {} }));
	expect(
		await failed.fetchPostMetrics({
			clientId: '11111111-1111-4111-8111-111111111111',
			platform: 'facebook',
			accessToken: 'page-token',
			providerPostId: 'page_404'
		})
	).toEqual({ impressions: 0, likes: 0, comments: 0, shares: 0, clicks: 0 });
});
