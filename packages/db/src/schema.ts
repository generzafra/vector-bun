import {
	index,
	integer,
	jsonb,
	pgEnum,
	pgTable,
	text,
	timestamp,
	uniqueIndex,
	uuid
} from 'drizzle-orm/pg-core';
import { uuidv7 } from 'uuidv7';

const id = () =>
	uuid('id')
		.primaryKey()
		.$defaultFn(() => uuidv7());
const createdAt = () => timestamp('created_at', { withTimezone: true }).notNull().defaultNow();
const updatedAt = () => timestamp('updated_at', { withTimezone: true }).notNull().defaultNow();

export const actorType = pgEnum('actor_type', [
	'human',
	'system',
	'automation',
	'ai',
	'provider_webhook'
]);

export const organizations = pgTable(
	'organizations',
	{
		id: id(),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('organizations_slug_idx').on(t.slug)]
);

export const clients = pgTable(
	'clients',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('clients_org_idx').on(t.organizationId),
		uniqueIndex('clients_org_slug_idx').on(t.organizationId, t.slug)
	]
);

export const clientSettings = pgTable(
	'client_settings',
	{
		id: id(),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		displayName: text('display_name').notNull(),
		timezone: text('timezone').notNull().default('UTC'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('client_settings_client_idx').on(t.clientId)]
);

export const users = pgTable(
	'users',
	{
		id: id(),
		email: text('email').notNull(),
		name: text('name').notNull(),
		passwordHash: text('password_hash').notNull(),
		failedLoginCount: integer('failed_login_count').notNull().default(0),
		lockedUntil: timestamp('locked_until', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('users_email_idx').on(t.email)]
);

export const roles = pgTable(
	'roles',
	{
		id: id(),
		key: text('key').notNull(),
		name: text('name').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('roles_key_idx').on(t.key)]
);

export const permissions = pgTable(
	'permissions',
	{
		id: id(),
		key: text('key').notNull(),
		name: text('name').notNull(),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('permissions_key_idx').on(t.key)]
);

export const rolePermissions = pgTable(
	'role_permissions',
	{
		id: id(),
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id),
		permissionId: uuid('permission_id')
			.notNull()
			.references(() => permissions.id)
	},
	(t) => [uniqueIndex('role_permissions_unique_idx').on(t.roleId, t.permissionId)]
);

export const memberships = pgTable(
	'memberships',
	{
		id: id(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id').references(() => clients.id),
		roleId: uuid('role_id')
			.notNull()
			.references(() => roles.id),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('memberships_client_idx').on(t.clientId),
		index('memberships_user_idx').on(t.userId),
		uniqueIndex('memberships_unique_idx').on(t.userId, t.organizationId, t.clientId, t.roleId)
	]
);

export const sessions = pgTable(
	'sessions',
	{
		id: id(),
		userId: uuid('user_id')
			.notNull()
			.references(() => users.id),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id').references(() => clients.id),
		tokenHash: text('token_hash').notNull(),
		csrf: text('csrf').notNull(),
		expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
		absoluteExpiresAt: timestamp('absolute_expires_at', { withTimezone: true }).notNull(),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('sessions_token_idx').on(t.tokenHash),
		index('sessions_client_idx').on(t.clientId)
	]
);

export const auditLogs = pgTable(
	'audit_logs',
	{
		id: id(),
		organizationId: uuid('organization_id').references(() => organizations.id),
		clientId: uuid('client_id').references(() => clients.id),
		actorType: actorType('actor_type').notNull(),
		actorId: text('actor_id'),
		action: text('action').notNull(),
		entityType: text('entity_type').notNull(),
		entityId: text('entity_id'),
		requestId: text('request_id').notNull(),
		reason: text('reason'),
		createdAt: createdAt()
	},
	(t) => [index('audit_logs_client_idx').on(t.clientId)]
);

export const claimKind = pgEnum('claim_kind', ['approved', 'prohibited']);

export type BrandTokens = {
	background?: string;
	surface?: string;
	text?: string;
	accent?: string;
	fontFamily?: string;
};

export const brands = pgTable(
	'brands',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		displayName: text('display_name').notNull(),
		tagline: text('tagline'),
		audience: text('audience'),
		offer: text('offer'),
		primaryConversion: text('primary_conversion'),
		secondaryConversion: text('secondary_conversion'),
		brandPersonality: text('brand_personality'),
		tokens: jsonb('tokens').$type<BrandTokens>().notNull().default({}),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('brands_client_idx').on(t.clientId),
		index('brands_org_idx').on(t.organizationId)
	]
);

export const services = pgTable(
	'services',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		outcome: text('outcome').notNull(),
		summary: text('summary').notNull(),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('services_client_idx').on(t.clientId),
		uniqueIndex('services_client_slug_idx').on(t.clientId, t.slug)
	]
);

export const offers = pgTable(
	'offers',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		name: text('name').notNull(),
		summary: text('summary').notNull(),
		startingPriceMinor: integer('starting_price_minor'),
		currency: text('currency').notNull().default('USD'),
		sortOrder: integer('sort_order').notNull().default(0),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('offers_client_idx').on(t.clientId)]
);

export const claims = pgTable(
	'claims',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		kind: claimKind('kind').notNull(),
		statement: text('statement').notNull(),
		evidence: text('evidence'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [index('claims_client_idx').on(t.clientId)]
);
