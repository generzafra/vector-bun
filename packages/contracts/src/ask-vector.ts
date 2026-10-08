import { z } from 'zod';

/** Closed questions. Free text is not an intent and cannot become a tool. */
export const ASK_VECTOR_INTENTS = [
	'goal_blocker',
	'qualified_leads',
	'source_coverage',
	'recorded_revenue',
	'data_health'
] as const;

export type AskVectorIntent = (typeof ASK_VECTOR_INTENTS)[number];

export const ASK_VECTOR_TOOLS = {
	goal_blocker: { name: 'read_primary_goal', capability: 'goals.read' },
	qualified_leads: { name: 'read_qualified_leads', capability: 'leads.read' },
	source_coverage: { name: 'read_source_coverage', capability: 'leads.read' },
	recorded_revenue: { name: 'read_recorded_revenue', capability: 'outcomes.read' },
	data_health: { name: 'read_data_health', capability: 'goals.read' }
} as const satisfies Record<AskVectorIntent, { name: string; capability: string }>;

export const askVectorSchema = z
	.object({
		intent: z.enum(ASK_VECTOR_INTENTS)
	})
	.strict();

export const askVectorClientIdSchema = z
	.object({
		clientId: z.string().uuid()
	})
	.strict();

export const askVectorExplanationSchema = z
	.object({
		explanation: z.string().trim().min(1).max(400)
	})
	.strict();

const FIGURE = /\d|%|\$|€|£/;

/** A model note may sit under the calculated answer only when it adds no figure. */
export function askVectorExplanationIsSafe(text: string) {
	const value = text.trim();
	if (!value || value.length > 400) return false;
	if (FIGURE.test(value)) return false;
	if (/roi/i.test(value)) return false;
	return true;
}
