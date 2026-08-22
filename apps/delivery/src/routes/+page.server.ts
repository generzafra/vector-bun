import { error, fail } from '@sveltejs/kit';

function fieldValues(form: FormData) {
	return {
		name: String(form.get('name') ?? ''),
		email: String(form.get('email') ?? ''),
		phone: String(form.get('phone') ?? ''),
		company: String(form.get('company') ?? ''),
		message: String(form.get('message') ?? '')
	};
}

export function load({ locals }) {
	if (locals.delivery.kind !== 'page') error(404, 'Unknown host');
	return {
		document: locals.delivery.document,
		domainKind: locals.delivery.domainKind,
		hostname: locals.delivery.hostname
	};
}

export const actions = {
	lead: async ({ request, locals }) => {
		if (locals.delivery.kind !== 'page') return fail(404, { error: 'Unknown host' });
		const values = fieldValues(await request.formData());
		if (!values.name.trim()) {
			return fail(400, { error: 'Enter your name so we know who to contact.', ...values });
		}
		if (!values.email.includes('@')) {
			return fail(400, { error: 'Enter a valid email so we can reply.', ...values });
		}
		return { accepted: true };
	}
};
