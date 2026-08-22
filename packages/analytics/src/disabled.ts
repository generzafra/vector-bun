import type { AnalyticsProvider } from './types';

export class DisabledAnalyticsProvider implements AnalyticsProvider {
	async track() {}

	async health() {
		return {
			ok: true,
			adapter: 'disabled' as const,
			detail: 'PostHog is not configured. Postgres remains the source of truth.'
		};
	}
}
