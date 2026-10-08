import { ProviderError } from '@vector/contracts';
import { logInfo } from '@vector/observability';
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

type StoredLead = {
	clientId: string;
	leadId: string;
	contactId: string;
	externalId: string;
	idempotencyKey: string;
	displayName: string;
	email: string | null;
	stage: string;
};

export class MemoryCrmProvider implements CRMProvider {
	readonly metrics = { calls: 0, failures: 0 };
	private readonly leads = new Map<string, StoredLead>();
	private readonly contacts = new Map<string, CrmPushResult>();
	private readonly deals: CrmDeal[] = [];

	async pushLead(input: CrmLeadPush): Promise<CrmPushResult> {
		return this.remember('crm.push_lead', input.clientId, input.leadId, () => {
			assertCrmDeadline(input);
			const key = `${input.clientId}:${input.idempotencyKey}`;
			const existing = this.leads.get(key);
			if (existing) {
				return {
					adapter: 'memory' as const,
					status: 'stored' as const,
					externalId: existing.externalId,
					idempotencyKey: input.idempotencyKey,
					detail: 'Already stored for this client.'
				};
			}
			const externalId = `mem-crm-${this.leads.size + 1}`;
			this.leads.set(key, {
				clientId: input.clientId,
				leadId: input.leadId,
				contactId: input.contactId,
				externalId,
				idempotencyKey: input.idempotencyKey,
				displayName: input.displayName,
				email: input.email,
				stage: input.stage
			});
			return {
				adapter: 'memory' as const,
				status: 'stored' as const,
				externalId,
				idempotencyKey: input.idempotencyKey,
				detail: 'Stored in the memory CRM.'
			};
		});
	}

	async syncContact(input: CrmContactSync): Promise<CrmPushResult> {
		return this.remember('crm.sync_contact', input.clientId, input.leadId, () => {
			assertCrmDeadline(input);
			const key = `${input.clientId}:${input.idempotencyKey}`;
			const existing = this.contacts.get(key);
			if (existing) return existing;
			const result: CrmPushResult = {
				adapter: 'memory',
				status: 'stored',
				externalId: `mem-contact-${this.contacts.size + 1}`,
				idempotencyKey: input.idempotencyKey,
				detail: 'Contact stored in the memory CRM.'
			};
			this.contacts.set(key, result);
			return result;
		});
	}

	async pullStages(input: CrmPullRequest): Promise<CrmStage[]> {
		return this.remember('crm.pull_stages', input.clientId, input.leadId, () => {
			assertCrmDeadline(input);
			return [...this.leads.values()]
				.filter((row) => row.clientId === input.clientId)
				.filter((row) => !input.leadId || row.leadId === input.leadId)
				.map((row) => ({
					clientId: row.clientId,
					leadId: row.leadId,
					externalId: row.externalId,
					stage: row.stage
				}));
		});
	}

	async pullDeals(input: CrmPullRequest): Promise<CrmDeal[]> {
		return this.remember('crm.pull_deals', input.clientId, input.leadId, () => {
			assertCrmDeadline(input);
			return this.deals.filter(
				(row) => row.clientId === input.clientId && (!input.leadId || row.leadId === input.leadId)
			);
		});
	}

	async pullRevenue(input: CrmPullRequest): Promise<CrmRevenue[]> {
		const deals = await this.pullDeals(input);
		return deals.flatMap((deal) => {
			if (deal.amountMinor == null || deal.currency == null) return [];
			this.assertMinor(deal.amountMinor);
			return [
				{
					clientId: deal.clientId,
					leadId: deal.leadId,
					externalId: deal.externalId,
					amountMinor: deal.amountMinor,
					currency: deal.currency
				}
			];
		});
	}

	async health(): Promise<CrmHealth> {
		return {
			ok: true,
			adapter: 'memory',
			external: false,
			detail: 'No external CRM is connected. Sales stay recorded here.'
		};
	}

	seedDeal(deal: CrmDeal) {
		if (deal.amountMinor != null) this.assertMinor(deal.amountMinor);
		this.deals.push(deal);
	}

	private assertMinor(amountMinor: number) {
		if (!Number.isInteger(amountMinor) || amountMinor < 0) {
			throw new ProviderError('CRM money must be integer minor units', 'CRM_MONEY');
		}
	}

	private async remember<T>(
		operation: string,
		clientId: string,
		leadId: string | undefined,
		run: () => T
	): Promise<T> {
		this.metrics.calls += 1;
		try {
			const result = run();
			logInfo(operation, { clientId, leadId: leadId ?? null, adapter: 'memory' });
			return result;
		} catch (error) {
			this.metrics.failures += 1;
			throw error;
		}
	}
}
