import { env } from '@vector/config';
import { logError } from '@vector/observability';
import { sanitizeAnalyticsProperties } from './sanitize';
import type { AnalyticsProvider, AnalyticsTrackInput } from './types';

export class PostHogAnalyticsProvider implements AnalyticsProvider {
	constructor(
		private readonly apiKey = env.POSTHOG_API_KEY,
		private readonly host = env.POSTHOG_HOST,
		private readonly send: typeof fetch = fetch
	) {}

	async track(input: AnalyticsTrackInput) {
		if (!this.apiKey || input.isTest) return;
		const controller = new AbortController();
		const timer = setTimeout(() => controller.abort(), 2000);
		try {
			const response = await this.send(`${this.host.replace(/\/$/, '')}/capture/`, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				signal: controller.signal,
				body: JSON.stringify({
					api_key: this.apiKey,
					event: input.name,
					distinct_id: input.visitorId ?? input.eventId,
					timestamp: input.occurredAt.toISOString(),
					properties: {
						...sanitizeAnalyticsProperties(input.properties),
						client_id: input.clientId,
						event_id: input.eventId,
						$ip: null
					}
				})
			});
			if (!response.ok) {
				logError('analytics.posthog.track', new Error(`status ${response.status}`), {
					clientId: input.clientId,
					event: input.name
				});
			}
		} catch (error) {
			logError('analytics.posthog.track', error, {
				clientId: input.clientId,
				event: input.name
			});
		} finally {
			clearTimeout(timer);
		}
	}

	async health() {
		if (!this.apiKey) {
			return {
				ok: true,
				adapter: 'disabled' as const,
				detail: 'POSTHOG_API_KEY is unset'
			};
		}
		return {
			ok: true,
			adapter: 'posthog' as const,
			detail: this.host
		};
	}
}
