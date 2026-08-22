import { fail, redirect } from '@sveltejs/kit';
import { cookieName, sessionCookieOptions } from '@vector/auth';
import { AppError } from '@vector/contracts';
import { login } from '@vector/domain';

export function load({ locals }) {
	if (locals.session) throw redirect(303, '/');
}

export const actions = {
	default: async ({ request, cookies, getClientAddress }) => {
		const form = await request.formData();
		try {
			const result = await login(
				{
					email: String(form.get('email') ?? ''),
					password: String(form.get('password') ?? '')
				},
				getClientAddress()
			);
			cookies.set(cookieName(), result.session.token, sessionCookieOptions());
		} catch (error) {
			if (error instanceof AppError) {
				return fail(error.status, { error: error.message });
			}
			return fail(500, { error: 'Login failed' });
		}
		throw redirect(303, '/');
	}
};
