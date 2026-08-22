import { RateLimitError } from '@vector/contracts';

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

export function consumeRateLimit(key: string, limit: number, windowMs: number) {
	const now = Date.now();
	const current = buckets.get(key);
	if (!current || now > current.resetAt) {
		buckets.set(key, { count: 1, resetAt: now + windowMs });
		return;
	}
	if (current.count >= limit) {
		throw new RateLimitError();
	}
	current.count += 1;
}

export function resetRateLimits() {
	buckets.clear();
}
