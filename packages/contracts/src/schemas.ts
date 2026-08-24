import { z } from 'zod';
import { AUTONOMY_ACTION_TYPES, LAUNCH_AUTOMATION_ACTIONS, PHASE_8_MAX_AUTONOMY } from './autonomy';
import { ValidationError } from './errors';
import { USAGE_LIMIT_MODES, USAGE_RESOURCE_FAMILIES } from './scale';

export const loginSchema = z
	.object({
		email: z.string().email(),
		password: z.string().min(1)
	})
	.strict();

export const createClientSchema = z
	.object({
		name: z.string().min(1).max(120),
		slug: z
			.string()
			.min(2)
			.max(60)
			.regex(/^[a-z0-9-]+$/),
		timezone: z.string().min(1).default('UTC')
	})
	.strict();

export const switchClientSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export const createMembershipSchema = z
	.object({
		email: z.string().email(),
		name: z.string().min(1).max(120),
		roleKey: z.enum(['client_owner', 'client_admin', 'read_only'])
	})
	.strict();

export const updateClientSettingsSchema = z
	.object({
		displayName: z.string().min(1).max(120)
	})
	.strict();

export const brandTokensSchema = z
	.object({
		background: z.string().max(32).optional(),
		surface: z.string().max(32).optional(),
		text: z.string().max(32).optional(),
		accent: z.string().max(32).optional(),
		fontFamily: z.string().max(80).optional()
	})
	.strict();

export type BrandTokens = z.infer<typeof brandTokensSchema>;

export const upsertBrandSchema = z
	.object({
		displayName: z.string().min(1).max(120),
		tagline: z.string().max(200).optional().nullable(),
		audience: z.string().max(400).optional().nullable(),
		offer: z.string().max(400).optional().nullable(),
		primaryConversion: z.string().max(160).optional().nullable(),
		secondaryConversion: z.string().max(160).optional().nullable(),
		brandPersonality: z
			.enum(['premium', 'technology', 'growth', 'creative', 'corporate'])
			.optional()
			.nullable(),
		tokens: brandTokensSchema.default({})
	})
	.strict();

export const createServiceSchema = z
	.object({
		name: z.string().min(1).max(120),
		slug: z
			.string()
			.min(2)
			.max(60)
			.regex(/^[a-z0-9-]+$/),
		outcome: z.string().min(1).max(200),
		summary: z.string().min(1).max(400)
	})
	.strict();

export const createOfferSchema = z
	.object({
		name: z.string().min(1).max(120),
		summary: z.string().min(1).max(400),
		startingPriceMinor: z.number().int().nonnegative().optional().nullable(),
		currency: z.string().length(3).default('USD')
	})
	.strict();

export const createClaimSchema = z
	.object({
		kind: z.enum(['approved', 'prohibited']),
		statement: z.string().min(1).max(400),
		evidence: z.string().max(400).optional().nullable()
	})
	.strict();

export const knowledgeClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export const ASSET_PURPOSES = ['logo', 'mark', 'og', 'favicon', 'other'] as const;

export const uploadBrandAssetSchema = z
	.object({
		purpose: z.enum(ASSET_PURPOSES)
	})
	.strict();

export const brandAssetIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export const DOMAIN_KINDS = ['production', 'redirect'] as const;

export const submitClientDomainSchema = z
	.object({
		hostname: z.string().min(3).max(253),
		kind: z.enum(DOMAIN_KINDS)
	})
	.strict();

export const clientDomainIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export const LEAD_STATUSES = ['new', 'working', 'qualified', 'won', 'lost', 'spam'] as const;
export type LeadStatus = (typeof LEAD_STATUSES)[number];

export const captureLeadSchema = z
	.object({
		name: z.string().trim().min(1).max(120),
		email: z.string().trim().email().max(254),
		phone: z.string().trim().max(40).optional().nullable(),
		company: z.string().trim().max(120).optional().nullable(),
		message: z.string().trim().max(2000).optional().nullable(),
		consentLeadFollowUp: z.boolean(),
		consentMarketing: z.boolean(),
		visitorId: z.string().uuid().optional(),
		sessionId: z.string().uuid().optional(),
		landingUrl: z.string().max(2000).optional().nullable(),
		referrer: z.string().max(2000).optional().nullable(),
		utmSource: z.string().max(200).optional().nullable(),
		utmMedium: z.string().max(200).optional().nullable(),
		utmCampaign: z.string().max(200).optional().nullable(),
		utmTerm: z.string().max(200).optional().nullable(),
		utmContent: z.string().max(200).optional().nullable(),
		hostname: z.string().min(1).max(253),
		domainKind: z.enum(['preview', 'production']),
		siteId: z.string().uuid(),
		funnelId: z.string().uuid(),
		pageId: z.string().uuid(),
		pageVersionId: z.string().uuid(),
		experimentId: z.string().uuid().optional(),
		experimentVariant: z.string().trim().max(40).optional(),
		userAgent: z.string().trim().max(512).optional()
	})
	.strict();

export const recordDeliveryEventSchema = z
	.object({
		name: z.enum(['page_viewed', 'cta_clicked', 'form_started']),
		visitorId: z.string().uuid(),
		sessionId: z.string().uuid(),
		landingUrl: z.string().max(2000).optional().nullable(),
		referrer: z.string().max(2000).optional().nullable(),
		utmSource: z.string().max(200).optional().nullable(),
		utmMedium: z.string().max(200).optional().nullable(),
		utmCampaign: z.string().max(200).optional().nullable(),
		utmTerm: z.string().max(200).optional().nullable(),
		utmContent: z.string().max(200).optional().nullable(),
		hostname: z.string().min(1).max(253),
		domainKind: z.enum(['preview', 'production']),
		siteId: z.string().uuid(),
		funnelId: z.string().uuid(),
		pageId: z.string().uuid(),
		pageVersionId: z.string().uuid(),
		experimentId: z.string().uuid().optional(),
		experimentVariant: z.string().trim().max(40).optional(),
		userAgent: z.string().trim().max(512).optional()
	})
	.strict();

export const updateLeadStatusSchema = z
	.object({
		id: z.string().uuid(),
		status: z.enum(LEAD_STATUSES),
		reason: z.string().trim().min(1).max(400)
	})
	.strict();

export const leadClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export const EMAIL_SUPPRESSION_REASONS = [
	'unsubscribe',
	'bounce',
	'complaint',
	'operator'
] as const;
export type EmailSuppressionReason = (typeof EMAIL_SUPPRESSION_REASONS)[number];

export const upsertEmailDomainSchema = z
	.object({
		domain: z
			.string()
			.trim()
			.toLowerCase()
			.min(3)
			.max(253)
			.regex(/^[a-z0-9.-]+$/),
		fromAddress: z.string().trim().email().max(254),
		fromName: z.string().trim().min(1).max(120),
		fromApproved: z.boolean(),
		dkimSelector: z.string().trim().min(1).max(80).default('resend')
	})
	.strict();

export const emailDomainIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export const addEmailSuppressionSchema = z
	.object({
		email: z.string().trim().email().max(254),
		reason: z.enum(['unsubscribe', 'operator'])
	})
	.strict();

export const emailClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export const unsubscribeTokenSchema = z
	.object({
		token: z.string().min(16).max(500)
	})
	.strict();

export const emailInboundIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export const AI_AGENT_KEYS = ['research', 'copy', 'analytics', 'funnel_strategist'] as const;
export type AIAgentKey = (typeof AI_AGENT_KEYS)[number];

export const runIntelligenceSchema = z
	.object({
		agentKey: z.enum(AI_AGENT_KEYS),
		brief: z.string().trim().max(2000).optional().nullable(),
		idempotencyKey: z.string().uuid().optional()
	})
	.strict();

export const intelligenceClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export const decideApprovalSchema = z
	.object({
		id: z.string().uuid(),
		decision: z.enum(['approved', 'rejected']),
		note: z.string().trim().max(400).optional().nullable()
	})
	.strict();

export const pauseIntelligenceSchema = z
	.object({
		paused: z.boolean(),
		reason: z.string().trim().min(8).max(400)
	})
	.strict();

export const setAutonomyCeilingSchema = z
	.object({
		autonomyCeiling: z.number().int().min(0).max(PHASE_8_MAX_AUTONOMY)
	})
	.strict();

export const runAutoExecuteSchema = z
	.object({
		actionType: z.enum(AUTONOMY_ACTION_TYPES),
		idempotencyKey: z.string().trim().min(8).max(80).optional(),
		experimentId: z.string().uuid().optional()
	})
	.strict();

export const rollbackAutoExecuteSchema = z
	.object({
		executionId: z.string().uuid()
	})
	.strict();

export const setLaunchAutomationPolicySchema = z
	.object({
		actionType: z.enum(LAUNCH_AUTOMATION_ACTIONS),
		enabled: z.boolean()
	})
	.strict();

export const recordTenantUsageSchema = z
	.object({
		resourceFamily: z.enum(USAGE_RESOURCE_FAMILIES),
		quantity: z.number().int().min(1).max(10_000).default(1)
	})
	.strict();

export const setTenantUsageLimitSchema = z
	.object({
		clientId: z.string().uuid(),
		resourceFamily: z.enum(USAGE_RESOURCE_FAMILIES),
		hardLimit: z.number().int().min(1).max(1_000_000),
		warningPercent: z.number().int().min(1).max(100).default(80),
		mode: z.enum(USAGE_LIMIT_MODES).default('enforce'),
		reason: z.string().trim().min(8).max(400)
	})
	.strict();

export const requestIntelligenceToolSchema = z
	.object({
		runId: z.string().uuid(),
		name: z.string().trim().min(1).max(80),
		input: z
			.record(z.string(), z.union([z.string().max(400), z.number(), z.boolean(), z.null()]))
			.optional()
	})
	.strict();

export const SOCIAL_PLATFORMS = ['linkedin', 'x', 'facebook', 'instagram'] as const;
export type SocialPlatform = (typeof SOCIAL_PLATFORMS)[number];

export const SOCIAL_POST_STATUSES = [
	'idea',
	'draft',
	'reviewed',
	'approved',
	'scheduled',
	'publishing',
	'published',
	'failed',
	'archived'
] as const;
export type SocialPostStatus = (typeof SOCIAL_POST_STATUSES)[number];

export const CREATIVE_ASSET_STATUSES = ['draft', 'approved', 'archived'] as const;
export type CreativeAssetStatus = (typeof CREATIVE_ASSET_STATUSES)[number];

export const CREATIVE_RIGHTS_STATUSES = [
	'unknown',
	'client_owned',
	'client_approved',
	'restricted',
	'prohibited'
] as const;
export type CreativeRightsStatus = (typeof CREATIVE_RIGHTS_STATUSES)[number];

export const CREATIVE_ASSET_KINDS = ['image', 'graphic', 'other'] as const;
export type CreativeAssetKind = (typeof CREATIVE_ASSET_KINDS)[number];

export const upsertSocialConnectionSchema = z
	.object({
		platform: z.enum(SOCIAL_PLATFORMS),
		accessToken: z.string().trim().min(8).max(4000),
		refreshToken: z.string().trim().min(8).max(4000).optional().nullable(),
		externalAccountId: z.string().trim().min(1).max(180),
		handle: z.string().trim().min(1).max(80),
		displayName: z.string().trim().min(1).max(120),
		required: z.boolean().default(true)
	})
	.strict();

export const socialConnectionIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export const refreshSocialConnectionSchema = socialConnectionIdSchema;

export const startSocialOAuthSchema = z
	.object({
		platform: z.enum(SOCIAL_PLATFORMS),
		required: z.boolean().default(true)
	})
	.strict();

export const completeSocialOAuthSchema = z
	.object({
		code: z.string().trim().min(1).max(4000),
		state: z.string().trim().min(8).max(8000)
	})
	.strict();

export const selectSocialOAuthPageSchema = z
	.object({
		pageId: z.string().trim().min(1).max(180),
		selectionToken: z.string().trim().min(8).max(8000)
	})
	.strict();

export const createSocialPostSchema = z
	.object({
		body: z.string().trim().min(1).max(2000),
		assetId: z.string().uuid().optional().nullable(),
		status: z.enum(['idea', 'draft']).default('draft')
	})
	.strict();

export const socialPostIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export const transitionSocialPostSchema = z
	.object({
		id: z.string().uuid(),
		to: z.enum(['draft', 'reviewed', 'approved', 'archived'])
	})
	.strict();

export const scheduleSocialPostSchema = z
	.object({
		id: z.string().uuid(),
		scheduledAt: z.coerce.date()
	})
	.strict();

export const publishSocialPostSchema = z
	.object({
		id: z.string().uuid(),
		accountIds: z.array(z.string().uuid()).min(1).max(8)
	})
	.strict();

export const socialClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export const uploadCreativeAssetSchema = z
	.object({
		title: z.string().trim().min(1).max(160),
		kind: z.enum(CREATIVE_ASSET_KINDS).default('image')
	})
	.strict();

export const creativeAssetIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export const confirmCreativeRightsSchema = z
	.object({
		id: z.string().uuid(),
		rightsStatus: z.enum(['client_owned', 'client_approved', 'restricted', 'prohibited']),
		usageNotes: z.string().trim().max(400).optional().nullable()
	})
	.strict();

export const SEARCH_ENGINES = ['google', 'bing'] as const;
export type SearchEngine = (typeof SEARCH_ENGINES)[number];

export const SEO_OPPORTUNITY_CHANNELS = ['seo', 'aeo', 'geo'] as const;
export type SeoOpportunityChannel = (typeof SEO_OPPORTUNITY_CHANNELS)[number];

export const SEO_EVIDENCE_CLASSES = [
	'observed',
	'measured',
	'provider_reported',
	'client_verified',
	'source_verified',
	'inferred',
	'estimated',
	'hypothesis',
	'unknown'
] as const;
export type SeoEvidenceClass = (typeof SEO_EVIDENCE_CLASSES)[number];

export const SEO_SOURCE_KINDS = [
	'knowledge_claim',
	'official_query',
	'technical_audit',
	'page'
] as const;
export type SeoSourceKind = (typeof SEO_SOURCE_KINDS)[number];

export const SEO_OPPORTUNITY_STATUSES = [
	'proposed',
	'accepted',
	'rejected',
	'publish_ready',
	'done'
] as const;
export type SeoOpportunityStatus = (typeof SEO_OPPORTUNITY_STATUSES)[number];

export const SEO_EFFORTS = ['low', 'medium', 'high'] as const;
export type SeoEffort = (typeof SEO_EFFORTS)[number];

export const connectSearchPropertySchema = z
	.object({
		engine: z.enum(SEARCH_ENGINES),
		siteUrl: z.string().trim().url().max(400),
		credential: z.string().trim().min(8).max(8000)
	})
	.strict();

export const searchPropertyIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export const submitSearchSitemapSchema = z
	.object({
		id: z.string().uuid(),
		sitemapUrl: z.string().trim().url().max(400)
	})
	.strict();

export const createSeoOpportunitySchema = z
	.object({
		channel: z.enum(SEO_OPPORTUNITY_CHANNELS),
		title: z.string().trim().min(1).max(160),
		problem: z.string().trim().min(1).max(800),
		proposedAction: z.string().trim().min(1).max(800),
		evidenceClass: z.enum(SEO_EVIDENCE_CLASSES),
		sourceKind: z.enum(SEO_SOURCE_KINDS),
		sourceId: z.string().trim().min(1).max(80),
		pageId: z.string().uuid().optional().nullable(),
		queryId: z.string().uuid().optional().nullable(),
		effort: z.enum(SEO_EFFORTS).default('medium')
	})
	.strict();

export const seoOpportunityIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export const searchClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export const SCHEMA_ENTITY_KINDS = ['organization', 'service', 'offer'] as const;
export type SchemaEntityKind = (typeof SCHEMA_ENTITY_KINDS)[number];

export const SCHEMA_ENTITY_SOURCE_KINDS = ['brand', 'service', 'offer'] as const;
export type SchemaEntitySourceKind = (typeof SCHEMA_ENTITY_SOURCE_KINDS)[number];

export const SCHEMA_ENTITY_STATUSES = ['current', 'stale'] as const;
export type SchemaEntityStatus = (typeof SCHEMA_ENTITY_STATUSES)[number];

export const ANSWER_TARGET_SOURCE_KINDS = ['brand', 'service', 'offer', 'knowledge_claim'] as const;
export type AnswerTargetSourceKind = (typeof ANSWER_TARGET_SOURCE_KINDS)[number];

export const ANSWER_TARGET_INTENTS = ['definition', 'use_case'] as const;
export type AnswerTargetIntent = (typeof ANSWER_TARGET_INTENTS)[number];

export const ANSWER_TARGET_STATUSES = ['mapped', 'gap'] as const;
export type AnswerTargetStatus = (typeof ANSWER_TARGET_STATUSES)[number];

export const CONTENT_BRIEF_STATUSES = ['draft'] as const;
export type ContentBriefStatus = (typeof CONTENT_BRIEF_STATUSES)[number];

export const GEO_QUERY_LIMIT = 20;
export const SEARCH_CADENCE_INTERVAL_MIN_DAYS = 1;
export const SEARCH_CADENCE_INTERVAL_MAX_DAYS = 90;
export const SEARCH_GEO_ENGINE_LIMIT_MAX = 5;
export const SEARCH_GEO_LOCALE_LIMIT_MAX = 8;
export const SEARCH_MONTHLY_BUDGET_MINOR_MAX = 10_000_000;

export const SEARCH_WORK_KINDS = [
	'technical_audit',
	'property_sync',
	'aeo_refresh',
	'geo_snapshot',
	'geo_measure',
	'stale_measurement',
	'budget'
] as const;
export type SearchWorkKind = (typeof SEARCH_WORK_KINDS)[number];

export const SEARCH_WORK_STATUSES = ['due', 'blocked', 'clear'] as const;
export type SearchWorkStatus = (typeof SEARCH_WORK_STATUSES)[number];

export const updateSearchCadenceSchema = z
	.object({
		technicalAuditIntervalDays: z.coerce
			.number()
			.int()
			.min(SEARCH_CADENCE_INTERVAL_MIN_DAYS)
			.max(SEARCH_CADENCE_INTERVAL_MAX_DAYS),
		propertySyncIntervalDays: z.coerce
			.number()
			.int()
			.min(SEARCH_CADENCE_INTERVAL_MIN_DAYS)
			.max(SEARCH_CADENCE_INTERVAL_MAX_DAYS),
		aeoRefreshIntervalDays: z.coerce
			.number()
			.int()
			.min(SEARCH_CADENCE_INTERVAL_MIN_DAYS)
			.max(SEARCH_CADENCE_INTERVAL_MAX_DAYS),
		geoSnapshotIntervalDays: z.coerce
			.number()
			.int()
			.min(SEARCH_CADENCE_INTERVAL_MIN_DAYS)
			.max(SEARCH_CADENCE_INTERVAL_MAX_DAYS),
		geoMeasureIntervalDays: z.coerce
			.number()
			.int()
			.min(SEARCH_CADENCE_INTERVAL_MIN_DAYS)
			.max(SEARCH_CADENCE_INTERVAL_MAX_DAYS),
		geoQueryLimit: z.coerce.number().int().min(1).max(GEO_QUERY_LIMIT),
		geoEngineLimit: z.coerce.number().int().min(1).max(SEARCH_GEO_ENGINE_LIMIT_MAX),
		geoLocaleLimit: z.coerce.number().int().min(1).max(SEARCH_GEO_LOCALE_LIMIT_MAX),
		monthlyBudgetMinor: z.coerce.number().int().min(0).max(SEARCH_MONTHLY_BUDGET_MINOR_MAX),
		currency: z.string().trim().length(3).toUpperCase().default('USD'),
		paused: z.boolean()
	})
	.strict();

export const GEO_QUERY_GROUPS = [
	'brand',
	'service',
	'product',
	'high_intent',
	'informational'
] as const;
export type GeoQueryGroup = (typeof GEO_QUERY_GROUPS)[number];

export const GEO_QUERY_SOURCE_KINDS = ['brand', 'service', 'offer'] as const;
export type GeoQuerySourceKind = (typeof GEO_QUERY_SOURCE_KINDS)[number];

export const GEO_SURFACES = [
	'chatgpt',
	'google_ai_overview',
	'gemini',
	'perplexity',
	'other'
] as const;
export type GeoSurface = (typeof GEO_SURFACES)[number];

export const GEO_MEASUREMENT_METHODS = ['manual', 'operator_assisted'] as const;
export type GeoMeasurementMethod = (typeof GEO_MEASUREMENT_METHODS)[number];

export const GEO_PROMINENCE = ['unknown', 'mentioned', 'cited', 'primary'] as const;
export type GeoProminence = (typeof GEO_PROMINENCE)[number];

export const GEO_ACCURACY = ['yes', 'no', 'unknown'] as const;
export type GeoAccuracy = (typeof GEO_ACCURACY)[number];

export const GEO_CITATION_KINDS = ['owned', 'earned'] as const;
export type GeoCitationKind = (typeof GEO_CITATION_KINDS)[number];

export const GEO_REPRESENTATION_STATUSES = [
	'accurate',
	'inaccurate',
	'unknown',
	'missing'
] as const;
export type GeoRepresentationStatus = (typeof GEO_REPRESENTATION_STATUSES)[number];

export const GEO_REPORT_STATUSES = ['empty', 'insufficient', 'stale', 'recorded'] as const;
export type GeoReportStatus = (typeof GEO_REPORT_STATUSES)[number];

export const SEARCH_REFERRAL_CHANNELS = ['organic_search', 'generative'] as const;
export type SearchReferralChannel = (typeof SEARCH_REFERRAL_CHANNELS)[number];

export const SEARCH_OUTCOME_LABELS = ['observed', 'unknown'] as const;
export type SearchOutcomeLabel = (typeof SEARCH_OUTCOME_LABELS)[number];

export const recordGeoObservationSchema = z
	.object({
		queryId: z.string().uuid(),
		engine: z.enum(GEO_SURFACES),
		method: z.enum(GEO_MEASUREMENT_METHODS),
		mentioned: z.boolean(),
		ownedCitation: z.boolean(),
		earnedCitation: z.boolean(),
		represented: z.boolean(),
		accurate: z.enum(GEO_ACCURACY).default('unknown'),
		prominence: z.enum(GEO_PROMINENCE).default('unknown'),
		confidence: z.number().int().min(0).max(100).default(50),
		detail: z.string().trim().max(400).optional().nullable(),
		costMinor: z.number().int().nonnegative().default(0),
		currency: z.string().trim().length(3).default('USD'),
		citations: z
			.array(
				z
					.object({
						kind: z.enum(GEO_CITATION_KINDS),
						url: z.string().trim().url().max(400).optional().nullable(),
						domain: z.string().trim().max(180).optional().nullable()
					})
					.strict()
			)
			.max(8)
			.default([])
	})
	.strict();

export const EXPERIMENT_STATUSES = [
	'draft',
	'proposed',
	'approved',
	'running',
	'paused',
	'decided',
	'archived'
] as const;
export type ExperimentStatus = (typeof EXPERIMENT_STATUSES)[number];

export const EXPERIMENT_VARIANT_ROLES = ['control', 'challenger'] as const;
export type ExperimentVariantRole = (typeof EXPERIMENT_VARIANT_ROLES)[number];

export const EXPERIMENT_AUDIENCES = ['all_visitors'] as const;
export type ExperimentAudience = (typeof EXPERIMENT_AUDIENCES)[number];

export const EXPERIMENT_PRIMARY_METRICS = [
	'cta_clicked',
	'form_started',
	'form_submitted',
	'lead_created'
] as const;
export type ExperimentPrimaryMetric = (typeof EXPERIMENT_PRIMARY_METRICS)[number];

export const EXPERIMENT_GUARDRAIL_METRICS = [
	'page_viewed',
	'cta_clicked',
	'form_started',
	'form_submitted',
	'lead_created'
] as const;
export type ExperimentGuardrailMetric = (typeof EXPERIMENT_GUARDRAIL_METRICS)[number];

export const DEFERRED_EXPERIMENT_METRICS = ['qualified_lead', 'revenue'] as const;
export type DeferredExperimentMetric = (typeof DEFERRED_EXPERIMENT_METRICS)[number];

export const EXPERIMENT_DECISION_RULES = ['fixed_horizon', 'manual_review'] as const;
export type ExperimentDecisionRule = (typeof EXPERIMENT_DECISION_RULES)[number];

export const EXPERIMENT_ROLLBACK_RULES = ['revert_to_control', 'pause_experiment'] as const;
export type ExperimentRollbackRule = (typeof EXPERIMENT_ROLLBACK_RULES)[number];

export const EXPERIMENT_DECISION_OUTCOMES = [
	'keep_control',
	'promote_challenger',
	'inconclusive'
] as const;
export type ExperimentDecisionOutcome = (typeof EXPERIMENT_DECISION_OUTCOMES)[number];

export const decideExperimentSchema = z
	.object({
		id: z.string().uuid(),
		outcome: z.enum(EXPERIMENT_DECISION_OUTCOMES),
		notes: z.string().trim().min(1).max(800)
	})
	.strict();

export const createExperimentProposalSchema = z
	.object({
		name: z.string().trim().min(1).max(160),
		problem: z.string().trim().min(1).max(800),
		evidence: z.string().trim().min(1).max(800),
		hypothesis: z.string().trim().min(1).max(800),
		audience: z.string().trim().min(1).max(400),
		audienceKey: z.enum(EXPERIMENT_AUDIENCES).default('all_visitors'),
		pageId: z.string().uuid(),
		controlPageVersionId: z.string().uuid(),
		challengerPageVersionId: z.string().uuid(),
		challengerName: z.string().trim().min(1).max(120).default('Challenger'),
		primaryMetric: z.string().trim().min(1).max(40),
		guardrailMetrics: z.array(z.string().trim().min(1).max(40)).max(6).default([]),
		minDurationDays: z.number().int().min(7).max(90),
		minSamplePerVariant: z.number().int().min(100).max(100_000),
		decisionRule: z.enum(EXPERIMENT_DECISION_RULES).default('fixed_horizon'),
		rollbackRule: z.enum(EXPERIMENT_ROLLBACK_RULES).default('revert_to_control')
	})
	.strict();

export const experimentIdSchema = z
	.object({
		id: z.string().uuid()
	})
	.strict();

export const EXPERIMENT_TRANSITION_TARGETS = ['approved', 'paused', 'running'] as const;
export type ExperimentTransitionTarget = (typeof EXPERIMENT_TRANSITION_TARGETS)[number];

export const transitionExperimentSchema = z
	.object({
		id: z.string().uuid(),
		to: z.enum(EXPERIMENT_TRANSITION_TARGETS)
	})
	.strict();

export const experimentClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export const CLIENT_GOAL_TYPES = [
	'qualified_leads',
	'sales',
	'revenue',
	'bookings',
	'appointments',
	'custom'
] as const;
export type ClientGoalType = (typeof CLIENT_GOAL_TYPES)[number];

export const CLIENT_GOAL_PERIODS = ['month', 'quarter', 'year'] as const;
export type ClientGoalPeriod = (typeof CLIENT_GOAL_PERIODS)[number];

export const NOTIFICATION_TOPICS = [
	'high_intent_lead',
	'data_health_alert',
	'weekly_digest'
] as const;
export type NotificationTopic = (typeof NOTIFICATION_TOPICS)[number];

export const DATA_HEALTH_STATUSES = ['healthy', 'warning', 'broken', 'unknown'] as const;
export type DataHealthStatus = (typeof DATA_HEALTH_STATUSES)[number];

const optionalDateOn = z
	.string()
	.trim()
	.optional()
	.transform((value) => (value ? value : undefined));

export const upsertClientGoalSchema = z
	.object({
		name: z.string().trim().min(1).max(120),
		goalType: z.enum(CLIENT_GOAL_TYPES),
		targetValue: z.number().int().positive().max(1_000_000_000_000),
		unit: z.string().trim().min(1).max(40),
		currency: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z]{3}$/)
			.optional()
			.nullable(),
		period: z.enum(CLIENT_GOAL_PERIODS),
		isPrimary: z.boolean().default(false),
		startOn: optionalDateOn,
		endOn: optionalDateOn
	})
	.strict()
	.superRefine((value, ctx) => {
		if (value.goalType === 'revenue' && !value.currency) {
			ctx.addIssue({
				code: 'custom',
				path: ['currency'],
				message: 'Revenue goals require a currency'
			});
		}
		if (value.startOn && !/^\d{4}-\d{2}-\d{2}$/.test(value.startOn)) {
			ctx.addIssue({ code: 'custom', path: ['startOn'], message: 'Invalid start date' });
		}
		if (value.endOn && !/^\d{4}-\d{2}-\d{2}$/.test(value.endOn)) {
			ctx.addIssue({ code: 'custom', path: ['endOn'], message: 'Invalid end date' });
		}
	});

export const updateNotificationPreferenceSchema = z
	.object({
		topic: z.enum(NOTIFICATION_TOPICS),
		enabled: z.boolean()
	})
	.strict();

export const overrideFirstRevealGateSchema = z
	.object({
		reason: z.string().trim().min(12).max(400)
	})
	.strict();

export const goalsClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export function parseContract<T>(
	schema: { safeParse(input: unknown): { success: true; data: T } | { success: false } },
	input: unknown
): T {
	const result = schema.safeParse(input);
	if (!result.success) {
		throw new ValidationError('Validation failed');
	}
	return result.data;
}
