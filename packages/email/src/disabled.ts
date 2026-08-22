import { ProviderError } from '@vector/contracts';
import type {
	EmailHealth,
	EmailProvider,
	EmailWebhookResult,
	SendEmailInput,
	SendEmailResult
} from './types';

export class DisabledEmailProvider implements EmailProvider {
	constructor(
		private readonly detail = 'Outbound email is paused',
		private readonly inner?: EmailProvider
	) {}

	async send(_input: SendEmailInput): Promise<SendEmailResult> {
		throw new ProviderError(this.detail, 'EMAIL_SENDING_PAUSED');
	}

	async health(): Promise<EmailHealth> {
		return { ok: false, adapter: 'disabled', detail: this.detail };
	}

	async verifyWebhook(
		headers: Record<string, string | undefined>,
		payload: string
	): Promise<EmailWebhookResult> {
		if (!this.inner) {
			throw new ProviderError('Email webhooks are disabled', 'EMAIL_SENDING_PAUSED');
		}
		return this.inner.verifyWebhook(headers, payload);
	}
}
