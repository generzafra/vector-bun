import { env, isTest } from '@vector/config';
import { SEARCH_ENGINES, type SearchEngine } from '@vector/contracts';
import { BingSearchProvider } from './bing';
import { GoogleSearchProvider } from './google';
import { MemorySearchProvider } from './memory';
import type { SearchProvider } from './types';

const cached = new Map<SearchEngine, SearchProvider>();
const memory = {
	google: new MemorySearchProvider('google'),
	bing: new MemorySearchProvider('bing')
} as const satisfies Record<SearchEngine, MemorySearchProvider>;

function officialSearchProvider(engine: SearchEngine): SearchProvider {
	return engine === 'google' ? new GoogleSearchProvider() : new BingSearchProvider();
}

export function createSearchProvider(engine: SearchEngine): SearchProvider {
	const useMemory = isTest || env.SEARCH_ADAPTER === 'memory';
	return useMemory ? memory[engine] : officialSearchProvider(engine);
}

export function searchProvider(engine: SearchEngine) {
	const existing = cached.get(engine);
	if (existing) return existing;
	const created = createSearchProvider(engine);
	cached.set(engine, created);
	return created;
}

export function setSearchProvider(engine: SearchEngine, provider: SearchProvider) {
	cached.set(engine, provider);
}

export function resetSearchProvider() {
	cached.clear();
	for (const engine of SEARCH_ENGINES) memory[engine].reset();
}

export function memorySearchProvider(engine: SearchEngine) {
	return memory[engine];
}
