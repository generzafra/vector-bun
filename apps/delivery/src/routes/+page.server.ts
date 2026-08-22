import { error, fail } from '@sveltejs/kit';

export function load({ locals }) {
	if (locals.delivery.kind !== 'page') error(404, 'Unknown host');
	return {
		document: locals.delivery.document,
		domainKind: locals.delivery.domainKind
	};
}

export const actions = {
	lead: async ({ request, locals }) => {
		if (locals.delivery.kind !== 'page') return fail(404, { error: 'Unknown host' });
		const form = await request.formData();
		const email = String(form.get('email') ?? '').trim();
		const name = String(form.get('name') ?? '').trim();
		if (!name) return fail(400, { error: 'Enter your name' });
		if (!email.includes('@')) return fail(400, { error: 'Enter a valid email' });
		return { accepted: true };
	}
};
