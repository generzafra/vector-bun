import { promises as dns } from 'node:dns';
import type { DnsTxtLookup, DomainDnsRecords, DomainReadiness } from './types';

const RESEND_SPF = /include:(?:_spf\.)?resend\.com|include:amazonses\.com/i;

export async function lookupTxtRecords(name: string): Promise<string[]> {
	try {
		const records = await dns.resolveTxt(name);
		return records.map((parts) => parts.join(''));
	} catch {
		return [];
	}
}

export async function lookupSendingDomainRecords(
	domain: string,
	dkimSelector: string,
	lookup: DnsTxtLookup = lookupTxtRecords
): Promise<DomainDnsRecords> {
	const [apex, dkim, dmarc] = await Promise.all([
		lookup(domain),
		lookup(`${dkimSelector}._domainkey.${domain}`),
		lookup(`_dmarc.${domain}`)
	]);
	return { apex, dkim, dmarc };
}

export function fromAddressMatchesDomain(fromAddress: string, domain: string) {
	const host = fromAddress.trim().toLowerCase().split('@')[1] ?? '';
	const apex = domain.trim().toLowerCase();
	return host === apex || host.endsWith(`.${apex}`);
}

export function evaluateSendingDomain(input: {
	domain: string;
	fromAddress: string;
	fromApproved: boolean;
	records: DomainDnsRecords;
}): DomainReadiness {
	const domain = input.domain.trim().toLowerCase();
	const fromAddress = input.fromAddress.trim().toLowerCase();
	const fromMatchesDomain = fromAddressMatchesDomain(fromAddress, domain);
	const spfJoined = input.records.apex.join(' ');
	const dkimJoined = input.records.dkim.join(' ');
	const spfOk = /v=spf1/i.test(spfJoined) && RESEND_SPF.test(spfJoined);
	const dkimOk =
		input.records.dkim.length > 0 &&
		(/v=DKIM1/i.test(dkimJoined) || /resend|amazonses|dkim/i.test(dkimJoined));
	const dmarcOk = input.records.dmarc.some((record) => /v=DMARC1/i.test(record));
	return {
		domain,
		fromAddress,
		fromMatchesDomain,
		fromApproved: input.fromApproved,
		spf: {
			ok: spfOk,
			records: input.records.apex,
			detail: spfOk ? 'SPF includes Resend' : 'SPF must include Resend or amazonses.com'
		},
		dkim: {
			ok: dkimOk,
			records: input.records.dkim,
			detail: dkimOk ? 'DKIM selector is present' : 'DKIM selector record is missing'
		},
		dmarc: {
			ok: dmarcOk,
			records: input.records.dmarc,
			detail: dmarcOk ? 'DMARC policy is present' : 'DMARC record is missing'
		},
		ready: Boolean(spfOk && dkimOk && dmarcOk && input.fromApproved && fromMatchesDomain)
	};
}
