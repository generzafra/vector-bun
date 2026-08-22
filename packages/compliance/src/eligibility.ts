import type { JurisdictionProfile } from './jurisdiction';

export const SEND_CHECK_ORDER = [
	'preview_or_test',
	'sending_paused',
	'global_suppression',
	'client_suppression',
	'consent',
	'topic',
	'jurisdiction',
	'campaign',
	'domain',
	'from',
	'connection'
] as const;

export type SendCheckKey = (typeof SEND_CHECK_ORDER)[number];

export type SendEligibilityInput = {
	email: string;
	isTest: boolean;
	sendingPaused: boolean;
	connectionActive: boolean;
	domainReady: boolean;
	fromApproved: boolean;
	globalSuppressed: boolean;
	clientSuppressed: boolean;
	marketingConsent: 'granted' | 'denied' | 'missing';
	topicAllowed: boolean;
	jurisdiction: JurisdictionProfile;
	jurisdictionAllowsMarketing: boolean;
	sequenceApproved: boolean;
};

export type SendEligibilityResult = {
	allowed: boolean;
	blockedBy?: SendCheckKey;
	detail: string;
};

export function evaluateSendEligibility(input: SendEligibilityInput): SendEligibilityResult {
	if (input.isTest) {
		return {
			allowed: false,
			blockedBy: 'preview_or_test',
			detail: 'Preview and test leads do not send production email'
		};
	}
	if (input.sendingPaused) {
		return { allowed: false, blockedBy: 'sending_paused', detail: 'Outbound email is paused' };
	}
	if (input.globalSuppressed) {
		return {
			allowed: false,
			blockedBy: 'global_suppression',
			detail: 'Address is on the global suppression list'
		};
	}
	if (input.clientSuppressed) {
		return {
			allowed: false,
			blockedBy: 'client_suppression',
			detail: 'Address is suppressed for this client'
		};
	}
	if (input.marketingConsent !== 'granted') {
		return { allowed: false, blockedBy: 'consent', detail: 'Marketing consent is not granted' };
	}
	if (!input.topicAllowed) {
		return { allowed: false, blockedBy: 'topic', detail: 'Topic preference is denied' };
	}
	if (!input.jurisdictionAllowsMarketing) {
		return {
			allowed: false,
			blockedBy: 'jurisdiction',
			detail: `Jurisdiction ${input.jurisdiction} blocks marketing email`
		};
	}
	if (!input.sequenceApproved) {
		return { allowed: false, blockedBy: 'campaign', detail: 'Nurture sequence is not approved' };
	}
	if (!input.domainReady) {
		return { allowed: false, blockedBy: 'domain', detail: 'Sending domain DNS is not ready' };
	}
	if (!input.fromApproved) {
		return { allowed: false, blockedBy: 'from', detail: 'From identity is not approved' };
	}
	if (!input.connectionActive) {
		return { allowed: false, blockedBy: 'connection', detail: 'Email connection is paused' };
	}
	return { allowed: true, detail: 'Eligible to send' };
}
