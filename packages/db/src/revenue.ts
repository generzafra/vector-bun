import { and, desc, eq, gte, lt } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { leads, revenueEvents, salesOutcomes } from './schema';

export async function listRevenueEventsForTenant(
	ctx: TenantContext,
	window?: { start: Date; end: Date }
) {
	const required = requireTenantContext(ctx);
	const filters = [eq(revenueEvents.clientId, required.clientId)];
	if (window) {
		filters.push(gte(revenueEvents.occurredAt, window.start));
		filters.push(lt(revenueEvents.occurredAt, window.end));
	}
	return db
		.select({
			id: revenueEvents.id,
			amountMinor: revenueEvents.amountMinor,
			currency: revenueEvents.currency,
			source: revenueEvents.source,
			evidenceClass: revenueEvents.evidenceClass,
			note: revenueEvents.note,
			occurredAt: revenueEvents.occurredAt
		})
		.from(revenueEvents)
		.where(and(...filters))
		.orderBy(desc(revenueEvents.occurredAt));
}

export async function insertRevenueEventForTenant(
	ctx: TenantContext,
	input: {
		amountMinor: number;
		currency: string;
		leadId?: string | null;
		salesOutcomeId?: string | null;
		note?: string | null;
		idempotencyKey?: string | null;
		recordedBy?: string | null;
		occurredAt?: Date;
	}
) {
	const required = requireTenantContext(ctx);
	if (input.leadId) {
		const [lead] = await db
			.select({ id: leads.id })
			.from(leads)
			.where(and(eq(leads.id, input.leadId), eq(leads.clientId, required.clientId)))
			.limit(1);
		if (!lead) return { missingLead: true as const };
	}
	if (input.salesOutcomeId) {
		const [outcome] = await db
			.select({ id: salesOutcomes.id, amountMinor: salesOutcomes.amountMinor })
			.from(salesOutcomes)
			.where(
				and(
					eq(salesOutcomes.id, input.salesOutcomeId),
					eq(salesOutcomes.clientId, required.clientId)
				)
			)
			.limit(1);
		if (!outcome) return { missingOutcome: true as const };
	}
	if (input.idempotencyKey) {
		const [existing] = await db
			.select()
			.from(revenueEvents)
			.where(
				and(
					eq(revenueEvents.clientId, required.clientId),
					eq(revenueEvents.idempotencyKey, input.idempotencyKey)
				)
			)
			.limit(1);
		if (existing) return existing;
	}
	const [row] = await db
		.insert(revenueEvents)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			leadId: input.leadId ?? null,
			salesOutcomeId: input.salesOutcomeId ?? null,
			amountMinor: input.amountMinor,
			currency: input.currency,
			source: 'manual',
			evidenceClass: 'observed',
			note: input.note ?? null,
			idempotencyKey: input.idempotencyKey ?? null,
			recordedBy: input.recordedBy ?? null,
			occurredAt: input.occurredAt
		})
		.returning();
	return row;
}
