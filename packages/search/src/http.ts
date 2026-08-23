const TIMEOUT_MS = 10_000;
const RETRYABLE = new Set([429, 500, 502, 503, 504]);

function wait(ms: number) {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function searchFetch(
	sendHttp: typeof fetch,
	url: string,
	init: RequestInit,
	attempts = 2
): Promise<Response> {
	let lastError: unknown;
	for (let attempt = 0; attempt < attempts; attempt++) {
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const response = await sendHttp(url, { ...init, signal: controller.signal });
			if (RETRYABLE.has(response.status) && attempt < attempts - 1) {
				await wait(200);
				continue;
			}
			return response;
		} catch (error) {
			lastError = error;
			if (attempt === attempts - 1) throw error;
			await wait(200);
		} finally {
			clearTimeout(timer);
		}
	}
	throw lastError instanceof Error ? lastError : new Error('Search provider request failed');
}

export function encodeSitePath(siteUrl: string) {
	return encodeURIComponent(siteUrl);
}

export function toCtrBps(ctr: number | undefined) {
	if (ctr === undefined || !Number.isFinite(ctr)) return 0;
	return Math.max(0, Math.round(ctr * 10_000));
}

export function toPositionMilli(position: number | undefined) {
	if (position === undefined || !Number.isFinite(position)) return 0;
	return Math.max(0, Math.round(position * 1000));
}

export function isoDate(value: Date) {
	return value.toISOString().slice(0, 10);
}
