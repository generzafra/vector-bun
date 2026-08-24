import { isControlMarketingPath } from '$lib/public-paths';

export function load({ locals, url }) {
	return {
		userId: locals.session?.userId ?? null,
		clientId: locals.session?.clientId ?? null,
		csrf: locals.session?.csrf ?? null,
		permissions: locals.session?.permissions ?? [],
		marketingShell: isControlMarketingPath(url.pathname)
	};
}
