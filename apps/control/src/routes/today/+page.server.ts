import { contextFor, getClientToday } from '@vector/domain';

const TODAY_CAPS = ['leads.read', 'goals.read', 'ai.read', 'email.read', 'social.read'] as const;

export async function load({ locals }) {
	const session = locals.session!;
	if (!session.clientId) return { needsClient: true, today: null };
	if (!TODAY_CAPS.some((capability) => session.permissions.includes(capability))) {
		return { needsClient: false, today: null };
	}
	const today = await getClientToday(session, contextFor(session, locals.requestId));
	return { needsClient: false, today };
}
