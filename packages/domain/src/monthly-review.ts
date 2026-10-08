import { requireCapability } from '@vector/auth';
import {
	ForbiddenError,
	attributionCoverage,
	dataHealthEvidenceClass,
	monthlyGrowthNarrative,
	assertActorOwnsContext,
	type TenantContext
} from '@vector/contracts';
import {
	assertLeadClient,
	attributionEvidenceForTenant,
	getClientSettingsForTenant,
	insertMonthlyGrowthReportForTenant,
	listDataHealthChecksForTenant,
	listMonthlyGrowthReportsForTenant,
	monthlyGrowthFactsForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { summarizeRecordedRevenue } from './revenue';
import { previousCompletedMonth } from './today';

function publicReport(row: {
	id: string;
	periodKey: string;
	narrative: string;
	qualifiedLeads: number;
	salesCount: number | null;
	salesEvidence: string;
	revenueEvidence: string;
	revenueDetail: string;
	handledCount: number;
	attributionEvidence: string;
	dataHealthEvidence: string;
	createdAt: Date;
}) {
	return {
		id: row.id,
		periodKey: row.periodKey,
		narrative: row.narrative,
		qualifiedLeads: row.qualifiedLeads,
		salesCount: row.salesCount,
		salesEvidence: row.salesEvidence,
		revenueEvidence: row.revenueEvidence,
		revenueDetail: row.revenueDetail,
		handledCount: row.handledCount,
		attributionEvidence: row.attributionEvidence,
		dataHealthEvidence: row.dataHealthEvidence,
		createdAt: row.createdAt
	};
}

export async function listMonthlyGrowthReports(
	actor: Actor,
	ctx: TenantContext,
	clientId?: string
) {
	requireCapability(actor.permissions, 'outcomes.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertLeadClient(required, clientId);
	const rows = await listMonthlyGrowthReportsForTenant(required);
	return rows.map(publicReport);
}

export async function recordMonthlyGrowthReport(
	actor: Actor,
	ctx: TenantContext,
	requestId: string
) {
	requireCapability(actor.permissions, 'outcomes.manage');
	if (!actor.permissions.includes('leads.read')) {
		throw new ForbiddenError('Lead access is required to record a monthly review');
	}
	const required = assertActorOwnsContext(actor, ctx);
	const settings = await getClientSettingsForTenant(required);
	const month = previousCompletedMonth(settings?.timezone ?? 'UTC');
	const [facts, revenue, checks, attributionCounts] = await Promise.all([
		monthlyGrowthFactsForTenant(required, month),
		summarizeRecordedRevenue(required, month, 'Revenue is not recorded yet.'),
		listDataHealthChecksForTenant(required),
		attributionEvidenceForTenant(required)
	]);
	const salesUnknown = facts.wonLeadsWithoutSale > 0;
	const attribution = attributionCoverage(attributionCounts);
	const dataHealth = dataHealthEvidenceClass(checks);
	const narrative = monthlyGrowthNarrative({
		label: month.label,
		qualifiedLeads: facts.qualifiedLeads,
		salesCount: salesUnknown ? null : facts.salesCount,
		revenueDetail: revenue.detail,
		handledCount: facts.handledCount,
		attributionEvidence: attribution.evidenceClass,
		dataHealthEvidence: dataHealth
	});
	const saved = await insertMonthlyGrowthReportForTenant(required, {
		periodKey: month.periodKey,
		timeZone: month.timeZone,
		periodStart: month.start,
		periodEnd: month.end,
		qualifiedLeads: facts.qualifiedLeads,
		salesCount: salesUnknown ? null : facts.salesCount,
		salesEvidence: salesUnknown ? 'unknown' : 'observed',
		revenueAmountMinor: revenue.amountMinor,
		revenueCurrency: revenue.currency,
		revenueEvidence: revenue.evidenceClass,
		revenueDetail: revenue.detail,
		handledCount: facts.handledCount,
		attributionEvidence: attribution.evidenceClass,
		dataHealthEvidence: dataHealth,
		narrative,
		recordedBy: actor.userId
	});
	if (!saved.replayed) {
		await recordAudit({
			organizationId: required.organizationId,
			clientId: required.clientId,
			actorType: 'human',
			actorId: actor.userId,
			action: 'outcomes.review.record',
			entityType: 'monthly_growth_report',
			entityId: saved.row.id,
			requestId,
			reason: month.periodKey
		});
	}
	return { ...publicReport(saved.row), replayed: saved.replayed };
}
