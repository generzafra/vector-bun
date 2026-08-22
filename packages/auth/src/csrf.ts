import { ForbiddenError } from '@vector/contracts';

export function createCsrfToken() {
	return Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url');
}

export function assertCsrf(expected: string | undefined, provided: string | undefined) {
	if (!expected || !provided || expected !== provided) {
		throw new ForbiddenError('CSRF validation failed');
	}
}
