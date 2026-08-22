import { sanitizeAnalyticsProperties } from './sanitize';
import type { AnalyticsHealth, AnalyticsProvider, AnalyticsTrackInput } from './types';

export class MemoryAnalyticsProvider implements AnalyticsProvider {
	readonly tracks: AnalyticsTrackInput[] = [];

	async track(input: AnalyticsTrackInput) {
		if (input.isTest) return;
		this.tracks.push({
			...input,
			properties: sanitizeAnalyticsProperties(input.properties)
		});
	}

	async health(): Promise<AnalyticsHealth> {
		return { ok: true, adapter: 'memory', detail: `${this.tracks.length} events` };
	}
}
