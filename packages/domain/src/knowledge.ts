import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	ValidationError,
	createClaimSchema,
	createOfferSchema,
	createServiceSchema,
	assertActorOwnsContext,
	parseContract,
	reviseOfferSchema,
	upsertBrandSchema,
	type TenantContext
} from '@vector/contracts';
import {
	appendOfferVersionForTenant,
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
	listOfferVersionsForTenant,
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
	const [brand, services, offers, versions, claims, assets] = await Promise.all([
		getBrandForTenant(required),
		listServicesForTenant(required),
		listOffersForTenant(required),
		listOfferVersionsForTenant(required),
		listClaimsForTenant(required),
		listBrandAssetsForTenant(required)
	]);
	const versionsByOffer = new Map<string, typeof versions>();
	for (const version of versions) {
		const rows = versionsByOffer.get(version.offerId) ?? [];
		rows.push(version);
		versionsByOffer.set(version.offerId, rows);
	}
	return {
		brand,
		services,
		offers: offers.map((offer) => ({
			...offer,
			versions: versionsByOffer.get(offer.id) ?? []
		})),
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
	const row = await insertOfferForTenant(required, parsed, actor.userId);
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
	if (row && 'blocked' in row) {
		throw new ValidationError('This offer has a recorded revision. It stays in history.');
	}
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

function offerInstant(day: string | null | undefined, end: boolean) {
	if (!day) return null;
	return new Date(`${day}T${end ? '23:59:59.999' : '00:00:00.000'}Z`);
}

export async function reviseOffer(
	actor: Actor,
	ctx: TenantContext,
	offerId: string,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'knowledge.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(reviseOfferSchema, input);
	if (parsed.validFrom && parsed.validUntil && parsed.validUntil < parsed.validFrom) {
		throw new ValidationError('The end date is before the start date.');
	}
	if (
		parsed.priceMinor != null &&
		parsed.discountMinor != null &&
		parsed.discountMinor > parsed.priceMinor
	) {
		throw new ValidationError('The discount is larger than the price.');
	}
	const version = await appendOfferVersionForTenant(required, offerId, {
		name: parsed.name,
		summary: parsed.summary,
		offerType: parsed.offerType,
		serviceId: parsed.serviceId ?? null,
		priceMinor: parsed.priceMinor ?? null,
		discountMinor: parsed.discountMinor ?? null,
		currency: parsed.currency.toUpperCase(),
		validFrom: offerInstant(parsed.validFrom, false),
		validUntil: offerInstant(parsed.validUntil, true),
		eligibility: parsed.eligibility ?? null,
		terms: parsed.terms ?? null,
		primaryCta: parsed.primaryCta ?? null,
		createdBy: actor.userId
	});
	if (version && 'missingService' in version) throw new NotFoundError('Service not found');
	if (!version) throw new NotFoundError('Offer not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'knowledge.offer.revise',
		entityType: 'offer_version',
		entityId: version.id,
		requestId
	});
	return version;
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
