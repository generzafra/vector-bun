import { requireTenantContext } from '@vector/contracts';
import { findActiveDomainByHostname, getPublishedHomeForTenant } from '@vector/db';
import { isHealthPath, parsePageDocument } from '@vector/funnel-engine';
import { logInfo } from '@vector/observability';

export type DeliveryResolution =
	| { kind: 'health' }
	| { kind: 'unknown_host'; host: string | null }
	| {
			kind: 'page';
			hostname: string;
			domainKind: 'preview' | 'production' | 'redirect';
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
	const domain = await findActiveDomainByHostname(hostHeader);
	if (!domain) return { kind: 'unknown_host', host: hostHeader };
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
