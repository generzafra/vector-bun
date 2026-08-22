import { requireTenantContext } from '@vector/contracts';
import {
	findActiveDomainByHostname,
	findRoutableDomainByHostname,
	getProductionDomainForTenant,
	getPublishedHomeForTenant
} from '@vector/db';
import {
	isDomainChallengePath,
	isHealthPath,
	isRobotsPath,
	isSitemapPath,
	parsePageDocument
} from '@vector/funnel-engine';
import { logInfo } from '@vector/observability';

export type DeliveryDomainKind = 'preview' | 'production' | 'redirect';

export type DeliveryResolution =
	| { kind: 'health' }
	| { kind: 'unknown_host'; host: string | null }
	| { kind: 'domain_challenge'; hostname: string; token: string }
	| { kind: 'robots'; hostname: string; domainKind: DeliveryDomainKind }
	| { kind: 'sitemap'; hostname: string; domainKind: DeliveryDomainKind }
	| { kind: 'redirect'; hostname: string; targetHostname: string }
	| {
			kind: 'page';
			hostname: string;
			domainKind: DeliveryDomainKind;
			clientId: string;
			organizationId: string;
			versionId: string;
			document: ReturnType<typeof parsePageDocument>;
	  };

export async function resolveDeliveryPage(
	hostHeader: string | null,
	pathname: string,
	requestId: string
): Promise<DeliveryResolution> {
	if (isHealthPath(pathname)) return { kind: 'health' };

	if (isDomainChallengePath(pathname)) {
		const pending = await findRoutableDomainByHostname(hostHeader);
		if (!pending?.verificationToken) return { kind: 'unknown_host', host: hostHeader };
		return {
			kind: 'domain_challenge',
			hostname: pending.hostname,
			token: pending.verificationToken
		};
	}

	const domain = await findActiveDomainByHostname(hostHeader);
	if (!domain) return { kind: 'unknown_host', host: hostHeader };

	if (domain.kind === 'redirect') {
		const ctx = requireTenantContext({
			organizationId: domain.organizationId,
			clientId: domain.clientId,
			roleIds: [],
			requestId
		});
		const canonical = await getProductionDomainForTenant(ctx);
		if (!canonical) return { kind: 'unknown_host', host: hostHeader };
		return { kind: 'redirect', hostname: domain.hostname, targetHostname: canonical.hostname };
	}

	if (isRobotsPath(pathname)) {
		return { kind: 'robots', hostname: domain.hostname, domainKind: domain.kind };
	}
	if (isSitemapPath(pathname)) {
		if (domain.kind !== 'production') return { kind: 'unknown_host', host: hostHeader };
		return { kind: 'sitemap', hostname: domain.hostname, domainKind: domain.kind };
	}
	if (pathname !== '/' && pathname !== '') {
		return { kind: 'unknown_host', host: hostHeader };
	}

	const ctx = requireTenantContext({
		organizationId: domain.organizationId,
		clientId: domain.clientId,
		roleIds: [],
		requestId
	});
	const published = await getPublishedHomeForTenant(ctx);
	if (!published) return { kind: 'unknown_host', host: hostHeader };
	const document = parsePageDocument(published.version.document);
	logInfo('delivery.resolve', {
		requestId,
		hostname: domain.hostname,
		domainKind: domain.kind,
		versionId: published.version.id
	});
	return {
		kind: 'page',
		hostname: domain.hostname,
		domainKind: domain.kind,
		clientId: domain.clientId,
		organizationId: domain.organizationId,
		versionId: published.version.id,
		document
	};
}
