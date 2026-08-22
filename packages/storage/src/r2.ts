import { NotFoundError, ProviderError } from '@vector/contracts';
import { logError, logInfo } from '@vector/observability';
import { toArrayBuffer } from './bytes';
import { assertTenantStorageKey } from './keys';
import type { PutObjectInput, StorageHealth, StorageObject, StorageProvider } from './types';

const TIMEOUT_MS = 10_000;
const REGION = 'auto';

export type R2Config = {
	accountId: string;
	accessKeyId: string;
	secretAccessKey: string;
	bucket: string;
	endpoint?: string;
};

export class R2StorageProvider implements StorageProvider {
	private readonly endpoint: string;

	constructor(private readonly config: R2Config) {
		this.endpoint =
			config.endpoint?.replace(/\/$/, '') ??
			`https://${config.accountId}.r2.cloudflarestorage.com`;
	}

	async putObject(input: PutObjectInput) {
		assertTenantStorageKey(input.clientId, input.key);
		const response = await this.request('PUT', input.key, input.bytes, input.contentType);
		if (!response.ok) {
			logError('storage.put', new Error(`R2 ${response.status}`), { clientId: input.clientId });
			throw new ProviderError('Storage put failed', 'PROVIDER_TEMPORARY_FAILURE');
		}
		logInfo('storage.put', {
			adapter: 'r2',
			clientId: input.clientId,
			sizeBytes: input.bytes.byteLength
		});
		return { key: input.key, sizeBytes: input.bytes.byteLength };
	}

	async getObject(clientId: string, key: string): Promise<StorageObject> {
		assertTenantStorageKey(clientId, key);
		const response = await this.request('GET', key);
		if (response.status === 404) throw new NotFoundError('Asset object not found');
		if (!response.ok) throw new ProviderError('Storage get failed', 'PROVIDER_TEMPORARY_FAILURE');
		return {
			key,
			bytes: new Uint8Array(await response.arrayBuffer()),
			contentType: response.headers.get('content-type') ?? 'application/octet-stream'
		};
	}

	async deleteObject(clientId: string, key: string) {
		assertTenantStorageKey(clientId, key);
		const response = await this.request('DELETE', key);
		if (!response.ok && response.status !== 404) {
			throw new ProviderError('Storage delete failed', 'PROVIDER_TEMPORARY_FAILURE');
		}
		logInfo('storage.delete', { adapter: 'r2', clientId });
	}

	async health(): Promise<StorageHealth> {
		try {
			const response = await this.request('HEAD');
			if (response.ok || response.status === 404) {
				return { ok: true, adapter: 'r2', detail: this.config.bucket };
			}
			return { ok: false, adapter: 'r2', detail: `R2 health ${response.status}` };
		} catch (error) {
			logError('storage.health', error, { adapter: 'r2' });
			return { ok: false, adapter: 'r2', detail: 'R2 health check failed' };
		}
	}

	private async request(method: string, key?: string, body?: Uint8Array, contentType?: string) {
		const url = key
			? `${this.endpoint}/${this.config.bucket}/${key}`
			: `${this.endpoint}/${this.config.bucket}`;
		const headers = await signRequest({
			method,
			url,
			body,
			contentType,
			accessKeyId: this.config.accessKeyId,
			secretAccessKey: this.config.secretAccessKey,
			region: REGION
		});
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			return await fetch(url, {
				method,
				headers,
				body: body ? toArrayBuffer(body) : undefined,
				signal: controller.signal
			});
		} catch {
			throw new ProviderError('Storage request timed out', 'PROVIDER_TEMPORARY_FAILURE');
		} finally {
			clearTimeout(timer);
		}
	}
}

async function signRequest(input: {
	method: string;
	url: string;
	body?: Uint8Array;
	contentType?: string;
	accessKeyId: string;
	secretAccessKey: string;
	region: string;
}) {
	const parsed = new URL(input.url);
	const amzDate = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z');
	const dateStamp = amzDate.slice(0, 8);
	const payloadHash = await sha256Hex(input.body ?? new Uint8Array());
	const headers: Record<string, string> = {
		host: parsed.host,
		'x-amz-date': amzDate,
		'x-amz-content-sha256': payloadHash
	};
	if (input.contentType) headers['content-type'] = input.contentType;
	const signedHeaderNames = Object.keys(headers)
		.map((name) => name.toLowerCase())
		.sort();
	const canonicalHeaders = signedHeaderNames
		.map((name) => `${name}:${headers[name].trim()}\n`)
		.join('');
	const signedHeaders = signedHeaderNames.join(';');
	const canonicalRequest = [
		input.method,
		parsed.pathname,
		parsed.searchParams.toString(),
		canonicalHeaders,
		signedHeaders,
		payloadHash
	].join('\n');
	const scope = `${dateStamp}/${input.region}/s3/aws4_request`;
	const stringToSign = [
		'AWS4-HMAC-SHA256',
		amzDate,
		scope,
		await sha256Hex(canonicalRequest)
	].join('\n');
	const signingKey = await deriveSigningKey(input.secretAccessKey, dateStamp, input.region);
	const signature = hex(await hmac(signingKey, stringToSign));
	headers.authorization = `AWS4-HMAC-SHA256 Credential=${input.accessKeyId}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
	return headers;
}

async function deriveSigningKey(secret: string, dateStamp: string, region: string) {
	const kDate = await hmac(toArrayBuffer(new TextEncoder().encode(`AWS4${secret}`)), dateStamp);
	const kRegion = await hmac(kDate, region);
	const kService = await hmac(kRegion, 's3');
	return hmac(kService, 'aws4_request');
}

async function hmac(key: ArrayBuffer, data: string) {
	const cryptoKey = await crypto.subtle.importKey(
		'raw',
		key,
		{ name: 'HMAC', hash: 'SHA-256' },
		false,
		['sign']
	);
	return crypto.subtle.sign('HMAC', cryptoKey, new TextEncoder().encode(data));
}

async function sha256Hex(data: Uint8Array | string) {
	const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
	return hex(await crypto.subtle.digest('SHA-256', toArrayBuffer(bytes)));
}

function hex(buffer: ArrayBuffer) {
	return [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('');
}
