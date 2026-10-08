import { requireCapability } from '@vector/auth';
import {
	assertActorOwnsContext,
	attributionCoverage,
	clientValueClientIdSchema,
	parseContract,
	recordValueActivitySchema,
	saveClientValueProfileSchema,
	utcMonthWindow,
	type AttributionEvidenceClass,
	type TenantContext
} from '@vector/contracts';
import {
	assertValueClient,
	attributionEvidenceForTenant,
	countObservedWorkForTenant,
	getClientValueProfileForTenant,
	getOverviewFactsForTenant,
	insertValueActivityForTenant,
	listClientGoalsForTenant,
	listValueActivityForTenant,
	upsertClientValueProfileForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

/** V0 reuses goals.read / goals.manage. Do not add value.* until roles are migrated. */

function primaryGoalJoin(
	goal: {
		name: string;
		goalType: string;
		targetValue: number;
		unit: string;
		isPrimary: boolean;
	} | null,
	facts: { qualifiedCount: number; wonLeadCount: number; wonOutcomeCount: number }
): {
	name: string;
	goalType: string;
	targetValue: number;
	unit: string;
	observedValue: number | null;
	evidenceClass: 'observed' | 'unknown';
	detail: string;
} | null {
	if (!goal || !goal.isPrimary) return null;
	if (goal.goalType === 'revenue') {
		return {
			name: goal.name,
			goalType: goal.goalType,
			targetValue: goal.targetValue,
			unit: goal.unit,
			observedValue: null,
			evidenceClass: 'unknown',
			detail: 'This goal has no progress figure.'
		};
	}
	if (goal.goalType !== 'qualified_leads' && goal.goalType !== 'sales') {
		return {
			name: goal.name,
			goalType: goal.goalType,
			targetValue: goal.targetValue,
			unit: goal.unit,
			observedValue: null,
			evidenceClass: 'unknown',
			detail: 'This goal is not measured here yet.'
		};
	}
	if (goal.goalType === 'sales' && facts.wonLeadCount > facts.wonOutcomeCount) {
		return {
			name: goal.name,
			goalType: goal.goalType,
			targetValue: goal.targetValue,
			unit: goal.unit,
			observedValue: null,
			evidenceClass: 'unknown',
			detail: 'Some won leads have no recorded sale, so goal progress is unknown.'
		};
	}
	const observedValue =
		goal.goalType === 'qualified_leads' ? facts.qualifiedCount : facts.wonOutcomeCount;
	return {
		name: goal.name,
		goalType: goal.goalType,
		targetValue: goal.targetValue,
		unit: goal.unit,
		observedValue,
		evidenceClass: 'observed',
		detail: `${observedValue} of ${goal.targetValue} ${goal.unit}.`
	};
}

export async function getClientValueProof(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'goals.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(clientValueClientIdSchema, { clientId });
		assertValueClient(required, clientId);
	}
	const period = utcMonthWindow();
	const [profile, counts, activities, facts, goals, attribution] = await Promise.all([
		getClientValueProfileForTenant(required),
		countObservedWorkForTenant(required, period),
		listValueActivityForTenant(required, period),
		getOverviewFactsForTenant(required),
		listClientGoalsForTenant(required),
		attributionEvidenceForTenant(required)
	]);
	const coverage = attributionCoverage({
		leadCount: attribution.leadCount,
		classes: attribution.classes
	});
	const primary = goals.find((goal) => goal.isPrimary) ?? null;
	return {
		profile,
		period,
		feeKnown: Boolean(profile),
		evidenceClass: profile ? ('observed' as const) : ('unknown' as const),
		counts,
		activities,
		leadValue: {
			qualifiedLeads: counts.qualifiedLeads,
			attributionEvidence: coverage.evidenceClass satisfies AttributionEvidenceClass,
			goal: primaryGoalJoin(primary, facts)
		}
	};
}

export async function saveClientValueProfile(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'goals.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(saveClientValueProfileSchema, input);
	const row = await upsertClientValueProfileForTenant(required, {
		packageName: parsed.packageName,
		feeMinor: parsed.feeMinor,
		currency: parsed.currency,
		recordedBy: actor.userId
	});
	if (!row) throw new Error('client value profile write failed');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'value.profile.save',
		entityType: 'client_value_profile',
		entityId: row.id,
		requestId
	});
	return row;
}

export async function recordValueActivity(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'goals.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(recordValueActivitySchema, input);
	const row = await insertValueActivityForTenant(required, {
		activityType: parsed.activityType,
		description: parsed.description,
		quantity: parsed.quantity,
		automated: parsed.automated,
		recordedBy: actor.userId
	});
	if (!row) throw new Error('value activity write failed');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'value.activity.record',
		entityType: 'value_activity_record',
		entityId: row.id,
		requestId
	});
	return row;
}
