import { APPROVED_SECTION_TYPES } from '@vector/funnel-engine';
import { z } from 'zod';

export const autonomyLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2)]);

export const researchOutputSchema = z
	.object({
		summary: z.string().min(1).max(800),
		audienceInsights: z.array(z.string().min(1).max(240)).max(8),
		competitorObservations: z.array(z.string().min(1).max(240)).max(8),
		opportunities: z
			.array(
				z
					.object({
						title: z.string().min(1).max(160),
						evidence: z.string().min(1).max(400),
						priority: z.enum(['low', 'medium', 'high'])
					})
					.strict()
			)
			.max(8),
		claimsUsed: z.array(z.string().min(1).max(400)).max(16),
		knowledgeAuthority: z.enum(['approved_knowledge', 'generated_hypothesis']),
		finding: z.string().min(1).max(400),
		proposedAction: z.string().min(1).max(400),
		expectedImpact: z.string().min(1).max(240),
		riskClass: z.enum(['low', 'content', 'financial', 'legal']),
		confidence: z.number().int().min(0).max(100),
		recommendedAutonomy: autonomyLevelSchema
	})
	.strict();

export type ResearchOutput = z.infer<typeof researchOutputSchema>;

export const copyVariantSchema = z
	.object({
		label: z.string().min(1).max(80),
		text: z.string().min(1).max(2000)
	})
	.strict();

export const copyOutputSchema = z
	.object({
		kind: z.enum(['headline', 'page', 'cta', 'email', 'brief']),
		variants: z.array(copyVariantSchema).min(1).max(5),
		prohibitedClaimHits: z.array(z.string().min(1).max(400)).max(16),
		usesApprovedClaims: z.boolean(),
		finding: z.string().min(1).max(400),
		proposedAction: z.string().min(1).max(400),
		expectedImpact: z.string().min(1).max(240),
		riskClass: z.enum(['low', 'content', 'financial', 'legal']),
		confidence: z.number().int().min(0).max(100),
		recommendedAutonomy: autonomyLevelSchema
	})
	.strict();

export type CopyOutput = z.infer<typeof copyOutputSchema>;

export const analyticsOutputSchema = z
	.object({
		summary: z.string().min(1).max(800),
		anomalies: z
			.array(
				z
					.object({
						metric: z.string().min(1).max(80),
						observation: z.string().min(1).max(400),
						evidence: z.string().min(1).max(400)
					})
					.strict()
			)
			.max(8),
		funnelLoss: z
			.array(
				z
					.object({
						stage: z.string().min(1).max(80),
						observation: z.string().min(1).max(400)
					})
					.strict()
			)
			.max(8),
		finding: z.string().min(1).max(400),
		proposedAction: z.string().min(1).max(400),
		expectedImpact: z.string().min(1).max(240),
		riskClass: z.enum(['low', 'content', 'financial', 'legal']),
		confidence: z.number().int().min(0).max(100),
		recommendedAutonomy: autonomyLevelSchema
	})
	.strict();

export type AnalyticsOutput = z.infer<typeof analyticsOutputSchema>;

export const funnelPlanOutputSchema = z
	.object({
		audience: z.string().min(1).max(400),
		primaryConversion: z.string().min(1).max(160),
		narrative: z.string().min(1).max(800),
		sections: z
			.array(
				z
					.object({
						type: z.enum(APPROVED_SECTION_TYPES),
						purpose: z.string().min(1).max(240)
					})
					.strict()
			)
			.min(1)
			.max(8),
		experimentHypotheses: z.array(z.string().min(1).max(240)).max(6),
		finding: z.string().min(1).max(400),
		proposedAction: z.string().min(1).max(400),
		expectedImpact: z.string().min(1).max(240),
		riskClass: z.enum(['low', 'content', 'financial', 'legal']),
		confidence: z.number().int().min(0).max(100),
		recommendedAutonomy: autonomyLevelSchema
	})
	.strict();

export type FunnelPlanOutput = z.infer<typeof funnelPlanOutputSchema>;

export type AgentOutput = ResearchOutput | CopyOutput | AnalyticsOutput | FunnelPlanOutput;

export const AGENT_OUTPUT_SCHEMAS = {
	'research.v1': researchOutputSchema,
	'copy.v1': copyOutputSchema,
	'analytics.v1': analyticsOutputSchema,
	'funnel_plan.v1': funnelPlanOutputSchema
} as const;

export type AgentSchemaName = keyof typeof AGENT_OUTPUT_SCHEMAS;

export function schemaForAgent(schemaName: string) {
	if (schemaName in AGENT_OUTPUT_SCHEMAS) {
		return AGENT_OUTPUT_SCHEMAS[schemaName as AgentSchemaName];
	}
	return null;
}
