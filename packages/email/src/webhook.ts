import { createHmac, timingSafeEqual } from 'node:crypto';
import { UnauthorizedError, ValidationError } from '@vector/contracts';
import type { EmailWebhookResult, NormalizedEmailEvent, NormalizedInboundEmail } from './types';

const EVENT_MAP = {
	'email.sent': 'sent',
	'email.delivered': 'delivered',
	'email.bounced': 'bounced',
	'email.complained': 'complained',
	'email.opened': 'opened',
	'email.clicked': 'clicked'
} as const;

const INBOUND_TEXT_MAX = 8_000;

type ResendWebhookBody = {
	type?: string;
	created_at?: string;
	data?: {
		email_id?: string;
		from?: string;
		to?: string[] | string;
		subject?: string;
		text?: string;
		html?: string;
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

export function inboundTextFromPayload(text?: string, html?: string) {
	const raw = (text ?? '').trim() || html || '';
	return stripTags(raw).slice(0, INBOUND_TEXT_MAX);
}

function stripTags(html: string) {
	return html
		.replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, ' ')
		.replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, ' ')
		.replace(/<[^>]+>/g, ' ')
		.replace(/\s+/g, ' ')
		.trim();
}

function firstAddress(value: string[] | string | undefined) {
	if (Array.isArray(value)) return value[0];
	return value;
}

function normalizeDelivery(
	body: ResendWebhookBody,
	fallbackId: string
): NormalizedEmailEvent | null {
	const mapped = body.type ? EVENT_MAP[body.type as keyof typeof EVENT_MAP] : undefined;
	const providerMessageId = body.data?.email_id;
	if (!mapped || !providerMessageId) return null;
	return {
		providerEventId: fallbackId,
		providerMessageId,
		type: mapped,
		occurredAt: new Date(body.created_at ?? body.data?.created_at ?? Date.now()),
		recipient: firstAddress(body.data?.to)
	};
}

function normalizeInbound(
	body: ResendWebhookBody,
	fallbackId: string
): NormalizedInboundEmail | null {
	if (body.type !== 'email.received') return null;
	const providerMessageId = body.data?.email_id;
	const fromAddress = body.data?.from?.trim().toLowerCase();
	const toAddress = firstAddress(body.data?.to)?.trim().toLowerCase();
	if (!providerMessageId || !fromAddress || !toAddress) return null;
	return {
		providerEventId: fallbackId,
		providerMessageId,
		fromAddress,
		toAddress,
		subject: (body.data?.subject ?? '(no subject)').slice(0, 500),
		textBody: inboundTextFromPayload(body.data?.text, body.data?.html),
		occurredAt: new Date(body.created_at ?? body.data?.created_at ?? Date.now())
	};
}

export function parseResendWebhookPayload(
	payload: string,
	providerEventId: string
): EmailWebhookResult {
	let parsed: unknown;
	try {
		parsed = JSON.parse(payload) as unknown;
	} catch {
		throw new ValidationError('Invalid webhook payload');
	}
	const items = Array.isArray(parsed) ? parsed : [parsed];
	const delivery: NormalizedEmailEvent[] = [];
	const inbound: NormalizedInboundEmail[] = [];
	items.forEach((item, index) => {
		const body = item as ResendWebhookBody;
		const id = `${providerEventId}:${index}`;
		const inboundEvent = normalizeInbound(body, id);
		if (inboundEvent) {
			inbound.push(inboundEvent);
			return;
		}
		const event = normalizeDelivery(body, id);
		if (event) delivery.push(event);
	});
	if (delivery.length === 0 && inbound.length === 0) {
		throw new ValidationError('Unsupported webhook event');
	}
	return { delivery, inbound };
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
