import { env } from '@vector/config';
import { DisabledEmailProvider } from './disabled';
import { MemoryEmailProvider } from './memory';
import { ResendEmailProvider } from './resend';
import type { DnsTxtLookup, EmailProvider } from './types';
import { lookupTxtRecords } from './dns';

let cached: EmailProvider | null = null;
let dnsLookup: DnsTxtLookup = lookupTxtRecords;

export function createEmailProvider(): EmailProvider {
	if (env.EMAIL_SENDING_PAUSED) {
		return new DisabledEmailProvider('Outbound email is paused');
	}
	if (env.RESEND_API_KEY) {
		return new ResendEmailProvider(env.RESEND_API_KEY, env.RESEND_WEBHOOK_SECRET);
	}
	return new MemoryEmailProvider();
}

export function emailProvider() {
	cached ??= createEmailProvider();
	return cached;
}

export function setEmailProvider(provider: EmailProvider) {
	cached = provider;
}

export function resetEmailProvider() {
	cached = null;
}

export function getDnsLookup() {
	return dnsLookup;
}

export function setDnsLookup(lookup: DnsTxtLookup) {
	dnsLookup = lookup;
}

export function resetDnsLookup() {
	dnsLookup = lookupTxtRecords;
}
