import { env } from '@vector/config';
import { LocalStorageProvider } from './local';
import { R2StorageProvider } from './r2';
import type { StorageProvider } from './types';

let cached: StorageProvider | null = null;

export function createStorageProvider(): StorageProvider {
	if (
		env.R2_ACCOUNT_ID &&
		env.R2_ACCESS_KEY_ID &&
		env.R2_SECRET_ACCESS_KEY &&
		env.R2_BUCKET
	) {
		return new R2StorageProvider({
			accountId: env.R2_ACCOUNT_ID,
			accessKeyId: env.R2_ACCESS_KEY_ID,
			secretAccessKey: env.R2_SECRET_ACCESS_KEY,
			bucket: env.R2_BUCKET,
			endpoint: env.R2_ENDPOINT
		});
	}
	return new LocalStorageProvider(env.STORAGE_LOCAL_DIR);
}

export function storageProvider() {
	cached ??= createStorageProvider();
	return cached;
}

export function resetStorageProvider() {
	cached = null;
}
