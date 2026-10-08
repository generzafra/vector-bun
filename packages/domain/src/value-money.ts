import { requireCapability } from '@vector/auth';
import {
	assertActorOwnsContext,
	clientBaselineStatement,
	parseContract,
	recordClientValueBaselineSchema,
	revenueLinkedStatement,
	type TenantContext
} from '@vector/contracts';
import { insertClientValueBaselineForTenant } from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import type { RevenueSummary } from './revenue';

type StoredBaseline = {
	version: number;
	amountMinor: number;
	currency: string;
};

type FeeProfile = { feeMinor: number; currency: string } | null;

export function presentStoredBaseline(current: StoredBaseline | null, versions: number) {
	if (!current) return null;
	const stated = clientBaselineStatement(current.version);
	return {
		version: current.version,
		amountMinor: current.amountMinor,
		currency: current.currency,
		evidence: stated.evidence,
		label: stated.label,
		detail: stated.detail,
		earlierVersions: versions - 1
	};
}

export function presentRevenueLink(
	profile: FeeProfile,
	revenue: RevenueSummary,
	attributionEvidence: string
) {
	return revenueLinkedStatement({
		feeMinor: profile?.feeMinor ?? null,
		feeCurrency: profile?.currency ?? null,
		revenueMinor: revenue.amountMinor,
		revenueCurrency: revenue.currency,
		revenueEvidence: revenue.evidenceClass,
		revenueCount: revenue.count,
		attributionEvidence
	});
}

export async function recordClientValueBaseline(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'goals.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(recordClientValueBaselineSchema, input);
	const row = await insertClientValueBaselineForTenant(required, {
		amountMinor: parsed.amountMinor,
		currency: parsed.currency,
		recordedBy: actor.userId
	});
	if (!row) throw new Error('client value baseline write failed');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'value.baseline.record',
		entityType: 'client_value_baseline',
		entityId: row.id,
		requestId
	});
	return row;
}
