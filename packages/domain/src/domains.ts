import { randomBytes } from 'node:crypto';
import { requireCapability } from '@vector/auth';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	clientDomainIdSchema,
	parseContract,
	submitClientDomainSchema,
	type TenantContext
} from '@vector/contracts';
import {
	assertDomainClient,
	disableClientDomainForTenant,
	findRoutableDomainByHostname,
	getClientDomainForTenant,
	getManagedDomainForTenant,
	getPublishedHomeForTenant,
	insertClientDomainForTenant,
	listClientDomainsForTenant,
	markClientDomainActiveForTenant,
	markClientDomainVerifiedForTenant,
	replacePendingDomainForTenant
} from '@vector/db';
import { isValidPublicHostname, normalizeHostname } from '@vector/funnel-engine';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';
import { resolveDeliveryPage } from './delivery';

function newVerificationToken() {
	return randomBytes(16).toString('hex');
}

function parseHostname(raw: string) {
	const hostname = normalizeHostname(raw);
	if (!hostname || !isValidPublicHostname(hostname)) {
		throw new ValidationError('Enter a valid hostname');
	}
	return hostname;
}

export async function listClientDomains(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'pages.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertDomainClient(required, clientId);
	return listClientDomainsForTenant(required);
}

export async function submitClientDomain(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(submitClientDomainSchema, input);
	const hostname = parseHostname(parsed.hostname);
	const existing = await getManagedDomainForTenant(required, parsed.kind);
	if (existing?.status === 'active') {
		throw new ValidationError('Disable the active domain before replacing it');
	}
	const taken = await findRoutableDomainByHostname(hostname);
	if (taken && taken.clientId !== required.clientId) {
		throw new ValidationError('Hostname is not available');
	}
	if (taken && taken.kind !== parsed.kind) {
		throw new ValidationError('Hostname is not available');
	}
	const token = newVerificationToken();
	const row = existing
		? await replacePendingDomainForTenant(required, existing.id, {
				hostname,
				verificationToken: token
			})
		: await insertClientDomainForTenant(required, {
				hostname,
				kind: parsed.kind,
				verificationToken: token,
				isCanonical: parsed.kind === 'production'
			});
	if (!row) throw new ValidationError('Hostname is not available');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'domains.submit',
		entityType: 'client_domain',
		entityId: row.id,
		requestId,
		reason: parsed.kind
	});
	return row;
}

export async function verifyClientDomain(
	actor: Actor,
	ctx: TenantContext,
	id: string,
	requestId: string
) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(clientDomainIdSchema, { id });
	const row = await getClientDomainForTenant(required, parsed.id);
	if (!row || row.kind === 'preview') throw new NotFoundError('Domain not found');
	if (!row.verificationToken) throw new ValidationError('Domain has no verification token');
	const challenge = await resolveDeliveryPage(
		row.hostname,
		'/.well-known/vector-domain',
		`${requestId}-challenge`
	);
	if (challenge.kind !== 'domain_challenge' || challenge.token !== row.verificationToken) {
		throw new ValidationError('Domain ownership is not verified');
	}
	const verified = await markClientDomainVerifiedForTenant(required, row.id);
	if (!verified) throw new NotFoundError('Domain not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'domains.verify',
		entityType: 'client_domain',
		entityId: verified.id,
		requestId
	});
	return verified;
}

export async function activateClientDomain(
	actor: Actor,
	ctx: TenantContext,
	id: string,
	requestId: string
) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(clientDomainIdSchema, { id });
	const row = await getClientDomainForTenant(required, parsed.id);
	if (!row || row.kind === 'preview') throw new NotFoundError('Domain not found');
	if (row.status !== 'verified')
		throw new ValidationError('Verify the domain before activating it');
	if (row.kind === 'production') {
		const published = await getPublishedHomeForTenant(required);
		if (!published)
			throw new ValidationError('Publish a preview funnel before activating production');
	}
	if (row.kind === 'redirect') {
		const production = await getManagedDomainForTenant(required, 'production');
		if (production?.status !== 'active') {
			throw new ValidationError('Activate the production hostname before the redirect');
		}
	}
	const active = await markClientDomainActiveForTenant(required, row.id);
	if (!active) throw new NotFoundError('Domain not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'domains.activate',
		entityType: 'client_domain',
		entityId: active.id,
		requestId,
		reason: row.kind
	});
	return active;
}

export async function disableClientDomain(
	actor: Actor,
	ctx: TenantContext,
	id: string,
	requestId: string
) {
	requireCapability(actor.permissions, 'pages.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(clientDomainIdSchema, { id });
	const disabled = await disableClientDomainForTenant(required, parsed.id);
	if (!disabled) throw new NotFoundError('Domain not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'domains.disable',
		entityType: 'client_domain',
		entityId: disabled.id,
		requestId
	});
	return disabled;
}
