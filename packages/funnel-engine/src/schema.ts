import { z } from 'zod';
import { brandTokensSchema, parseContract } from '@vector/contracts';

export const APPROVED_SECTION_TYPES = [
	'hero-minimal',
	'hero-split',
	'hero-editorial',
	'proof',
	'proof-featured',
	'services',
	'services-editorial',
	'offer',
	'cta',
	'cta-minimal',
	'faq',
	'lead-form'
] as const;

export type ApprovedSectionType = (typeof APPROVED_SECTION_TYPES)[number];

export const HERO_SECTION_TYPES = ['hero-minimal', 'hero-split', 'hero-editorial'] as const;
export const PROOF_SECTION_TYPES = ['proof', 'proof-featured'] as const;
export const SERVICES_SECTION_TYPES = ['services', 'services-editorial'] as const;
export const CTA_SECTION_TYPES = ['cta', 'cta-minimal'] as const;
export const TYPOGRAPHY_LED_HERO_TYPES = ['hero-minimal', 'hero-editorial'] as const;

export const SECTION_WIDTH_MODES = ['contained', 'wide', 'full-bleed', 'split-bleed'] as const;
export type SectionWidthMode = (typeof SECTION_WIDTH_MODES)[number];

export const MOTION_PRESETS = ['m0', 'm1', 'm2'] as const;
export type MotionPreset = (typeof MOTION_PRESETS)[number];

export const HERO_MOBILE_TREATMENTS = ['stack', 'typography_first'] as const;
export type HeroMobileTreatment = (typeof HERO_MOBILE_TREATMENTS)[number];

const widthModeField = z.enum(SECTION_WIDTH_MODES).optional();
const mobileTreatmentField = z.enum(HERO_MOBILE_TREATMENTS).optional();
const UNSAFE_MEDIA_TEXT = /[<>]|javascript:|\{@html/i;

const heroMediaFields = {
	mediaAssetId: z.string().uuid().optional(),
	mediaAlt: z.string().min(1).max(200).optional(),
	focalX: z.number().int().min(0).max(10000).optional(),
	focalY: z.number().int().min(0).max(10000).optional()
};

function heroMediaIssues(
	section: {
		mediaAssetId?: string;
		mediaAlt?: string;
		focalX?: number;
		focalY?: number;
	},
	ctx: z.RefinementCtx
) {
	const placed = section.mediaAssetId !== undefined;
	if (placed && section.mediaAlt && UNSAFE_MEDIA_TEXT.test(section.mediaAlt)) {
		ctx.addIssue({ code: 'custom', message: 'Hero alt text must stay plain' });
	}
	if (
		placed &&
		(!section.mediaAlt || section.focalX === undefined || section.focalY === undefined)
	) {
		ctx.addIssue({
			code: 'custom',
			message: 'Hero media needs alt text and a focal point'
		});
	}
	if (
		!placed &&
		(section.mediaAlt || section.focalX !== undefined || section.focalY !== undefined)
	) {
		ctx.addIssue({ code: 'custom', message: 'A focal point requires an approved asset' });
	}
}

const ctaSchema = z
	.object({
		label: z.string().min(1).max(80),
		href: z.string().min(1).max(200)
	})
	.strict();

const heroMinimalSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('hero-minimal'),
		eyebrow: z.string().max(80).optional(),
		headline: z.string().min(1).max(160),
		lede: z.string().min(1).max(400),
		primaryCta: ctaSchema,
		secondaryCta: ctaSchema.optional(),
		widthMode: widthModeField,
		mobileTreatment: mobileTreatmentField,
		...heroMediaFields
	})
	.strict()
	.superRefine(heroMediaIssues);

const heroSplitSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('hero-split'),
		eyebrow: z.string().max(80).optional(),
		headline: z.string().min(1).max(160),
		lede: z.string().min(1).max(400),
		asideTitle: z.string().min(1).max(80),
		asideBody: z.string().min(1).max(240),
		primaryCta: ctaSchema,
		secondaryCta: ctaSchema.optional(),
		widthMode: widthModeField,
		mobileTreatment: mobileTreatmentField,
		...heroMediaFields
	})
	.strict()
	.superRefine(heroMediaIssues);

const heroEditorialSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('hero-editorial'),
		eyebrow: z.string().max(80).optional(),
		headline: z.string().min(1).max(160),
		lede: z.string().min(1).max(400),
		primaryCta: ctaSchema,
		secondaryCta: ctaSchema.optional(),
		widthMode: widthModeField,
		mobileTreatment: mobileTreatmentField,
		...heroMediaFields
	})
	.strict()
	.superRefine(heroMediaIssues);

const proofItemSchema = z
	.object({
		statement: z.string().min(1).max(400),
		evidence: z.string().max(400).optional()
	})
	.strict();

const proofSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('proof'),
		heading: z.string().min(1).max(120),
		items: z.array(proofItemSchema).min(1).max(6),
		widthMode: widthModeField
	})
	.strict();

const proofFeaturedSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('proof-featured'),
		heading: z.string().min(1).max(120),
		items: z.array(proofItemSchema).min(1).max(6),
		widthMode: widthModeField
	})
	.strict();

const serviceItemSchema = z
	.object({
		name: z.string().min(1).max(120),
		outcome: z.string().min(1).max(200),
		summary: z.string().min(1).max(400)
	})
	.strict();

const servicesSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('services'),
		heading: z.string().min(1).max(120),
		items: z.array(serviceItemSchema).min(1).max(8),
		widthMode: widthModeField
	})
	.strict();

const servicesEditorialSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('services-editorial'),
		heading: z.string().min(1).max(120),
		items: z.array(serviceItemSchema).min(1).max(8),
		widthMode: widthModeField
	})
	.strict();

const offerSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('offer'),
		heading: z.string().min(1).max(120),
		name: z.string().min(1).max(120),
		summary: z.string().min(1).max(400),
		priceLabel: z.string().max(80).optional(),
		widthMode: widthModeField
	})
	.strict();

const ctaSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('cta'),
		heading: z.string().min(1).max(120),
		body: z.string().min(1).max(400),
		primaryCta: ctaSchema,
		widthMode: widthModeField
	})
	.strict();

const ctaMinimalSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('cta-minimal'),
		heading: z.string().min(1).max(120),
		body: z.string().min(1).max(400),
		primaryCta: ctaSchema,
		widthMode: widthModeField
	})
	.strict();

const faqSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('faq'),
		heading: z.string().min(1).max(120),
		items: z
			.array(
				z
					.object({
						question: z.string().min(1).max(160),
						answer: z.string().min(1).max(400)
					})
					.strict()
			)
			.min(1)
			.max(8),
		widthMode: widthModeField
	})
	.strict();

const leadFormSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('lead-form'),
		heading: z.string().min(1).max(120),
		body: z.string().max(400).optional(),
		submitLabel: z.string().min(1).max(80),
		fields: z
			.array(z.enum(['name', 'email', 'phone', 'company', 'message']))
			.min(1)
			.max(6),
		widthMode: widthModeField
	})
	.strict();

export const pageSectionSchema = z.discriminatedUnion('type', [
	heroMinimalSectionSchema,
	heroSplitSectionSchema,
	heroEditorialSectionSchema,
	proofSectionSchema,
	proofFeaturedSectionSchema,
	servicesSectionSchema,
	servicesEditorialSectionSchema,
	offerSectionSchema,
	ctaSectionSchema,
	ctaMinimalSectionSchema,
	faqSectionSchema,
	leadFormSectionSchema
]);

export const pageDocumentSchema = z
	.object({
		schemaVersion: z.literal(1),
		identity: z
			.object({
				displayName: z.string().min(1).max(120)
			})
			.strict(),
		narrative: z
			.object({
				audience: z.string().min(1).max(400),
				primaryConversion: z.string().min(1).max(160),
				offer: z.string().min(1).max(400)
			})
			.strict(),
		theme: z
			.object({
				personality: z
					.enum(['premium', 'technology', 'growth', 'creative', 'corporate'])
					.optional(),
				tokens: brandTokensSchema,
				motionPreset: z.enum(MOTION_PRESETS).optional()
			})
			.strict(),
		seo: z
			.object({
				title: z.string().min(1).max(70),
				description: z.string().min(1).max(160),
				noindex: z.boolean()
			})
			.strict(),
		sections: z.array(pageSectionSchema).min(2).max(12)
	})
	.strict();

export type PageDocument = z.infer<typeof pageDocumentSchema>;
export type PageSection = z.infer<typeof pageSectionSchema>;

export function parsePageDocument(input: unknown): PageDocument {
	return parseContract(pageDocumentSchema, input);
}

export function isApprovedSectionType(value: string): value is ApprovedSectionType {
	return (APPROVED_SECTION_TYPES as readonly string[]).includes(value);
}

export function isHeroSectionType(value: string): value is (typeof HERO_SECTION_TYPES)[number] {
	return (HERO_SECTION_TYPES as readonly string[]).includes(value);
}

export function isProofSectionType(value: string): value is (typeof PROOF_SECTION_TYPES)[number] {
	return (PROOF_SECTION_TYPES as readonly string[]).includes(value);
}

export function isServicesSectionType(
	value: string
): value is (typeof SERVICES_SECTION_TYPES)[number] {
	return (SERVICES_SECTION_TYPES as readonly string[]).includes(value);
}

export function isCtaSectionType(value: string): value is (typeof CTA_SECTION_TYPES)[number] {
	return (CTA_SECTION_TYPES as readonly string[]).includes(value);
}

export function isTypographyLedHeroType(
	value: string
): value is (typeof TYPOGRAPHY_LED_HERO_TYPES)[number] {
	return (TYPOGRAPHY_LED_HERO_TYPES as readonly string[]).includes(value);
}

export function isHeroSection(
	section: PageSection
): section is Extract<PageSection, { type: (typeof HERO_SECTION_TYPES)[number] }> {
	return isHeroSectionType(section.type);
}

export function isProofSection(
	section: PageSection
): section is Extract<PageSection, { type: (typeof PROOF_SECTION_TYPES)[number] }> {
	return isProofSectionType(section.type);
}

export function isServicesSection(
	section: PageSection
): section is Extract<PageSection, { type: (typeof SERVICES_SECTION_TYPES)[number] }> {
	return isServicesSectionType(section.type);
}

export function isCtaSection(
	section: PageSection
): section is Extract<PageSection, { type: (typeof CTA_SECTION_TYPES)[number] }> {
	return isCtaSectionType(section.type);
}

export function sectionFamily(type: string): string {
	if (isHeroSectionType(type)) return 'hero';
	if (isProofSectionType(type)) return 'proof';
	if (isServicesSectionType(type)) return 'services';
	if (isCtaSectionType(type)) return 'cta';
	return type;
}
