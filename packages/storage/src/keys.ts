import { ForbiddenError, ValidationError } from '@vector/contracts';

export const STORAGE_CATEGORIES = [
	'brand',
	'funnel',
	'content',
	'email',
	'social',
	'creative',
	'generated',
	'source',
	'export'
] as const;

export type StorageCategory = (typeof STORAGE_CATEGORIES)[number];

export function tenantPrefix(clientId: string) {
	return `clients/${clientId}/`;
}

export function assertTenantStorageKey(clientId: string, key: string) {
	if (!clientId || !key) throw new ForbiddenError('Storage key is not authorized for this tenant');
	if (key.includes('..') || key.includes('\\') || key.startsWith('/')) {
		throw new ForbiddenError('Storage key is not authorized for this tenant');
	}
	if (!key.startsWith(tenantPrefix(clientId))) {
		throw new ForbiddenError('Storage key is not authorized for this tenant');
	}
}

export function sanitizeFilename(filename: string) {
	const base = filename.split(/[/\\]/).pop() ?? 'file';
	const cleaned = base.toLowerCase().replace(/[^a-z0-9._-]+/g, '-').replace(/-+/g, '-');
	if (!cleaned || cleaned === '.' || cleaned === '..') {
		throw new ValidationError('Filename is invalid');
	}
	return cleaned.slice(0, 80);
}

export function buildStorageKey(
	clientId: string,
	category: StorageCategory,
	purpose: string,
	filename: string
) {
	const safePurpose = purpose.replace(/[^a-z0-9_-]+/g, '') || 'other';
	const key = `${tenantPrefix(clientId)}${category}/${safePurpose}/${crypto.randomUUID()}-${sanitizeFilename(filename)}`;
	assertTenantStorageKey(clientId, key);
	return key;
}
