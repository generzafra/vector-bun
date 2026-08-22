import { ValidationError } from '@vector/contracts';

export const CONSENT_COPY_VERSION = 1;

export const CONSENT_COPY = {
	lead_follow_up: 'I agree to be contacted about this request.',
	marketing: 'Send me occasional updates about this offer.'
} as const;

export type ConsentPurposeKey = keyof typeof CONSENT_COPY;

export function requireLeadFollowUpConsent(granted: boolean) {
	if (!granted) {
		throw new ValidationError('Consent is required to submit this form.');
	}
}

export function consentEvidence(hostname: string, purpose: ConsentPurposeKey) {
	return {
		hostname,
		copyVersion: CONSENT_COPY_VERSION,
		text: CONSENT_COPY[purpose]
	};
}
