import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	formatMinorUnits,
	parseContract,
	recordRevenueEventSchema,
	assertActorOwnsContext,
	type TenantContext
} from '@vector/contracts';
import {
	assertLeadClient,
	insertRevenueEventForTenant,
	listRevenueEventsForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

export type RevenueSummary = {
	evidenceClass: 'observed' | 'unknown';
	amountMinor: number | null;
	currency: string | null;
	count: number | null;
	detail: string;
};

export async function summarizeRecordedRevenue(
	ctx: TenantContext,
	window?: { start: Date; end: Date },
	emptyDetail = 'Revenue is not recorded yet.'
): Promise<RevenueSummary> {
	const rows = await listRevenueEventsForTenant(ctx, window);
	if (rows.length === 0) {
		return {
			evidenceClass: 'unknown',
			amountMinor: null,
			currency: null,
			count: 0,
			detail: emptyDetail
		};
	}
	const currencies = [...new Set(rows.map((row) => row.currency))];
	if (currencies.length !== 1) {
		return {
			evidenceClass: 'unknown',
			amountMinor: null,
			currency: null,
			count: rows.length,
			detail: 'Revenue is in more than one currency, so there is no single total.'
		};
	}
	const amountMinor = rows.reduce((sum, row) => sum + row.amountMinor, 0);
	const currency = currencies[0] ?? 'USD';
	const payments = rows.length === 1 ? 'payment' : 'payments';
	return {
		evidenceClass: 'observed',
		amountMinor,
		currency,
		count: rows.length,
		detail: `${formatMinorUnits(amountMinor, currency)} recorded across ${rows.length} ${payments}.`
	};
}

export async function recordRevenueEvent(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'outcomes.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(recordRevenueEventSchema, input);
	const row = await insertRevenueEventForTenant(required, {
		amountMinor: parsed.amountMinor,
		currency: parsed.currency,
		leadId: parsed.leadId ?? null,
		salesOutcomeId: parsed.salesOutcomeId ?? null,
		note: parsed.note ?? null,
		idempotencyKey: parsed.idempotencyKey ?? null,
		recordedBy: actor.userId,
		occurredAt: parsed.occurredAt ? new Date(parsed.occurredAt) : new Date()
	});
	if (row && 'missingLead' in row) throw new NotFoundError('Lead not found');
	if (row && 'missingOutcome' in row) throw new NotFoundError('Sales outcome not found');
	if (!row) throw new NotFoundError('Revenue event was not recorded');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'outcomes.revenue.record',
		entityType: 'revenue_event',
		entityId: row.id,
		requestId
	});
	return {
		id: row.id,
		amountMinor: row.amountMinor,
		currency: row.currency,
		source: row.source,
		evidenceClass: row.evidenceClass,
		occurredAt: row.occurredAt
	};
}

export async function listRevenueEvents(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'outcomes.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertLeadClient(required, clientId);
	const [events, summary] = await Promise.all([
		listRevenueEventsForTenant(required),
		summarizeRecordedRevenue(required)
	]);
	return { summary, events };
}
