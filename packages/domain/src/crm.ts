import { requireCapability } from '@vector/auth';
import {
	crmProvider,
	resolveCrmConflict,
	withCrmRetry,
	type CrmDeal,
	type CrmRevenue
} from '@vector/crm';
import {
	NotFoundError,
	ProviderError,
	ValidationError,
	assertActorOwnsContext,
	type Capability,
	type TenantContext
} from '@vector/contracts';
import {
	assertLeadClient,
	getLeadWithContactForTenant,
	listSalesOutcomesForLeadsForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

function assertMinor(amountMinor: number) {
	if (!Number.isInteger(amountMinor) || amountMinor < 0) {
		throw new ValidationError('CRM money must be a whole number of minor units');
	}
}

function assertDeal(deal: CrmDeal) {
	if (deal.amountMinor != null) assertMinor(deal.amountMinor);
}

function assertRevenue(row: CrmRevenue) {
	assertMinor(row.amountMinor);
}

async function leadForActor(
	actor: Actor,
	ctx: TenantContext,
	leadId: string,
	capability: Capability
) {
	requireCapability(actor.permissions, capability);
	const required = assertActorOwnsContext(actor, ctx);
	const row = await getLeadWithContactForTenant(required, leadId);
	if (!row) throw new NotFoundError('Lead not found');
	return { required, row };
}

export async function getCrmStatus(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'leads.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertLeadClient(required, clientId);
	const health = await crmProvider().health();
	return {
		adapter: health.adapter,
		external: health.external,
		ok: health.ok,
		detail: health.external
			? health.detail
			: 'No external CRM is connected. Sales stay recorded here.'
	};
}

export async function pushLeadToCrm(
	actor: Actor,
	ctx: TenantContext,
	leadId: string,
	requestId: string
) {
	const { required, row } = await leadForActor(actor, ctx, leadId, 'leads.manage');
	const result = await withCrmRetry(() =>
		crmProvider().pushLead({
			clientId: required.clientId,
			leadId: row.lead.id,
			contactId: row.contact.id,
			idempotencyKey: `lead:${row.lead.id}`,
			displayName: row.contact.displayName,
			email: row.contact.email,
			stage: row.lead.status,
			timeoutMs: 5_000
		})
	);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'crm.lead.push',
		entityType: 'lead',
		entityId: row.lead.id,
		requestId
	});
	return {
		adapter: result.adapter,
		status: result.status,
		externalId: result.externalId,
		detail: result.detail
	};
}

export async function pullCrmLead(
	actor: Actor,
	ctx: TenantContext,
	leadId: string,
	requestId: string
) {
	const { required, row } = await leadForActor(actor, ctx, leadId, 'leads.read');
	const provider = crmProvider();
	const request = { clientId: required.clientId, leadId: row.lead.id, timeoutMs: 5_000 };
	const [stages, deals, revenue] = await withCrmRetry(async () => {
		const pulled = await Promise.all([
			provider.pullStages(request),
			provider.pullDeals(request),
			provider.pullRevenue(request)
		]);
		return pulled;
	});
	for (const deal of deals) assertDeal(deal);
	for (const item of revenue) assertRevenue(item);
	const before = await listSalesOutcomesForLeadsForTenant(required, [row.lead.id]);
	const conflict = resolveCrmConflict(before.length > 0);
	const after = await listSalesOutcomesForLeadsForTenant(required, [row.lead.id]);
	if (JSON.stringify(before) !== JSON.stringify(after)) {
		throw new ProviderError('CRM pull changed a recorded sale', 'CRM_CONFLICT');
	}
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'crm.lead.pull',
		entityType: 'lead',
		entityId: row.lead.id,
		requestId
	});
	return {
		leadId: row.lead.id,
		stages: stages.map(({ stage, externalId }) => ({ stage, externalId })),
		deals: deals.map(({ externalId, name, amountMinor, currency }) => ({
			externalId,
			name,
			amountMinor,
			currency
		})),
		revenue: revenue.map(({ externalId, amountMinor, currency }) => ({
			externalId,
			amountMinor,
			currency
		})),
		conflict,
		vectorOutcomeCount: after.length
	};
}
