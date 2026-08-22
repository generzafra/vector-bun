import { schedules, task } from '@trigger.dev/sdk';
import {
	ENROLL_ELIGIBLE_WORKFLOW,
	INBOUND_EMAIL_WORKFLOW,
	LEAD_CAPTURED_WORKFLOW,
	NURTURE_DUE_SWEEP_PLATFORM_WORKFLOW,
	NURTURE_DUE_SWEEP_WORKFLOW,
	NURTURE_STEP_WORKFLOW,
	type EnrollEligibleInput,
	type InboundEmailInput,
	type LeadCapturedInput,
	type NurtureDueSweepInput,
	type NurtureStepInput
} from '@vector/automation';
import {
	enrollEligibleLeads,
	processDueNurtureSteps,
	processInboundEmailWorkflow,
	processLeadCapturedWorkflow,
	processNurtureStepWorkflow,
	processPlatformDueNurtureSweep
} from '@vector/domain';

function tenantFrom(input: { organizationId: string; clientId: string; requestId: string }) {
	return {
		organizationId: input.organizationId,
		clientId: input.clientId,
		roleIds: [],
		requestId: input.requestId
	};
}

export const leadCapturedTask = task({
	id: LEAD_CAPTURED_WORKFLOW.name,
	retry: { maxAttempts: LEAD_CAPTURED_WORKFLOW.retry.maxAttempts },
	run: async (payload: LeadCapturedInput) => processLeadCapturedWorkflow(payload)
});

export const nurtureStepTask = task({
	id: NURTURE_STEP_WORKFLOW.name,
	retry: { maxAttempts: NURTURE_STEP_WORKFLOW.retry.maxAttempts },
	run: async (payload: NurtureStepInput) => processNurtureStepWorkflow(payload)
});

export const enrollEligibleTask = task({
	id: ENROLL_ELIGIBLE_WORKFLOW.name,
	retry: { maxAttempts: ENROLL_ELIGIBLE_WORKFLOW.retry.maxAttempts },
	run: async (payload: EnrollEligibleInput) => enrollEligibleLeads(tenantFrom(payload))
});

export const nurtureDueSweepTask = task({
	id: NURTURE_DUE_SWEEP_WORKFLOW.name,
	retry: { maxAttempts: NURTURE_DUE_SWEEP_WORKFLOW.retry.maxAttempts },
	run: async (payload: NurtureDueSweepInput) => processDueNurtureSteps(tenantFrom(payload))
});

export const inboundEmailTask = task({
	id: INBOUND_EMAIL_WORKFLOW.name,
	retry: { maxAttempts: INBOUND_EMAIL_WORKFLOW.retry.maxAttempts },
	run: async (payload: InboundEmailInput) => processInboundEmailWorkflow(payload)
});

export const nurtureDueSweepPlatformTask = schedules.task({
	id: NURTURE_DUE_SWEEP_PLATFORM_WORKFLOW.name,
	cron: '*/5 * * * *',
	run: async () =>
		processPlatformDueNurtureSweep({
			requestId: crypto.randomUUID()
		})
});
