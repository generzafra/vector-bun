import { and, eq, gte, inArray, isNotNull, isNull, lt, sql } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import {
	emailMessages,
	leads,
	monthlyGrowthReports,
	salesOutcomes,
	socialPublications
} from './schema';

const QUALIFIED = ['qualified', 'won', 'lost'] as const;

export async function monthlyGrowthFactsForTenant(
	ctx: TenantContext,
	window: { start: Date; end: Date }
) {
	const required = requireTenantContext(ctx);
	const inMonth = and(
		eq(leads.clientId, required.clientId),
		eq(leads.isTest, false),
		gte(leads.createdAt, window.start),
		lt(leads.createdAt, window.end)
	);
	const [qualified] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(leads)
		.where(and(inMonth, inArray(leads.status, [...QUALIFIED])));
	const [sales] = await db
		.select({ total: sql<number>`count(distinct ${salesOutcomes.leadId})::int` })
		.from(salesOutcomes)
		.innerJoin(
			leads,
			and(eq(leads.id, salesOutcomes.leadId), eq(leads.clientId, required.clientId))
		)
		.where(
			and(
				eq(salesOutcomes.clientId, required.clientId),
				eq(leads.isTest, false),
				eq(salesOutcomes.outcomeType, 'won'),
				gte(salesOutcomes.occurredAt, window.start),
				lt(salesOutcomes.occurredAt, window.end)
			)
		);
	const [missingSale] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(leads)
		.leftJoin(
			salesOutcomes,
			and(
				eq(salesOutcomes.leadId, leads.id),
				eq(salesOutcomes.clientId, required.clientId),
				eq(salesOutcomes.outcomeType, 'won')
			)
		)
		.where(and(inMonth, eq(leads.status, 'won'), isNull(salesOutcomes.id)));
	const [nurture] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(emailMessages)
		.where(
			and(
				eq(emailMessages.clientId, required.clientId),
				eq(emailMessages.isTest, false),
				isNotNull(emailMessages.enrollmentId),
				inArray(emailMessages.status, ['sent', 'delivered']),
				gte(emailMessages.updatedAt, window.start),
				lt(emailMessages.updatedAt, window.end)
			)
		);
	const [posts] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(socialPublications)
		.where(
			and(
				eq(socialPublications.clientId, required.clientId),
				eq(socialPublications.status, 'published'),
				isNotNull(socialPublications.publishedAt),
				gte(socialPublications.publishedAt, window.start),
				lt(socialPublications.publishedAt, window.end)
			)
		);
	return {
		qualifiedLeads: Number(qualified?.total ?? 0),
		salesCount: Number(sales?.total ?? 0),
		wonLeadsWithoutSale: Number(missingSale?.total ?? 0),
		handledCount: Number(nurture?.total ?? 0) + Number(posts?.total ?? 0)
	};
}

export async function listMonthlyGrowthReportsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			id: monthlyGrowthReports.id,
			periodKey: monthlyGrowthReports.periodKey,
			narrative: monthlyGrowthReports.narrative,
			qualifiedLeads: monthlyGrowthReports.qualifiedLeads,
			salesCount: monthlyGrowthReports.salesCount,
			salesEvidence: monthlyGrowthReports.salesEvidence,
			revenueEvidence: monthlyGrowthReports.revenueEvidence,
			revenueDetail: monthlyGrowthReports.revenueDetail,
			handledCount: monthlyGrowthReports.handledCount,
			attributionEvidence: monthlyGrowthReports.attributionEvidence,
			dataHealthEvidence: monthlyGrowthReports.dataHealthEvidence,
			createdAt: monthlyGrowthReports.createdAt
		})
		.from(monthlyGrowthReports)
		.where(eq(monthlyGrowthReports.clientId, required.clientId))
		.orderBy(monthlyGrowthReports.periodKey);
}

export async function insertMonthlyGrowthReportForTenant(
	ctx: TenantContext,
	input: {
		periodKey: string;
		timeZone: string;
		periodStart: Date;
		periodEnd: Date;
		qualifiedLeads: number;
		salesCount: number | null;
		salesEvidence: 'observed' | 'unknown';
		revenueAmountMinor: number | null;
		revenueCurrency: string | null;
		revenueEvidence: 'observed' | 'unknown';
		revenueDetail: string;
		handledCount: number;
		attributionEvidence: string;
		dataHealthEvidence: string;
		narrative: string;
		recordedBy: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(monthlyGrowthReports)
		.where(
			and(
				eq(monthlyGrowthReports.clientId, required.clientId),
				eq(monthlyGrowthReports.periodKey, input.periodKey)
			)
		)
		.limit(1);
	if (existing) return { row: existing, replayed: true as const };
	const [row] = await db
		.insert(monthlyGrowthReports)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return { row: row!, replayed: false as const };
}
