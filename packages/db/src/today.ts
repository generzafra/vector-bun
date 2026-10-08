import { and, desc, eq, gte, inArray, isNotNull, lt, sql } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import {
	approvalRequests,
	emailMessages,
	leadScores,
	leads,
	salesOutcomes,
	socialPublications
} from './schema';

export async function getTodayFactsForTenant(
	ctx: TenantContext,
	window: { start: Date; end: Date; previousStart: Date },
	highIntentScore: number
) {
	const required = requireTenantContext(ctx);
	const leadWindow = and(
		eq(leads.clientId, required.clientId),
		eq(leads.isTest, false),
		gte(leads.createdAt, window.start),
		lt(leads.createdAt, window.end)
	);
	const [created] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(leads)
		.where(leadWindow);
	const [highIntent] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(leads)
		.innerJoin(
			leadScores,
			and(eq(leadScores.leadId, leads.id), eq(leadScores.clientId, required.clientId))
		)
		.where(and(leadWindow, gte(leadScores.score, highIntentScore)));
	const [yesterday] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(leads)
		.where(
			and(
				eq(leads.clientId, required.clientId),
				eq(leads.isTest, false),
				gte(leads.createdAt, window.previousStart),
				lt(leads.createdAt, window.start)
			)
		);
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
	const pending = await db
		.select({ id: approvalRequests.id, summary: approvalRequests.summary })
		.from(approvalRequests)
		.where(
			and(eq(approvalRequests.clientId, required.clientId), eq(approvalRequests.status, 'pending'))
		)
		.orderBy(desc(approvalRequests.createdAt))
		.limit(5);
	const [pendingCount] = await db
		.select({ total: sql<number>`count(*)::int` })
		.from(approvalRequests)
		.where(
			and(eq(approvalRequests.clientId, required.clientId), eq(approvalRequests.status, 'pending'))
		);
	return {
		newLeads: Number(created?.total ?? 0),
		highIntentLeads: Number(highIntent?.total ?? 0),
		newLeadsYesterday: Number(yesterday?.total ?? 0),
		sales: Number(sales?.total ?? 0),
		nurtureSent: Number(nurture?.total ?? 0),
		postsPublished: Number(posts?.total ?? 0),
		pendingApprovals: pending,
		pendingApprovalCount: Number(pendingCount?.total ?? 0)
	};
}
