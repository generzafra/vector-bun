import { requireCapability } from '@vector/auth';
import { evaluateAutoExecute } from '@vector/ai';
import { env } from '@vector/config';
import {
	PHASE_4_MAX_AUTONOMY,
	PHASE_8_MAX_AUTONOMY,
	ValidationError,
	assertActorOwnsContext,
	parseContract,
	setAutonomyCeilingSchema,
	type TenantContext
} from '@vector/contracts';
import {
	assertAutonomyClient,
	ensureAiSettingsForTenant,
	insertKillSwitchEventForTenant,
	listAiActionPolicies,
	listKillSwitchEventsForTenant,
	updateAiSettingsForTenant
} from '@vector/db';
import { logInfo } from '@vector/observability';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

export async function getAutonomyOverview(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'ai.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertAutonomyClient(required, clientId);
	const [settings, policies, killSwitchEvents] = await Promise.all([
		ensureAiSettingsForTenant(required),
		listAiActionPolicies(),
		listKillSwitchEventsForTenant(required)
	]);
	const pausedGlobal = env.AI_EXECUTION_PAUSED;
	const actions = policies.map((policy) => {
		const gate = evaluateAutoExecute({
			pausedGlobal,
			pausedClient: settings.paused,
			autonomyCeiling: settings.autonomyCeiling,
			requestedAutonomy: 3,
			confidence: 100,
			actionType: policy.actionType,
			policy: {
				actionType: policy.actionType,
				riskClass: policy.riskClass,
				maxAutonomy: policy.maxAutonomy,
				autoExecuteAllowed: policy.autoExecuteAllowed,
				forbidden: policy.forbidden,
				financialLimitMinor: policy.financialLimitMinor
			}
		});
		return {
			id: policy.id,
			actionType: policy.actionType,
			name: policy.name,
			description: policy.description,
			riskClass: policy.riskClass,
			defaultAutonomy: policy.defaultAutonomy,
			maxAutonomy: policy.maxAutonomy,
			autoExecuteAllowed: policy.autoExecuteAllowed,
			forbidden: policy.forbidden,
			financialLimitMinor: policy.financialLimitMinor,
			financialCurrency: policy.financialCurrency,
			contentLimit: policy.contentLimit,
			providerLimit: policy.providerLimit,
			approvalExpirySeconds: policy.approvalExpirySeconds,
			rollbackSupported: policy.rollbackSupported,
			eligibleNow: gate.allowed,
			blockedBy: gate.allowed ? null : gate.blockedBy
		};
	});
	return {
		settings,
		pausedGlobal,
		phase4MaxAutonomy: PHASE_4_MAX_AUTONOMY,
		phase8MaxAutonomy: PHASE_8_MAX_AUTONOMY,
		executed: false,
		executedCount: 0,
		actions,
		killSwitchEvents
	};
}

export async function setAutonomyCeiling(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'ai.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(setAutonomyCeilingSchema, input);
	if (parsed.autonomyCeiling > PHASE_8_MAX_AUTONOMY) {
		throw new ValidationError('Autonomy ceiling cannot exceed Level 3 in Phase 8');
	}
	const settings = await updateAiSettingsForTenant(required, {
		autonomyCeiling: parsed.autonomyCeiling
	});
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'ai.autonomy_ceiling',
		entityType: 'ai_client_settings',
		entityId: settings?.id,
		requestId,
		reason: `ceiling:${parsed.autonomyCeiling}`
	});
	logInfo('ai.autonomy.ceiling', {
		clientId: required.clientId,
		autonomyCeiling: parsed.autonomyCeiling
	});
	return settings;
}
