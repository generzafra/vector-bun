import { schedules, task } from '@trigger.dev/sdk';
import {
	SOCIAL_DUE_SWEEP_PLATFORM_WORKFLOW,
	SOCIAL_DUE_SWEEP_WORKFLOW,
	SOCIAL_PUBLISH_WORKFLOW,
	type SocialDueSweepInput,
	type SocialPublishInput
} from '@vector/automation';
import {
	processDueSocialPublishes,
	processPlatformDueSocialSweep,
	processSocialPublishWorkflow
} from '@vector/domain';

function tenantFrom(input: { organizationId: string; clientId: string; requestId: string }) {
	return {
		organizationId: input.organizationId,
		clientId: input.clientId,
		roleIds: [],
		requestId: input.requestId
	};
}

export const socialPublishTask = task({
	id: SOCIAL_PUBLISH_WORKFLOW.name,
	retry: { maxAttempts: SOCIAL_PUBLISH_WORKFLOW.retry.maxAttempts },
	run: async (payload: SocialPublishInput) => processSocialPublishWorkflow(payload)
});

export const socialDueSweepTask = task({
	id: SOCIAL_DUE_SWEEP_WORKFLOW.name,
	retry: { maxAttempts: SOCIAL_DUE_SWEEP_WORKFLOW.retry.maxAttempts },
	run: async (payload: SocialDueSweepInput) => processDueSocialPublishes(tenantFrom(payload))
});

export const socialDueSweepPlatformTask = schedules.task({
	id: SOCIAL_DUE_SWEEP_PLATFORM_WORKFLOW.name,
	cron: '*/5 * * * *',
	run: async () =>
		processPlatformDueSocialSweep({
			requestId: crypto.randomUUID()
		})
});
