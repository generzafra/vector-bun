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
