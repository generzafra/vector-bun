import { z } from 'zod';
import { ValidationError } from './errors';

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
		pageVersionId: z.string().uuid()
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
		pageVersionId: z.string().uuid()
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
		paused: z.boolean()
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
