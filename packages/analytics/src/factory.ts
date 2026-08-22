import { env } from '@vector/config';
import { DisabledAnalyticsProvider } from './disabled';
import { PostHogAnalyticsProvider } from './posthog';
import type { AnalyticsProvider } from './types';

export function createAnalyticsProvider(): AnalyticsProvider {
	if (env.POSTHOG_API_KEY) return new PostHogAnalyticsProvider();
	return new DisabledAnalyticsProvider();
}
