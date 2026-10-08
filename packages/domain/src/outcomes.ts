import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	goalsClientIdSchema,
	leadStatusForSalesOutcome,
	mapQuickStartGoal,
	parseContract,
	recordSalesOutcomeSchema,
	salesOutcomesClientIdSchema,
	saveOutcomesQuickStartSchema,
	updateNotificationPreferenceSchema,
	upsertClientGoalSchema,
	type DataHealthStatus,
	type TenantContext
} from '@vector/contracts';
import {
	assertGoalClient,
	assertLeadClient,
	countAnalyticsEventsForTenant,
	ensureNotificationPreferencesForTenant,
	getLeadForTenant,
	getOverviewFactsForTenant,
	getProductionDomainForTenant,
	getPublishedHomeForTenant,
	getSalesOutcomeCoverageForTenant,
	insertClientGoalForTenant,
	insertSalesOutcomeForTenant,
	listClientGoalsForTenant,
	listDataHealthChecksForTenant,
	listSalesOutcomesForTenant,
	getOutcomesQuickStartForTenant,
	saveOutcomesQuickStartForTenant,
	updateLeadStatusForTenant,
	updateNotificationPreferenceForTenant,
	upsertDataHealthCheckForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import { summarizeRecordedRevenue } from './revenue';
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
	const [goals, notifications, health, quickstart] = await Promise.all([
		listClientGoalsForTenant(required),
		ensureNotificationPreferencesForTenant(required),
		evaluateDataHealthForTenant(required),
		getOutcomesQuickStartForTenant(required)
	]);
	return {
		goals,
		primary: goals.find((row) => row.isPrimary) ?? null,
		notifications,
		health,
		quickstart
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

export async function evaluateDataHealthForTenant(ctx: TenantContext) {
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

export async function getOutcomesQuickStart(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'goals.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(goalsClientIdSchema, { clientId });
		assertGoalClient(required, clientId);
	}
	return getOutcomesQuickStartForTenant(required);
}

export async function saveOutcomesQuickStart(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'goals.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(saveOutcomesQuickStartSchema, input);
	const mapped = mapQuickStartGoal(parsed);
	const goal =
		parsed.hasTarget && parsed.targetValue && parsed.period
			? {
					name: mapped.name,
					goalType: mapped.goalType,
					targetValue: parsed.targetValue,
					unit: mapped.unit,
					currency: parsed.goalChoice === 'revenue' ? (parsed.currency ?? null) : null,
					period: parsed.period,
					isPrimary: true as const
				}
			: null;
	const row = await saveOutcomesQuickStartForTenant(required, {
		answers: parsed,
		goal,
		createdBy: actor.userId,
		approverUserId: parsed.approver === 'self' ? actor.userId : null
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'outcomes.quickstart.save',
		entityType: 'client_outcome_quickstart',
		entityId: row.id,
		requestId
	});
	return row;
}

export async function listSalesOutcomes(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'leads.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(salesOutcomesClientIdSchema, { clientId });
		assertLeadClient(required, clientId);
	}
	const [outcomes, coverage] = await Promise.all([
		listSalesOutcomesForTenant(required),
		getSalesOutcomeCoverageForTenant(required)
	]);
	return { outcomes, coverage };
}

export async function getSalesOutcomeCoverage(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'leads.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(salesOutcomesClientIdSchema, { clientId });
		assertLeadClient(required, clientId);
	}
	return getSalesOutcomeCoverageForTenant(required);
}

export async function recordSalesOutcome(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'leads.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(recordSalesOutcomeSchema, input);
	const existing = await getLeadForTenant(required, parsed.leadId);
	if (!existing) throw new NotFoundError('Lead not found');
	if (existing.status === 'spam') {
		throw new ValidationError('Spam leads cannot receive a sales outcome');
	}
	const outcome = await insertSalesOutcomeForTenant(required, {
		leadId: parsed.leadId,
		outcomeType: parsed.outcomeType,
		amountMinor: parsed.amountMinor ?? null,
		currency: parsed.currency ?? null,
		note: parsed.note ?? null,
		recordedBy: actor.userId
	});
	const nextStatus = leadStatusForSalesOutcome(parsed.outcomeType, existing.status);
	let lead = existing;
	if (nextStatus) {
		const updated = await updateLeadStatusForTenant(required, {
			leadId: existing.id,
			status: nextStatus,
			reason: `Recorded ${parsed.outcomeType} sales outcome`,
			actorId: actor.userId,
			requestId
		});
		if (updated) lead = updated.lead;
	}
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'outcomes.sales.record',
		entityType: 'sales_outcome',
		entityId: outcome.id,
		requestId,
		reason: parsed.outcomeType
	});
	return { outcome, lead };
}

type OverviewCount = {
	evidenceClass: 'observed' | 'unknown';
	count: number | null;
	detail: string;
};

type OverviewGoal = {
	name: string;
	goalType: string;
	targetValue: number;
	unit: string;
	currency: string | null;
	period: string;
	observedValue: number | null;
	evidenceClass: 'observed' | 'unknown';
	detail: string;
};

function unknownCount(detail: string): OverviewCount {
	return { evidenceClass: 'unknown', count: null, detail };
}

function observedCount(count: number, detail: string): OverviewCount {
	return { evidenceClass: 'observed', count, detail };
}

export async function getClientOverview(actor: Actor, ctx: TenantContext, clientId?: string) {
	const canGoals = actor.permissions.includes('goals.read');
	const canLeads = actor.permissions.includes('leads.read');
	const canOutcomes = actor.permissions.includes('outcomes.read');
	if (!canGoals && !canLeads) {
		requireCapability(actor.permissions, 'goals.read');
	}
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(goalsClientIdSchema, { clientId });
		assertGoalClient(required, clientId);
	}

	const facts = canLeads ? await getOverviewFactsForTenant(required) : null;
	const goals = canGoals ? await listClientGoalsForTenant(required) : [];
	const health = canGoals ? await evaluateDataHealth(actor, required) : [];
	const primary = goals.find((row) => row.isPrimary) ?? null;

	const qualified: OverviewCount = facts
		? observedCount(
				facts.qualifiedCount,
				facts.qualifiedCount === 0
					? 'No qualified leads recorded yet.'
					: `${facts.qualifiedCount} qualified ${facts.qualifiedCount === 1 ? 'lead' : 'leads'} recorded.`
			)
		: unknownCount('Qualified leads need lead access.');

	const salesIncomplete = facts !== null && facts.wonLeadCount > facts.wonOutcomeCount;
	const sales: OverviewCount = !facts
		? unknownCount('Sales need lead access.')
		: salesIncomplete
			? unknownCount('Some won leads have no recorded sale, so the sales total is unknown.')
			: observedCount(
					facts.wonOutcomeCount,
					facts.wonOutcomeCount === 0
						? 'No sales recorded yet.'
						: `${facts.wonOutcomeCount} recorded ${facts.wonOutcomeCount === 1 ? 'sale' : 'sales'}.`
				);

	let goal: OverviewGoal | null = null;
	if (primary) {
		const base = {
			name: primary.name,
			goalType: primary.goalType,
			targetValue: primary.targetValue,
			unit: primary.unit,
			currency: primary.currency,
			period: primary.period
		};
		if (primary.goalType === 'revenue') {
			goal = {
				...base,
				observedValue: null,
				evidenceClass: 'unknown',
				detail: 'Revenue is not recorded yet, so this goal has no progress figure.'
			};
		} else if (primary.goalType !== 'qualified_leads' && primary.goalType !== 'sales') {
			goal = {
				...base,
				observedValue: null,
				evidenceClass: 'unknown',
				detail: 'This goal is not measured on Overview yet.'
			};
		} else if (!facts) {
			goal = {
				...base,
				observedValue: null,
				evidenceClass: 'unknown',
				detail: 'Goal progress needs lead access.'
			};
		} else if (primary.goalType === 'sales' && salesIncomplete) {
			goal = {
				...base,
				observedValue: null,
				evidenceClass: 'unknown',
				detail: 'Some won leads have no recorded sale, so goal progress is unknown.'
			};
		} else {
			const observedValue =
				primary.goalType === 'qualified_leads' ? facts.qualifiedCount : facts.wonOutcomeCount;
			goal = {
				...base,
				observedValue,
				evidenceClass: 'observed',
				detail: `${observedValue} of ${primary.targetValue} ${primary.unit} recorded.`
			};
		}
	}

	const warnings = health
		.filter((row) => row.status === 'warning' || row.status === 'broken')
		.map((row) => ({ checkKey: row.checkKey, status: row.status, detail: row.detail }));
	const trackingUnknown = !canGoals || health.some((row) => row.status === 'unknown');
	const trackingHealthy =
		canGoals && health.length > 0 && !trackingUnknown && warnings.length === 0;
	const revenue = canOutcomes
		? await summarizeRecordedRevenue(required)
		: {
				evidenceClass: 'unknown' as const,
				amountMinor: null,
				currency: null,
				count: null,
				detail: 'Revenue needs access.'
			};

	return {
		qualified,
		sales,
		revenue,
		goalsAvailable: canGoals,
		goal,
		warnings,
		trackingUnknown,
		trackingHealthy
	};
}
