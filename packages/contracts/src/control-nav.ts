import { OPERATOR_CONTROL_NAV_CAPABILITY, type Capability } from './capabilities';

export { OPERATOR_CONTROL_NAV_CAPABILITY };

export type ControlNavShell = 'client' | 'operator' | 'both';

export type ControlNavItem = {
	href: string;
	label: string;
	capability?: Capability;
	shell: ControlNavShell;
};

export type ControlNavLink = {
	href: string;
	label: string;
};

/**
 * Operator catalog order matches the existing Control cockpit.
 * Default client shell uses existing routes only (`docs/30` §5, CU0).
 * Today, Campaigns, and Insights stay omitted until those routes exist.
 */
export const CONTROL_NAV_ITEMS: readonly ControlNavItem[] = [
	{ href: '/', label: 'Overview', shell: 'both' },
	{ href: '/clients', label: 'Clients', capability: 'clients.read', shell: 'operator' },
	{ href: '/knowledge', label: 'Knowledge', capability: 'knowledge.read', shell: 'operator' },
	{ href: '/funnel', label: 'Funnel', capability: 'pages.read', shell: 'operator' },
	{ href: '/leads', label: 'Leads', capability: 'leads.read', shell: 'both' },
	{ href: '/goals', label: 'Goals', capability: 'goals.read', shell: 'both' },
	{ href: '/email', label: 'Email', capability: 'email.read', shell: 'operator' },
	{ href: '/social', label: 'Social', capability: 'social.read', shell: 'operator' },
	{ href: '/search', label: 'Search', capability: 'seo.read', shell: 'operator' },
	{ href: '/intelligence', label: 'Approvals', capability: 'ai.read', shell: 'client' },
	{ href: '/intelligence', label: 'Intelligence', capability: 'ai.read', shell: 'operator' },
	{ href: '/autonomy', label: 'Autonomy', capability: 'ai.read', shell: 'operator' },
	{ href: '/analytics', label: 'Analytics', capability: 'analytics.read', shell: 'operator' },
	{ href: '/experiments', label: 'Experiments', capability: 'experiments.read', shell: 'operator' },
	{ href: '/launch', label: 'Launch', capability: 'launch.read', shell: 'operator' },
	{ href: '/portfolio', label: 'Portfolio', capability: 'scale.read', shell: 'operator' },
	{ href: '/members', label: 'Members', capability: 'users.manage', shell: 'operator' }
];

export const CLIENT_DEFAULT_NAV_HREFS = ['/', '/leads', '/intelligence', '/goals'] as const;

export const CLIENT_DEFAULT_NAV_LABELS = ['Overview', 'Leads', 'Approvals', 'Goals'] as const;

export const OPERATOR_ONLY_NAV_LABELS = [
	'Clients',
	'Knowledge',
	'Funnel',
	'Email',
	'Social',
	'Search',
	'Intelligence',
	'Autonomy',
	'Analytics',
	'Experiments',
	'Launch',
	'Portfolio',
	'Members'
] as const;

export function hasOperatorControlNav(permissions: readonly string[]): boolean {
	return permissions.includes(OPERATOR_CONTROL_NAV_CAPABILITY);
}

export function controlNavFor(permissions: readonly string[]): ControlNavLink[] {
	const operator = hasOperatorControlNav(permissions);
	const links = CONTROL_NAV_ITEMS.filter((item) => {
		if (item.capability && !permissions.includes(item.capability)) return false;
		if (item.shell === 'operator') return operator;
		if (item.shell === 'client') return !operator;
		return true;
	}).map((item) => ({ href: item.href, label: item.label }));
	if (operator) return links;
	return CLIENT_DEFAULT_NAV_HREFS.flatMap((href) => links.filter((link) => link.href === href));
}
