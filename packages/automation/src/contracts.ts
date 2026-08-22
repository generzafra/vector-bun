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

export const TENANT_WORKFLOW_NAMES = [
	LEAD_CAPTURED_WORKFLOW.name,
	NURTURE_STEP_WORKFLOW.name,
	ENROLL_ELIGIBLE_WORKFLOW.name,
	NURTURE_DUE_SWEEP_WORKFLOW.name,
	INBOUND_EMAIL_WORKFLOW.name
] as const;

export type TenantWorkflowName = (typeof TENANT_WORKFLOW_NAMES)[number];
export type WorkflowName = TenantWorkflowName | typeof NURTURE_DUE_SWEEP_PLATFORM_WORKFLOW.name;
