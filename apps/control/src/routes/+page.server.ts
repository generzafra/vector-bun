import { redirect } from '@sveltejs/kit';
import { CONTROL_OVERVIEW_PATH } from '$lib/public-paths';

export function load({ locals }) {
	if (locals.session) throw redirect(303, CONTROL_OVERVIEW_PATH);
	return {};
}
