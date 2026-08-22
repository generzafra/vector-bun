import { ValidationError } from '@vector/contracts';
import { parseResendWebhookPayload } from './webhook';
import type {
	EmailHealth,
	EmailProvider,
	NormalizedEmailEvent,
	SendEmailInput,
	SendEmailResult
} from './types';

export class MemoryEmailProvider implements EmailProvider {
	readonly sent: SendEmailInput[] = [];
	readonly skipped: SendEmailInput[] = [];
	readonly events: NormalizedEmailEvent[] = [];

	async send(input: SendEmailInput): Promise<SendEmailResult> {
		if (input.isTest) {
			this.skipped.push(input);
			return { providerMessageId: `mem-skip-${input.messageId}`, accepted: false, skipped: true };
		}
		this.sent.push(input);
		return { providerMessageId: `mem-${input.messageId}`, accepted: true };
	}

	async health(): Promise<EmailHealth> {
		return {
			ok: true,
			adapter: 'memory',
			detail: `${this.sent.length} accepted, ${this.skipped.length} skipped`
		};
	}

	async verifyWebhook(
		_headers: Record<string, string | undefined>,
		payload: string
	): Promise<NormalizedEmailEvent[]> {
		const events = parseResendWebhookPayload(payload, `mem-${crypto.randomUUID()}`);
		this.events.push(...events);
		return events;
	}

	emit(event: NormalizedEmailEvent) {
		this.events.push(event);
		return event;
	}

	reset() {
		this.sent.length = 0;
		this.skipped.length = 0;
		this.events.length = 0;
	}
}

export function parseMemoryWebhook(payload: string) {
	if (!payload.trim()) throw new ValidationError('Webhook payload is required');
	return parseResendWebhookPayload(payload, 'memory');
}
