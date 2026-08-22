import { consumeRateLimit, requireCapability } from '@vector/auth';
import {
	classifyTouch,
	EVENT_TAXONOMY_VERSION,
	leadScoreV1,
	resolveAttribution,
	type AnalyticsProvider,
	type Touch
} from '@vector/analytics';
import {
	CONSENT_COPY_VERSION,
	consentEvidence,
	requireLeadFollowUpConsent
} from '@vector/compliance';
import {
	NotFoundError,
	ValidationError,
	assertActorOwnsContext,
	captureLeadSchema,
	parseContract,
	recordDeliveryEventSchema,
	updateLeadStatusSchema,
	type TenantContext
} from '@vector/contracts';
import {
	assertLeadClient,
	findFormStartedEvent,
	getLeadForTenant,
	insertAnalyticsEventForTenant,
	insertTouchpointForTenant,
	listAnalyticsEventsForTenant,
	listConsentForContact,
	listLeadsForTenant,
	listTouchpointsForVisitor,
	persistCapturedLead,
	persistDeliveryVisit,
	updateLeadStatusForTenant
} from '@vector/db';
import { logError, logInfo } from '@vector/observability';
import { getAnalyticsProvider } from './analytics';
import { recordAudit } from './audit';
import { tryEnrollCapturedLead } from './email';
import type { Actor } from './auth-service';

export function deliveryTenantContext(
	input: { organizationId: string; clientId: string; requestId?: string },
	requestId?: string
): TenantContext {
	const id = requestId ?? input.requestId;
	if (!id) throw new ValidationError('Request id is required');
	return {
		organizationId: input.organizationId,
		clientId: input.clientId,
		roleIds: [],
		requestId: id
	};
}

function normalizeEmail(email: string) {
	return email.trim().toLowerCase();
}

function normalizePhone(phone: string | null | undefined) {
	const digits = phone?.replace(/\D+/g, '') ?? '';
	return digits || null;
}

async function fanout(
	provider: AnalyticsProvider,
	input: Parameters<AnalyticsProvider['track']>[0]
) {
	try {
		await provider.track(input);
	} catch (error) {
		logError('analytics.provider.track', error, { clientId: input.clientId, event: input.name });
	}
}

export async function recordDeliveryEvent(
	ctx: TenantContext,
	input: unknown,
	requestId: string,
	ip = '127.0.0.1'
) {
	const required = deliveryTenantContext(ctx, requestId);
	const parsed = parseContract(recordDeliveryEventSchema, input);
	consumeRateLimit(`event:${required.clientId}:${ip}`, 60, 60_000);
	const isTest = parsed.domainKind === 'preview';
	const { visitor, session } = await persistDeliveryVisit(required, {
		anonymousId: parsed.visitorId,
		sessionId: parsed.sessionId,
		landingUrl: parsed.landingUrl,
		referrer: parsed.referrer,
		utmSource: parsed.utmSource,
		utmMedium: parsed.utmMedium,
		utmCampaign: parsed.utmCampaign,
		isTest
	});
	if (parsed.name === 'form_started') {
		const existing = await findFormStartedEvent(required, session.id, parsed.pageId);
		if (existing) return { event: existing, visitor, session, duplicate: true };
	}
	const touch = classifyTouch(parsed);
	if (parsed.name === 'page_viewed') {
		await insertTouchpointForTenant(required, {
			visitorId: visitor.id,
			sessionId: session.id,
			channel: touch.channel,
			source: touch.source,
			medium: touch.medium,
			campaign: touch.campaign,
			term: touch.term,
			content: touch.content,
			referrer: touch.referrer,
			landingUrl: touch.landingUrl,
			isDirect: touch.isDirect
		});
	}
	const event = await insertAnalyticsEventForTenant(required, {
		eventId: crypto.randomUUID(),
		name: parsed.name,
		taxonomyVersion: EVENT_TAXONOMY_VERSION,
		visitorId: visitor.id,
		sessionId: session.id,
		siteId: parsed.siteId,
		funnelId: parsed.funnelId,
		pageId: parsed.pageId,
		pageVersionId: parsed.pageVersionId,
		properties: {
			hostname: parsed.hostname,
			domainKind: parsed.domainKind,
			landingUrl: parsed.landingUrl ?? undefined,
			referrer: parsed.referrer ?? undefined
		},
		isTest
	});
	await fanout(getAnalyticsProvider(), {
		eventId: event.eventId,
		name: parsed.name,
		clientId: required.clientId,
		visitorId: visitor.anonymousId,
		occurredAt: event.occurredAt,
		isTest,
		properties: {
			hostname: parsed.hostname,
			domain_kind: parsed.domainKind,
			page_id: parsed.pageId
		}
	});
	return { event, visitor, session, duplicate: false };
}

export async function captureLead(
	ctx: TenantContext,
	input: unknown,
	requestId: string,
	ip = '127.0.0.1'
) {
	const required = deliveryTenantContext(ctx, requestId);
	const parsed = parseContract(captureLeadSchema, input);
	requireLeadFollowUpConsent(parsed.consentLeadFollowUp);
	const email = normalizeEmail(parsed.email);
	consumeRateLimit(`lead:${required.clientId}:${ip}`, 8, 15 * 60_000);
	consumeRateLimit(`lead-email:${required.clientId}:${email}`, 5, 60 * 60_000);
	const phone = normalizePhone(parsed.phone);
	const isTest = parsed.domainKind === 'preview';
	const currentTouch = classifyTouch(parsed);
	let visitorId: string | undefined;
	let sessionId: string | undefined;
	if (parsed.visitorId) {
		const visit = await persistDeliveryVisit(required, {
			anonymousId: parsed.visitorId,
			sessionId: parsed.sessionId,
			landingUrl: parsed.landingUrl,
			referrer: parsed.referrer,
			utmSource: parsed.utmSource,
			utmMedium: parsed.utmMedium,
			utmCampaign: parsed.utmCampaign,
			isTest
		});
		visitorId = visit.visitor.id;
		sessionId = visit.session.id;
		await insertTouchpointForTenant(required, {
			visitorId: visit.visitor.id,
			sessionId: visit.session.id,
			channel: currentTouch.channel,
			source: currentTouch.source,
			medium: currentTouch.medium,
			campaign: currentTouch.campaign,
			term: currentTouch.term,
			content: currentTouch.content,
			referrer: currentTouch.referrer,
			landingUrl: currentTouch.landingUrl,
			isDirect: currentTouch.isDirect
		});
	}
	const history = visitorId ? await listTouchpointsForVisitor(required, visitorId) : [];
	const touches: Touch[] =
		history.length > 0
			? history.map((row) => ({
					channel: row.channel as Touch['channel'],
					source: row.source,
					medium: row.medium,
					campaign: row.campaign,
					term: row.term,
					content: row.content,
					referrer: row.referrer,
					landingUrl: row.landingUrl,
					isDirect: row.isDirect
				}))
			: [currentTouch];
	const { firstTouch, lastNonDirect } = resolveAttribution(touches);
	const score = leadScoreV1({
		hasPhone: Boolean(phone),
		hasCompany: Boolean(parsed.company?.trim()),
		hasMessage: Boolean(parsed.message && parsed.message.trim().length >= 20),
		isTest,
		lastNonDirectIsDirect: lastNonDirect.isDirect
	});
	const persisted = await persistCapturedLead(required, {
		displayName: parsed.name.trim(),
		email,
		phone,
		company: parsed.company?.trim() || null,
		message: parsed.message?.trim() || null,
		visitorAnonymousId: parsed.visitorId,
		sessionId,
		hostname: parsed.hostname,
		domainKind: parsed.domainKind,
		isTest,
		siteId: parsed.siteId,
		funnelId: parsed.funnelId,
		pageId: parsed.pageId,
		pageVersionId: parsed.pageVersionId,
		landingUrl: parsed.landingUrl,
		source: {
			channel: lastNonDirect.channel,
			utmSource: lastNonDirect.source,
			utmMedium: lastNonDirect.medium,
			utmCampaign: lastNonDirect.campaign,
			utmTerm: lastNonDirect.term,
			utmContent: lastNonDirect.content,
			referrer: lastNonDirect.referrer
		},
		attribution: {
			firstTouchChannel: firstTouch.channel,
			firstTouchSource: firstTouch.source,
			firstTouchMedium: firstTouch.medium,
			firstTouchCampaign: firstTouch.campaign,
			lastNonDirectChannel: lastNonDirect.channel,
			lastNonDirectSource: lastNonDirect.source,
			lastNonDirectMedium: lastNonDirect.medium,
			lastNonDirectCampaign: lastNonDirect.campaign
		},
		score,
		scoreReason: 'lead_score_v1',
		consents: [
			{
				purpose: 'lead_follow_up',
				decision: 'granted',
				copyVersion: CONSENT_COPY_VERSION,
				evidence: consentEvidence(parsed.hostname, 'lead_follow_up')
			},
			{
				purpose: 'marketing',
				decision: parsed.consentMarketing ? 'granted' : 'denied',
				copyVersion: CONSENT_COPY_VERSION,
				evidence: consentEvidence(parsed.hostname, 'marketing')
			}
		],
		formSubmittedEventId: crypto.randomUUID(),
		leadCreatedEventId: crypto.randomUUID(),
		taxonomyVersion: EVENT_TAXONOMY_VERSION,
		requestId
	});

	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'system',
		actorId: 'delivery',
		action: persisted.created ? 'leads.create' : 'leads.update',
		entityType: 'lead',
		entityId: persisted.lead.id,
		requestId
	});
	logInfo('leads.capture', {
		requestId,
		clientId: required.clientId,
		leadId: persisted.lead.id,
		created: persisted.created,
		isTest
	});
	const nurture = await tryEnrollCapturedLead(required, persisted.lead.id);
	for (const event of persisted.events) {
		if (!persisted.created && event.name === 'lead_created') continue;
		await fanout(getAnalyticsProvider(), {
			eventId: event.eventId,
			name: event.name as 'form_submitted' | 'lead_created',
			clientId: required.clientId,
			visitorId: parsed.visitorId,
			occurredAt: event.occurredAt,
			isTest,
			properties: {
				lead_id: persisted.lead.id,
				contact_id: persisted.contact.id,
				domain_kind: parsed.domainKind
			}
		});
	}
	return {
		contact: persisted.contact,
		lead: persisted.lead,
		created: persisted.created,
		score,
		attribution: {
			firstTouch,
			lastNonDirect
		},
		events: persisted.events,
		nurture
	};
}

export async function listLeads(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'leads.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertLeadClient(required, clientId);
	const rows = await listLeadsForTenant(required);
	return rows.map((row) => ({
		id: row.lead.id,
		status: row.lead.status,
		isTest: row.lead.isTest,
		message: row.lead.message,
		hostname: row.lead.hostname,
		createdAt: row.lead.createdAt,
		contact: {
			id: row.contact.id,
			displayName: row.contact.displayName,
			email: row.contact.email,
			phone: row.contact.phone,
			company: row.contact.company
		},
		score: row.score?.score ?? null,
		attribution: row.attribution
			? {
					firstTouchChannel: row.attribution.firstTouchChannel,
					firstTouchSource: row.attribution.firstTouchSource,
					firstTouchCampaign: row.attribution.firstTouchCampaign,
					lastNonDirectChannel: row.attribution.lastNonDirectChannel,
					lastNonDirectSource: row.attribution.lastNonDirectSource,
					lastNonDirectCampaign: row.attribution.lastNonDirectCampaign
				}
			: null
	}));
}

export async function updateLeadStatus(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'leads.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(updateLeadStatusSchema, input);
	const existing = await getLeadForTenant(required, parsed.id);
	if (!existing) throw new NotFoundError('Lead not found');
	if (existing.status === parsed.status) {
		throw new ValidationError('Lead already has that status');
	}
	const updated = await updateLeadStatusForTenant(required, {
		leadId: parsed.id,
		status: parsed.status,
		reason: parsed.reason,
		actorId: actor.userId,
		requestId
	});
	if (!updated) throw new NotFoundError('Lead not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'leads.status',
		entityType: 'lead',
		entityId: parsed.id,
		requestId,
		reason: parsed.reason
	});
	return updated;
}

export async function listLeadEvents(actor: Actor, ctx: TenantContext, leadId?: string) {
	requireCapability(actor.permissions, 'analytics.read');
	const required = assertActorOwnsContext(actor, ctx);
	return listAnalyticsEventsForTenant(required, leadId);
}

export async function listLeadConsent(actor: Actor, ctx: TenantContext, contactId: string) {
	requireCapability(actor.permissions, 'leads.read');
	const required = assertActorOwnsContext(actor, ctx);
	return listConsentForContact(required, contactId);
}
