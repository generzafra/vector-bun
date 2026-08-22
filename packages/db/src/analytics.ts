import { and, count, eq } from 'drizzle-orm';
import { requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import { analyticsEvents, attributionResults, clientLaunchEvents, leads } from './schema';

export async function countAnalyticsEventsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			name: analyticsEvents.name,
			isTest: analyticsEvents.isTest,
			total: count()
		})
		.from(analyticsEvents)
		.where(eq(analyticsEvents.clientId, required.clientId))
		.groupBy(analyticsEvents.name, analyticsEvents.isTest);
}

export async function countLeadsByAttributionForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			channel: attributionResults.lastNonDirectChannel,
			source: attributionResults.lastNonDirectSource,
			campaign: attributionResults.lastNonDirectCampaign,
			isTest: leads.isTest,
			total: count()
		})
		.from(leads)
		.leftJoin(
			attributionResults,
			and(
				eq(attributionResults.leadId, leads.id),
				eq(attributionResults.clientId, required.clientId)
			)
		)
		.where(eq(leads.clientId, required.clientId))
		.groupBy(
			attributionResults.lastNonDirectChannel,
			attributionResults.lastNonDirectSource,
			attributionResults.lastNonDirectCampaign,
			leads.isTest
		);
}

export async function countLaunchTransitionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			toStatus: clientLaunchEvents.toStatus,
			total: count()
		})
		.from(clientLaunchEvents)
		.where(eq(clientLaunchEvents.clientId, required.clientId))
		.groupBy(clientLaunchEvents.toStatus);
}
