import { and, count, desc, eq, sum } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import {
	aiAgents,
	aiAgentVersions,
	aiClientSettings,
	aiCostEvents,
	aiDecisions,
	aiMessages,
	aiRuns,
	approvalDecisions,
	approvalRequests,
	pageVersions,
	promptTemplates,
	promptVersions,
	type AiMessageContent,
	type AiRunOutput
} from './schema';

export function assertAiClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function listAiAgents() {
	return db.select().from(aiAgents).orderBy(aiAgents.key);
}

export async function getPublishedAgentByKey(key: string) {
	const [agent] = await db.select().from(aiAgents).where(eq(aiAgents.key, key)).limit(1);
	if (!agent) return null;
	const [version] = await db
		.select()
		.from(aiAgentVersions)
		.where(eq(aiAgentVersions.agentId, agent.id))
		.orderBy(desc(aiAgentVersions.version))
		.limit(1);
	if (!version) return null;
	const [prompt] = await db
		.select()
		.from(promptVersions)
		.where(eq(promptVersions.id, version.promptVersionId))
		.limit(1);
	if (!prompt) return null;
	return { agent, version, prompt };
}

export async function getAiSettingsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(aiClientSettings)
		.where(eq(aiClientSettings.clientId, required.clientId))
		.limit(1);
	return row ?? null;
}

export async function ensureAiSettingsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const existing = await getAiSettingsForTenant(required);
	if (existing) return existing;
	const [row] = await db
		.insert(aiClientSettings)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId
		})
		.returning();
	return row;
}

export async function updateAiSettingsForTenant(ctx: TenantContext, input: { paused: boolean }) {
	const required = requireTenantContext(ctx);
	const current = await ensureAiSettingsForTenant(required);
	const [row] = await db
		.update(aiClientSettings)
		.set({ paused: input.paused, updatedAt: new Date() })
		.where(
			and(eq(aiClientSettings.id, current.id), eq(aiClientSettings.clientId, required.clientId))
		)
		.returning();
	return row ?? null;
}

export async function getAiRunByIdempotency(ctx: TenantContext, idempotencyKey: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(aiRuns)
		.where(and(eq(aiRuns.clientId, required.clientId), eq(aiRuns.idempotencyKey, idempotencyKey)))
		.limit(1);
	return row ?? null;
}

export async function getAiRunForTenant(ctx: TenantContext, runId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(aiRuns)
		.where(and(eq(aiRuns.id, runId), eq(aiRuns.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function listAiRunsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(aiRuns)
		.where(eq(aiRuns.clientId, required.clientId))
		.orderBy(desc(aiRuns.createdAt));
}

export async function insertAiRunForTenant(
	ctx: TenantContext,
	input: {
		agentId: string;
		agentVersionId: string;
		promptVersionId: string;
		agentKey: string;
		schemaName: string;
		schemaVersion: string;
		taskClass: (typeof aiRuns.$inferInsert)['taskClass'];
		status: (typeof aiRuns.$inferInsert)['status'];
		provider: string;
		model: string;
		autonomyLevel: number;
		brief?: string | null;
		output?: AiRunOutput | null;
		error?: string | null;
		blockedBy?: string | null;
		idempotencyKey: string;
		requestId: string;
		actorId?: string | null;
		latencyMs?: number | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(aiRuns)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function updateAiRunForTenant(
	ctx: TenantContext,
	runId: string,
	input: {
		status: (typeof aiRuns.$inferInsert)['status'];
		provider?: string;
		model?: string;
		output?: AiRunOutput | null;
		error?: string | null;
		blockedBy?: string | null;
		latencyMs?: number | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(aiRuns)
		.set({ ...input, updatedAt: new Date() })
		.where(and(eq(aiRuns.id, runId), eq(aiRuns.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function insertAiMessageForTenant(
	ctx: TenantContext,
	input: {
		runId: string;
		role: 'system' | 'user' | 'assistant';
		content: AiMessageContent;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(aiMessages)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function insertAiCostEventForTenant(
	ctx: TenantContext,
	input: {
		runId: string;
		provider: string;
		model: string;
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
		costMicros: number;
		currency?: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(aiCostEvents)
		.values({
			...input,
			organizationId: required.organizationId,
			clientId: required.clientId,
			currency: input.currency ?? 'USD'
		})
		.returning();
	return row;
}

export async function listAiCostEventsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(aiCostEvents)
		.where(eq(aiCostEvents.clientId, required.clientId))
		.orderBy(desc(aiCostEvents.createdAt));
}

export async function sumAiCostMicrosForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({ total: sum(aiCostEvents.costMicros) })
		.from(aiCostEvents)
		.where(eq(aiCostEvents.clientId, required.clientId));
	return Number(row?.total ?? 0);
}

export async function insertAiDecisionForTenant(
	ctx: TenantContext,
	input: {
		runId: string;
		kind: string;
		finding: string;
		evidence: string;
		proposedAction: string;
		expectedImpact: string;
		confidence: number;
		riskClass: (typeof aiDecisions.$inferInsert)['riskClass'];
		recommendedAutonomy: number;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(aiDecisions)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			status: 'proposed',
			...input
		})
		.returning();
	return row;
}

export async function getAiDecisionForRun(ctx: TenantContext, runId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(aiDecisions)
		.where(and(eq(aiDecisions.runId, runId), eq(aiDecisions.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function listAiDecisionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(aiDecisions)
		.where(eq(aiDecisions.clientId, required.clientId))
		.orderBy(desc(aiDecisions.createdAt));
}

export async function updateAiDecisionStatusForTenant(
	ctx: TenantContext,
	decisionId: string,
	status: 'proposed' | 'approved' | 'rejected'
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(aiDecisions)
		.set({ status, updatedAt: new Date() })
		.where(and(eq(aiDecisions.id, decisionId), eq(aiDecisions.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function insertApprovalRequestForTenant(
	ctx: TenantContext,
	input: {
		runId: string;
		decisionId: string;
		actionType: string;
		riskClass: (typeof approvalRequests.$inferInsert)['riskClass'];
		summary: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(approvalRequests)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			required: true,
			status: 'pending',
			...input
		})
		.returning();
	return row;
}

export async function getApprovalRequestForTenant(ctx: TenantContext, requestId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(approvalRequests)
		.where(
			and(eq(approvalRequests.id, requestId), eq(approvalRequests.clientId, required.clientId))
		)
		.limit(1);
	return row ?? null;
}

export async function listApprovalRequestsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(approvalRequests)
		.where(eq(approvalRequests.clientId, required.clientId))
		.orderBy(desc(approvalRequests.createdAt));
}

export async function updateApprovalRequestStatusForTenant(
	ctx: TenantContext,
	requestId: string,
	status: 'pending' | 'approved' | 'rejected'
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(approvalRequests)
		.set({ status, updatedAt: new Date() })
		.where(
			and(eq(approvalRequests.id, requestId), eq(approvalRequests.clientId, required.clientId))
		)
		.returning();
	return row ?? null;
}

export async function insertApprovalDecisionForTenant(
	ctx: TenantContext,
	input: {
		requestId: string;
		decision: 'approved' | 'rejected';
		note?: string | null;
		actorId?: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(approvalDecisions)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			confidenceIgnored: true,
			...input
		})
		.returning();
	return row;
}

export async function listApprovalDecisionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(approvalDecisions)
		.where(eq(approvalDecisions.clientId, required.clientId))
		.orderBy(desc(approvalDecisions.createdAt));
}

export async function countPublishedPageVersionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({ total: count() })
		.from(pageVersions)
		.where(and(eq(pageVersions.clientId, required.clientId), eq(pageVersions.status, 'published')));
	return Number(row?.total ?? 0);
}

export async function upsertPromptTemplate(key: string, name: string) {
	const [existing] = await db
		.select()
		.from(promptTemplates)
		.where(eq(promptTemplates.key, key))
		.limit(1);
	if (existing) return existing;
	const [row] = await db.insert(promptTemplates).values({ key, name }).returning();
	return row;
}

export async function upsertPromptVersion(templateId: string, version: number, systemText: string) {
	const [existing] = await db
		.select()
		.from(promptVersions)
		.where(and(eq(promptVersions.templateId, templateId), eq(promptVersions.version, version)))
		.limit(1);
	if (existing) return existing;
	const [row] = await db
		.insert(promptVersions)
		.values({ templateId, version, systemText })
		.returning();
	return row;
}

export async function upsertAiAgent(input: {
	key: string;
	name: string;
	description: string;
	defaultAutonomy: number;
	defaultRiskClass: 'low' | 'content' | 'financial' | 'legal';
}) {
	const [existing] = await db.select().from(aiAgents).where(eq(aiAgents.key, input.key)).limit(1);
	if (existing) return existing;
	const [row] = await db.insert(aiAgents).values(input).returning();
	return row;
}

export async function upsertAiAgentVersion(input: {
	agentId: string;
	promptVersionId: string;
	version: number;
	schemaName: string;
	schemaVersion: string;
	taskClass: (typeof aiAgentVersions.$inferInsert)['taskClass'];
	modelHint?: string | null;
}) {
	const [existing] = await db
		.select()
		.from(aiAgentVersions)
		.where(
			and(eq(aiAgentVersions.agentId, input.agentId), eq(aiAgentVersions.version, input.version))
		)
		.limit(1);
	if (existing) return existing;
	const [row] = await db.insert(aiAgentVersions).values(input).returning();
	return row;
}
