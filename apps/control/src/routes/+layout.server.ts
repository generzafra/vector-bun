export function load({ locals }) {
	return {
		userId: locals.session?.userId ?? null,
		clientId: locals.session?.clientId ?? null,
		csrf: locals.session?.csrf ?? null,
		permissions: locals.session?.permissions ?? []
	};
}
