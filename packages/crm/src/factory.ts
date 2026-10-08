import { DisabledCrmProvider } from './disabled';
import { MemoryCrmProvider } from './memory';
import type { CRMProvider } from './types';

let cached: CRMProvider | null = null;

export function createCrmProvider(): CRMProvider {
	return new MemoryCrmProvider();
}

export function crmProvider() {
	cached ??= createCrmProvider();
	return cached;
}

export function setCrmProvider(provider: CRMProvider) {
	cached = provider;
}

export function resetCrmProvider() {
	cached = null;
}

export function disableCrmProvider() {
	cached = new DisabledCrmProvider();
	return cached;
}
