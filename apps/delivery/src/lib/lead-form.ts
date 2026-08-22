export type LeadFormState = {
	accepted?: boolean;
	eventAccepted?: boolean;
	error?: string;
	name?: string;
	email?: string;
	phone?: string;
	company?: string;
	message?: string;
	consentLeadFollowUp?: boolean;
	consentMarketing?: boolean;
} | null;
