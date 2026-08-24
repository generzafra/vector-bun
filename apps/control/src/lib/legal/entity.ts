import { env } from '@vector/config';

export type LegalEntity = {
	legalCompanyName: string;
	websiteUrl: string;
	privacyPolicyUrl: string;
	privacyEmail: string;
	supportEmail: string;
	legalEmail: string;
	phone: string;
	businessAddress: string;
	county: string;
	effectiveDate: string;
	lastUpdated: string;
};

function origin(url: string) {
	return url.replace(/\/$/, '');
}

export function createLegalEntity(websiteUrl: string): LegalEntity {
	const website = origin(websiteUrl);
	return {
		legalCompanyName: 'Maximum Global Exposure',
		websiteUrl: website,
		privacyPolicyUrl: `${website}/privacy`,
		privacyEmail: '[PRIVACY EMAIL]',
		supportEmail: '[SUPPORT EMAIL]',
		legalEmail: '[LEGAL EMAIL]',
		phone: '[PHONE NUMBER]',
		businessAddress: '[BUSINESS ADDRESS]',
		county: '[COUNTY]',
		effectiveDate: '[EFFECTIVE DATE]',
		lastUpdated: '[LAST UPDATED DATE]'
	};
}

export const vectorLegalEntity = createLegalEntity(env.CONTROL_ORIGIN);

const PLACEHOLDERS: [token: string, key: keyof LegalEntity][] = [
	['[PRIVACY POLICY URL]', 'privacyPolicyUrl'],
	['[LEGAL COMPANY NAME]', 'legalCompanyName'],
	['[LAST UPDATED DATE]', 'lastUpdated'],
	['[EFFECTIVE DATE]', 'effectiveDate'],
	['[BUSINESS ADDRESS]', 'businessAddress'],
	['[PHONE NUMBER]', 'phone'],
	['[SUPPORT EMAIL]', 'supportEmail'],
	['[PRIVACY EMAIL]', 'privacyEmail'],
	['[LEGAL EMAIL]', 'legalEmail'],
	['[WEBSITE URL]', 'websiteUrl'],
	['[COUNTY]', 'county']
];

export function applyLegalPlaceholders(source: string, entity: LegalEntity) {
	let next = source;
	for (const [token, key] of PLACEHOLDERS) {
		next = next.replaceAll(token, entity[key]);
	}
	return next;
}
