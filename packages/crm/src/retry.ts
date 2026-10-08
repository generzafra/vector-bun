import { ProviderError } from '@vector/contracts';

export const CRM_RETRY = { maxAttempts: 2, retryOn: ['CRM_TEMPORARY'] as const };

export async function withCrmRetry<T>(
	operation: () => Promise<T>,
	policy: { maxAttempts: number } = CRM_RETRY
): Promise<T> {
	let last: unknown;
	for (let attempt = 1; attempt <= policy.maxAttempts; attempt += 1) {
		try {
			return await operation();
		} catch (error) {
			last = error;
			const retryable = error instanceof ProviderError && error.code === 'CRM_TEMPORARY';
			if (!retryable || attempt === policy.maxAttempts) throw error;
		}
	}
	throw last;
}
