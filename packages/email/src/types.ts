export type EmailAdapterName = 'memory' | 'resend' | 'disabled';

export type SendEmailInput = {
	clientId: string;
	messageId: string;
	idempotencyKey: string;
	fromAddress: string;
	fromName: string;
	to: string;
	subject: string;
	html: string;
	text: string;
	unsubscribeUrl: string;
	isTest: boolean;
};

export type SendEmailResult = {
	providerMessageId: string;
	accepted: boolean;
	skipped?: boolean;
};

export type EmailHealth = {
	ok: boolean;
	adapter: EmailAdapterName;
	detail: string;
};

export type NormalizedEmailEvent = {
	providerEventId: string;
	providerMessageId: string;
	type: 'sent' | 'delivered' | 'bounced' | 'complained' | 'opened' | 'clicked';
	occurredAt: Date;
	recipient?: string;
};

export type DomainDnsRecords = {
	apex: string[];
	dkim: string[];
	dmarc: string[];
};

export type DomainCheckPart = {
	ok: boolean;
	records: string[];
	detail: string;
};

export type DomainReadiness = {
	domain: string;
	fromAddress: string;
	fromMatchesDomain: boolean;
	fromApproved: boolean;
	spf: DomainCheckPart;
	dkim: DomainCheckPart;
	dmarc: DomainCheckPart;
	ready: boolean;
};

export type DnsTxtLookup = (name: string) => Promise<string[]>;

export interface EmailProvider {
	send(input: SendEmailInput): Promise<SendEmailResult>;
	health(): Promise<EmailHealth>;
	verifyWebhook(
		headers: Record<string, string | undefined>,
		payload: string
	): Promise<NormalizedEmailEvent[]>;
}
