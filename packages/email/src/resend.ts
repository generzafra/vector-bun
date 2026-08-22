import { ProviderError, ValidationError } from '@vector/contracts';
import { logError, logInfo } from '@vector/observability';
import { requireResendWebhookEvents } from './webhook';
import type { EmailHealth, EmailProvider, SendEmailInput, SendEmailResult } from './types';

const TIMEOUT_MS = 10_000;

export class ResendEmailProvider implements EmailProvider {
	constructor(
		private readonly apiKey: string,
		private readonly webhookSecret?: string,
		private readonly sendHttp: typeof fetch = fetch
	) {}

	async send(input: SendEmailInput): Promise<SendEmailResult> {
		if (input.isTest) {
			return {
				providerMessageId: `resend-skip-${input.messageId}`,
				accepted: false,
				skipped: true
			};
		}
		if (!this.apiKey) throw new ProviderError('Resend API key is missing', 'PROVIDER_CONFIG');
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
		try {
			const response = await this.sendHttp('https://api.resend.com/emails', {
				method: 'POST',
				signal: controller.signal,
				headers: {
					authorization: `Bearer ${this.apiKey}`,
					'content-type': 'application/json',
					'idempotency-key': input.idempotencyKey
				},
				body: JSON.stringify({
					from: `${input.fromName} <${input.fromAddress}>`,
					to: [input.to],
					subject: input.subject,
					html: input.html,
					text: input.text,
					headers: {
						'List-Unsubscribe': `<${input.unsubscribeUrl}>`,
						'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click'
					},
					tags: [
						{ name: 'client_id', value: input.clientId },
						{ name: 'message_id', value: input.messageId }
					]
				})
			});
			if (!response.ok) {
				logError('email.resend.send', new Error(`status ${response.status}`), {
					clientId: input.clientId,
					status: response.status
				});
				throw new ProviderError('Resend send failed', 'PROVIDER_TEMPORARY_FAILURE');
			}
			const body = (await response.json()) as { id?: string };
			if (!body.id) throw new ValidationError('Resend did not return a message id');
			logInfo('email.resend.send', { clientId: input.clientId, accepted: true });
			return { providerMessageId: body.id, accepted: true };
		} catch (error) {
			if (error instanceof ProviderError || error instanceof ValidationError) throw error;
			logError('email.resend.send', error, { clientId: input.clientId });
			throw new ProviderError('Resend send failed', 'PROVIDER_TEMPORARY_FAILURE');
		} finally {
			clearTimeout(timer);
		}
	}

	async health(): Promise<EmailHealth> {
		return { ok: true, adapter: 'resend', detail: 'Resend API configured' };
	}

	async verifyWebhook(headers: Record<string, string | undefined>, payload: string) {
		return requireResendWebhookEvents(headers, payload, this.webhookSecret);
	}
}
