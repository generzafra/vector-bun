import { createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedError, ValidationError } from '@vector/contracts';
import type { NormalizedEmailEvent } from './types';

const EVENT_MAP = {
	'email.sent': 'sent',
	'email.delivered': 'delivered',
	'email.bounced': 'bounced',
	'email.complained': 'complained',
	'email.opened': 'opened',
	'email.clicked': 'clicked'
} as const;

type ResendWebhookBody = {
	type?: string;
	created_at?: string;
	data?: {
		email_id?: string;
		to?: string[] | string;
		created_at?: string;
	};
};

export function verifyResendSignature(input: {
	secret: string;
	payload: string;
	svixId: string;
	svixTimestamp: string;
	svixSignature: string;
}) {
	const raw = input.secret.startsWith('whsec_') ? input.secret.slice(6) : input.secret;
	const key = Buffer.from(raw, 'base64');
	const signed = `${input.svixId}.${input.svixTimestamp}.${input.payload}`;
	const expected = createHmac('sha256', key).update(signed).digest('base64');
	const candidates = input.svixSignature.split(/\s+/).map((part) => {
		const comma = part.indexOf(',');
		return comma === -1 ? part : part.slice(comma + 1);
	});
	return candidates.some((candidate) => {
		const left = Buffer.from(candidate);
		const right = Buffer.from(expected);
		return left.length === right.length && timingSafeEqual(left, right);
	});
}

function normalizeOne(body: ResendWebhookBody, fallbackId: string): NormalizedEmailEvent | null {
	const mapped = body.type ? EVENT_MAP[body.type as keyof typeof EVENT_MAP] : undefined;
	const providerMessageId = body.data?.email_id;
	if (!mapped || !providerMessageId) return null;
	const recipient = Array.isArray(body.data?.to) ? body.data.to[0] : body.data?.to;
	return {
		providerEventId: fallbackId,
		providerMessageId,
		type: mapped,
		occurredAt: new Date(body.created_at ?? body.data?.created_at ?? Date.now()),
		recipient
	};
}

export function parseResendWebhookPayload(
	payload: string,
	providerEventId: string
): NormalizedEmailEvent[] {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload) as unknown;
	} catch {
		throw new ValidationError('Invalid webhook payload');
	}
	const items = Array.isArray(parsed) ? parsed : [parsed];
	const events: NormalizedEmailEvent[] = [];
	items.forEach((item, index) => {
		const event = normalizeOne(item as ResendWebhookBody, `${providerEventId}:${index}`);
		if (event) events.push(event);
	});
	if (events.length === 0) throw new ValidationError('Unsupported webhook event');
	return events;
}

export function requireResendWebhookEvents(
	headers: Record<string, string | undefined>,
	payload: string,
	secret: string | undefined
) {
	if (!secret) throw new UnauthorizedError('Resend webhook secret is not configured');
	const svixId = headers['svix-id'] ?? headers['Svix-Id'];
	const svixTimestamp = headers['svix-timestamp'] ?? headers['Svix-Timestamp'];
	const svixSignature = headers['svix-signature'] ?? headers['Svix-Signature'];
	if (!svixId || !svixTimestamp || !svixSignature) {
		throw new UnauthorizedError('Webhook signature is missing');
	}
	const ok = verifyResendSignature({
		secret,
		payload,
		svixId,
		svixTimestamp,
		svixSignature
	});
	if (!ok) throw new UnauthorizedError('Webhook signature is invalid');
	return parseResendWebhookPayload(payload, svixId);
}
