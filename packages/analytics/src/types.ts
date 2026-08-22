import type { CoreEventName } from './taxonomy';

export type AnalyticsTrackInput = {
	eventId: string;
	name: CoreEventName;
	clientId: string;
	visitorId?: string;
	occurredAt: Date;
	isTest: boolean;
	properties: Record<string, string | number | boolean | null | undefined>;
};

export type AnalyticsHealth = {
	ok: boolean;
	adapter: 'disabled' | 'posthog';
	detail: string;
};

export interface AnalyticsProvider {
	track(input: AnalyticsTrackInput): Promise<void>;
	health(): Promise<AnalyticsHealth>;
}
