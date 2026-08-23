import { schedules, task } from '@trigger.dev/sdk';
import {
	SEARCH_DUE_SWEEP_PLATFORM_WORKFLOW,
	SEARCH_DUE_SWEEP_WORKFLOW,
	type SearchDueSweepInput
} from '@vector/automation';
import { processPlatformDueSearchSweep, processSearchDueSweepWorkflow } from '@vector/domain';

export const searchDueSweepTask = task({
	id: SEARCH_DUE_SWEEP_WORKFLOW.name,
	retry: { maxAttempts: SEARCH_DUE_SWEEP_WORKFLOW.retry.maxAttempts },
	run: async (payload: SearchDueSweepInput) => processSearchDueSweepWorkflow(payload)
});

export const searchDueSweepPlatformTask = schedules.task({
	id: SEARCH_DUE_SWEEP_PLATFORM_WORKFLOW.name,
	cron: '0 6 * * *',
	run: async () =>
		processPlatformDueSearchSweep({
			requestId: crypto.randomUUID()
		})
});
