import { and, desc, eq, gte, inArray, lt, sql } from 'drizzle-orm';
import {
	assertSameClient,
	requireTenantContext,
	utcMonthWindow,
	type TenantContext,
	type ValueActivityType
} from '@vector/contracts';
import { db } from './client';
import {
	clientValueProfiles,
	emailMessages,
	leads,
	pageVersions,
	salesOutcomes,
	socialPosts,
	valueActivityRecords
} from './schema';

export function assertValueClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

async function countRows(query: Promise<Array<{ total: number }>>) {
	const [row] = await query;
	return Number(row?.total ?? 0);
}

export async function getClientValueProfileForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(clientValueProfiles)
		.where(eq(clientValueProfiles.clientId, required.clientId))
		.limit(1);
	return row ?? null;
}

export async function upsertClientValueProfileForTenant(
	ctx: TenantContext,
	input: {
		packageName: string;
		feeMinor: number;
		currency: string;
		recordedBy: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const now = new Date();
	const existing = await getClientValueProfileForTenant(required);
	if (existing) {
		const [row] = await db
			.update(clientValueProfiles)
			.set({
				packageName: input.packageName,
				feeMinor: input.feeMinor,
				currency: input.currency,
				recordedBy: input.recordedBy,
				updatedAt: now
			})
			.where(
				and(
					eq(clientValueProfiles.id, existing.id),
					eq(clientValueProfiles.clientId, required.clientId)
				)
			)
			.returning();
		return row;
	}
	const [row] = await db
		.insert(clientValueProfiles)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			packageName: input.packageName,
			feeMinor: input.feeMinor,
			currency: input.currency,
			recordedBy: input.recordedBy
		})
		.returning();
	return row;
}

export async function listValueActivityForTenant(
	ctx: TenantContext,
	range: { start: Date; end: Date }
) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(valueActivityRecords)
		.where(
			and(
				eq(valueActivityRecords.clientId, required.clientId),
				eq(valueActivityRecords.clientVisible, true),
				gte(valueActivityRecords.completedAt, range.start),
				lt(valueActivityRecords.completedAt, range.end)
			)
		)
		.orderBy(desc(valueActivityRecords.completedAt))
		.limit(100);
}

export async function insertValueActivityForTenant(
	ctx: TenantContext,
	input: {
		activityType: ValueActivityType;
		description: string;
		quantity: number;
		automated: boolean;
		recordedBy: string | null;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(valueActivityRecords)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			activityType: input.activityType,
			description: input.description,
			quantity: input.quantity,
			automated: input.automated,
			clientVisible: true,
			status: 'completed',
			completedAt: new Date(),
			recordedBy: input.recordedBy
		})
		.returning();
	return row;
}

export async function countObservedWorkForTenant(
	ctx: TenantContext,
	range: { start: Date; end: Date } = utcMonthWindow()
) {
	const required = requireTenantContext(ctx);
	const [
		leadsCount,
		qualifiedCount,
		salesCount,
		emailCount,
		socialCount,
		pageCount,
		recordedCount
	] = await Promise.all([
		countRows(
			db
				.select({ total: sql<number>`count(*)::int` })
				.from(leads)
				.where(
					and(
						eq(leads.clientId, required.clientId),
						eq(leads.isTest, false),
						gte(leads.createdAt, range.start),
						lt(leads.createdAt, range.end)
					)
				)
		),
		countRows(
			db
				.select({ total: sql<number>`count(*)::int` })
				.from(leads)
				.where(
					and(
						eq(leads.clientId, required.clientId),
						eq(leads.isTest, false),
						inArray(leads.status, ['qualified', 'won', 'lost']),
						gte(leads.createdAt, range.start),
						lt(leads.createdAt, range.end)
					)
				)
		),
		countRows(
			db
				.select({ total: sql<number>`count(*)::int` })
				.from(salesOutcomes)
				.where(
					and(
						eq(salesOutcomes.clientId, required.clientId),
						gte(salesOutcomes.occurredAt, range.start),
						lt(salesOutcomes.occurredAt, range.end)
					)
				)
		),
		countRows(
			db
				.select({ total: sql<number>`count(*)::int` })
				.from(emailMessages)
				.where(
					and(
						eq(emailMessages.clientId, required.clientId),
						eq(emailMessages.isTest, false),
						inArray(emailMessages.status, ['sent', 'delivered']),
						gte(emailMessages.createdAt, range.start),
						lt(emailMessages.createdAt, range.end)
					)
				)
		),
		countRows(
			db
				.select({ total: sql<number>`count(*)::int` })
				.from(socialPosts)
				.where(
					and(
						eq(socialPosts.clientId, required.clientId),
						eq(socialPosts.status, 'published'),
						gte(socialPosts.updatedAt, range.start),
						lt(socialPosts.updatedAt, range.end)
					)
				)
		),
		countRows(
			db
				.select({ total: sql<number>`count(*)::int` })
				.from(pageVersions)
				.where(
					and(
						eq(pageVersions.clientId, required.clientId),
						eq(pageVersions.status, 'published'),
						gte(pageVersions.publishedAt, range.start),
						lt(pageVersions.publishedAt, range.end)
					)
				)
		),
		countRows(
			db
				.select({ total: sql<number>`count(*)::int` })
				.from(valueActivityRecords)
				.where(
					and(
						eq(valueActivityRecords.clientId, required.clientId),
						eq(valueActivityRecords.clientVisible, true),
						gte(valueActivityRecords.completedAt, range.start),
						lt(valueActivityRecords.completedAt, range.end)
					)
				)
		)
	]);
	return {
		leads: leadsCount,
		qualifiedLeads: qualifiedCount,
		salesOutcomes: salesCount,
		emailsSent: emailCount,
		socialPublished: socialCount,
		pagesPublished: pageCount,
		recordedActivities: recordedCount
	};
}
