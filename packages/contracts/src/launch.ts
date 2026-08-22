import { z } from 'zod';

export const LAUNCH_STATES = [
	'draft',
	'onboarding',
	'blocked',
	'vector_ready',
	'generating',
	'qa',
	'awaiting_client_approval',
	'awaiting_domain',
	'launching',
	'live',
	'launch_failed',
	'paused'
] as const;

export type LaunchState = (typeof LAUNCH_STATES)[number];

export const LAUNCH_CLASSES = ['A', 'B', 'C', 'D'] as const;
export type LaunchClass = (typeof LAUNCH_CLASSES)[number];

export const READINESS_ITEM_STATUSES = ['pending', 'complete', 'not_applicable'] as const;
export type ReadinessItemStatus = (typeof READINESS_ITEM_STATUSES)[number];

export const ALLOWED_LAUNCH_TRANSITIONS: Record<LaunchState, LaunchState[]> = {
	draft: ['onboarding', 'paused'],
	onboarding: ['blocked', 'vector_ready', 'paused'],
	blocked: ['onboarding', 'vector_ready', 'paused'],
	vector_ready: ['generating', 'blocked', 'paused'],
	generating: ['qa', 'blocked', 'launch_failed', 'paused'],
	qa: ['awaiting_client_approval', 'generating', 'paused'],
	awaiting_client_approval: ['awaiting_domain', 'qa', 'paused'],
	awaiting_domain: ['launching', 'paused'],
	launching: ['live', 'launch_failed', 'paused'],
	live: ['paused'],
	launch_failed: ['onboarding', 'generating', 'paused'],
	paused: [
		'onboarding',
		'blocked',
		'vector_ready',
		'generating',
		'qa',
		'awaiting_client_approval',
		'awaiting_domain',
		'launching'
	]
};

export const LIVE_REQUIRED_ITEM_KEYS = ['domain.production'] as const;

export type ReadinessItemSource = 'automatic' | 'operator';

export type ReadinessCatalogItem = {
	key: string;
	category: string;
	label: string;
	blocking: boolean;
	source: ReadinessItemSource;
};

export const READINESS_CATALOG: ReadinessCatalogItem[] = [
	{
		key: 'brand.identity',
		category: 'brand',
		label: 'Brand display name',
		blocking: true,
		source: 'automatic'
	},
	{
		key: 'brand.narrative',
		category: 'brand',
		label: 'Audience, offer, and primary conversion',
		blocking: true,
		source: 'automatic'
	},
	{
		key: 'services.present',
		category: 'business',
		label: 'At least one service',
		blocking: true,
		source: 'automatic'
	},
	{
		key: 'offers.present',
		category: 'business',
		label: 'At least one offer',
		blocking: false,
		source: 'automatic'
	},
	{
		key: 'claims.approved',
		category: 'claims',
		label: 'At least one approved claim',
		blocking: true,
		source: 'automatic'
	},
	{
		key: 'claims.prohibited',
		category: 'claims',
		label: 'At least one prohibited claim',
		blocking: true,
		source: 'automatic'
	},
	{
		key: 'funnel.preview_published',
		category: 'funnel',
		label: 'Published preview funnel',
		blocking: true,
		source: 'automatic'
	},
	{
		key: 'compliance.reviewed',
		category: 'compliance',
		label: 'Compliance review recorded',
		blocking: false,
		source: 'operator'
	},
	{
		key: 'approvals.contact_recorded',
		category: 'approvals',
		label: 'Approval contact recorded',
		blocking: false,
		source: 'operator'
	},
	{
		key: 'legal.links_reviewed',
		category: 'compliance',
		label: 'Legal links reviewed',
		blocking: false,
		source: 'operator'
	},
	{
		key: 'competitors.recorded',
		category: 'business',
		label: 'Competitors recorded',
		blocking: false,
		source: 'operator'
	},
	{
		key: 'domain.production',
		category: 'domain',
		label: 'Production domain active',
		blocking: false,
		source: 'automatic'
	},
	{
		key: 'email.sending',
		category: 'email',
		label: 'Email sending access',
		blocking: false,
		source: 'automatic'
	},
	{
		key: 'social.access',
		category: 'social',
		label: 'Social publishing access',
		blocking: false,
		source: 'automatic'
	},
	{
		key: 'analytics.connected',
		category: 'analytics',
		label: 'Analytics connected',
		blocking: false,
		source: 'automatic'
	},
	{
		key: 'assets.uploaded',
		category: 'brand',
		label: 'Brand assets uploaded',
		blocking: false,
		source: 'automatic'
	}
];

export const OPERATOR_READINESS_KEYS = READINESS_CATALOG.filter(
	(item) => item.source === 'operator'
).map((item) => item.key) as [string, ...string[]];

export const transitionLaunchSchema = z
	.object({
		to: z.enum(LAUNCH_STATES),
		reason: z.string().min(1).max(400),
		launchClass: z.enum(LAUNCH_CLASSES).optional()
	})
	.strict();

export const completeReadinessItemSchema = z
	.object({
		key: z.enum(OPERATOR_READINESS_KEYS),
		note: z.string().max(400).optional()
	})
	.strict();

export const launchClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();
