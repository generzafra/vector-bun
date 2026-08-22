import type { StorageCategory } from './keys';

export type StorageObject = {
	key: string;
	bytes: Uint8Array;
	contentType: string;
};

export type PutObjectInput = {
	clientId: string;
	key: string;
	bytes: Uint8Array;
	contentType: string;
};

export type StorageHealth = {
	ok: boolean;
	adapter: 'local' | 'r2';
	detail: string;
};

export interface StorageProvider {
	putObject(input: PutObjectInput): Promise<{ key: string; sizeBytes: number }>;
	getObject(clientId: string, key: string): Promise<StorageObject>;
	deleteObject(clientId: string, key: string): Promise<void>;
	health(): Promise<StorageHealth>;
}

export type { StorageCategory };
