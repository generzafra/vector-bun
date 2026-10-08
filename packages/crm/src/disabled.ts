import { assertCrmDeadline } from './deadline';
import type {
	CRMProvider,
	CrmContactSync,
	CrmDeal,
	CrmHealth,
	CrmLeadPush,
	CrmPullRequest,
	CrmPushResult,
	CrmRevenue,
	CrmStage
} from './types';

const detail = 'No external CRM is connected. Sales stay recorded here.';

function unsupported(idempotencyKey: string): CrmPushResult {
	return {
		adapter: 'disabled',
		status: 'unsupported',
		externalId: null,
		idempotencyKey,
		detail
	};
}

export class DisabledCrmProvider implements CRMProvider {
	readonly metrics = { calls: 0, failures: 0 };

	async pushLead(input: CrmLeadPush): Promise<CrmPushResult> {
		this.metrics.calls += 1;
		assertCrmDeadline(input);
		return unsupported(input.idempotencyKey);
	}

	async syncContact(input: CrmContactSync): Promise<CrmPushResult> {
		this.metrics.calls += 1;
		assertCrmDeadline(input);
		return unsupported(input.idempotencyKey);
	}

	async pullStages(input: CrmPullRequest): Promise<CrmStage[]> {
		this.metrics.calls += 1;
		assertCrmDeadline(input);
		return [];
	}

	async pullDeals(input: CrmPullRequest): Promise<CrmDeal[]> {
		this.metrics.calls += 1;
		assertCrmDeadline(input);
		return [];
	}

	async pullRevenue(input: CrmPullRequest): Promise<CrmRevenue[]> {
		this.metrics.calls += 1;
		assertCrmDeadline(input);
		return [];
	}

	async health(): Promise<CrmHealth> {
		return { ok: true, adapter: 'disabled', external: false, detail };
	}
}
