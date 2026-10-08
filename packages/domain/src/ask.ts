import { consumeRateLimit } from '@vector/auth';
import { evaluateAiGate } from '@vector/ai';
import { env } from '@vector/config';
import {
	ASK_VECTOR_TOOLS,
	ForbiddenError,
	ProviderError,
	askVectorClientIdSchema,
	askVectorExplanationIsSafe,
	askVectorExplanationSchema,
	askVectorSchema,
	assertActorOwnsContext,
	assertSameClient,
	attributionCoverage,
	dataHealthEvidenceClass,
	parseContract,
	type AskVectorIntent,
	type AttributionEvidenceClass,
	type TenantContext
} from '@vector/contracts';
import {
	attributionEvidenceForTenant,
	ensureAiSettingsForTenant,
	getOverviewFactsForTenant,
	insertAskVectorTurnForTenant,
	listAskVectorTurnsForTenant,
	listClientGoalsForTenant,
	listDataHealthChecksForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { getDomainAIProvider } from './intelligence';
import { summarizeRecordedRevenue } from './revenue';

const ASK_CAPS = ['goals.read', 'leads.read', 'outcomes.read'] as const;

function canAsk(permissions: readonly string[]) {
	return ASK_CAPS.some((cap) => permissions.includes(cap));
}

function requireAsk(actor: Actor) {
	if (!canAsk(actor.permissions)) {
		throw new ForbiddenError('Ask Vector needs goal, lead, or revenue access');
	}
}

function goalAnswer(
	goal: {
		name: string;
		goalType: string;
		targetValue: number;
		unit: string;
		isPrimary: boolean;
	} | null,
	facts: { qualifiedCount: number; wonLeadCount: number; wonOutcomeCount: number }
): { evidenceClass: 'observed' | 'unknown'; answer: string } {
	if (!goal || !goal.isPrimary) {
		return { evidenceClass: 'unknown', answer: 'No primary goal yet.' };
	}
	if (goal.goalType === 'revenue') {
		return { evidenceClass: 'unknown', answer: 'This goal has no progress figure.' };
	}
	if (goal.goalType !== 'qualified_leads' && goal.goalType !== 'sales') {
		return { evidenceClass: 'unknown', answer: 'This goal is not measured here yet.' };
	}
	if (goal.goalType === 'sales' && facts.wonLeadCount > facts.wonOutcomeCount) {
		return {
			evidenceClass: 'unknown',
			answer: 'Some won leads have no recorded sale, so goal progress is unknown.'
		};
	}
	const observed =
		goal.goalType === 'qualified_leads' ? facts.qualifiedCount : facts.wonOutcomeCount;
	return {
		evidenceClass: 'observed',
		answer: `${observed} of ${goal.targetValue} ${goal.unit}.`
	};
}

async function readTool(
	intent: AskVectorIntent,
	ctx: TenantContext
): Promise<{ evidenceClass: AttributionEvidenceClass; answer: string }> {
	if (intent === 'goal_blocker') {
		const [goals, facts] = await Promise.all([
			listClientGoalsForTenant(ctx),
			getOverviewFactsForTenant(ctx)
		]);
		const primary = goals.find((goal) => goal.isPrimary) ?? null;
		return goalAnswer(primary, facts);
	}
	if (intent === 'qualified_leads') {
		const facts = await getOverviewFactsForTenant(ctx);
		return {
			evidenceClass: 'observed',
			answer: `Qualified leads: ${facts.qualifiedCount} observed.`
		};
	}
	if (intent === 'source_coverage') {
		const attribution = await attributionEvidenceForTenant(ctx);
		const coverage = attributionCoverage({
			leadCount: attribution.leadCount,
			classes: attribution.classes
		});
		return {
			evidenceClass: coverage.evidenceClass,
			answer: `Source coverage is ${coverage.evidenceClass}.`
		};
	}
	if (intent === 'recorded_revenue') {
		const summary = await summarizeRecordedRevenue(ctx);
		return { evidenceClass: summary.evidenceClass, answer: summary.detail };
	}
	const checks = await listDataHealthChecksForTenant(ctx);
	const evidenceClass = dataHealthEvidenceClass(checks);
	return {
		evidenceClass,
		answer:
			evidenceClass === 'observed'
				? 'Data health was checked. Tracking looks healthy.'
				: 'Data health is incomplete, so this answer does not rank a channel.'
	};
}

async function explain(ctx: TenantContext, requestId: string) {
	try {
		const result = await getDomainAIProvider().generateStructured({
			clientId: ctx.clientId,
			requestId,
			idempotencyKey: crypto.randomUUID(),
			taskClass: 'data_interpretation',
			schemaName: 'ask.v1',
			schemaVersion: '1',
			schema: askVectorExplanationSchema,
			system:
				'You do not calculate. You do not invent revenue. You do not name a channel or a cause.',
			prompt: 'Write one short sentence that adds no figure, currency, percent, channel, or cause.',
			facts: {
				knowledge: {
					brandName: null,
					audience: null,
					offer: null,
					primaryConversion: null,
					services: [],
					approvedClaims: [],
					prohibitedClaims: []
				},
				analytics: {
					pageViewed: 0,
					ctaClicked: 0,
					formStarted: 0,
					formSubmitted: 0,
					leadCreated: 0
				}
			}
		});
		const explanation = result.output.explanation;
		if (!askVectorExplanationIsSafe(explanation)) {
			return { explanation: null, costMicros: result.costMicros };
		}
		return { explanation, costMicros: result.costMicros };
	} catch {
		return { explanation: null, costMicros: null };
	}
}

export async function listAskVectorTurns(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireAsk(actor);
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(askVectorClientIdSchema, { clientId });
		assertSameClient(required, clientId);
	}
	return listAskVectorTurnsForTenant(required);
}

export async function askVector(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireAsk(actor);
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(askVectorSchema, input);
	consumeRateLimit(`ask:${required.clientId}`, 20, 60_000);
	const settings = await ensureAiSettingsForTenant(required);
	const gate = evaluateAiGate({
		pausedGlobal: env.AI_EXECUTION_PAUSED,
		pausedClient: settings.paused,
		autonomyCeiling: settings.autonomyCeiling,
		requestedAutonomy: 1,
		confidence: 0
	});
	if (!gate.allowed) {
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'human',
			actorId: actor.userId,
			action: 'ai.ask.paused',
			entityType: 'ask_vector_turn',
			entityId: required.clientId,
			requestId,
			reason: gate.blockedBy
		});
		throw new ProviderError(`AI execution is paused (${gate.blockedBy})`, 'AI_EXECUTION_PAUSED');
	}
	const tool = ASK_VECTOR_TOOLS[parsed.intent];
	if (!actor.permissions.includes(tool.capability)) {
		const row = await insertAskVectorTurnForTenant(required, {
			intent: parsed.intent,
			toolName: tool.name,
			authorized: false,
			evidenceClass: 'unknown',
			answer: 'That question is not available with your access.',
			explanation: null,
			costMicros: null,
			askedBy: actor.userId
		});
		if (!row) throw new Error('ask turn write failed');
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'human',
			actorId: actor.userId,
			action: 'ai.ask.denied',
			entityType: 'ask_vector_turn',
			entityId: row.id,
			requestId,
			reason: tool.capability
		});
		return row;
	}
	const facts = await readTool(parsed.intent, required);
	const note = await explain(required, requestId);
	const row = await insertAskVectorTurnForTenant(required, {
		intent: parsed.intent,
		toolName: tool.name,
		authorized: true,
		evidenceClass: facts.evidenceClass,
		answer: facts.answer,
		explanation: note.explanation,
		costMicros: note.costMicros,
		askedBy: actor.userId
	});
	if (!row) throw new Error('ask turn write failed');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'ai.ask.answer',
		entityType: 'ask_vector_turn',
		entityId: row.id,
		requestId
	});
	return row;
}
