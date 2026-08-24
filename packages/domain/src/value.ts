import { requireCapability } from '@vector/auth';
import {
	assertActorOwnsContext,
	clientValueClientIdSchema,
	parseContract,
	recordValueActivitySchema,
	saveClientValueProfileSchema,
	utcMonthWindow,
	type TenantContext
} from '@vector/contracts';
import {
	assertValueClient,
	countObservedWorkForTenant,
	getClientValueProfileForTenant,
	insertValueActivityForTenant,
	listValueActivityForTenant,
	upsertClientValueProfileForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

/** V0 reuses goals.read / goals.manage. Do not add value.* until roles are migrated. */

export async function getClientValueProof(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'goals.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) {
		parseContract(clientValueClientIdSchema, { clientId });
		assertValueClient(required, clientId);
	}
	const period = utcMonthWindow();
	const [profile, counts, activities] = await Promise.all([
		getClientValueProfileForTenant(required),
		countObservedWorkForTenant(required, period),
		listValueActivityForTenant(required, period)
	]);
	return {
		profile,
		period,
		feeKnown: Boolean(profile),
		evidenceClass: profile ? ('observed' as const) : ('unknown' as const),
		counts,
		activities
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
