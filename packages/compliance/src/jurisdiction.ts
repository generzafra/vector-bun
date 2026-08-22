export const JURISDICTION_PROFILES = ['us_can_spam', 'gdpr', 'ph_dpa'] as const;
export type JurisdictionProfile = (typeof JURISDICTION_PROFILES)[number];

export function parseJurisdictionProfile(value: string | null | undefined): JurisdictionProfile {
	if (value === 'gdpr' || value === 'ph_dpa' || value === 'us_can_spam') return value;
	return 'us_can_spam';
}

export function marketingRequiresExplicitConsent(profile: JurisdictionProfile) {
	return profile === 'gdpr' || profile === 'ph_dpa' || profile === 'us_can_spam';
}
