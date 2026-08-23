import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { ValidationError } from '@vector/contracts';

const PREFIX = 'v1';

function keyBytes(secret: string) {
	return createHash('sha256').update(secret).digest();
}

export function encryptSecret(secret: string, plaintext: string) {
	if (!plaintext) throw new ValidationError('Secret is required');
	const iv = randomBytes(12);
	const cipher = createCipheriv('aes-256-gcm', keyBytes(secret), iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return `${PREFIX}:${iv.toString('base64url')}:${tag.toString('base64url')}:${encrypted.toString('base64url')}`;
}

export function decryptSecret(secret: string, ciphertext: string) {
	const [prefix, iv, tag, body] = ciphertext.split(':');
	if (prefix !== PREFIX || !iv || !tag || !body) {
		throw new ValidationError('Encrypted secret is malformed');
	}
	const decipher = createDecipheriv('aes-256-gcm', keyBytes(secret), Buffer.from(iv, 'base64url'));
	decipher.setAuthTag(Buffer.from(tag, 'base64url'));
	return Buffer.concat([
		decipher.update(Buffer.from(body, 'base64url')),
		decipher.final()
	]).toString('utf8');
}
