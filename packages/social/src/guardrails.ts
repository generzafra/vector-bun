import { createHash } from 'node:crypto';
import { ValidationError } from '@vector/contracts';

export const SOCIAL_MAX_POSTS_PER_PLATFORM_PER_DAY = 4;
export const SOCIAL_SIMILARITY_WINDOW_DAYS = 7;

export function normalizePostBody(body: string) {
	return body.trim().toLowerCase().replace(/\s+/g, ' ');
}

export function similarityHash(body: string) {
	return createHash('sha256').update(normalizePostBody(body)).digest('hex').slice(0, 32);
}

export function assertFrequencyAllowed(publishedInWindow: number) {
	if (publishedInWindow >= SOCIAL_MAX_POSTS_PER_PLATFORM_PER_DAY) {
		throw new ValidationError(
			`Frequency limit is ${SOCIAL_MAX_POSTS_PER_PLATFORM_PER_DAY} posts per platform per day`
		);
	}
}

export function assertNotSimilar(matches: number) {
	if (matches > 0) {
		throw new ValidationError('A similar post was already published recently');
	}
}
