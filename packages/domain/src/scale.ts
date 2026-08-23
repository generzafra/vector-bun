import { requireCapability } from '@vector/auth';
import {
	ForbiddenError,
	NotFoundError,
	assertActorOwnsContext,
	DEFAULT_USAGE_LIMITS,
	evaluateUsageQuota,
	evaluateVector24Clock,
	nextLaunchAction,
	parseContract,
	recordTenantUsageSchema,
	requireTenantContext,
	setTenantUsageLimitSchema,
	summarizeVector24Kpis,
	usageWindowStart,
	type PortfolioExceptionReason,
	type TenantContext,
	type UsageResourceFamily
} from '@vector/contracts';
import {
	assertScaleClient,
	getTenantUsageEventByIdempotency,
	getTenantUsageLimitForTenant,
	insertTenantUsageEventForTenant,
	listLaunchesForClientIds,
	listOpenLaunchBlocksForClientIds,
	listReadinessForClientIds,
	listTenantUsageLimitsForClientIds,
	listTenantUsageTotalsForCurrentWindows,
	sumTenantUsageForWindow,
	updateTenantUsageLimitForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { listClientsForActor } from './clients';

function tenantContextForClient(actor: Actor, clientId: string, requestId: string): TenantContext {
	return {
		organizationId: actor.organizationId,
		clientId,
		userId: actor.userId,
		roleIds: actor.roleIds,
		requestId
	};
}

export async function evaluateAndRecordUsage(
	ctx: TenantContext,
	input: { resourceFamily: UsageResourceFamily; quantity?: number; actorId?: string | null }
) {
	const required = requireTenantContext(ctx);
	const quantity = input.quantity ?? 1;
	const limit = await getTenantUsageLimitForTenant(required, input.resourceFamily);
	if (!limit) throw new NotFoundError('Usage limit not found');
	const existing = await getTenantUsageEventByIdempotency(required, {
		requestId: required.requestId,
		resourceFamily: input.resourceFamily
	});
	const windowStartedAt = usageWindowStart(limit.window, new Date());
	if (existing) {
		const used = await sumTenantUsageForWindow(required, {
			resourceFamily: input.resourceFamily,
			windowStartedAt
		});
		return {
			replayed: true,
			event: existing,
			evaluation: evaluateUsageQuota({
				used: used - existing.quantity,
				hardLimit: existing.hardLimit,
				warningPercent: existing.warningPercent,
				quantity: existing.quantity,
				mode: 'evaluate_only'
			})
		};
	}
	const used = await sumTenantUsageForWindow(required, {
		resourceFamily: input.resourceFamily,
		windowStartedAt
	});
	const evaluation = evaluateUsageQuota({
		used,
		hardLimit: limit.hardLimit,
		warningPercent: limit.warningPercent,
		quantity,
		mode: 'evaluate_only'
	});
	const event = await insertTenantUsageEventForTenant(required, {
		resourceFamily: input.resourceFamily,
		window: limit.window,
		windowStartedAt,
		quantity,
		usedBefore: used,
		hardLimit: limit.hardLimit,
		warningPercent: limit.warningPercent,
		mode: 'evaluate_only',
		outcome: evaluation.wouldDeny ? 'would_deny' : 'recorded',
		requestId: required.requestId,
		actorId: input.actorId ?? null
	});
	return { replayed: false, event, evaluation };
}

function assemblePortfolioRow(input: {
	clientId: string;
	clientName: string;
	launch: {
		id: string | null;
		status:
			| 'draft'
			| 'onboarding'
			| 'blocked'
			| 'vector_ready'
			| 'generating'
			| 'qa'
			| 'awaiting_client_approval'
			| 'awaiting_domain'
			| 'launching'
			| 'live'
			| 'launch_failed'
			| 'paused';
		launchClass: 'A' | 'B' | 'C' | 'D';
		vectorReadyAt: Date | null;
		liveAt: Date | null;
		pausedAt: Date | null;
		pausedSeconds: number;
		failureReason: string | null;
	};
	readiness: {
		scorePercent: number;
		vectorReady: boolean;
		blockingComplete: number;
		blockingTotal: number;
	};
	openBlocks: Array<{ id: string; itemKey: string; message: string }>;
	limits: Array<{
		resourceFamily: UsageResourceFamily;
		window: (typeof DEFAULT_USAGE_LIMITS)[number]['window'];
		hardLimit: number;
		warningPercent: number;
		mode: 'evaluate_only' | 'enforce';
		overrideReason: string | null;
	}>;
	usedByFamily: Map<string, number>;
	now: Date;
}) {
	const usage = DEFAULT_USAGE_LIMITS.map((catalog) => {
		const limit = input.limits.find((row) => row.resourceFamily === catalog.resourceFamily);
		const used = input.usedByFamily.get(catalog.resourceFamily) ?? 0;
		const hardLimit = limit?.hardLimit ?? catalog.hardLimit;
		const warningPercent = limit?.warningPercent ?? catalog.warningPercent;
		const evaluation = evaluateUsageQuota({
			used,
			hardLimit,
			warningPercent,
			quantity: 0,
			mode: 'evaluate_only'
		});
		return {
			resourceFamily: catalog.resourceFamily,
			window: limit?.window ?? catalog.window,
			used,
			hardLimit,
			warningPercent,
			mode: limit?.mode ?? 'evaluate_only',
			overrideReason: limit?.overrideReason ?? null,
			warning: evaluation.warning,
			wouldDeny: used > hardLimit,
			remaining: evaluation.remaining
		};
	});
	const clock = evaluateVector24Clock({
		launchClass: input.launch.launchClass,
		status: input.launch.status,
		vectorReadyAt: input.launch.vectorReadyAt,
		liveAt: input.launch.liveAt,
		pausedAt: input.launch.pausedAt,
		pausedSeconds: input.launch.pausedSeconds,
		now: input.now
	});
	const reasons: PortfolioExceptionReason[] = [];
	if (input.launch.status === 'launch_failed') reasons.push('launch_failed');
	if (input.launch.status === 'blocked') reasons.push('blocked');
	if (input.launch.status === 'paused') reasons.push('paused');
	if (input.openBlocks.length > 0) reasons.push('open_block');
	if (clock.started && clock.promised && clock.overClass) reasons.push('sla_over');
	else if (clock.started && clock.promised && clock.warningClass) reasons.push('sla_warning');
	if (usage.some((row) => row.wouldDeny)) reasons.push('usage_would_deny');
	else if (usage.some((row) => row.warning)) reasons.push('usage_warning');
	return {
		clientId: input.clientId,
		clientName: input.clientName,
		launch: input.launch,
		readiness: input.readiness,
		openBlocks: input.openBlocks,
		clock,
		usage,
		reasons,
		exception: reasons.length > 0,
		nextAction: nextLaunchAction(input.launch.status, reasons)
	};
}

async function loadPortfolioRows(
	organizationId: string,
	clients: Array<{ id: string; name: string }>,
	now = new Date()
) {
	const clientIds = clients.map((client) => client.id);
	const [launches, readinessRows, blocks, limits, totals] = await Promise.all([
		listLaunchesForClientIds(organizationId, clientIds),
		listReadinessForClientIds(organizationId, clientIds),
		listOpenLaunchBlocksForClientIds(organizationId, clientIds),
		listTenantUsageLimitsForClientIds(organizationId, clientIds),
		listTenantUsageTotalsForCurrentWindows(organizationId, clientIds, now)
	]);
	const launchByClient = new Map(launches.map((row) => [row.clientId, row]));
	const readinessByClient = new Map(readinessRows.map((row) => [row.clientId, row]));
	const blocksByClient = new Map<string, typeof blocks>();
	for (const block of blocks) {
		const list = blocksByClient.get(block.clientId) ?? [];
		list.push(block);
		blocksByClient.set(block.clientId, list);
	}
	const limitsByClient = new Map<string, typeof limits>();
	for (const limit of limits) {
		const list = limitsByClient.get(limit.clientId) ?? [];
		list.push(limit);
		limitsByClient.set(limit.clientId, list);
	}
	const usedByClient = new Map<string, Map<string, number>>();
	for (const total of totals) {
		const familyUsed = usedByClient.get(total.clientId) ?? new Map<string, number>();
		familyUsed.set(total.resourceFamily, Number(total.total));
		usedByClient.set(total.clientId, familyUsed);
	}
	return clients.map((client) => {
		const launch = launchByClient.get(client.id);
		const readiness = readinessByClient.get(client.id);
		return assemblePortfolioRow({
			clientId: client.id,
			clientName: client.name,
			launch: launch
				? {
						id: launch.id,
						status: launch.status,
						launchClass: launch.launchClass,
						vectorReadyAt: launch.vectorReadyAt,
						liveAt: launch.liveAt,
						pausedAt: launch.pausedAt,
						pausedSeconds: launch.pausedSeconds,
						failureReason: launch.failureReason
					}
				: {
						id: null,
						status: 'draft',
						launchClass: 'B',
						vectorReadyAt: null,
						liveAt: null,
						pausedAt: null,
						pausedSeconds: 0,
						failureReason: null
					},
			readiness: readiness
				? {
						scorePercent: readiness.scorePercent,
						vectorReady: readiness.vectorReady,
						blockingComplete: readiness.blockingComplete,
						blockingTotal: readiness.blockingTotal
					}
				: {
						scorePercent: 0,
						vectorReady: false,
						blockingComplete: 0,
						blockingTotal: 0
					},
			openBlocks: (blocksByClient.get(client.id) ?? []).map((block) => ({
				id: block.id,
				itemKey: block.itemKey,
				message: block.message
			})),
			limits: (limitsByClient.get(client.id) ?? []).map((limit) => ({
				resourceFamily: limit.resourceFamily,
				window: limit.window,
				hardLimit: limit.hardLimit,
				warningPercent: limit.warningPercent,
				mode: limit.mode,
				overrideReason: limit.overrideReason
			})),
			usedByFamily: usedByClient.get(client.id) ?? new Map(),
			now
		});
	});
}

export async function getPortfolioOverview(actor: Actor, requestId: string) {
	requireCapability(actor.permissions, 'scale.read');
	const accessible = await listClientsForActor(actor);
	const rows = await loadPortfolioRows(actor.organizationId, accessible);
	return {
		evaluateOnly: true,
		kpi: summarizeVector24Kpis(
			rows.map((row) => ({
				launchClass: row.launch.launchClass,
				status: row.launch.status,
				liveAt: row.launch.liveAt,
				elapsedSeconds: row.clock.elapsedSeconds,
				promised: row.clock.promised
			}))
		),
		watched: rows.length,
		clients: rows.map((row) => ({ clientId: row.clientId, clientName: row.clientName })),
		exceptions: rows.filter((row) => row.exception),
		quietCount: rows.filter((row) => !row.exception).length
	};
}

export async function getPortfolioClient(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'scale.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertScaleClient(required, clientId);
	const clients = await listClientsForActor(actor);
	const client = clients.find((row) => row.id === required.clientId);
	if (!client) throw new ForbiddenError('Cannot read that client');
	const [row] = await loadPortfolioRows(required.organizationId, [client]);
	if (!row) throw new NotFoundError('Client not found');
	return row;
}

export async function recordTenantUsage(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'scale.read');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(recordTenantUsageSchema, input);
	return evaluateAndRecordUsage(
		{ ...required, requestId },
		{
			resourceFamily: parsed.resourceFamily,
			quantity: parsed.quantity,
			actorId: actor.userId
		}
	);
}

export async function setTenantUsageLimit(actor: Actor, input: unknown, requestId: string) {
	requireCapability(actor.permissions, 'scale.manage');
	const parsed = parseContract(setTenantUsageLimitSchema, input);
	const accessible = await listClientsForActor(actor);
	if (!accessible.some((client) => client.id === parsed.clientId)) {
		throw new ForbiddenError('Cannot change limits for that client');
	}
	const ctx = tenantContextForClient(actor, parsed.clientId, requestId);
	const row = await updateTenantUsageLimitForTenant(ctx, {
		resourceFamily: parsed.resourceFamily,
		hardLimit: parsed.hardLimit,
		warningPercent: parsed.warningPercent,
		overrideReason: parsed.reason
	});
	if (!row) throw new NotFoundError('Usage limit not found');
	await recordAudit({
		organizationId: ctx.organizationId,
		clientId: ctx.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'scale.usage_limit.override',
		entityType: 'tenant_usage_limits',
		entityId: row.id,
		requestId,
		reason: parsed.reason
	});
	return row;
}
