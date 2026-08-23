import { requireTenantContext, type TenantContext } from '@vector/contracts';
import {
	getBrandForTenant,
	listClaimsForTenant,
	listPublishedPagesForTenant,
	listServicesForTenant
} from '@vector/db';
import {
	publicLlmsTxt,
	publicRobotsTxt,
	xmlSitemap,
	type PublicDomainKind
} from '@vector/funnel-engine';

export function deliveryRobotsTxt(input: { domainKind: PublicDomainKind; origin: string }) {
	return publicRobotsTxt(input);
}

export async function deliverySitemapXml(ctx: TenantContext, origin: string) {
	requireTenantContext(ctx);
	const pages = await listPublishedPagesForTenant(ctx);
	return xmlSitemap(
		origin,
		pages.map((page) => page.path)
	);
}

export async function deliveryLlmsTxt(ctx: TenantContext, origin: string) {
	const required = requireTenantContext(ctx);
	const [brand, services, claims] = await Promise.all([
		getBrandForTenant(required),
		listServicesForTenant(required),
		listClaimsForTenant(required)
	]);
	if (!brand) return null;
	return publicLlmsTxt({
		domainKind: 'production',
		origin,
		knowledge: {
			displayName: brand.displayName,
			tagline: brand.tagline,
			offer: brand.offer,
			audience: brand.audience,
			services,
			claims
		}
	});
}
