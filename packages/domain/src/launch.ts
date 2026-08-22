import { requireCapability } from '@vector/auth';
import {
	ALLOWED_LAUNCH_TRANSITIONS,
	LIVE_REQUIRED_ITEM_KEYS,
	NotFoundError,
	READINESS_CATALOG,
	ValidationError,
	assertActorOwnsContext,
	completeReadinessItemSchema,
	parseContract,
	transitionLaunchSchema,
	type LaunchState,
	type TenantContext
} from '@vector/contracts';
import {
	approvePendingLaunchApprovalForTenant,
	assertLaunchClient,
	ensureLaunchRecordsForTenant,
	getBrandForTenant,
	getLaunchForTenant,
	getPreviewDomainForTenant,
	getProductionDomainForTenant,
	getPublishedHomeForTenant,
	getReadinessForTenant,
	insertLaunchApprovalForTenant,
	insertLaunchEventForTenant,
	listBrandAssetsForTenant,
	listClaimsForTenant,
	listLaunchApprovalsForTenant,
	listLaunchBlocksForTenant,
	listLaunchEventsForTenant,
	listOffersForTenant,
	listReadinessItemsForTenant,
	listServicesForTenant,
	syncLaunchBlocksForTenant,
	updateLaunchForTenant,
	updateReadinessItemForTenant,
	updateReadinessItemsForTenant,
	updateReadinessSummaryForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

const POST_READY_STATES = new Set<LaunchState>([
	'vector_ready',
	'generating',
	'qa',
	'awaiting_client_approval',
	'awaiting_domain',
	'launching'
]);

function scorePercent(complete: number, total: number) {
	if (total === 0) return 0;
	return Math.floor((complete * 100) / total);
}

export function liveLaunchBlockReason(to: LaunchState, productionActive: boolean) {
	if ((to === 'launching' || to === 'live') && !productionActive) {
		return 'Production domain is required before live launch';
	}
	return null;
}

export function vectorReadyBlockReason(to: LaunchState, vectorReady: boolean) {
	if (to === 'vector_ready' && !vectorReady) {
		return 'Blocking readiness items are incomplete';
	}
	return null;
}

async function snapshot(ctx: TenantContext) {
	await ensureLaunchRecordsForTenant(ctx);
	const readiness = await getReadinessForTenant(ctx);
	const items = await listReadinessItemsForTenant(ctx);
	const launch = await getLaunchForTenant(ctx);
	const events = await listLaunchEventsForTenant(ctx);
	const blocks = await listLaunchBlocksForTenant(ctx);
	const approvals = await listLaunchApprovalsForTenant(ctx);
	if (!readiness || !launch) throw new NotFoundError('Launch record not found');
	const nextStates =
		launch.status === 'paused' && launch.resumeStatus
			? ([launch.resumeStatus, 'blocked'] as LaunchState[])
			: ALLOWED_LAUNCH_TRANSITIONS[launch.status];
	return {
		readiness,
		items,
		launch,
		events,
		blocks,
		approvals,
		nextStates,
		timing: launchTimingSplits(launch)
	};
}

export function secondsBetween(from: Date | null | undefined, to: Date | null | undefined) {
	if (!from || !to) return null;
	return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 1000));
}

export function launchTimingSplits(launch: {
	signedAt: Date | null;
	onboardingStartedAt: Date | null;
	vectorReadyAt: Date | null;
	liveAt: Date | null;
	pausedSeconds: number;
}) {
	return {
		contractToReadySeconds: secondsBetween(launch.signedAt, launch.vectorReadyAt),
		onboardingToReadySeconds: secondsBetween(launch.onboardingStartedAt, launch.vectorReadyAt),
		readyToLiveSeconds: secondsBetween(launch.vectorReadyAt, launch.liveAt),
		pausedSeconds: launch.pausedSeconds
	};
}

async function evaluateAutomatic(ctx: TenantContext) {
	const brand = await getBrandForTenant(ctx);
	const services = await listServicesForTenant(ctx);
	const offers = await listOffersForTenant(ctx);
	const claims = await listClaimsForTenant(ctx);
	const published = await getPublishedHomeForTenant(ctx);
	const preview = await getPreviewDomainForTenant(ctx);
	const production = await getProductionDomainForTenant(ctx);
	const assets = await listBrandAssetsForTenant(ctx);
	const approved = claims.some((claim) => claim.kind === 'approved');
	const prohibited = claims.some((claim) => claim.kind === 'prohibited');
	return {
		'brand.identity': {
			complete: Boolean(brand?.displayName),
			detail: brand?.displayName ? 'Display name is present' : 'Brand display name is missing'
		},
		'brand.narrative': {
			complete: Boolean(brand?.audience && brand.offer && brand.primaryConversion),
			detail:
				brand?.audience && brand.offer && brand.primaryConversion
					? 'Audience, offer, and primary conversion are present'
					: 'Audience, offer, or primary conversion is missing'
		},
		'services.present': {
			complete: services.length > 0,
			detail: services.length > 0 ? `${services.length} service(s)` : 'No services recorded'
		},
		'offers.present': {
			complete: offers.length > 0,
			detail: offers.length > 0 ? `${offers.length} offer(s)` : 'No offers recorded'
		},
		'claims.approved': {
			complete: approved,
			detail: approved ? 'Approved claim recorded' : 'No approved claim'
		},
		'claims.prohibited': {
			complete: prohibited,
			detail: prohibited ? 'Prohibited claim recorded' : 'No prohibited claim'
		},
		'funnel.preview_published': {
			complete: Boolean(published && preview?.status === 'active'),
			detail:
				published && preview?.status === 'active'
					? 'Preview page is published'
					: 'Preview funnel is not published'
		},
		'domain.production': {
			complete: Boolean(production),
			detail: production ? 'Production domain is active' : 'Production domain is not active'
		},
		'email.sending': { complete: false, detail: 'Email adapter is not connected in this slice' },
		'social.access': { complete: false, detail: 'Social adapter is not connected in this slice' },
		'analytics.connected': {
			complete: false,
			detail: 'Analytics adapter is not connected in this slice'
		},
		'assets.uploaded': {
			complete: assets.length > 0,
			detail: assets.length > 0 ? `${assets.length} brand asset(s)` : 'No brand assets uploaded'
		}
	} as const;
}

async function persistSummaryAndBlocks(
	ctx: TenantContext,
	requestId: string,
	actorId?: string,
	options?: { autoBlock?: boolean }
) {
	const items = await listReadinessItemsForTenant(ctx);
	const launch = await getLaunchForTenant(ctx);
	const current = await getReadinessForTenant(ctx);
	if (!launch) throw new NotFoundError('Launch record not found');
	const blocking = items.filter((item) => item.blocking);
	const optional = items.filter((item) => !item.blocking);
	const blockingComplete = blocking.filter((item) => item.status === 'complete').length;
	const optionalComplete = optional.filter((item) => item.status === 'complete').length;
	const vectorReady = blocking.length > 0 && blockingComplete === blocking.length;
	const summary = {
		scorePercent: scorePercent(
			items.filter((item) => item.status === 'complete').length,
			items.length
		),
		blockingComplete,
		blockingTotal: blocking.length,
		optionalComplete,
		optionalTotal: optional.length,
		vectorReady
	};
	if (
		!current ||
		current.scorePercent !== summary.scorePercent ||
		current.blockingComplete !== summary.blockingComplete ||
		current.blockingTotal !== summary.blockingTotal ||
		current.optionalComplete !== summary.optionalComplete ||
		current.optionalTotal !== summary.optionalTotal ||
		current.vectorReady !== summary.vectorReady
	) {
		await updateReadinessSummaryForTenant(ctx, summary);
	}
	const openBlocks = blocking
		.filter((item) => item.status !== 'complete')
		.map((item) => ({ itemKey: item.key, message: item.detail ?? item.label }));
	await syncLaunchBlocksForTenant(ctx, launch.id, openBlocks);

	if (options?.autoBlock !== false && !vectorReady && POST_READY_STATES.has(launch.status)) {
		await applyTransition(
			ctx,
			launch.status,
			'blocked',
			'Blocking readiness items are incomplete',
			{
				requestId,
				actorId: actorId ?? null,
				system: true
			}
		);
	}
}

async function applyTransition(
	ctx: TenantContext,
	from: LaunchState,
	to: LaunchState,
	reason: string,
	meta: { requestId: string; actorId: string | null; system?: boolean }
) {
	const launch = await getLaunchForTenant(ctx);
	if (!launch) throw new NotFoundError('Launch record not found');
	const now = new Date();
	const patch: Parameters<typeof updateLaunchForTenant>[1] = { status: to, failureReason: null };
	if (to === 'onboarding' && !launch.onboardingStartedAt) patch.onboardingStartedAt = now;
	if (to === 'vector_ready' && !launch.vectorReadyAt) patch.vectorReadyAt = now;
	if (to === 'generating' && !launch.generationStartedAt) patch.generationStartedAt = now;
	if (to === 'qa' && !launch.qaStartedAt) patch.qaStartedAt = now;
	if (to === 'awaiting_client_approval' && !launch.approvalRequestedAt) {
		patch.approvalRequestedAt = now;
	}
	if (from === 'awaiting_client_approval' && to === 'awaiting_domain') {
		patch.approvalReceivedAt = now;
	}
	if (to === 'launching') {
		if (!launch.domainReadyAt) patch.domainReadyAt = now;
		if (!launch.launchStartedAt) patch.launchStartedAt = now;
	}
	if (to === 'live' && !launch.liveAt) patch.liveAt = now;
	if (to === 'launch_failed') patch.failureReason = reason;
	if (to === 'paused') {
		patch.pausedAt = now;
		patch.resumeStatus = from === 'paused' ? launch.resumeStatus : from;
	}
	if (from === 'paused' && to !== 'paused') {
		const started = launch.pausedAt?.getTime() ?? now.getTime();
		const elapsed = Math.max(0, Math.floor((now.getTime() - started) / 1000));
		patch.pausedSeconds = launch.pausedSeconds + elapsed;
		patch.pausedAt = null;
		patch.resumeStatus = null;
	}

	const updated = await updateLaunchForTenant(ctx, patch);
	if (!updated) throw new NotFoundError('Launch record not found');
	const event = await insertLaunchEventForTenant(ctx, {
		launchId: launch.id,
		fromStatus: from,
		toStatus: to,
		reason,
		actorId: meta.actorId,
		requestId: meta.requestId
	});
	if (to === 'awaiting_client_approval') {
		await insertLaunchApprovalForTenant(ctx, {
			launchId: launch.id,
			kind: 'client_launch',
			status: 'pending',
			actorId: meta.actorId,
			note: reason
		});
	}
	if (from === 'awaiting_client_approval' && to === 'awaiting_domain' && meta.actorId) {
		await approvePendingLaunchApprovalForTenant(ctx, 'client_launch', meta.actorId, reason);
	}
	if (!meta.system) {
		await recordAudit({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			actorType: 'human',
			actorId: meta.actorId,
			action: 'launch.transition',
			entityType: 'client_launch',
			entityId: launch.id,
			requestId: meta.requestId,
			reason
		});
	}
	return { launch: updated, event };
}

async function refreshAutomaticItems(ctx: TenantContext) {
	await ensureLaunchRecordsForTenant(ctx);
	const evaluation = await evaluateAutomatic(ctx);
	const items = await listReadinessItemsForTenant(ctx);
	const updates: { key: string; status: 'complete' | 'pending'; detail: string }[] = [];
	for (const item of READINESS_CATALOG) {
		if (item.source !== 'automatic') continue;
		const result = evaluation[item.key as keyof typeof evaluation];
		if (!result) continue;
		const status = result.complete ? 'complete' : 'pending';
		const current = items.find((row) => row.key === item.key);
		if (current?.status === status && (current.detail ?? null) === result.detail) continue;
		updates.push({ key: item.key, status, detail: result.detail });
	}
	if (updates.length > 0) {
		await updateReadinessItemsForTenant(ctx, updates);
	}
}

export async function getLaunch(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'launch.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertLaunchClient(required, clientId);
	await refreshAutomaticItems(required);
	await persistSummaryAndBlocks(required, ctx.requestId, actor.userId, { autoBlock: false });
	return snapshot(required);
}

export async function recalculateReadiness(actor: Actor, ctx: TenantContext, requestId: string) {
	requireCapability(actor.permissions, 'launch.manage');
	const required = assertActorOwnsContext(actor, ctx);
	await refreshAutomaticItems(required);
	await persistSummaryAndBlocks(required, requestId, actor.userId);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'launch.readiness.recalculate',
		entityType: 'client_readiness',
		entityId: required.clientId,
		requestId
	});
	return snapshot(required);
}

export async function completeReadinessItem(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'launch.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(completeReadinessItemSchema, input);
	await ensureLaunchRecordsForTenant(required);
	const row = await updateReadinessItemForTenant(required, parsed.key, {
		status: 'complete',
		detail: parsed.note ?? 'Recorded by operator'
	});
	if (!row) throw new NotFoundError('Readiness item not found');
	await persistSummaryAndBlocks(required, requestId, actor.userId);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'launch.readiness.complete',
		entityType: 'client_readiness_item',
		entityId: row.id,
		requestId,
		reason: parsed.key
	});
	return snapshot(required);
}

export async function transitionLaunch(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'launch.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(transitionLaunchSchema, input);
	await ensureLaunchRecordsForTenant(required);
	const current = await getLaunchForTenant(required);
	if (!current) throw new NotFoundError('Launch record not found');
	const from = current.status;
	if (
		from === 'paused' &&
		current.resumeStatus &&
		parsed.to !== current.resumeStatus &&
		parsed.to !== 'blocked'
	) {
		throw new ValidationError(`Resume to ${current.resumeStatus} or blocked`);
	}
	if (!ALLOWED_LAUNCH_TRANSITIONS[from].includes(parsed.to)) {
		throw new ValidationError(`Cannot move from ${from} to ${parsed.to}`);
	}
	if (parsed.launchClass) {
		await updateLaunchForTenant(required, { launchClass: parsed.launchClass });
	}

	const productionBlock = liveLaunchBlockReason(
		parsed.to,
		Boolean(await getProductionDomainForTenant(required))
	);
	if (productionBlock) throw new ValidationError(productionBlock);

	await refreshAutomaticItems(required);
	await persistSummaryAndBlocks(required, requestId, actor.userId);
	const readiness = await getReadinessForTenant(required);
	if (!readiness) throw new NotFoundError('Readiness record not found');

	const readyBlock = vectorReadyBlockReason(parsed.to, readiness.vectorReady);
	if (readyBlock) throw new ValidationError(readyBlock);
	if (parsed.to === 'launching' || parsed.to === 'live') {
		const items = await listReadinessItemsForTenant(required);
		const missing = LIVE_REQUIRED_ITEM_KEYS.filter(
			(key) => items.find((item) => item.key === key)?.status !== 'complete'
		);
		if (missing.length) {
			throw new ValidationError('Production domain is required before live launch');
		}
	}

	const latest = await getLaunchForTenant(required);
	if (!latest) throw new NotFoundError('Launch record not found');
	if (!ALLOWED_LAUNCH_TRANSITIONS[latest.status].includes(parsed.to)) {
		throw new ValidationError(`Cannot move from ${latest.status} to ${parsed.to}`);
	}
	await applyTransition(required, latest.status, parsed.to, parsed.reason, {
		requestId,
		actorId: actor.userId
	});
	return snapshot(required);
}
