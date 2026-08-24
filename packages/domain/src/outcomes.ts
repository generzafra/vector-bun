import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	goalsClientIdSchema,
	parseContract,
	updateNotificationPreferenceSchema,
	upsertClientGoalSchema,
	type DataHealthStatus,
	type TenantContext
} from '@vector/contracts';
import {
	assertGoalClient,
	countAnalyticsEventsForTenant,
	ensureNotificationPreferencesForTenant,
	getProductionDomainForTenant,
	getPublishedHomeForTenant,
	insertClientGoalForTenant,
	listClientGoalsForTenant,
	listDataHealthChecksForTenant,
	updateNotificationPreferenceForTenant,
	upsertDataHealthCheckForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

function parseDay(value: string | undefined): Date | null {
	if (!value) return null;
	const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
	if (!match) return null;
	return new Date(`${match[1]}-${match[2]}-${match[3]}T00:00:00.000Z`);
}

function eventCount(
	rows: Array<{ name: string; isTest: boolean; total: number }>,
	name: string,
	isTest: boolean
) {
	return rows
		.filter((row) => row.name === name && row.isTest === isTest)
		.reduce((sum, row) => sum + Number(row.total), 0);
}

export async function getClientOutcomes(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'goals.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(goalsClientIdSchema, { clientId });
		assertGoalClient(required, clientId);
	}
	const [goals, notifications, health] = await Promise.all([
		listClientGoalsForTenant(required),
		ensureNotificationPreferencesForTenant(required),
		evaluateDataHealthForTenant(required)
	]);
	return {
		goals,
		primary: goals.find((row) => row.isPrimary) ?? null,
		notifications,
		health
	};
}

export async function upsertClientGoal(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'goals.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(upsertClientGoalSchema, input);
	if (parsed.goalType === 'revenue' && !parsed.currency) {
		throw new ValidationError('Revenue goals require a currency');
	}
	const row = await insertClientGoalForTenant(required, {
		name: parsed.name,
		goalType: parsed.goalType,
		targetValue: parsed.targetValue,
		unit: parsed.unit,
		currency: parsed.goalType === 'revenue' ? (parsed.currency ?? null) : (parsed.currency ?? null),
		period: parsed.period,
		isPrimary: parsed.isPrimary,
		startOn: parseDay(parsed.startOn),
		endOn: parseDay(parsed.endOn),
		createdBy: actor.userId
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'goals.upsert',
		entityType: 'client_goal',
		entityId: row.id,
		requestId
	});
	return row;
}

export async function updateNotificationPreference(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'goals.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(updateNotificationPreferenceSchema, input);
	const row = await updateNotificationPreferenceForTenant(required, parsed);
	if (!row) throw new NotFoundError('Notification preference not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'goals.notification.update',
		entityType: 'client_notification_preference',
		entityId: row.id,
		requestId,
		reason: `${parsed.topic}:${parsed.enabled ? 'on' : 'off'}`
	});
	return row;
}

export async function evaluateDataHealth(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'goals.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(goalsClientIdSchema, { clientId });
		assertGoalClient(required, clientId);
	}
	return evaluateDataHealthForTenant(required);
}

async function evaluateDataHealthForTenant(ctx: TenantContext) {
	const [published, production, events] = await Promise.all([
		getPublishedHomeForTenant(ctx),
		getProductionDomainForTenant(ctx),
		countAnalyticsEventsForTenant(ctx)
	]);
	const productionViews = eventCount(events, 'page_viewed', false);
	const productionLeads = eventCount(events, 'lead_created', false);

	let viewsStatus: DataHealthStatus = 'unknown';
	let viewsDetail = 'No published page yet.';
	if (!published) {
		viewsStatus = 'unknown';
		viewsDetail = 'No published page yet. Tracking health is unknown.';
	} else if (!production) {
		viewsStatus = 'unknown';
		viewsDetail = 'No production hostname. Tracking health is unknown until launch.';
	} else if (productionViews === 0) {
		viewsStatus = 'broken';
		viewsDetail = 'Production site has no recorded page views.';
	} else {
		viewsStatus = 'healthy';
		viewsDetail = `${productionViews} production page views recorded.`;
	}

	let leadStatus: DataHealthStatus = 'unknown';
	let leadDetail = 'Lead capture health is unknown.';
	if (!published || !production) {
		leadStatus = 'unknown';
		leadDetail = viewsDetail;
	} else if (productionViews === 0) {
		leadStatus = 'unknown';
		leadDetail = 'No production visits yet, so lead capture cannot be judged.';
	} else if (productionLeads === 0) {
		leadStatus = 'warning';
		leadDetail = 'Visitors are recorded, but no production leads yet.';
	} else {
		leadStatus = 'healthy';
		leadDetail = `${productionLeads} production leads recorded.`;
	}

	await upsertDataHealthCheckForTenant(ctx, {
		checkKey: 'production_page_views',
		status: viewsStatus,
		detail: viewsDetail
	});
	await upsertDataHealthCheckForTenant(ctx, {
		checkKey: 'lead_capture',
		status: leadStatus,
		detail: leadDetail
	});
	return listDataHealthChecksForTenant(ctx);
}
