import { z } from 'zod';
import { brandTokensSchema, parseContract } from '@vector/contracts';

export const APPROVED_SECTION_TYPES = [
	'hero-minimal',
	'hero-split',
	'proof',
	'services',
	'offer',
	'cta',
	'faq',
	'lead-form'
] as const;

export type ApprovedSectionType = (typeof APPROVED_SECTION_TYPES)[number];

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
		secondaryCta: ctaSchema.optional()
	})
	.strict();

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
		secondaryCta: ctaSchema.optional()
	})
	.strict();

const proofSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('proof'),
		heading: z.string().min(1).max(120),
		items: z
			.array(
				z
					.object({
						statement: z.string().min(1).max(400),
						evidence: z.string().max(400).optional()
					})
					.strict()
			)
			.min(1)
			.max(6)
	})
	.strict();

const servicesSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('services'),
		heading: z.string().min(1).max(120),
		items: z
			.array(
				z
					.object({
						name: z.string().min(1).max(120),
						outcome: z.string().min(1).max(200),
						summary: z.string().min(1).max(400)
					})
					.strict()
			)
			.min(1)
			.max(8)
	})
	.strict();

const offerSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('offer'),
		heading: z.string().min(1).max(120),
		name: z.string().min(1).max(120),
		summary: z.string().min(1).max(400),
		priceLabel: z.string().max(80).optional()
	})
	.strict();

const ctaSectionSchema = z
	.object({
		id: z.string().min(1).max(80),
		type: z.literal('cta'),
		heading: z.string().min(1).max(120),
		body: z.string().min(1).max(400),
		primaryCta: ctaSchema
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
			.max(8)
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
			.max(6)
	})
	.strict();

export const pageSectionSchema = z.discriminatedUnion('type', [
	heroMinimalSectionSchema,
	heroSplitSectionSchema,
	proofSectionSchema,
	servicesSectionSchema,
	offerSectionSchema,
	ctaSectionSchema,
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
				tokens: brandTokensSchema
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
