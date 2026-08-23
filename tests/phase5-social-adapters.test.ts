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

const PNG = Uint8Array.from([
	0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
	0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
	0x89, 0x00, 0x00, 0x00, 0x0a, 0x49, 0x44, 0x41, 0x54, 0x78, 0x9c, 0x63, 0x00, 0x01, 0x00, 0x00,
	0x05, 0x00, 0x01, 0x0d, 0x0a, 0x2d, 0xb4, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4e, 0x44, 0xae,
	0x42, 0x60, 0x82
]);

function sampleMedia(publicUrl?: string) {
	return {
		assetVersionId: '33333333-3333-4333-8333-333333333333',
		filename: 'social.png',
		mimeType: 'image/png',
		bytes: PNG,
		publicUrl
	};
}

test('official LinkedIn and X publish approved media through official upload endpoints', async () => {
	const linkedinCalls: string[] = [];
	const linkedin = new LinkedInSocialProvider(async (input, init) => {
		const url = String(input);
		linkedinCalls.push(`${init?.method ?? 'GET'} ${url}`);
		if (url.includes('initializeUpload')) {
			return jsonResponse(200, {
				value: {
					uploadUrl: 'https://www.linkedin.com/dm-uploads/image-1',
					image: 'urn:li:image:abc'
				}
			});
		}
		if (url.includes('dm-uploads')) return new Response(null, { status: 201 });
		if (url.includes('/rest/posts')) {
			expect(String(init?.body)).toContain('urn:li:image:abc');
			const headers = new Headers(init?.headers);
			expect(headers.get('linkedin-version')).toBe('202608');
			return new Response(null, { status: 201, headers: { 'x-restli-id': 'urn:li:share:1' } });
		}
		return jsonResponse(404, {});
	});
	const linkedinResult = await linkedin.publish({
		clientId: '11111111-1111-4111-8111-111111111111',
		publicationId: '22222222-2222-4222-8222-222222222222',
		idempotencyKey: 'li-media-1',
		platform: 'linkedin',
		accessToken: 'li-token',
		externalAccountId: 'urn:li:person:1',
		body: 'With image',
		assetVersionId: sampleMedia().assetVersionId,
		media: sampleMedia()
	});
	expect(linkedinResult.providerPostId).toBe('urn:li:share:1');
	expect(linkedinCalls.some((call) => call.includes('initializeUpload'))).toBe(true);

	const xCalls: string[] = [];
	const x = new XSocialProvider(async (input, init) => {
		const url = String(input);
		xCalls.push(`${init?.method ?? 'GET'} ${url}`);
		if (url.includes('/media/upload')) return jsonResponse(200, { data: { id: 'media-9' } });
		if (url.includes('/tweets')) {
			expect(String(init?.body)).toContain('media-9');
			return jsonResponse(201, { data: { id: 'tweet-9' } });
		}
		return jsonResponse(404, {});
	});
	const xResult = await x.publish({
		clientId: '11111111-1111-4111-8111-111111111111',
		publicationId: '22222222-2222-4222-8222-222222222222',
		idempotencyKey: 'x-media-1',
		platform: 'x',
		accessToken: 'x-token',
		externalAccountId: 'x-user-1',
		body: 'With image',
		media: sampleMedia()
	});
	expect(xResult.providerPostId).toBe('tweet-9');
	expect(xCalls.some((call) => call.includes('/media/upload'))).toBe(true);
});

test('official Meta Facebook photos and Instagram containers use official media endpoints', async () => {
	const facebookCalls: string[] = [];
	const facebook = new MetaSocialProvider('facebook', async (input, init) => {
		const url = String(input);
		facebookCalls.push(`${init?.method ?? 'GET'} ${url}`);
		if (url.includes('/photos')) return jsonResponse(200, { id: 'photo-1', post_id: 'page_photo' });
		return jsonResponse(404, {});
	});
	const facebookResult = await facebook.publish({
		clientId: '11111111-1111-4111-8111-111111111111',
		publicationId: '22222222-2222-4222-8222-222222222222',
		idempotencyKey: 'fb-media-1',
		platform: 'facebook',
		accessToken: 'page-token',
		externalAccountId: 'page-1',
		body: 'Photo caption',
		media: sampleMedia()
	});
	expect(facebookResult.providerPostId).toBe('page_photo');
	expect(facebookCalls.some((call) => call.includes('/page-1/photos'))).toBe(true);

	const igCalls: string[] = [];
	const instagram = new MetaSocialProvider('instagram', async (input, init) => {
		const url = String(input);
		igCalls.push(`${init?.method ?? 'GET'} ${url}`);
		if (url.endsWith('/media')) {
			expect(String(init?.body)).toContain('https://api.example.test/image.png');
			return jsonResponse(200, { id: 'container-1' });
		}
		if (url.includes('/media_publish')) {
			expect(String(init?.body)).toContain('container-1');
			return jsonResponse(200, { id: 'ig-media-9' });
		}
		return jsonResponse(404, {});
	});
	const igResult = await instagram.publish({
		clientId: '11111111-1111-4111-8111-111111111111',
		publicationId: '22222222-2222-4222-8222-222222222222',
		idempotencyKey: 'ig-media-1',
		platform: 'instagram',
		accessToken: 'ig-token',
		externalAccountId: 'ig-user-1',
		body: 'IG caption',
		media: sampleMedia('https://api.example.test/image.png')
	});
	expect(igResult.providerPostId).toBe('ig-media-9');
	expect(igCalls.some((call) => call.includes('/media_publish'))).toBe(true);
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

test('official LinkedIn and X OAuth fail closed without credentials and exchange official codes', async () => {
	const unconfigured = new LinkedInSocialProvider(async () => jsonResponse(200, {}));
	let linkedinConfigError: unknown;
	try {
		unconfigured.createAuthorizationUrl({
			state: 'state-1',
			redirectUri: 'http://localhost:5183/social/oauth/callback',
			codeChallenge: 'challenge-1'
		});
	} catch (caught) {
		linkedinConfigError = caught;
	}
	expect(linkedinConfigError).toBeInstanceOf(ProviderError);
	expect((linkedinConfigError as ProviderError).code).toBe('SOCIAL_OAUTH_UNCONFIGURED');

	const linkedinCalls: string[] = [];
	const linkedin = new LinkedInSocialProvider(
		async (input) => {
			const url = String(input);
			linkedinCalls.push(url);
			if (url.includes('/oauth/v2/accessToken')) {
				return jsonResponse(200, {
					access_token: 'linkedin-oauth-access',
					refresh_token: 'linkedin-oauth-refresh',
					expires_in: 3600
				});
			}
			if (url.includes('/v2/userinfo')) {
				return jsonResponse(200, { sub: 'person-9', name: 'Li Member', email: 'li@example.test' });
			}
			return jsonResponse(404, {});
		},
		{ clientId: 'li-client', clientSecret: 'li-secret' }
	);
	const linkedinUrl = new URL(
		linkedin.createAuthorizationUrl({
			state: 'li-state',
			redirectUri: 'http://localhost:5183/social/oauth/callback',
			codeChallenge: 'li-challenge'
		})
	);
	expect(linkedinUrl.origin).toBe('https://www.linkedin.com');
	expect(linkedinUrl.searchParams.get('client_id')).toBe('li-client');
	expect(linkedinUrl.searchParams.get('scope')).toBe('openid profile w_member_social');
	expect(linkedinUrl.searchParams.get('scope')?.includes('offline_access')).toBe(false);
	const linkedinTokens = await linkedin.exchangeAuthorizationCode({
		code: 'li-code',
		redirectUri: 'http://localhost:5183/social/oauth/callback',
		codeVerifier: 'li-verifier'
	});
	if (linkedinTokens.kind !== 'connected') throw new Error('expected LinkedIn connected');
	expect(linkedinTokens.tokens.accessToken).toBe('linkedin-oauth-access');
	expect(linkedinTokens.tokens.externalAccountId).toBe('urn:li:person:person-9');
	expect(linkedinTokens.tokens.handle).toBe('li@example.test');
	expect(linkedinTokens.tokens.displayName).toBe('Li Member');
	expect(linkedinCalls.some((call) => call.includes('/oauth/v2/accessToken'))).toBe(true);
	expect(linkedinCalls.some((call) => call.includes('/v2/userinfo'))).toBe(true);
	expect(linkedinCalls.some((call) => call.includes('organizationAcls'))).toBe(false);

	const xBare = new XSocialProvider(async () => jsonResponse(200, {}));
	let xConfigError: unknown;
	try {
		await xBare.exchangeAuthorizationCode({
			code: 'x-code',
			redirectUri: 'http://localhost:5183/social/oauth/callback',
			codeVerifier: 'x-verifier'
		});
	} catch (caught) {
		xConfigError = caught;
	}
	expect(xConfigError).toBeInstanceOf(ProviderError);
	expect((xConfigError as ProviderError).code).toBe('SOCIAL_OAUTH_UNCONFIGURED');

	const xCalls: string[] = [];
	const x = new XSocialProvider(
		async (input) => {
			const url = String(input);
			xCalls.push(url);
			if (url.includes('/oauth2/token')) {
				return jsonResponse(200, {
					access_token: 'x-oauth-access',
					refresh_token: 'x-oauth-refresh',
					expires_in: 7200
				});
			}
			if (url.includes('/users/me')) {
				return jsonResponse(200, {
					data: { id: 'x-user-9', username: 'vectorx', name: 'Vector X' }
				});
			}
			return jsonResponse(404, {});
		},
		{ clientId: 'x-client', clientSecret: 'x-secret' }
	);
	const xUrl = new URL(
		x.createAuthorizationUrl({
			state: 'x-state',
			redirectUri: 'http://localhost:5183/social/oauth/callback',
			codeChallenge: 'x-challenge'
		})
	);
	expect(xUrl.origin).toBe('https://x.com');
	expect(xUrl.searchParams.get('code_challenge_method')).toBe('S256');
	const xTokens = await x.exchangeAuthorizationCode({
		code: 'x-code',
		redirectUri: 'http://localhost:5183/social/oauth/callback',
		codeVerifier: 'x-verifier'
	});
	if (xTokens.kind !== 'connected') throw new Error('expected X connected');
	expect(xTokens.tokens.accessToken).toBe('x-oauth-access');
	expect(xTokens.tokens.handle).toBe('vectorx');
	expect(xCalls.some((call) => call.includes('https://api.x.com/2/oauth2/token'))).toBe(true);
});

test('official Meta OAuth stores the Page token and fails closed without a Page or Instagram account', async () => {
	const unconfigured = new MetaSocialProvider('facebook', async () => jsonResponse(200, {}));
	let metaConfigError: unknown;
	try {
		unconfigured.createAuthorizationUrl({
			state: 'meta-state',
			redirectUri: 'http://localhost:5183/social/oauth/callback',
			codeChallenge: 'meta-challenge'
		});
	} catch (caught) {
		metaConfigError = caught;
	}
	expect(metaConfigError).toBeInstanceOf(ProviderError);
	expect((metaConfigError as ProviderError).code).toBe('SOCIAL_OAUTH_UNCONFIGURED');

	const facebookCalls: string[] = [];
	const facebook = new MetaSocialProvider(
		'facebook',
		async (input) => {
			const url = String(input);
			facebookCalls.push(url);
			if (url.includes('redirect_uri=')) {
				return jsonResponse(200, { access_token: 'meta-short' });
			}
			if (url.includes('fb_exchange_token')) {
				return jsonResponse(200, { access_token: 'meta-long', expires_in: 5184000 });
			}
			if (url.includes('/me/accounts')) {
				return jsonResponse(200, {
					data: [{ id: 'page-9', name: 'Vector Page', access_token: 'page-token-9' }]
				});
			}
			return jsonResponse(404, {});
		},
		{ appId: 'meta-app', appSecret: 'meta-secret' }
	);
	const facebookUrl = new URL(
		facebook.createAuthorizationUrl({
			state: 'fb-state',
			redirectUri: 'http://localhost:5183/social/oauth/callback',
			codeChallenge: 'fb-challenge'
		})
	);
	expect(facebookUrl.origin).toBe('https://www.facebook.com');
	expect(facebookUrl.pathname).toContain('/dialog/oauth');
	const facebookTokens = await facebook.exchangeAuthorizationCode({
		code: 'fb-code',
		redirectUri: 'http://localhost:5183/social/oauth/callback',
		codeVerifier: 'fb-verifier'
	});
	if (facebookTokens.kind !== 'connected') throw new Error('expected Facebook connected');
	expect(facebookTokens.tokens.accessToken).toBe('page-token-9');
	expect(facebookTokens.tokens.externalAccountId).toBe('page-9');
	expect(facebookCalls.some((call) => call.includes('/me/accounts'))).toBe(true);

	const noPage = new MetaSocialProvider(
		'facebook',
		async (input) => {
			const url = String(input);
			if (url.includes('redirect_uri=')) return jsonResponse(200, { access_token: 'meta-short' });
			if (url.includes('fb_exchange_token'))
				return jsonResponse(200, { access_token: 'meta-long' });
			if (url.includes('/me/accounts')) return jsonResponse(200, { data: [] });
			return jsonResponse(404, {});
		},
		{ appId: 'meta-app', appSecret: 'meta-secret' }
	);
	let noPageError: unknown;
	try {
		await noPage.exchangeAuthorizationCode({
			code: 'fb-empty',
			redirectUri: 'http://localhost:5183/social/oauth/callback',
			codeVerifier: 'fb-verifier'
		});
	} catch (caught) {
		noPageError = caught;
	}
	expect(noPageError).toBeInstanceOf(ProviderError);

	const instagram = new MetaSocialProvider(
		'instagram',
		async (input) => {
			const url = String(input);
			if (url.includes('redirect_uri=')) return jsonResponse(200, { access_token: 'meta-short' });
			if (url.includes('fb_exchange_token'))
				return jsonResponse(200, { access_token: 'meta-long' });
			if (url.includes('/me/accounts')) {
				return jsonResponse(200, {
					data: [{ id: 'page-9', name: 'Vector Page', access_token: 'page-token-9' }]
				});
			}
			if (url.includes('fields=instagram_business_account')) {
				return jsonResponse(200, { instagram_business_account: { id: 'ig-9' } });
			}
			if (url.includes('fields=id,username')) {
				return jsonResponse(200, { id: 'ig-9', username: 'vectorig' });
			}
			return jsonResponse(404, {});
		},
		{ appId: 'meta-app', appSecret: 'meta-secret' }
	);
	const igTokens = await instagram.exchangeAuthorizationCode({
		code: 'ig-code',
		redirectUri: 'http://localhost:5183/social/oauth/callback',
		codeVerifier: 'ig-verifier'
	});
	if (igTokens.kind !== 'connected') throw new Error('expected Instagram connected');
	expect(igTokens.tokens.accessToken).toBe('page-token-9');
	expect(igTokens.tokens.externalAccountId).toBe('ig-9');
	expect(igTokens.tokens.handle).toBe('vectorig');

	const noIg = new MetaSocialProvider(
		'instagram',
		async (input) => {
			const url = String(input);
			if (url.includes('redirect_uri=')) return jsonResponse(200, { access_token: 'meta-short' });
			if (url.includes('fb_exchange_token'))
				return jsonResponse(200, { access_token: 'meta-long' });
			if (url.includes('/me/accounts')) {
				return jsonResponse(200, {
					data: [{ id: 'page-9', name: 'Vector Page', access_token: 'page-token-9' }]
				});
			}
			if (url.includes('fields=instagram_business_account')) return jsonResponse(200, {});
			return jsonResponse(404, {});
		},
		{ appId: 'meta-app', appSecret: 'meta-secret' }
	);
	let noIgError: unknown;
	try {
		await noIg.exchangeAuthorizationCode({
			code: 'ig-empty',
			redirectUri: 'http://localhost:5183/social/oauth/callback',
			codeVerifier: 'ig-verifier'
		});
	} catch (caught) {
		noIgError = caught;
	}
	expect(noIgError).toBeInstanceOf(ProviderError);
});

test('official Meta OAuth asks for a Page when more than one eligible Page exists', async () => {
	const facebook = new MetaSocialProvider(
		'facebook',
		async (input) => {
			const url = String(input);
			if (url.includes('redirect_uri=')) return jsonResponse(200, { access_token: 'meta-short' });
			if (url.includes('fb_exchange_token'))
				return jsonResponse(200, { access_token: 'meta-long' });
			if (url.includes('/me/accounts')) {
				return jsonResponse(200, {
					data: [
						{ id: 'page-a', name: 'Page A', access_token: 'page-token-a' },
						{ id: 'page-b', name: 'Page B', access_token: 'page-token-b' }
					]
				});
			}
			return jsonResponse(404, {});
		},
		{ appId: 'meta-app', appSecret: 'meta-secret' }
	);
	const exchanged = await facebook.exchangeAuthorizationCode({
		code: 'fb-multi',
		redirectUri: 'http://localhost:5183/social/oauth/callback',
		codeVerifier: 'fb-verifier'
	});
	if (exchanged.kind !== 'select_page') throw new Error('expected page selection');
	expect(exchanged.pages.map((page) => page.pageId)).toEqual(['page-a', 'page-b']);
	expect(JSON.stringify(exchanged.pages).includes('page-token')).toBe(false);
	const selected = await facebook.resolveOAuthPage({
		userAccessToken: exchanged.userAccessToken,
		pageId: 'page-b'
	});
	expect(selected.accessToken).toBe('page-token-b');
	expect(selected.externalAccountId).toBe('page-b');
});

test('official LinkedIn OAuth does not use Page selection', async () => {
	const linkedin = new LinkedInSocialProvider(async () => jsonResponse(200, {}), {
		clientId: 'li-client',
		clientSecret: 'li-secret'
	});
	let pageError: unknown;
	try {
		await linkedin.resolveOAuthPage({
			userAccessToken: 'linkedin-user-token',
			pageId: 'urn:li:organization:22'
		});
	} catch (caught) {
		pageError = caught;
	}
	expect(pageError).toBeInstanceOf(ProviderError);
	expect((pageError as ProviderError).code).toBe('SOCIAL_PAGE_SELECTION_UNSUPPORTED');
});
