import { sql } from 'drizzle-orm';
import {
	boolean,
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
import type { PageDocument } from '@vector/funnel-engine';
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

export const brandAssetPurpose = pgEnum('brand_asset_purpose', [
	'logo',
	'mark',
	'og',
	'favicon',
	'other'
]);

export const brandAssets = pgTable(
	'brand_assets',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		storageKey: text('storage_key').notNull(),
		purpose: brandAssetPurpose('purpose').notNull(),
		originalFilename: text('original_filename').notNull(),
		mimeType: text('mime_type').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		checksum: text('checksum').notNull(),
		createdBy: text('created_by'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('brand_assets_client_key_idx').on(t.clientId, t.storageKey),
		index('brand_assets_client_idx').on(t.clientId),
		index('brand_assets_org_idx').on(t.organizationId)
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

export const domainKind = pgEnum('domain_kind', ['preview', 'production', 'redirect']);
export const domainStatus = pgEnum('domain_status', ['pending', 'verified', 'active', 'disabled']);
export const pageVersionStatus = pgEnum('page_version_status', ['draft', 'published']);

export const clientDomains = pgTable(
	'client_domains',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		hostname: text('hostname').notNull(),
		kind: domainKind('kind').notNull(),
		status: domainStatus('status').notNull().default('pending'),
		isCanonical: boolean('is_canonical').notNull().default(true),
		verificationToken: text('verification_token'),
		verifiedAt: timestamp('verified_at', { withTimezone: true }),
		activatedAt: timestamp('activated_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('client_domains_hostname_live_idx')
			.on(t.hostname)
			.where(sql`${t.status} <> 'disabled'`),
		index('client_domains_client_idx').on(t.clientId)
	]
);

export const sites = pgTable(
	'sites',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		name: text('name').notNull(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('sites_client_idx').on(t.clientId),
		index('sites_org_idx').on(t.organizationId)
	]
);

export const funnels = pgTable(
	'funnels',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		siteId: uuid('site_id')
			.notNull()
			.references(() => sites.id),
		name: text('name').notNull(),
		slug: text('slug').notNull(),
		purpose: text('purpose').notNull().default('lead'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('funnels_client_slug_idx').on(t.clientId, t.slug),
		index('funnels_client_idx').on(t.clientId)
	]
);

export const pages = pgTable(
	'pages',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		funnelId: uuid('funnel_id')
			.notNull()
			.references(() => funnels.id),
		path: text('path').notNull().default('/'),
		title: text('title').notNull(),
		publishedVersionId: uuid('published_version_id'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('pages_funnel_path_idx').on(t.funnelId, t.path),
		index('pages_client_idx').on(t.clientId)
	]
);

export const pageVersions = pgTable(
	'page_versions',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		pageId: uuid('page_id')
			.notNull()
			.references(() => pages.id),
		version: integer('version').notNull(),
		status: pageVersionStatus('status').notNull(),
		document: jsonb('document').$type<PageDocument>().notNull(),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('page_versions_page_version_idx').on(t.pageId, t.version),
		index('page_versions_client_idx').on(t.clientId)
	]
);

export const readinessItemStatus = pgEnum('readiness_item_status', [
	'pending',
	'complete',
	'not_applicable'
]);
export const readinessItemSource = pgEnum('readiness_item_source', ['automatic', 'operator']);
export const launchStatus = pgEnum('launch_status', [
	'draft',
	'onboarding',
	'blocked',
	'vector_ready',
	'generating',
	'qa',
	'awaiting_client_approval',
	'awaiting_domain',
	'launching',
	'live',
	'launch_failed',
	'paused'
]);
export const launchClass = pgEnum('launch_class', ['A', 'B', 'C', 'D']);
export const launchApprovalKind = pgEnum('launch_approval_kind', ['client_launch', 'internal_qa']);
export const launchApprovalStatus = pgEnum('launch_approval_status', [
	'pending',
	'approved',
	'rejected'
]);

export const clientReadiness = pgTable(
	'client_readiness',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		scorePercent: integer('score_percent').notNull().default(0),
		blockingComplete: integer('blocking_complete').notNull().default(0),
		blockingTotal: integer('blocking_total').notNull().default(0),
		optionalComplete: integer('optional_complete').notNull().default(0),
		optionalTotal: integer('optional_total').notNull().default(0),
		vectorReady: boolean('vector_ready').notNull().default(false),
		computedAt: timestamp('computed_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('client_readiness_client_idx').on(t.clientId),
		index('client_readiness_org_idx').on(t.organizationId)
	]
);

export const clientReadinessItems = pgTable(
	'client_readiness_items',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		key: text('key').notNull(),
		category: text('category').notNull(),
		label: text('label').notNull(),
		blocking: boolean('blocking').notNull(),
		status: readinessItemStatus('status').notNull().default('pending'),
		source: readinessItemSource('source').notNull(),
		detail: text('detail'),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('client_readiness_items_client_key_idx').on(t.clientId, t.key),
		index('client_readiness_items_client_idx').on(t.clientId)
	]
);

export const clientLaunches = pgTable(
	'client_launches',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		launchClass: launchClass('launch_class').notNull().default('B'),
		status: launchStatus('status').notNull().default('draft'),
		signedAt: timestamp('signed_at', { withTimezone: true }),
		onboardingStartedAt: timestamp('onboarding_started_at', { withTimezone: true }),
		vectorReadyAt: timestamp('vector_ready_at', { withTimezone: true }),
		generationStartedAt: timestamp('generation_started_at', { withTimezone: true }),
		qaStartedAt: timestamp('qa_started_at', { withTimezone: true }),
		approvalRequestedAt: timestamp('approval_requested_at', { withTimezone: true }),
		approvalReceivedAt: timestamp('approval_received_at', { withTimezone: true }),
		domainReadyAt: timestamp('domain_ready_at', { withTimezone: true }),
		launchStartedAt: timestamp('launch_started_at', { withTimezone: true }),
		liveAt: timestamp('live_at', { withTimezone: true }),
		pausedAt: timestamp('paused_at', { withTimezone: true }),
		pausedSeconds: integer('paused_seconds').notNull().default(0),
		resumeStatus: launchStatus('resume_status'),
		failureReason: text('failure_reason'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('client_launches_client_idx').on(t.clientId),
		index('client_launches_org_idx').on(t.organizationId)
	]
);

export const clientLaunchEvents = pgTable(
	'client_launch_events',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		launchId: uuid('launch_id')
			.notNull()
			.references(() => clientLaunches.id),
		fromStatus: launchStatus('from_status').notNull(),
		toStatus: launchStatus('to_status').notNull(),
		reason: text('reason').notNull(),
		actorId: text('actor_id'),
		requestId: text('request_id').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('client_launch_events_client_idx').on(t.clientId)]
);

export const clientLaunchBlocks = pgTable(
	'client_launch_blocks',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		launchId: uuid('launch_id')
			.notNull()
			.references(() => clientLaunches.id),
		itemKey: text('item_key').notNull(),
		message: text('message').notNull(),
		resolvedAt: timestamp('resolved_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [index('client_launch_blocks_client_idx').on(t.clientId)]
);

export const clientLaunchApprovals = pgTable(
	'client_launch_approvals',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		launchId: uuid('launch_id')
			.notNull()
			.references(() => clientLaunches.id),
		kind: launchApprovalKind('kind').notNull(),
		status: launchApprovalStatus('status').notNull().default('pending'),
		actorId: text('actor_id'),
		note: text('note'),
		decidedAt: timestamp('decided_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [index('client_launch_approvals_client_idx').on(t.clientId)]
);

export const contactIdentityKind = pgEnum('contact_identity_kind', ['email', 'phone', 'visitor']);
export const leadStatus = pgEnum('lead_status', [
	'new',
	'working',
	'qualified',
	'won',
	'lost',
	'spam'
]);
export const consentPurpose = pgEnum('consent_purpose', [
	'lead_follow_up',
	'marketing',
	'analytics'
]);
export const consentDecision = pgEnum('consent_decision', ['granted', 'denied']);
export const attributionModel = pgEnum('attribution_model', ['first_touch_last_non_direct_v1']);

export type ConsentEvidence = {
	hostname: string;
	copyVersion: number;
	text: string;
};

export type AnalyticsEventProperties = {
	hostname?: string;
	domainKind?: string;
	landingUrl?: string;
	referrer?: string;
};

export const contacts = pgTable(
	'contacts',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		displayName: text('display_name').notNull(),
		email: text('email').notNull(),
		phone: text('phone'),
		company: text('company'),
		firstSeenAt: timestamp('first_seen_at', { withTimezone: true }).notNull().defaultNow(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('contacts_client_email_idx').on(t.clientId, t.email),
		index('contacts_client_idx').on(t.clientId),
		index('contacts_org_idx').on(t.organizationId)
	]
);

export const contactIdentities = pgTable(
	'contact_identities',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		contactId: uuid('contact_id')
			.notNull()
			.references(() => contacts.id),
		kind: contactIdentityKind('kind').notNull(),
		value: text('value').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('contact_identities_client_kind_value_idx').on(t.clientId, t.kind, t.value),
		index('contact_identities_client_idx').on(t.clientId),
		index('contact_identities_contact_idx').on(t.contactId)
	]
);

export const leadSources = pgTable(
	'lead_sources',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		channel: text('channel').notNull(),
		utmSource: text('utm_source'),
		utmMedium: text('utm_medium'),
		utmCampaign: text('utm_campaign'),
		utmTerm: text('utm_term'),
		utmContent: text('utm_content'),
		referrer: text('referrer'),
		createdAt: createdAt()
	},
	(t) => [index('lead_sources_client_idx').on(t.clientId)]
);

export const leads = pgTable(
	'leads',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		contactId: uuid('contact_id')
			.notNull()
			.references(() => contacts.id),
		sourceId: uuid('source_id').references(() => leadSources.id),
		status: leadStatus('status').notNull().default('new'),
		siteId: uuid('site_id'),
		funnelId: uuid('funnel_id'),
		pageId: uuid('page_id'),
		pageVersionId: uuid('page_version_id'),
		hostname: text('hostname').notNull(),
		domainKind: text('domain_kind').notNull(),
		isTest: boolean('is_test').notNull().default(false),
		message: text('message'),
		landingUrl: text('landing_url'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('leads_client_created_idx').on(t.clientId, t.createdAt),
		index('leads_client_contact_idx').on(t.clientId, t.contactId),
		index('leads_org_idx').on(t.organizationId)
	]
);

export const leadScores = pgTable(
	'lead_scores',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		leadId: uuid('lead_id')
			.notNull()
			.references(() => leads.id),
		score: integer('score').notNull(),
		version: text('version').notNull().default('v1'),
		computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('lead_scores_lead_idx').on(t.leadId),
		index('lead_scores_client_idx').on(t.clientId)
	]
);

export const leadScoreEvents = pgTable(
	'lead_score_events',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		leadId: uuid('lead_id')
			.notNull()
			.references(() => leads.id),
		score: integer('score').notNull(),
		reason: text('reason').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('lead_score_events_client_idx').on(t.clientId)]
);

export const leadStatusHistory = pgTable(
	'lead_status_history',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		leadId: uuid('lead_id')
			.notNull()
			.references(() => leads.id),
		fromStatus: leadStatus('from_status').notNull(),
		toStatus: leadStatus('to_status').notNull(),
		reason: text('reason').notNull(),
		actorId: text('actor_id'),
		requestId: text('request_id').notNull(),
		createdAt: createdAt()
	},
	(t) => [index('lead_status_history_client_idx').on(t.clientId)]
);

export const consentRecords = pgTable(
	'consent_records',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		contactId: uuid('contact_id')
			.notNull()
			.references(() => contacts.id),
		leadId: uuid('lead_id').references(() => leads.id),
		purpose: consentPurpose('purpose').notNull(),
		decision: consentDecision('decision').notNull(),
		source: text('source').notNull(),
		copyVersion: integer('copy_version').notNull(),
		evidence: jsonb('evidence').$type<ConsentEvidence>().notNull(),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [
		index('consent_records_client_idx').on(t.clientId),
		index('consent_records_contact_idx').on(t.contactId)
	]
);

export const visitors = pgTable(
	'visitors',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		anonymousId: text('anonymous_id').notNull(),
		contactId: uuid('contact_id').references(() => contacts.id),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('visitors_client_anonymous_idx').on(t.clientId, t.anonymousId),
		index('visitors_client_idx').on(t.clientId)
	]
);

export const analyticsSessions = pgTable(
	'analytics_sessions',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		visitorId: uuid('visitor_id')
			.notNull()
			.references(() => visitors.id),
		landingUrl: text('landing_url'),
		referrer: text('referrer'),
		utmSource: text('utm_source'),
		utmMedium: text('utm_medium'),
		utmCampaign: text('utm_campaign'),
		isTest: boolean('is_test').notNull().default(false),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [index('analytics_sessions_client_idx').on(t.clientId)]
);

export const analyticsEvents = pgTable(
	'analytics_events',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		eventId: uuid('event_id').notNull(),
		name: text('name').notNull(),
		taxonomyVersion: integer('taxonomy_version').notNull().default(1),
		visitorId: uuid('visitor_id').references(() => visitors.id),
		sessionId: uuid('session_id').references(() => analyticsSessions.id),
		contactId: uuid('contact_id').references(() => contacts.id),
		leadId: uuid('lead_id').references(() => leads.id),
		siteId: uuid('site_id'),
		funnelId: uuid('funnel_id'),
		pageId: uuid('page_id'),
		pageVersionId: uuid('page_version_id'),
		properties: jsonb('properties').$type<AnalyticsEventProperties>().notNull().default({}),
		isTest: boolean('is_test').notNull().default(false),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('analytics_events_client_event_idx').on(t.clientId, t.eventId),
		index('analytics_events_client_name_idx').on(t.clientId, t.name),
		index('analytics_events_client_idx').on(t.clientId)
	]
);

export const attributionTouchpoints = pgTable(
	'attribution_touchpoints',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		visitorId: uuid('visitor_id')
			.notNull()
			.references(() => visitors.id),
		sessionId: uuid('session_id').references(() => analyticsSessions.id),
		leadId: uuid('lead_id').references(() => leads.id),
		channel: text('channel').notNull(),
		source: text('source'),
		medium: text('medium'),
		campaign: text('campaign'),
		term: text('term'),
		content: text('content'),
		referrer: text('referrer'),
		landingUrl: text('landing_url'),
		isDirect: boolean('is_direct').notNull(),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [
		index('attribution_touchpoints_client_idx').on(t.clientId),
		index('attribution_touchpoints_visitor_idx').on(t.visitorId)
	]
);

export const attributionResults = pgTable(
	'attribution_results',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		leadId: uuid('lead_id')
			.notNull()
			.references(() => leads.id),
		model: attributionModel('model').notNull().default('first_touch_last_non_direct_v1'),
		firstTouchChannel: text('first_touch_channel').notNull(),
		firstTouchSource: text('first_touch_source'),
		firstTouchMedium: text('first_touch_medium'),
		firstTouchCampaign: text('first_touch_campaign'),
		lastNonDirectChannel: text('last_non_direct_channel').notNull(),
		lastNonDirectSource: text('last_non_direct_source'),
		lastNonDirectMedium: text('last_non_direct_medium'),
		lastNonDirectCampaign: text('last_non_direct_campaign'),
		computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('attribution_results_lead_idx').on(t.leadId),
		index('attribution_results_client_idx').on(t.clientId)
	]
);
