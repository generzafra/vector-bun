import { ProviderError } from '@vector/contracts';
import type {
	EmailHealth,
	EmailProvider,
	NormalizedEmailEvent,
	SendEmailInput,
	SendEmailResult
} from './types';

export class DisabledEmailProvider implements EmailProvider {
	constructor(private readonly detail = 'Outbound email is paused') {}

	async send(_input: SendEmailInput): Promise<SendEmailResult> {
		throw new ProviderError(this.detail, 'EMAIL_SENDING_PAUSED');
	}

	async health(): Promise<EmailHealth> {
		return { ok: false, adapter: 'disabled', detail: this.detail };
	}

	async verifyWebhook(
		_headers: Record<string, string | undefined>,
		_payload: string
	): Promise<NormalizedEmailEvent[]> {
		throw new ProviderError('Email webhooks are disabled', 'EMAIL_SENDING_PAUSED');
	}
}
