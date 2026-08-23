import { z } from 'zod';

export const leadCapturedInputSchema = z
	.object({
		organizationId: z.string().uuid(),
		clientId: z.string().uuid(),
		leadId: z.string().uuid(),
		requestId: z.string().min(1)
	})
	.strict();

export const nurtureStepInputSchema = z
	.object({
		organizationId: z.string().uuid(),
		clientId: z.string().uuid(),
		enrollmentId: z.string().uuid(),
		stepIndex: z.number().int().nonnegative(),
		requestId: z.string().min(1)
	})
	.strict();

export type LeadCapturedInput = z.infer<typeof leadCapturedInputSchema>;
export type NurtureStepInput = z.infer<typeof nurtureStepInputSchema>;

export const LEAD_CAPTURED_WORKFLOW = {
	name: 'lead-captured',
	trigger: 'form submitted / lead persisted',
	idempotencyKey: (input: Pick<LeadCapturedInput, 'clientId' | 'leadId'>) =>
		`lead-captured:${input.clientId}:${input.leadId}`,
	retry: { maxAttempts: 5, timeoutMs: 30_000 },
	concurrency: { key: 'clientId', limit: 4 }
} as const;

export const NURTURE_STEP_WORKFLOW = {
	name: 'nurture-step',
	trigger: 'enrollment nextStepAt reached',
	idempotencyKey: (input: Pick<NurtureStepInput, 'clientId' | 'enrollmentId' | 'stepIndex'>) =>
		`nurture-step:${input.clientId}:${input.enrollmentId}:${input.stepIndex}`,
	retry: { maxAttempts: 8, timeoutMs: 30_000 },
	concurrency: { key: 'clientId', limit: 4 }
} as const;

export const enrollEligibleInputSchema = z
	.object({
		organizationId: z.string().uuid(),
		clientId: z.string().uuid(),
		requestId: z.string().min(1)
	})
	.strict();

export const nurtureDueSweepInputSchema = z
	.object({
		organizationId: z.string().uuid(),
		clientId: z.string().uuid(),
		requestId: z.string().min(1)
	})
	.strict();

export type EnrollEligibleInput = z.infer<typeof enrollEligibleInputSchema>;
export type NurtureDueSweepInput = z.infer<typeof nurtureDueSweepInputSchema>;

export const ENROLL_ELIGIBLE_WORKFLOW = {
	name: 'enroll-eligible',
	trigger: 'sending domain became ready or operator backfill',
	idempotencyKey: (input: Pick<EnrollEligibleInput, 'clientId'> & { windowStart: string }) =>
		`enroll-eligible:${input.clientId}:${input.windowStart}`,
	retry: { maxAttempts: 5, timeoutMs: 60_000 },
	concurrency: { key: 'clientId', limit: 1 }
} as const;

export const inboundEmailPayloadSchema = z
	.object({
		providerEventId: z.string().min(1),
		providerMessageId: z.string().min(1),
		fromAddress: z.string().min(1),
		toAddress: z.string().min(1),
		subject: z.string(),
		textBody: z.string(),
		occurredAt: z.coerce.date()
	})
	.strict();

export const inboundEmailInputSchema = z
	.object({
		organizationId: z.string().uuid(),
		clientId: z.string().uuid(),
		providerEventId: z.string().min(1),
		requestId: z.string().min(1),
		inbound: inboundEmailPayloadSchema
	})
	.strict();

export type InboundEmailPayload = z.infer<typeof inboundEmailPayloadSchema>;
export type InboundEmailInput = z.infer<typeof inboundEmailInputSchema>;

export const INBOUND_EMAIL_WORKFLOW = {
	name: 'inbound-email',
	trigger: 'provider inbound webhook',
	idempotencyKey: (input: Pick<InboundEmailInput, 'clientId' | 'providerEventId'>) =>
		`inbound-email:${input.clientId}:${input.providerEventId}`,
	retry: { maxAttempts: 5, timeoutMs: 30_000 },
	concurrency: { key: 'clientId', limit: 4 }
} as const;

export const NURTURE_DUE_SWEEP_WORKFLOW = {
	name: 'nurture-due-sweep',
	trigger: 'operator or scheduled due-step sweep',
	idempotencyKey: (input: Pick<NurtureDueSweepInput, 'clientId'> & { windowStart: string }) =>
		`nurture-due:${input.clientId}:${input.windowStart}`,
	retry: { maxAttempts: 8, timeoutMs: 60_000 },
	concurrency: { key: 'clientId', limit: 1 }
} as const;

export const platformDueSweepInputSchema = z
	.object({
		requestId: z.string().min(1)
	})
	.strict();

export type PlatformDueSweepInput = z.infer<typeof platformDueSweepInputSchema>;

export const NURTURE_DUE_SWEEP_PLATFORM_WORKFLOW = {
	name: 'nurture-due-sweep-platform',
	trigger: 'scheduled due-step fan-out',
	idempotencyKey: (input: { windowStart: string }) => `nurture-due-platform:${input.windowStart}`,
	retry: { maxAttempts: 5, timeoutMs: 60_000 },
	concurrency: { key: 'platform', limit: 1 }
} as const;

export const socialPublishInputSchema = z
	.object({
		organizationId: z.string().uuid(),
		clientId: z.string().uuid(),
		postId: z.string().uuid(),
		accountIds: z.array(z.string().uuid()).min(1).max(8),
		requestId: z.string().min(1)
	})
	.strict();

export type SocialPublishInput = z.infer<typeof socialPublishInputSchema>;

export const SOCIAL_PUBLISH_WORKFLOW = {
	name: 'social-publish',
	trigger: 'approved or scheduled social post',
	idempotencyKey: (input: Pick<SocialPublishInput, 'clientId' | 'postId'> & { accounts: string }) =>
		`social-publish:${input.clientId}:${input.postId}:${input.accounts}`,
	retry: { maxAttempts: 5, timeoutMs: 30_000 },
	concurrency: { key: 'clientId', limit: 2 }
} as const;

export const socialDueSweepInputSchema = z
	.object({
		organizationId: z.string().uuid(),
		clientId: z.string().uuid(),
		requestId: z.string().min(1)
	})
	.strict();

export type SocialDueSweepInput = z.infer<typeof socialDueSweepInputSchema>;

export const SOCIAL_DUE_SWEEP_WORKFLOW = {
	name: 'social-due-sweep',
	trigger: 'operator or scheduled social publish sweep',
	idempotencyKey: (input: Pick<SocialDueSweepInput, 'clientId'> & { windowStart: string }) =>
		`social-due:${input.clientId}:${input.windowStart}`,
	retry: { maxAttempts: 8, timeoutMs: 60_000 },
	concurrency: { key: 'clientId', limit: 1 }
} as const;

export const SOCIAL_DUE_SWEEP_PLATFORM_WORKFLOW = {
	name: 'social-due-sweep-platform',
	trigger: 'scheduled social due-post fan-out',
	idempotencyKey: (input: { windowStart: string }) => `social-due-platform:${input.windowStart}`,
	retry: { maxAttempts: 5, timeoutMs: 60_000 },
	concurrency: { key: 'platform', limit: 1 }
} as const;

export const searchDueSweepInputSchema = z
	.object({
		organizationId: z.string().uuid(),
		clientId: z.string().uuid(),
		requestId: z.string().min(1)
	})
	.strict();

export type SearchDueSweepInput = z.infer<typeof searchDueSweepInputSchema>;

export const SEARCH_DUE_SWEEP_WORKFLOW = {
	name: 'search-due-sweep',
	trigger: 'operator or scheduled search cadence sweep',
	idempotencyKey: (input: Pick<SearchDueSweepInput, 'clientId'> & { windowStart: string }) =>
		`search-due:${input.clientId}:${input.windowStart}`,
	retry: { maxAttempts: 8, timeoutMs: 60_000 },
	concurrency: { key: 'clientId', limit: 1 }
} as const;

export const SEARCH_DUE_SWEEP_PLATFORM_WORKFLOW = {
	name: 'search-due-sweep-platform',
	trigger: 'scheduled search cadence fan-out',
	idempotencyKey: (input: { windowStart: string }) => `search-due-platform:${input.windowStart}`,
	retry: { maxAttempts: 5, timeoutMs: 60_000 },
	concurrency: { key: 'platform', limit: 1 }
} as const;

export const TENANT_WORKFLOW_NAMES = [
	LEAD_CAPTURED_WORKFLOW.name,
	NURTURE_STEP_WORKFLOW.name,
	ENROLL_ELIGIBLE_WORKFLOW.name,
	NURTURE_DUE_SWEEP_WORKFLOW.name,
	INBOUND_EMAIL_WORKFLOW.name,
	SOCIAL_PUBLISH_WORKFLOW.name,
	SOCIAL_DUE_SWEEP_WORKFLOW.name,
	SEARCH_DUE_SWEEP_WORKFLOW.name
] as const;

export type TenantWorkflowName = (typeof TENANT_WORKFLOW_NAMES)[number];
export type WorkflowName =
	| TenantWorkflowName
	| typeof NURTURE_DUE_SWEEP_PLATFORM_WORKFLOW.name
	| typeof SOCIAL_DUE_SWEEP_PLATFORM_WORKFLOW.name
	| typeof SEARCH_DUE_SWEEP_PLATFORM_WORKFLOW.name;
