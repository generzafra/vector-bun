import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	createClaimSchema,
	createOfferSchema,
	createServiceSchema,
	assertActorOwnsContext,
	parseContract,
	upsertBrandSchema,
	type TenantContext
} from '@vector/contracts';
import {
	assertKnowledgeClient,
	deleteClaimForTenant,
	deleteOfferForTenant,
	deleteServiceForTenant,
	getBrandForTenant,
	getServiceForTenant,
	listBrandAssetsForTenant,
	insertClaimForTenant,
	insertOfferForTenant,
	insertServiceForTenant,
	listClaimsForTenant,
	listOffersForTenant,
	listServicesForTenant,
	upsertBrandForTenant
} from '@vector/db';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

export async function getKnowledge(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'knowledge.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertKnowledgeClient(required, clientId);
	const [brand, services, offers, claims, assets] = await Promise.all([
		getBrandForTenant(required),
		listServicesForTenant(required),
		listOffersForTenant(required),
		listClaimsForTenant(required),
		listBrandAssetsForTenant(required)
	]);
	return {
		brand,
		services,
		offers,
		claims,
		assets: assets.map(({ storageKey: _storageKey, ...asset }) => asset)
	};
}

export async function saveBrand(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(upsertBrandSchema, input);
	const row = await upsertBrandForTenant(required, parsed);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'knowledge.brand.upsert',
		entityType: 'brand',
		entityId: row.id,
		requestId
	});
	return row;
}

export async function addService(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(createServiceSchema, input);
	const row = await insertServiceForTenant(required, parsed);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'knowledge.service.create',
		entityType: 'service',
		entityId: row.id,
		requestId
	});
	return row;
}

export async function removeService(
	actor: Actor,
	ctx: TenantContext,
	serviceId: string,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const existing = await getServiceForTenant(required, serviceId);
	if (!existing) throw new NotFoundError('Service not found');
	await deleteServiceForTenant(required, serviceId);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'knowledge.service.delete',
		entityType: 'service',
		entityId: serviceId,
		requestId
	});
}

export async function addOffer(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(createOfferSchema, input);
	const row = await insertOfferForTenant(required, parsed);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'knowledge.offer.create',
		entityType: 'offer',
		entityId: row.id,
		requestId
	});
	return row;
}

export async function removeOffer(
	actor: Actor,
	ctx: TenantContext,
	offerId: string,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const row = await deleteOfferForTenant(required, offerId);
	if (!row) throw new NotFoundError('Offer not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'knowledge.offer.delete',
		entityType: 'offer',
		entityId: offerId,
		requestId
	});
}

export async function addClaim(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(createClaimSchema, input);
	const row = await insertClaimForTenant(required, parsed);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'knowledge.claim.create',
		entityType: 'claim',
		entityId: row.id,
		requestId
	});
	return row;
}

export async function removeClaim(
	actor: Actor,
	ctx: TenantContext,
	claimId: string,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const row = await deleteClaimForTenant(required, claimId);
	if (!row) throw new NotFoundError('Claim not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'knowledge.claim.delete',
		entityType: 'claim',
		entityId: claimId,
		requestId
	});
}
