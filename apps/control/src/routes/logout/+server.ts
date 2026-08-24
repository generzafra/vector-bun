import { redirect, type Cookies, type RequestHandler } from '@sveltejs/kit';
import { cookieName, sessionCookieOptions } from '@vector/auth';
import { logout } from '@vector/domain';

function clearSessionCookie(cookies: Cookies) {
	const options = sessionCookieOptions();
	cookies.delete(cookieName(), {
		path: options.path,
		httpOnly: options.httpOnly,
		sameSite: options.sameSite,
		secure: options.secure
	});
}

export const GET: RequestHandler = async () => {
	throw redirect(303, '/');
};

export const POST: RequestHandler = async ({ cookies, locals }) => {
	const token = cookies.get(cookieName()) ?? '';
	await logout(token, locals.session);
	clearSessionCookie(cookies);
	throw redirect(303, '/');
};
