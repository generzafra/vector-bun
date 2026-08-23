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
		jurisdictionProfile: text('jurisdiction_profile').notNull().default('us_can_spam'),
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

export const emailConnectionStatus = pgEnum('email_connection_status', ['active', 'paused']);
export const emailDomainStatus = pgEnum('email_domain_status', ['pending', 'ready', 'failed']);
export const emailSequenceStatus = pgEnum('email_sequence_status', [
	'draft',
	'approved',
	'retired'
]);
export const emailEnrollmentStatus = pgEnum('email_enrollment_status', [
	'active',
	'completed',
	'cancelled',
	'suppressed'
]);
export const emailMessageStatus = pgEnum('email_message_status', [
	'queued',
	'sent',
	'delivered',
	'bounced',
	'complained',
	'skipped',
	'failed'
]);
export const emailSuppressionScope = pgEnum('email_suppression_scope', ['global', 'client']);
export const emailSuppressionReason = pgEnum('email_suppression_reason', [
	'unsubscribe',
	'bounce',
	'complaint',
	'operator'
]);

export type EmailTopicPreferences = {
	welcome?: boolean;
	marketing?: boolean;
};

export type EmailDomainCheckDetail = {
	spf?: string;
	dkim?: string;
	dmarc?: string;
	fromMatchesDomain?: boolean;
};

export const emailConnections = pgTable(
	'email_connections',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		provider: text('provider').notNull().default('resend'),
		status: emailConnectionStatus('status').notNull().default('active'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('email_connections_client_idx').on(t.clientId)]
);

export const emailDomains = pgTable(
	'email_domains',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		domain: text('domain').notNull(),
		fromAddress: text('from_address').notNull(),
		fromName: text('from_name').notNull(),
		fromApproved: boolean('from_approved').notNull().default(false),
		dkimSelector: text('dkim_selector').notNull().default('resend'),
		status: emailDomainStatus('status').notNull().default('pending'),
		spfReady: boolean('spf_ready').notNull().default(false),
		dkimReady: boolean('dkim_ready').notNull().default(false),
		dmarcReady: boolean('dmarc_ready').notNull().default(false),
		checkDetail: jsonb('check_detail').$type<EmailDomainCheckDetail>().notNull().default({}),
		lastCheckedAt: timestamp('last_checked_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('email_domains_client_domain_idx').on(t.clientId, t.domain),
		index('email_domains_client_idx').on(t.clientId)
	]
);

export const emailTopics = pgTable(
	'email_topics',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('email_topics_client_slug_idx').on(t.clientId, t.slug)]
);

export const emailContacts = pgTable(
	'email_contacts',
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
		email: text('email').notNull(),
		topicPreferences: jsonb('topic_preferences').$type<EmailTopicPreferences>().notNull().default({
			welcome: true
		}),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('email_contacts_client_email_idx').on(t.clientId, t.email),
		uniqueIndex('email_contacts_contact_idx').on(t.contactId),
		index('email_contacts_client_idx').on(t.clientId)
	]
);

export const emailSequences = pgTable(
	'email_sequences',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		key: text('key').notNull(),
		name: text('name').notNull(),
		status: emailSequenceStatus('status').notNull().default('draft'),
		version: integer('version').notNull().default(1),
		approvedAt: timestamp('approved_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('email_sequences_client_key_idx').on(t.clientId, t.key)]
);

export const emailSequenceSteps = pgTable(
	'email_sequence_steps',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		sequenceId: uuid('sequence_id')
			.notNull()
			.references(() => emailSequences.id),
		stepIndex: integer('step_index').notNull(),
		delayMinutes: integer('delay_minutes').notNull().default(0),
		topic: text('topic').notNull().default('welcome'),
		subject: text('subject').notNull(),
		textBody: text('text_body').notNull(),
		htmlBody: text('html_body').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('email_sequence_steps_unique_idx').on(t.sequenceId, t.stepIndex),
		index('email_sequence_steps_client_idx').on(t.clientId)
	]
);

export const emailSequenceEnrollments = pgTable(
	'email_sequence_enrollments',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		sequenceId: uuid('sequence_id')
			.notNull()
			.references(() => emailSequences.id),
		contactId: uuid('contact_id')
			.notNull()
			.references(() => contacts.id),
		leadId: uuid('lead_id')
			.notNull()
			.references(() => leads.id),
		email: text('email').notNull(),
		status: emailEnrollmentStatus('status').notNull().default('active'),
		currentStepIndex: integer('current_step_index').notNull().default(0),
		nextStepAt: timestamp('next_step_at', { withTimezone: true }),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('email_enrollments_lead_sequence_idx').on(t.leadId, t.sequenceId),
		index('email_enrollments_client_idx').on(t.clientId),
		index('email_enrollments_due_idx').on(t.clientId, t.status, t.nextStepAt)
	]
);

export const emailMessages = pgTable(
	'email_messages',
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
		enrollmentId: uuid('enrollment_id').references(() => emailSequenceEnrollments.id),
		sequenceId: uuid('sequence_id').references(() => emailSequences.id),
		stepIndex: integer('step_index'),
		toAddress: text('to_address').notNull(),
		fromAddress: text('from_address').notNull(),
		subject: text('subject').notNull(),
		status: emailMessageStatus('status').notNull().default('queued'),
		provider: text('provider').notNull().default('resend'),
		providerMessageId: text('provider_message_id'),
		idempotencyKey: text('idempotency_key').notNull(),
		skipReason: text('skip_reason'),
		isTest: boolean('is_test').notNull().default(false),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('email_messages_idempotency_idx').on(t.clientId, t.idempotencyKey),
		index('email_messages_client_idx').on(t.clientId),
		index('email_messages_provider_idx').on(t.providerMessageId)
	]
);

export const emailEvents = pgTable(
	'email_events',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		messageId: uuid('message_id')
			.notNull()
			.references(() => emailMessages.id),
		providerEventId: text('provider_event_id').notNull(),
		type: text('type').notNull(),
		payload: jsonb('payload')
			.$type<Record<string, string | number | boolean | null>>()
			.notNull()
			.default({}),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('email_events_provider_idx').on(t.clientId, t.providerEventId),
		index('email_events_client_idx').on(t.clientId)
	]
);

export const emailSuppressions = pgTable(
	'email_suppressions',
	{
		id: id(),
		organizationId: uuid('organization_id').references(() => organizations.id),
		clientId: uuid('client_id').references(() => clients.id),
		email: text('email').notNull(),
		scope: emailSuppressionScope('scope').notNull(),
		reason: emailSuppressionReason('reason').notNull(),
		source: text('source').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('email_suppressions_global_email_idx')
			.on(t.email)
			.where(sql`${t.scope} = 'global'`),
		uniqueIndex('email_suppressions_client_email_idx')
			.on(t.clientId, t.email)
			.where(sql`${t.scope} = 'client'`),
		index('email_suppressions_client_idx').on(t.clientId),
		index('email_suppressions_email_idx').on(t.email)
	]
);

export const consentEvents = pgTable(
	'consent_events',
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
		purpose: consentPurpose('purpose').notNull(),
		decision: consentDecision('decision').notNull(),
		source: text('source').notNull(),
		copyVersion: integer('copy_version').notNull(),
		requestId: text('request_id').notNull(),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [
		index('consent_events_client_idx').on(t.clientId),
		index('consent_events_contact_idx').on(t.contactId)
	]
);

export const emailInboundStatus = pgEnum('email_inbound_status', ['received', 'reviewed']);
export const emailInboundClass = pgEnum('email_inbound_class', [
	'general',
	'legal',
	'refund',
	'dispute',
	'pricing',
	'complaint',
	'negotiation'
]);

export const emailInboundMessages = pgTable(
	'email_inbound_messages',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		contactId: uuid('contact_id').references(() => contacts.id),
		fromAddress: text('from_address').notNull(),
		toAddress: text('to_address').notNull(),
		subject: text('subject').notNull(),
		textBody: text('text_body').notNull(),
		classification: emailInboundClass('classification').notNull().default('general'),
		requiresHumanReview: boolean('requires_human_review').notNull().default(true),
		status: emailInboundStatus('status').notNull().default('received'),
		provider: text('provider').notNull().default('resend'),
		providerEventId: text('provider_event_id').notNull(),
		providerMessageId: text('provider_message_id').notNull(),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('email_inbound_provider_idx').on(t.clientId, t.providerEventId),
		index('email_inbound_client_idx').on(t.clientId),
		index('email_inbound_status_idx').on(t.clientId, t.status)
	]
);

export const aiRunStatus = pgEnum('ai_run_status', ['queued', 'succeeded', 'failed', 'paused']);
export const aiDecisionStatus = pgEnum('ai_decision_status', ['proposed', 'approved', 'rejected']);
export const approvalRequestStatus = pgEnum('approval_request_status', [
	'pending',
	'approved',
	'rejected'
]);
export const approvalDecisionKind = pgEnum('approval_decision_kind', ['approved', 'rejected']);
export const aiMessageRole = pgEnum('ai_message_role', ['system', 'user', 'assistant']);
export const aiRiskClass = pgEnum('ai_risk_class', ['low', 'content', 'financial', 'legal']);
export const aiTaskClass = pgEnum('ai_task_class', [
	'classification',
	'extraction',
	'copy_generation',
	'strategic_reasoning',
	'deep_research',
	'content_review',
	'data_interpretation',
	'tool_orchestration'
]);

export type AiRunOutput = Record<string, unknown>;
export type AiMessageContent = { text: string };
export type AiToolPayload = Record<string, string | number | boolean | null>;

export const aiAgents = pgTable(
	'ai_agents',
	{
		id: id(),
		key: text('key').notNull(),
		name: text('name').notNull(),
		description: text('description').notNull(),
		defaultAutonomy: integer('default_autonomy').notNull().default(1),
		defaultRiskClass: aiRiskClass('default_risk_class').notNull().default('low'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('ai_agents_key_idx').on(t.key)]
);

export const promptTemplates = pgTable(
	'prompt_templates',
	{
		id: id(),
		key: text('key').notNull(),
		name: text('name').notNull(),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('prompt_templates_key_idx').on(t.key)]
);

export const promptVersions = pgTable(
	'prompt_versions',
	{
		id: id(),
		templateId: uuid('template_id')
			.notNull()
			.references(() => promptTemplates.id),
		version: integer('version').notNull(),
		systemText: text('system_text').notNull(),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('prompt_versions_template_version_idx').on(t.templateId, t.version)]
);

export const aiAgentVersions = pgTable(
	'ai_agent_versions',
	{
		id: id(),
		agentId: uuid('agent_id')
			.notNull()
			.references(() => aiAgents.id),
		promptVersionId: uuid('prompt_version_id')
			.notNull()
			.references(() => promptVersions.id),
		version: integer('version').notNull(),
		schemaName: text('schema_name').notNull(),
		schemaVersion: text('schema_version').notNull(),
		taskClass: aiTaskClass('task_class').notNull(),
		modelHint: text('model_hint'),
		createdAt: createdAt()
	},
	(t) => [uniqueIndex('ai_agent_versions_unique_idx').on(t.agentId, t.version)]
);

export const aiClientSettings = pgTable(
	'ai_client_settings',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		paused: boolean('paused').notNull().default(false),
		autonomyCeiling: integer('autonomy_ceiling').notNull().default(2),
		costCeilingMicros: integer('cost_ceiling_micros').notNull().default(5_000_000),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [uniqueIndex('ai_client_settings_client_idx').on(t.clientId)]
);

export const aiRuns = pgTable(
	'ai_runs',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		agentId: uuid('agent_id')
			.notNull()
			.references(() => aiAgents.id),
		agentVersionId: uuid('agent_version_id')
			.notNull()
			.references(() => aiAgentVersions.id),
		promptVersionId: uuid('prompt_version_id')
			.notNull()
			.references(() => promptVersions.id),
		agentKey: text('agent_key').notNull(),
		schemaName: text('schema_name').notNull(),
		schemaVersion: text('schema_version').notNull(),
		taskClass: aiTaskClass('task_class').notNull(),
		status: aiRunStatus('status').notNull().default('queued'),
		provider: text('provider').notNull(),
		model: text('model').notNull(),
		autonomyLevel: integer('autonomy_level').notNull().default(1),
		brief: text('brief'),
		output: jsonb('output').$type<AiRunOutput>(),
		error: text('error'),
		blockedBy: text('blocked_by'),
		idempotencyKey: text('idempotency_key').notNull(),
		requestId: text('request_id').notNull(),
		actorId: text('actor_id'),
		latencyMs: integer('latency_ms'),
		artifactKind: text('artifact_kind'),
		artifactPageVersionId: uuid('artifact_page_version_id').references(() => pageVersions.id),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('ai_runs_idempotency_idx').on(t.clientId, t.idempotencyKey),
		index('ai_runs_client_created_idx').on(t.clientId, t.createdAt),
		index('ai_runs_org_idx').on(t.organizationId),
		index('ai_runs_artifact_idx').on(t.clientId, t.artifactPageVersionId)
	]
);

export const aiMessages = pgTable(
	'ai_messages',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		runId: uuid('run_id')
			.notNull()
			.references(() => aiRuns.id),
		role: aiMessageRole('role').notNull(),
		content: jsonb('content').$type<AiMessageContent>().notNull(),
		createdAt: createdAt()
	},
	(t) => [index('ai_messages_client_idx').on(t.clientId), index('ai_messages_run_idx').on(t.runId)]
);

export const aiToolCalls = pgTable(
	'ai_tool_calls',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		runId: uuid('run_id')
			.notNull()
			.references(() => aiRuns.id),
		name: text('name').notNull(),
		input: jsonb('input').$type<AiToolPayload>().notNull().default({}),
		output: jsonb('output').$type<AiToolPayload>().notNull().default({}),
		authorized: boolean('authorized').notNull().default(false),
		createdAt: createdAt()
	},
	(t) => [
		index('ai_tool_calls_client_idx').on(t.clientId),
		index('ai_tool_calls_run_idx').on(t.runId)
	]
);

export const aiDecisions = pgTable(
	'ai_decisions',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		runId: uuid('run_id')
			.notNull()
			.references(() => aiRuns.id),
		kind: text('kind').notNull(),
		finding: text('finding').notNull(),
		evidence: text('evidence').notNull(),
		proposedAction: text('proposed_action').notNull(),
		expectedImpact: text('expected_impact').notNull(),
		confidence: integer('confidence').notNull(),
		riskClass: aiRiskClass('risk_class').notNull(),
		recommendedAutonomy: integer('recommended_autonomy').notNull(),
		status: aiDecisionStatus('status').notNull().default('proposed'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('ai_decisions_run_idx').on(t.runId),
		index('ai_decisions_client_idx').on(t.clientId)
	]
);

export const aiFeedback = pgTable(
	'ai_feedback',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		runId: uuid('run_id')
			.notNull()
			.references(() => aiRuns.id),
		rating: integer('rating').notNull(),
		note: text('note'),
		actorId: text('actor_id'),
		createdAt: createdAt()
	},
	(t) => [index('ai_feedback_client_idx').on(t.clientId)]
);

export const aiCostEvents = pgTable(
	'ai_cost_events',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		runId: uuid('run_id')
			.notNull()
			.references(() => aiRuns.id),
		provider: text('provider').notNull(),
		model: text('model').notNull(),
		promptTokens: integer('prompt_tokens').notNull(),
		completionTokens: integer('completion_tokens').notNull(),
		totalTokens: integer('total_tokens').notNull(),
		costMicros: integer('cost_micros').notNull(),
		currency: text('currency').notNull().default('USD'),
		createdAt: createdAt()
	},
	(t) => [
		index('ai_cost_events_client_idx').on(t.clientId),
		index('ai_cost_events_run_idx').on(t.runId)
	]
);

export const approvalRequests = pgTable(
	'approval_requests',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		runId: uuid('run_id')
			.notNull()
			.references(() => aiRuns.id),
		decisionId: uuid('decision_id')
			.notNull()
			.references(() => aiDecisions.id),
		actionType: text('action_type').notNull(),
		riskClass: aiRiskClass('risk_class').notNull(),
		summary: text('summary').notNull(),
		status: approvalRequestStatus('status').notNull().default('pending'),
		required: boolean('required').notNull().default(true),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('approval_requests_run_idx').on(t.runId),
		index('approval_requests_client_status_idx').on(t.clientId, t.status)
	]
);

export const approvalDecisions = pgTable(
	'approval_decisions',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		requestId: uuid('request_id')
			.notNull()
			.references(() => approvalRequests.id),
		decision: approvalDecisionKind('decision').notNull(),
		note: text('note'),
		actorId: text('actor_id'),
		confidenceIgnored: boolean('confidence_ignored').notNull().default(true),
		decidedAt: timestamp('decided_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [
		index('approval_decisions_client_idx').on(t.clientId),
		index('approval_decisions_request_idx').on(t.requestId)
	]
);

export const creativeAssetStatus = pgEnum('creative_asset_status', [
	'draft',
	'approved',
	'archived'
]);
export const creativeAssetKind = pgEnum('creative_asset_kind', ['image', 'graphic', 'other']);
export const creativeRightsStatus = pgEnum('creative_rights_status', [
	'unknown',
	'client_owned',
	'client_approved',
	'restricted',
	'prohibited'
]);
export const socialPlatform = pgEnum('social_platform', ['linkedin', 'x', 'facebook', 'instagram']);
export const socialConnectionStatus = pgEnum('social_connection_status', [
	'pending',
	'active',
	'expired',
	'revoked'
]);
export const socialAccountStatus = pgEnum('social_account_status', ['active', 'disconnected']);
export const socialPostStatus = pgEnum('social_post_status', [
	'idea',
	'draft',
	'reviewed',
	'approved',
	'scheduled',
	'publishing',
	'published',
	'failed',
	'archived'
]);
export const socialPublicationStatus = pgEnum('social_publication_status', [
	'queued',
	'publishing',
	'published',
	'failed'
]);

export const creativeAssets = pgTable(
	'creative_assets',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		title: text('title').notNull(),
		kind: creativeAssetKind('kind').notNull().default('image'),
		status: creativeAssetStatus('status').notNull().default('draft'),
		sourceType: text('source_type').notNull().default('operator_upload'),
		currentVersion: integer('current_version').notNull().default(1),
		createdBy: text('created_by'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('creative_assets_client_idx').on(t.clientId),
		index('creative_assets_org_idx').on(t.organizationId)
	]
);

export const creativeAssetVersions = pgTable(
	'creative_asset_versions',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		assetId: uuid('asset_id')
			.notNull()
			.references(() => creativeAssets.id),
		version: integer('version').notNull(),
		storageKey: text('storage_key').notNull(),
		originalFilename: text('original_filename').notNull(),
		mimeType: text('mime_type').notNull(),
		sizeBytes: integer('size_bytes').notNull(),
		checksum: text('checksum').notNull(),
		createdBy: text('created_by'),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('creative_asset_versions_unique_idx').on(t.assetId, t.version),
		uniqueIndex('creative_asset_versions_client_key_idx').on(t.clientId, t.storageKey),
		index('creative_asset_versions_client_idx').on(t.clientId)
	]
);

export const creativeAssetRights = pgTable(
	'creative_asset_rights',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		assetId: uuid('asset_id')
			.notNull()
			.references(() => creativeAssets.id),
		rightsStatus: creativeRightsStatus('rights_status').notNull().default('unknown'),
		usageNotes: text('usage_notes'),
		confirmedBy: text('confirmed_by'),
		confirmedAt: timestamp('confirmed_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('creative_asset_rights_asset_idx').on(t.assetId),
		index('creative_asset_rights_client_idx').on(t.clientId)
	]
);

export const socialConnections = pgTable(
	'social_connections',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		platform: socialPlatform('platform').notNull(),
		status: socialConnectionStatus('status').notNull().default('pending'),
		encryptedAccessToken: text('encrypted_access_token'),
		encryptedRefreshToken: text('encrypted_refresh_token'),
		tokenExpiresAt: timestamp('token_expires_at', { withTimezone: true }),
		scopes: text('scopes'),
		lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
		lastError: text('last_error'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('social_connections_client_platform_idx').on(t.clientId, t.platform),
		index('social_connections_client_idx').on(t.clientId)
	]
);

export const socialAccounts = pgTable(
	'social_accounts',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		connectionId: uuid('connection_id')
			.notNull()
			.references(() => socialConnections.id),
		platform: socialPlatform('platform').notNull(),
		externalAccountId: text('external_account_id').notNull(),
		handle: text('handle').notNull(),
		displayName: text('display_name').notNull(),
		required: boolean('required').notNull().default(true),
		status: socialAccountStatus('status').notNull().default('active'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('social_accounts_connection_idx').on(t.connectionId),
		index('social_accounts_client_idx').on(t.clientId)
	]
);

export const socialPosts = pgTable(
	'social_posts',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		status: socialPostStatus('status').notNull().default('draft'),
		body: text('body').notNull(),
		assetId: uuid('asset_id').references(() => creativeAssets.id),
		assetVersionId: uuid('asset_version_id').references(() => creativeAssetVersions.id),
		scheduledAt: timestamp('scheduled_at', { withTimezone: true }),
		similarityHash: text('similarity_hash').notNull(),
		createdBy: text('created_by'),
		approvedBy: text('approved_by'),
		approvedAt: timestamp('approved_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('social_posts_client_idx').on(t.clientId),
		index('social_posts_client_status_idx').on(t.clientId, t.status),
		index('social_posts_similarity_idx').on(t.clientId, t.similarityHash)
	]
);

export const socialPublications = pgTable(
	'social_publications',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		postId: uuid('post_id')
			.notNull()
			.references(() => socialPosts.id),
		accountId: uuid('account_id')
			.notNull()
			.references(() => socialAccounts.id),
		connectionId: uuid('connection_id')
			.notNull()
			.references(() => socialConnections.id),
		platform: socialPlatform('platform').notNull(),
		status: socialPublicationStatus('status').notNull().default('queued'),
		providerPostId: text('provider_post_id'),
		contentVersion: integer('content_version').notNull().default(1),
		assetVersionId: uuid('asset_version_id').references(() => creativeAssetVersions.id),
		idempotencyKey: text('idempotency_key').notNull(),
		error: text('error'),
		publishedAt: timestamp('published_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('social_publications_idempotency_idx').on(t.clientId, t.idempotencyKey),
		index('social_publications_client_idx').on(t.clientId),
		index('social_publications_post_idx').on(t.postId)
	]
);

export const socialMetrics = pgTable(
	'social_metrics',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		publicationId: uuid('publication_id')
			.notNull()
			.references(() => socialPublications.id),
		impressions: integer('impressions').notNull().default(0),
		likes: integer('likes').notNull().default(0),
		comments: integer('comments').notNull().default(0),
		shares: integer('shares').notNull().default(0),
		clicks: integer('clicks').notNull().default(0),
		fetchedAt: timestamp('fetched_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [
		index('social_metrics_client_idx').on(t.clientId),
		index('social_metrics_publication_idx').on(t.publicationId)
	]
);

export const socialProviderEvents = pgTable(
	'social_provider_events',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		platform: socialPlatform('platform').notNull(),
		providerEventId: text('provider_event_id').notNull(),
		type: text('type').notNull(),
		payload: jsonb('payload')
			.$type<Record<string, string | number | boolean | null>>()
			.notNull()
			.default({}),
		occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('social_provider_events_unique_idx').on(t.clientId, t.providerEventId),
		index('social_provider_events_client_idx').on(t.clientId)
	]
);

export const seoEngine = pgEnum('seo_engine', ['google', 'bing']);
export const seoPropertyStatus = pgEnum('seo_property_status', [
	'pending',
	'active',
	'expired',
	'revoked'
]);
export const seoAuditKind = pgEnum('seo_audit_kind', ['technical']);
export const seoAuditStatus = pgEnum('seo_audit_status', ['completed', 'failed']);
export const seoIssueSeverity = pgEnum('seo_issue_severity', ['low', 'medium', 'high']);
export const seoIssueStatus = pgEnum('seo_issue_status', ['open', 'resolved']);
export const seoOpportunityChannel = pgEnum('seo_opportunity_channel', ['seo', 'aeo', 'geo']);
export const seoOpportunityStatus = pgEnum('seo_opportunity_status', [
	'proposed',
	'accepted',
	'rejected',
	'publish_ready',
	'done'
]);
export const seoEffort = pgEnum('seo_effort', ['low', 'medium', 'high']);
export const seoEvidenceClass = pgEnum('seo_evidence_class', [
	'observed',
	'measured',
	'provider_reported',
	'client_verified',
	'source_verified',
	'inferred',
	'estimated',
	'hypothesis',
	'unknown'
]);
export const seoSourceKind = pgEnum('seo_source_kind', [
	'knowledge_claim',
	'official_query',
	'technical_audit',
	'page'
]);

export const seoProperties = pgTable(
	'seo_properties',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		engine: seoEngine('engine').notNull(),
		siteUrl: text('site_url').notNull(),
		status: seoPropertyStatus('status').notNull().default('pending'),
		encryptedCredential: text('encrypted_credential'),
		lastValidatedAt: timestamp('last_validated_at', { withTimezone: true }),
		lastSyncedAt: timestamp('last_synced_at', { withTimezone: true }),
		lastError: text('last_error'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('seo_properties_client_engine_site_idx').on(t.clientId, t.engine, t.siteUrl),
		index('seo_properties_client_idx').on(t.clientId)
	]
);

export const seoPages = pgTable(
	'seo_pages',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		propertyId: uuid('property_id').references(() => seoProperties.id),
		pageId: uuid('page_id').references(() => pages.id),
		path: text('path').notNull(),
		url: text('url'),
		title: text('title'),
		clicks: integer('clicks').notNull().default(0),
		impressions: integer('impressions').notNull().default(0),
		ctrBps: integer('ctr_bps').notNull().default(0),
		positionMilli: integer('position_milli').notNull().default(0),
		lastSeenAt: timestamp('last_seen_at', { withTimezone: true }),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('seo_pages_client_path_idx').on(t.clientId, t.path),
		index('seo_pages_client_idx').on(t.clientId)
	]
);

export const seoKeywords = pgTable(
	'seo_keywords',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		phrase: text('phrase').notNull(),
		locale: text('locale').notNull().default('en'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('seo_keywords_client_phrase_locale_idx').on(t.clientId, t.phrase, t.locale),
		index('seo_keywords_client_idx').on(t.clientId)
	]
);

export const seoQueries = pgTable(
	'seo_queries',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		propertyId: uuid('property_id')
			.notNull()
			.references(() => seoProperties.id),
		keywordId: uuid('keyword_id').references(() => seoKeywords.id),
		query: text('query').notNull(),
		pageUrl: text('page_url').notNull().default(''),
		clicks: integer('clicks').notNull().default(0),
		impressions: integer('impressions').notNull().default(0),
		ctrBps: integer('ctr_bps').notNull().default(0),
		positionMilli: integer('position_milli').notNull().default(0),
		date: text('date').notNull(),
		country: text('country').notNull().default(''),
		device: text('device').notNull().default(''),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('seo_queries_unique_idx').on(
			t.clientId,
			t.propertyId,
			t.query,
			t.pageUrl,
			t.date,
			t.country,
			t.device
		),
		index('seo_queries_client_idx').on(t.clientId)
	]
);

export const seoAudits = pgTable(
	'seo_audits',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		kind: seoAuditKind('kind').notNull().default('technical'),
		status: seoAuditStatus('status').notNull().default('completed'),
		summary: text('summary').notNull(),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [index('seo_audits_client_idx').on(t.clientId)]
);

export const seoIssues = pgTable(
	'seo_issues',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		auditId: uuid('audit_id')
			.notNull()
			.references(() => seoAudits.id),
		pageId: uuid('page_id').references(() => pages.id),
		path: text('path'),
		code: text('code').notNull(),
		severity: seoIssueSeverity('severity').notNull(),
		evidenceClass: seoEvidenceClass('evidence_class').notNull().default('observed'),
		detail: text('detail').notNull(),
		status: seoIssueStatus('status').notNull().default('open'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('seo_issues_client_idx').on(t.clientId),
		index('seo_issues_client_status_idx').on(t.clientId, t.status)
	]
);

export const seoOpportunities = pgTable(
	'seo_opportunities',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		channel: seoOpportunityChannel('channel').notNull(),
		title: text('title').notNull(),
		problem: text('problem').notNull(),
		proposedAction: text('proposed_action').notNull(),
		evidenceClass: seoEvidenceClass('evidence_class').notNull(),
		sourceKind: seoSourceKind('source_kind').notNull(),
		sourceId: text('source_id').notNull(),
		pageId: uuid('page_id').references(() => pages.id),
		queryId: uuid('query_id').references(() => seoQueries.id),
		priority: integer('priority').notNull().default(1),
		effort: seoEffort('effort').notNull().default('medium'),
		status: seoOpportunityStatus('status').notNull().default('proposed'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		index('seo_opportunities_client_idx').on(t.clientId),
		index('seo_opportunities_client_status_idx').on(t.clientId, t.status),
		index('seo_opportunities_client_channel_idx').on(t.clientId, t.channel)
	]
);

export const schemaEntityKind = pgEnum('schema_entity_kind', ['organization', 'service', 'offer']);
export const schemaEntitySourceKind = pgEnum('schema_entity_source_kind', [
	'brand',
	'service',
	'offer'
]);
export const schemaEntityStatus = pgEnum('schema_entity_status', ['current', 'stale']);
export const answerTargetSourceKind = pgEnum('answer_target_source_kind', [
	'brand',
	'service',
	'offer',
	'knowledge_claim'
]);
export const answerTargetIntent = pgEnum('answer_target_intent', ['definition', 'use_case']);
export const answerTargetStatus = pgEnum('answer_target_status', ['mapped', 'gap']);
export const contentBriefStatus = pgEnum('content_brief_status', ['draft']);

export const schemaEntities = pgTable(
	'schema_entities',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		kind: schemaEntityKind('kind').notNull(),
		sourceKind: schemaEntitySourceKind('source_kind').notNull(),
		sourceId: uuid('source_id').notNull(),
		name: text('name').notNull(),
		fact: text('fact').notNull(),
		status: schemaEntityStatus('status').notNull().default('current'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('schema_entities_client_source_idx').on(
			t.clientId,
			t.kind,
			t.sourceKind,
			t.sourceId
		),
		index('schema_entities_client_idx').on(t.clientId)
	]
);

export const answerTargets = pgTable(
	'answer_targets',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		sourceKind: answerTargetSourceKind('source_kind').notNull(),
		sourceId: uuid('source_id').notNull(),
		intent: answerTargetIntent('intent').notNull(),
		question: text('question').notNull(),
		answer: text('answer').notNull(),
		pageId: uuid('page_id').references(() => pages.id),
		status: answerTargetStatus('status').notNull().default('gap'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('answer_targets_client_source_intent_idx').on(
			t.clientId,
			t.sourceKind,
			t.sourceId,
			t.intent
		),
		index('answer_targets_client_idx').on(t.clientId),
		index('answer_targets_client_status_idx').on(t.clientId, t.status)
	]
);

export const contentBriefs = pgTable(
	'content_briefs',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		answerTargetId: uuid('answer_target_id')
			.notNull()
			.references(() => answerTargets.id),
		claimId: uuid('claim_id').references(() => claims.id),
		pageId: uuid('page_id').references(() => pages.id),
		title: text('title').notNull(),
		problem: text('problem').notNull(),
		proposedAction: text('proposed_action').notNull(),
		status: contentBriefStatus('status').notNull().default('draft'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('content_briefs_client_target_idx').on(t.clientId, t.answerTargetId),
		index('content_briefs_client_idx').on(t.clientId)
	]
);

export const geoQueryGroup = pgEnum('geo_query_group', [
	'brand',
	'service',
	'product',
	'high_intent',
	'informational'
]);
export const geoQuerySourceKind = pgEnum('geo_query_source_kind', ['brand', 'service', 'offer']);
export const geoQuerySetStatus = pgEnum('geo_query_set_status', ['active', 'archived']);
export const geoSurface = pgEnum('geo_surface', [
	'chatgpt',
	'google_ai_overview',
	'gemini',
	'perplexity',
	'other'
]);
export const geoMeasurementMethod = pgEnum('geo_measurement_method', [
	'manual',
	'operator_assisted'
]);
export const geoRunStatus = pgEnum('geo_run_status', ['recorded']);
export const geoProminence = pgEnum('geo_prominence', ['unknown', 'mentioned', 'cited', 'primary']);
export const geoAccuracy = pgEnum('geo_accuracy', ['yes', 'no', 'unknown']);
export const geoCitationKind = pgEnum('geo_citation_kind', ['owned', 'earned']);
export const geoRepresentationStatus = pgEnum('geo_representation_status', [
	'accurate',
	'inaccurate',
	'unknown',
	'missing'
]);

export const geoQuerySets = pgTable(
	'geo_query_sets',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		slug: text('slug').notNull(),
		name: text('name').notNull(),
		purpose: text('purpose').notNull().default('commercial_baseline'),
		status: geoQuerySetStatus('status').notNull().default('active'),
		country: text('country').notNull().default(''),
		market: text('market').notNull().default(''),
		language: text('language').notNull().default('en'),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('geo_query_sets_client_slug_idx').on(t.clientId, t.slug),
		index('geo_query_sets_client_idx').on(t.clientId)
	]
);

export const geoQueries = pgTable(
	'geo_queries',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		setId: uuid('set_id')
			.notNull()
			.references(() => geoQuerySets.id),
		query: text('query').notNull(),
		group: geoQueryGroup('group').notNull(),
		sourceKind: geoQuerySourceKind('source_kind').notNull(),
		sourceId: uuid('source_id').notNull(),
		locale: text('locale').notNull().default('en'),
		country: text('country').notNull().default(''),
		language: text('language').notNull().default('en'),
		priority: integer('priority').notNull().default(50),
		createdAt: createdAt(),
		updatedAt: updatedAt()
	},
	(t) => [
		uniqueIndex('geo_queries_client_set_query_locale_idx').on(
			t.clientId,
			t.setId,
			t.query,
			t.locale
		),
		index('geo_queries_client_idx').on(t.clientId)
	]
);

export const geoMeasurementRuns = pgTable(
	'geo_measurement_runs',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		setId: uuid('set_id')
			.notNull()
			.references(() => geoQuerySets.id),
		method: geoMeasurementMethod('method').notNull(),
		status: geoRunStatus('status').notNull().default('recorded'),
		costMinor: integer('cost_minor').notNull().default(0),
		currency: text('currency').notNull().default('USD'),
		startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
		completedAt: timestamp('completed_at', { withTimezone: true }),
		createdAt: createdAt()
	},
	(t) => [index('geo_measurement_runs_client_idx').on(t.clientId)]
);

export const geoEngineObservations = pgTable(
	'geo_engine_observations',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		runId: uuid('run_id')
			.notNull()
			.references(() => geoMeasurementRuns.id),
		queryId: uuid('query_id')
			.notNull()
			.references(() => geoQueries.id),
		engine: geoSurface('engine').notNull(),
		method: geoMeasurementMethod('method').notNull(),
		evidenceClass: seoEvidenceClass('evidence_class').notNull().default('observed'),
		mentioned: boolean('mentioned').notNull().default(false),
		ownedCitation: boolean('owned_citation').notNull().default(false),
		earnedCitation: boolean('earned_citation').notNull().default(false),
		represented: boolean('represented').notNull().default(false),
		accurate: geoAccuracy('accurate').notNull().default('unknown'),
		prominence: geoProminence('prominence').notNull().default('unknown'),
		referralObserved: boolean('referral_observed').notNull().default(false),
		outcomeObserved: boolean('outcome_observed').notNull().default(false),
		confidence: integer('confidence').notNull().default(50),
		detail: text('detail'),
		observedAt: timestamp('observed_at', { withTimezone: true }).notNull().defaultNow(),
		createdAt: createdAt()
	},
	(t) => [
		index('geo_engine_observations_client_idx').on(t.clientId),
		index('geo_engine_observations_client_observed_idx').on(t.clientId, t.observedAt)
	]
);

export const geoCitations = pgTable(
	'geo_citations',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		observationId: uuid('observation_id')
			.notNull()
			.references(() => geoEngineObservations.id),
		kind: geoCitationKind('kind').notNull(),
		url: text('url'),
		domain: text('domain'),
		createdAt: createdAt()
	},
	(t) => [index('geo_citations_client_idx').on(t.clientId)]
);

export const geoVisibilitySnapshots = pgTable(
	'geo_visibility_snapshots',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		setId: uuid('set_id')
			.notNull()
			.references(() => geoQuerySets.id),
		windowStart: timestamp('window_start', { withTimezone: true }).notNull(),
		windowEnd: timestamp('window_end', { withTimezone: true }).notNull(),
		computedAt: timestamp('computed_at', { withTimezone: true }).notNull().defaultNow(),
		queryCount: integer('query_count').notNull().default(0),
		observationCount: integer('observation_count').notNull().default(0),
		mentionedQueryCount: integer('mentioned_query_count').notNull().default(0),
		ownedCitationQueryCount: integer('owned_citation_query_count').notNull().default(0),
		earnedCitationQueryCount: integer('earned_citation_query_count').notNull().default(0),
		representedQueryCount: integer('represented_query_count').notNull().default(0),
		accurateYesCount: integer('accurate_yes_count').notNull().default(0),
		accurateNoCount: integer('accurate_no_count').notNull().default(0),
		mentionOnlyCount: integer('mention_only_count').notNull().default(0),
		sufficient: boolean('sufficient').notNull().default(false),
		headline: text('headline').notNull(),
		createdAt: createdAt()
	},
	(t) => [
		index('geo_visibility_snapshots_client_idx').on(t.clientId),
		index('geo_visibility_snapshots_client_computed_idx').on(t.clientId, t.computedAt)
	]
);

export const geoFactRepresentations = pgTable(
	'geo_fact_representations',
	{
		id: id(),
		organizationId: uuid('organization_id')
			.notNull()
			.references(() => organizations.id),
		clientId: uuid('client_id')
			.notNull()
			.references(() => clients.id),
		snapshotId: uuid('snapshot_id')
			.notNull()
			.references(() => geoVisibilitySnapshots.id),
		observationId: uuid('observation_id')
			.notNull()
			.references(() => geoEngineObservations.id),
		claimId: uuid('claim_id').references(() => claims.id),
		status: geoRepresentationStatus('status').notNull(),
		evidenceClass: seoEvidenceClass('evidence_class').notNull().default('observed'),
		detail: text('detail'),
		createdAt: createdAt()
	},
	(t) => [
		uniqueIndex('geo_fact_representations_snapshot_observation_idx').on(
			t.snapshotId,
			t.observationId
		),
		index('geo_fact_representations_client_idx').on(t.clientId)
	]
);
