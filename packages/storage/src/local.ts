import { mkdir, readFile, unlink, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { NotFoundError, ProviderError } from '@vector/contracts';
import { logError, logInfo } from '@vector/observability';
import { assertTenantStorageKey } from './keys';
import type { PutObjectInput, StorageHealth, StorageObject, StorageProvider } from './types';

export class LocalStorageProvider implements StorageProvider {
	constructor(private readonly root: string) {}

	private resolveKey(clientId: string, key: string) {
		assertTenantStorageKey(clientId, key);
		const full = resolve(this.root, key);
		const root = resolve(this.root);
		if (full !== root && !full.startsWith(`${root}\\`) && !full.startsWith(`${root}/`)) {
			throw new ProviderError('Storage key escaped the tenant prefix', 'PROVIDER_INVALID_PAYLOAD');
		}
		return full;
	}

	async putObject(input: PutObjectInput) {
		const path = this.resolveKey(input.clientId, input.key);
		await mkdir(dirname(path), { recursive: true });
		await writeFile(path, input.bytes);
		logInfo('storage.put', {
			adapter: 'local',
			clientId: input.clientId,
			sizeBytes: input.bytes.byteLength
		});
		return { key: input.key, sizeBytes: input.bytes.byteLength };
	}

	async getObject(clientId: string, key: string): Promise<StorageObject> {
		const path = this.resolveKey(clientId, key);
		try {
			const bytes = new Uint8Array(await readFile(path));
			return { key, bytes, contentType: 'application/octet-stream' };
		} catch {
			throw new NotFoundError('Asset object not found');
		}
	}

	async deleteObject(clientId: string, key: string) {
		const path = this.resolveKey(clientId, key);
		try {
			await unlink(path);
		} catch {
			// Missing blob is not authorization. Metadata delete still proceeds.
		}
		logInfo('storage.delete', { adapter: 'local', clientId });
	}

	async health(): Promise<StorageHealth> {
		try {
			await mkdir(this.root, { recursive: true });
			return { ok: true, adapter: 'local', detail: join(this.root) };
		} catch (error) {
			logError('storage.health', error, { adapter: 'local' });
			return { ok: false, adapter: 'local', detail: 'Local storage directory is not writable' };
		}
	}
}
