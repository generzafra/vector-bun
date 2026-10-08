export type CrmAdapterName = 'memory' | 'disabled';

export type CrmHealth = {
	ok: boolean;
	adapter: CrmAdapterName;
	external: boolean;
	detail: string;
};

export type CrmDeadline = {
	timeoutMs?: number;
	signal?: AbortSignal;
};

export type CrmLeadPush = CrmDeadline & {
	clientId: string;
	leadId: string;
	contactId: string;
	idempotencyKey: string;
	displayName: string;
	email: string | null;
	stage: string;
};

export type CrmContactSync = CrmDeadline & {
	clientId: string;
	contactId: string;
	leadId: string;
	idempotencyKey: string;
	displayName: string;
	email: string | null;
};

export type CrmPushResult = {
	adapter: CrmAdapterName;
	status: 'stored' | 'unsupported';
	externalId: string | null;
	idempotencyKey: string;
	detail: string;
};

export type CrmPullRequest = CrmDeadline & {
	clientId: string;
	leadId?: string;
};

export type CrmStage = {
	clientId: string;
	leadId: string;
	externalId: string;
	stage: string;
};

export type CrmDeal = {
	clientId: string;
	leadId: string;
	externalId: string;
	name: string;
	amountMinor: number | null;
	currency: string | null;
};

export type CrmRevenue = {
	clientId: string;
	leadId: string;
	externalId: string;
	amountMinor: number;
	currency: string;
};

export interface CRMProvider {
	pushLead(input: CrmLeadPush): Promise<CrmPushResult>;
	syncContact(input: CrmContactSync): Promise<CrmPushResult>;
	pullStages(input: CrmPullRequest): Promise<CrmStage[]>;
	pullDeals(input: CrmPullRequest): Promise<CrmDeal[]>;
	pullRevenue(input: CrmPullRequest): Promise<CrmRevenue[]>;
	health(): Promise<CrmHealth>;
}
