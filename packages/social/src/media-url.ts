import { createHmac, timingSafeEqual } from 'node:crypto';

export type SocialMediaGrant = {
	clientId: string;
	storageKey: string;
	mimeType: string;
	exp: number;
};

function encode(value: string) {
	return Buffer.from(value, 'utf8').toString('base64url');
}

function decode(value: string) {
	return Buffer.from(value, 'base64url').toString('utf8');
}

export function createSocialMediaGrant(secret: string, grant: SocialMediaGrant) {
	const body = `${grant.clientId}:${encodeURIComponent(grant.storageKey)}:${grant.mimeType}:${grant.exp}`;
	const sig = createHmac('sha256', secret).update(body).digest('base64url');
	return `${encode(body)}.${sig}`;
}

export function parseSocialMediaGrant(secret: string, token: string): SocialMediaGrant | null {
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
	const [clientId, encodedKey, mimeType, expRaw] = body.split(':');
	const exp = Number(expRaw);
	if (!clientId || !encodedKey || !mimeType || !Number.isFinite(exp) || exp <= Date.now()) {
		return null;
	}
	return {
		clientId,
		storageKey: decodeURIComponent(encodedKey),
		mimeType,
		exp
	};
}

export function socialMediaPublicUrl(origin: string, token: string) {
	return `${origin.replace(/\/$/, '')}/v1/public/social-media?token=${encodeURIComponent(token)}`;
}
