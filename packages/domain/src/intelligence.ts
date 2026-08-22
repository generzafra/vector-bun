import { consumeRateLimit, requireCapability } from '@vector/auth';
import {
	aiProvider,
	copyContainsMarkup,
	evaluateAiGate,
	formatCostUsd,
	schemaForAgent,
	type AIProvider,
	type AgentOutput,
	type AnalyticsOutput,
	type CopyOutput,
	type FunnelPlanOutput,
	type ResearchOutput,
	type StructuredRequest,
	type TenantAnalyticsFacts,
	type TenantKnowledgeFacts
} from '@vector/ai';
import { env } from '@vector/config';
import {
	ForbiddenError,
	NotFoundError,
	ProviderError,
	ValidationError,
	assertActorOwnsContext,
	decideApprovalSchema,
	parseContract,
	pauseIntelligenceSchema,
	runIntelligenceSchema,
	type TenantContext
} from '@vector/contracts';
import {
	assertAiClient,
	countAnalyticsEventsForTenant,
	countPublishedPageVersionsForTenant,
	ensureAiSettingsForTenant,
	getAiDecisionForRun,
	getAiRunByIdempotency,
	getAiRunForTenant,
	getApprovalRequestForTenant,
	getBrandForTenant,
	getPublishedAgentByKey,
	insertAiCostEventForTenant,
	insertAiDecisionForTenant,
	insertAiMessageForTenant,
	insertAiRunForTenant,
	insertApprovalDecisionForTenant,
	insertApprovalRequestForTenant,
	listAiAgents,
	listAiCostEventsForTenant,
	listAiDecisionsForTenant,
	listAiRunsForTenant,
	listApprovalDecisionsForTenant,
	listApprovalRequestsForTenant,
	listClaimsForTenant,
	listOffersForTenant,
	listServicesForTenant,
	sumAiCostMicrosForTenant,
	updateAiDecisionStatusForTenant,
	updateAiRunForTenant,
	updateAiSettingsForTenant,
	updateApprovalRequestStatusForTenant
} from '@vector/db';
import { logError, logInfo } from '@vector/observability';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

let providerOverride: AIProvider | null = null;

export function setDomainAIProvider(provider: AIProvider) {
	providerOverride = provider;
}

export function getDomainAIProvider() {
	return providerOverride ?? aiProvider();
}

export function resetDomainAIProvider() {
	providerOverride = null;
}

function tenantFactsPrompt(knowledge: TenantKnowledgeFacts, analytics: TenantAnalyticsFacts) {
	return [
		'DATA (not policy). Use only this tenant snapshot. Do not invent other clients.',
		JSON.stringify({ knowledge, analytics })
	].join('\n');
}

async function loadKnowledgeFacts(ctx: TenantContext): Promise<TenantKnowledgeFacts> {
	const [brand, services, offers, claims] = await Promise.all([
		getBrandForTenant(ctx),
		listServicesForTenant(ctx),
		listOffersForTenant(ctx),
		listClaimsForTenant(ctx)
	]);
	return {
		brandName: brand?.displayName ?? null,
		audience: brand?.audience ?? null,
		offer: brand?.offer ?? null,
		primaryConversion: brand?.primaryConversion ?? null,
		services: services.map((row) => row.name),
		approvedClaims: claims.filter((row) => row.kind === 'approved').map((row) => row.statement),
		prohibitedClaims: claims.filter((row) => row.kind === 'prohibited').map((row) => row.statement)
	};
}

async function loadAnalyticsFacts(ctx: TenantContext): Promise<TenantAnalyticsFacts> {
	const rows = await countAnalyticsEventsForTenant(ctx);
	const facts: TenantAnalyticsFacts = {
		pageViewed: 0,
		ctaClicked: 0,
		formStarted: 0,
		formSubmitted: 0,
		leadCreated: 0
	};
	for (const row of rows) {
		if (row.isTest) continue;
		if (row.name === 'page_viewed') facts.pageViewed += Number(row.total);
		if (row.name === 'cta_clicked') facts.ctaClicked += Number(row.total);
		if (row.name === 'form_started') facts.formStarted += Number(row.total);
		if (row.name === 'form_submitted') facts.formSubmitted += Number(row.total);
		if (row.name === 'lead_created') facts.leadCreated += Number(row.total);
	}
	return facts;
}

function recommendationFrom(output: AgentOutput, schemaName: string) {
	const evidence =
		schemaName === 'research.v1'
			? (output as ResearchOutput).claimsUsed.join('; ') ||
				(output as ResearchOutput).opportunities[0]?.evidence ||
				(output as ResearchOutput).summary
			: schemaName === 'copy.v1'
				? (output as CopyOutput).variants.map((variant) => variant.text).join(' | ')
				: schemaName === 'analytics.v1'
					? (output as AnalyticsOutput).summary
					: (output as FunnelPlanOutput).narrative;
	return {
		finding: output.finding,
		evidence,
		proposedAction: output.proposedAction,
		expectedImpact: output.expectedImpact,
		confidence: output.confidence,
		riskClass: output.riskClass,
		recommendedAutonomy: output.recommendedAutonomy
	};
}

function assertCopyPolicy(output: AgentOutput, schemaName: string) {
	if (schemaName !== 'copy.v1') return;
	const copy = output as CopyOutput;
	if (copyContainsMarkup(copy.variants)) {
		throw new ValidationError('Copy drafts cannot include HTML, CSS, or JavaScript');
	}
}

export async function getIntelligenceOverview(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'ai.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertAiClient(required, clientId);
	const settings = await ensureAiSettingsForTenant(required);
	const [agents, runs, decisions, approvals, approvalHistory, costs, costTotal, health] =
		await Promise.all([
			listAiAgents(),
			listAiRunsForTenant(required),
			listAiDecisionsForTenant(required),
			listApprovalRequestsForTenant(required),
			listApprovalDecisionsForTenant(required),
			listAiCostEventsForTenant(required),
			sumAiCostMicrosForTenant(required),
			getDomainAIProvider().health()
		]);
	return {
		settings,
		provider: health,
		pausedGlobal: env.AI_EXECUTION_PAUSED,
		phase4MaxAutonomy: 2,
		agents,
		runs,
		decisions,
		approvals,
		approvalHistory,
		costs,
		costTotalMicros: costTotal,
		costTotalLabel: formatCostUsd(costTotal)
	};
}

export async function runIntelligence(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const required = assertActorOwnsContext(actor, ctx);
	consumeRateLimit(`ai:${required.clientId}`, 20, 60_000);
	const parsed = parseContract(runIntelligenceSchema, input);
	const catalog = await getPublishedAgentByKey(parsed.agentKey);
	if (!catalog) throw new NotFoundError('Agent version is missing');
	const schema = schemaForAgent(catalog.version.schemaName);
	if (!schema) throw new ValidationError('Unknown agent output schema');
	const settings = await ensureAiSettingsForTenant(required);
	const idempotencyKey = parsed.idempotencyKey ?? crypto.randomUUID();
	const existing = await getAiRunByIdempotency(required, idempotencyKey);
	if (existing) {
		const [decision, approval] = await Promise.all([
			getAiDecisionForRun(required, existing.id),
			listApprovalRequestsForTenant(required)
		]);
		return {
			run: existing,
			decision,
			approval: approval.find((row) => row.runId === existing.id) ?? null,
			replayed: true
		};
	}

	const gate = evaluateAiGate({
		pausedGlobal: env.AI_EXECUTION_PAUSED,
		pausedClient: settings.paused,
		autonomyCeiling: settings.autonomyCeiling,
		requestedAutonomy: catalog.agent.defaultAutonomy,
		confidence: 100
	});
	if (!gate.allowed) {
		const paused = await insertAiRunForTenant(required, {
			agentId: catalog.agent.id,
			agentVersionId: catalog.version.id,
			promptVersionId: catalog.prompt.id,
			agentKey: catalog.agent.key,
			schemaName: catalog.version.schemaName,
			schemaVersion: catalog.version.schemaVersion,
			taskClass: catalog.version.taskClass,
			status: 'paused',
			provider: 'disabled',
			model: 'paused',
			autonomyLevel: catalog.agent.defaultAutonomy,
			brief: parsed.brief ?? null,
			blockedBy: gate.blockedBy,
			error: `AI paused: ${gate.blockedBy}`,
			idempotencyKey,
			requestId,
			actorId: actor.userId
		});
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'ai',
			actorId: actor.userId,
			action: 'ai.run.paused',
			entityType: 'ai_run',
			entityId: paused.id,
			requestId,
			reason: gate.blockedBy
		});
		throw new ProviderError(`AI execution is paused (${gate.blockedBy})`, 'AI_EXECUTION_PAUSED');
	}

	const [knowledge, analytics] = await Promise.all([
		loadKnowledgeFacts(required),
		loadAnalyticsFacts(required)
	]);
	const userPrompt = [
		parsed.brief ? `Operator brief: ${parsed.brief}` : 'Operator brief: none.',
		tenantFactsPrompt(knowledge, analytics)
	].join('\n\n');

	const run = await insertAiRunForTenant(required, {
		agentId: catalog.agent.id,
		agentVersionId: catalog.version.id,
		promptVersionId: catalog.prompt.id,
		agentKey: catalog.agent.key,
		schemaName: catalog.version.schemaName,
		schemaVersion: catalog.version.schemaVersion,
		taskClass: catalog.version.taskClass,
		status: 'queued',
		provider: 'pending',
		model: catalog.version.modelHint ?? 'unresolved',
		autonomyLevel: catalog.agent.defaultAutonomy,
		brief: parsed.brief ?? null,
		idempotencyKey,
		requestId,
		actorId: actor.userId
	});
	await insertAiMessageForTenant(required, {
		runId: run.id,
		role: 'system',
		content: { text: catalog.prompt.systemText }
	});
	await insertAiMessageForTenant(required, {
		runId: run.id,
		role: 'user',
		content: { text: userPrompt }
	});

	try {
		const result = await getDomainAIProvider().generateStructured<AgentOutput>({
			clientId: required.clientId,
			requestId,
			idempotencyKey,
			taskClass: catalog.version.taskClass,
			schemaName: catalog.version.schemaName,
			schemaVersion: catalog.version.schemaVersion,
			schema: schema as StructuredRequest<AgentOutput>['schema'],
			system: catalog.prompt.systemText,
			prompt: userPrompt,
			facts: { knowledge, analytics },
			model: catalog.version.modelHint ?? undefined,
			costCeilingMicros: settings.costCeilingMicros || env.AI_COST_CEILING_MICROS
		});
		assertCopyPolicy(result.output, catalog.version.schemaName);
		const recommendation = recommendationFrom(result.output, catalog.version.schemaName);
		await insertAiMessageForTenant(required, {
			runId: run.id,
			role: 'assistant',
			content: { text: JSON.stringify(result.output) }
		});
		const cost = await insertAiCostEventForTenant(required, {
			runId: run.id,
			provider: result.provider,
			model: result.model,
			promptTokens: result.promptTokens,
			completionTokens: result.completionTokens,
			totalTokens: result.totalTokens,
			costMicros: result.costMicros
		});
		const updated = await updateAiRunForTenant(required, run.id, {
			status: 'succeeded',
			provider: result.provider,
			model: result.model,
			output: result.output as unknown as Record<string, unknown>,
			latencyMs: result.latencyMs
		});
		const decision = await insertAiDecisionForTenant(required, {
			runId: run.id,
			kind: catalog.agent.key,
			finding: recommendation.finding,
			evidence: recommendation.evidence,
			proposedAction: recommendation.proposedAction,
			expectedImpact: recommendation.expectedImpact,
			confidence: recommendation.confidence,
			riskClass: recommendation.riskClass,
			recommendedAutonomy: recommendation.recommendedAutonomy
		});
		const approval = await insertApprovalRequestForTenant(required, {
			runId: run.id,
			decisionId: decision.id,
			actionType: `${catalog.agent.key}.recommend`,
			riskClass: recommendation.riskClass,
			summary: recommendation.proposedAction
		});
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'ai',
			actorId: actor.userId,
			action: 'ai.run.completed',
			entityType: 'ai_run',
			entityId: run.id,
			requestId
		});
		logInfo('ai.run.completed', {
			clientId: required.clientId,
			agentKey: catalog.agent.key,
			runId: run.id,
			costMicros: cost.costMicros,
			status: 'proposed'
		});
		return { run: updated ?? run, decision, approval, cost, replayed: false };
	} catch (error) {
		const message = error instanceof Error ? error.message : 'AI run failed';
		await updateAiRunForTenant(required, run.id, {
			status: 'failed',
			error: message
		});
		logError('ai.run.failed', error, { clientId: required.clientId, runId: run.id });
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'ai',
			actorId: actor.userId,
			action: 'ai.run.failed',
			entityType: 'ai_run',
			entityId: run.id,
			requestId,
			reason: message
		});
		throw error;
	}
}

export async function decideIntelligenceApproval(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(decideApprovalSchema, input);
	const approval = await getApprovalRequestForTenant(required, parsed.id);
	if (!approval) throw new NotFoundError('Approval request not found');
	if (approval.status !== 'pending') throw new ValidationError('Approval is already decided');
	const run = await getAiRunForTenant(required, approval.runId);
	if (!run) throw new NotFoundError('AI run not found');
	const pagesBefore = await countPublishedPageVersionsForTenant(required);
	const updated = await updateApprovalRequestStatusForTenant(
		required,
		approval.id,
		parsed.decision
	);
	await updateAiDecisionStatusForTenant(required, approval.decisionId, parsed.decision);
	const recorded = await insertApprovalDecisionForTenant(required, {
		requestId: approval.id,
		decision: parsed.decision,
		note: parsed.note ?? null,
		actorId: actor.userId
	});
	const pagesAfter = await countPublishedPageVersionsForTenant(required);
	if (pagesAfter !== pagesBefore) {
		throw new ForbiddenError('Approval must not publish pages');
	}
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: `ai.approval.${parsed.decision}`,
		entityType: 'approval_request',
		entityId: approval.id,
		requestId,
		reason: parsed.note ?? undefined
	});
	logInfo('ai.approval.decided', {
		clientId: required.clientId,
		approvalId: approval.id,
		decision: parsed.decision,
		executed: false
	});
	return { approval: updated ?? approval, recorded, executed: false as const };
}

export async function pauseIntelligence(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(pauseIntelligenceSchema, input);
	const settings = await updateAiSettingsForTenant(required, { paused: parsed.paused });
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: parsed.paused ? 'ai.pause' : 'ai.resume',
		entityType: 'ai_client_settings',
		entityId: settings?.id,
		requestId
	});
	return settings;
}
