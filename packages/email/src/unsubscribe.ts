import { createHmac, timingSafeEqual } from 'node:crypto';

export type UnsubscribePayload = {
	clientId: string;
	contactId: string;
	email: string;
};

function encode(value: string) {
	return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string) {
	return Buffer.from(value, 'base64url').toString('utf8');
}

export function createUnsubscribeToken(secret: string, payload: UnsubscribePayload) {
	const body = `${payload.clientId}:${payload.contactId}:${payload.email.trim().toLowerCase()}`;
	const sig = createHmac('sha256', secret).update(body).digest('base64url');
	return `${encode(body)}.${sig}`;
}

export function parseUnsubscribeToken(secret: string, token: string): UnsubscribePayload | null {
	const [encoded, sig] = token.split('.');
	if (!encoded || !sig) return null;
	let body: string;
	try {
		body = decode(encoded);
	} catch {
		return null;
	}
	const expected = createHmac('sha256', secret).update(body).digest('base64url');
	const left = Buffer.from(sig);
	const right = Buffer.from(expected);
	if (left.length !== right.length || !timingSafeEqual(left, right)) return null;
	const [clientId, contactId, email] = body.split(':');
	if (!clientId || !contactId || !email) return null;
	return { clientId, contactId, email };
}
