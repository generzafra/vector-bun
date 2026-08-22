export const CAPABILITIES = [
	'clients.read',
	'clients.manage',
	'users.manage',
	'audit.read'
] as const;

export type Capability = (typeof CAPABILITIES)[number];

export const ROLE_KEYS = [
	'mge_super_admin',
	'mge_operator',
	'client_owner',
	'client_admin',
	'read_only'
] as const;

export type RoleKey = (typeof ROLE_KEYS)[number];

export const ROLE_CAPABILITIES: Record<RoleKey, Capability[]> = {
	mge_super_admin: ['clients.read', 'clients.manage', 'users.manage', 'audit.read'],
	mge_operator: ['clients.read', 'clients.manage', 'users.manage', 'audit.read'],
	client_owner: ['clients.read', 'users.manage', 'audit.read'],
	client_admin: ['clients.read', 'users.manage'],
	read_only: ['clients.read', 'audit.read']
};
