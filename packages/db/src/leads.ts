import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import {
	analyticsEvents,
	analyticsSessions,
	attributionResults,
	attributionTouchpoints,
	consentRecords,
	contactIdentities,
	contacts,
	leadScoreEvents,
	leadScores,
	leadSources,
	leadStatusHistory,
	leads,
	visitors,
	type AnalyticsEventProperties,
	type ConsentEvidence
} from './schema';

export function assertLeadClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function getContactByEmailForTenant(ctx: TenantContext, email: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(contacts)
		.where(and(eq(contacts.clientId, required.clientId), eq(contacts.email, email)))
		.limit(1);
	return row ?? null;
}

export async function getContactIdentityForTenant(
	ctx: TenantContext,
	kind: 'email' | 'phone' | 'visitor',
	value: string
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(contactIdentities)
		.where(
			and(
				eq(contactIdentities.clientId, required.clientId),
				eq(contactIdentities.kind, kind),
				eq(contactIdentities.value, value)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function getVisitorByAnonymousIdForTenant(ctx: TenantContext, anonymousId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(visitors)
		.where(and(eq(visitors.clientId, required.clientId), eq(visitors.anonymousId, anonymousId)))
		.limit(1);
	return row ?? null;
}

export async function getAnalyticsSessionForTenant(ctx: TenantContext, sessionId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(analyticsSessions)
		.where(
			and(eq(analyticsSessions.id, sessionId), eq(analyticsSessions.clientId, required.clientId))
		)
		.limit(1);
	return row ?? null;
}

export async function getOpenLeadForContact(ctx: TenantContext, contactId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(leads)
		.where(
			and(
				eq(leads.clientId, required.clientId),
				eq(leads.contactId, contactId),
				inArray(leads.status, ['new', 'working'])
			)
		)
		.orderBy(desc(leads.createdAt))
		.limit(1);
	return row ?? null;
}

export async function listTouchpointsForVisitor(ctx: TenantContext, visitorId: string) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(attributionTouchpoints)
		.where(
			and(
				eq(attributionTouchpoints.clientId, required.clientId),
				eq(attributionTouchpoints.visitorId, visitorId)
			)
		)
		.orderBy(attributionTouchpoints.occurredAt);
}

export async function findFormStartedEvent(ctx: TenantContext, sessionId: string, pageId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(analyticsEvents)
		.where(
			and(
				eq(analyticsEvents.clientId, required.clientId),
				eq(analyticsEvents.name, 'form_started'),
				eq(analyticsEvents.sessionId, sessionId),
				eq(analyticsEvents.pageId, pageId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function listLeadsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			lead: leads,
			contact: contacts,
			score: leadScores,
			attribution: attributionResults
		})
		.from(leads)
		.innerJoin(contacts, eq(contacts.id, leads.contactId))
		.leftJoin(leadScores, eq(leadScores.leadId, leads.id))
		.leftJoin(attributionResults, eq(attributionResults.leadId, leads.id))
		.where(eq(leads.clientId, required.clientId))
		.orderBy(desc(leads.createdAt))
		.limit(100);
}

export async function getLeadForTenant(ctx: TenantContext, leadId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(leads)
		.where(and(eq(leads.id, leadId), eq(leads.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function listAnalyticsEventsForTenant(ctx: TenantContext, leadId?: string) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(analyticsEvents)
		.where(
			leadId
				? and(eq(analyticsEvents.clientId, required.clientId), eq(analyticsEvents.leadId, leadId))
				: eq(analyticsEvents.clientId, required.clientId)
		)
		.orderBy(desc(analyticsEvents.occurredAt))
		.limit(200);
}

export async function listConsentForContact(ctx: TenantContext, contactId: string) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(consentRecords)
		.where(
			and(eq(consentRecords.clientId, required.clientId), eq(consentRecords.contactId, contactId))
		)
		.orderBy(desc(consentRecords.occurredAt));
}

export async function persistDeliveryVisit(
	ctx: TenantContext,
	input: {
		anonymousId: string;
		sessionId?: string;
		landingUrl?: string | null;
		referrer?: string | null;
		utmSource?: string | null;
		utmMedium?: string | null;
		utmCampaign?: string | null;
		isTest: boolean;
	}
) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		let [visitor] = await tx
			.select()
			.from(visitors)
			.where(
				and(eq(visitors.clientId, required.clientId), eq(visitors.anonymousId, input.anonymousId))
			)
			.limit(1);
		if (!visitor) {
			[visitor] = await tx
				.insert(visitors)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					anonymousId: input.anonymousId
				})
				.returning();
		}
		let session = input.sessionId
			? (
					await tx
						.select()
						.from(analyticsSessions)
						.where(
							and(
								eq(analyticsSessions.id, input.sessionId),
								eq(analyticsSessions.clientId, required.clientId)
							)
						)
						.limit(1)
				)[0]
			: undefined;
		if (!session) {
			[session] = await tx
				.insert(analyticsSessions)
				.values({
					...(input.sessionId ? { id: input.sessionId } : {}),
					organizationId: required.organizationId,
					clientId: required.clientId,
					visitorId: visitor.id,
					landingUrl: input.landingUrl ?? null,
					referrer: input.referrer ?? null,
					utmSource: input.utmSource ?? null,
					utmMedium: input.utmMedium ?? null,
					utmCampaign: input.utmCampaign ?? null,
					isTest: input.isTest
				})
				.returning();
		} else {
			[session] = await tx
				.update(analyticsSessions)
				.set({ lastSeenAt: new Date() })
				.where(
					and(
						eq(analyticsSessions.id, session.id),
						eq(analyticsSessions.clientId, required.clientId)
					)
				)
				.returning();
		}
		return { visitor, session };
	});
}

export async function insertAnalyticsEventForTenant(
	ctx: TenantContext,
	input: {
		eventId: string;
		name: string;
		taxonomyVersion: number;
		visitorId?: string | null;
		sessionId?: string | null;
		contactId?: string | null;
		leadId?: string | null;
		siteId?: string | null;
		funnelId?: string | null;
		pageId?: string | null;
		pageVersionId?: string | null;
		properties?: AnalyticsEventProperties;
		isTest: boolean;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(analyticsEvents)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			eventId: input.eventId,
			name: input.name,
			taxonomyVersion: input.taxonomyVersion,
			visitorId: input.visitorId ?? null,
			sessionId: input.sessionId ?? null,
			contactId: input.contactId ?? null,
			leadId: input.leadId ?? null,
			siteId: input.siteId ?? null,
			funnelId: input.funnelId ?? null,
			pageId: input.pageId ?? null,
			pageVersionId: input.pageVersionId ?? null,
			properties: input.properties ?? {},
			isTest: input.isTest
		})
		.returning();
	return row;
}

export async function insertTouchpointForTenant(
	ctx: TenantContext,
	input: {
		visitorId: string;
		sessionId?: string | null;
		leadId?: string | null;
		channel: string;
		source?: string | null;
		medium?: string | null;
		campaign?: string | null;
		term?: string | null;
		content?: string | null;
		referrer?: string | null;
		landingUrl?: string | null;
		isDirect: boolean;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(attributionTouchpoints)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function persistCapturedLead(
	ctx: TenantContext,
	input: {
		displayName: string;
		email: string;
		phone?: string | null;
		company?: string | null;
		message?: string | null;
		visitorAnonymousId?: string;
		sessionId?: string;
		hostname: string;
		domainKind: string;
		isTest: boolean;
		siteId: string;
		funnelId: string;
		pageId: string;
		pageVersionId: string;
		landingUrl?: string | null;
		source: {
			channel: string;
			utmSource?: string | null;
			utmMedium?: string | null;
			utmCampaign?: string | null;
			utmTerm?: string | null;
			utmContent?: string | null;
			referrer?: string | null;
		};
		attribution: {
			firstTouchChannel: string;
			firstTouchSource?: string | null;
			firstTouchMedium?: string | null;
			firstTouchCampaign?: string | null;
			lastNonDirectChannel: string;
			lastNonDirectSource?: string | null;
			lastNonDirectMedium?: string | null;
			lastNonDirectCampaign?: string | null;
		};
		score: number;
		scoreReason: string;
		consents: Array<{
			purpose: 'lead_follow_up' | 'marketing';
			decision: 'granted' | 'denied';
			copyVersion: number;
			evidence: ConsentEvidence;
		}>;
		formSubmittedEventId: string;
		leadCreatedEventId: string;
		taxonomyVersion: number;
		requestId: string;
	}
) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		let [contact] = await tx
			.select()
			.from(contacts)
			.where(and(eq(contacts.clientId, required.clientId), eq(contacts.email, input.email)))
			.limit(1);
		const now = new Date();
		if (contact) {
			[contact] = await tx
				.update(contacts)
				.set({
					displayName: input.displayName,
					phone: input.phone || contact.phone,
					company: input.company || contact.company,
					lastSeenAt: now,
					updatedAt: now
				})
				.where(and(eq(contacts.id, contact.id), eq(contacts.clientId, required.clientId)))
				.returning();
		} else {
			[contact] = await tx
				.insert(contacts)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					displayName: input.displayName,
					email: input.email,
					phone: input.phone ?? null,
					company: input.company ?? null
				})
				.returning();
		}

		async function ensureIdentity(kind: 'email' | 'phone' | 'visitor', value: string) {
			const [existing] = await tx
				.select()
				.from(contactIdentities)
				.where(
					and(
						eq(contactIdentities.clientId, required.clientId),
						eq(contactIdentities.kind, kind),
						eq(contactIdentities.value, value)
					)
				)
				.limit(1);
			if (existing) return existing.contactId === contact.id ? existing : null;
			const [row] = await tx
				.insert(contactIdentities)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					contactId: contact.id,
					kind,
					value
				})
				.returning();
			return row;
		}

		await ensureIdentity('email', input.email);
		if (input.phone) await ensureIdentity('phone', input.phone);

		let visitor = input.visitorAnonymousId
			? (
					await tx
						.select()
						.from(visitors)
						.where(
							and(
								eq(visitors.clientId, required.clientId),
								eq(visitors.anonymousId, input.visitorAnonymousId)
							)
						)
						.limit(1)
				)[0]
			: undefined;
		if (input.visitorAnonymousId && !visitor) {
			[visitor] = await tx
				.insert(visitors)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					anonymousId: input.visitorAnonymousId,
					contactId: contact.id
				})
				.returning();
		} else if (visitor) {
			[visitor] = await tx
				.update(visitors)
				.set({ contactId: contact.id, updatedAt: now })
				.where(and(eq(visitors.id, visitor.id), eq(visitors.clientId, required.clientId)))
				.returning();
			await ensureIdentity('visitor', visitor.anonymousId);
		}

		let [source] = await tx
			.select()
			.from(leadSources)
			.where(
				and(
					eq(leadSources.clientId, required.clientId),
					eq(leadSources.channel, input.source.channel),
					input.source.utmSource
						? eq(leadSources.utmSource, input.source.utmSource)
						: isNull(leadSources.utmSource),
					input.source.utmMedium
						? eq(leadSources.utmMedium, input.source.utmMedium)
						: isNull(leadSources.utmMedium),
					input.source.utmCampaign
						? eq(leadSources.utmCampaign, input.source.utmCampaign)
						: isNull(leadSources.utmCampaign),
					input.source.utmContent
						? eq(leadSources.utmContent, input.source.utmContent)
						: isNull(leadSources.utmContent)
				)
			)
			.limit(1);
		if (!source) {
			[source] = await tx
				.insert(leadSources)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					...input.source
				})
				.returning();
		}

		let [lead] = await tx
			.select()
			.from(leads)
			.where(
				and(
					eq(leads.clientId, required.clientId),
					eq(leads.contactId, contact.id),
					inArray(leads.status, ['new', 'working'])
				)
			)
			.orderBy(desc(leads.createdAt))
			.limit(1);
		let created = false;
		if (lead) {
			[lead] = await tx
				.update(leads)
				.set({
					sourceId: source.id,
					message: input.message ?? lead.message,
					hostname: input.hostname,
					domainKind: input.domainKind,
					isTest: input.isTest,
					landingUrl: input.landingUrl ?? lead.landingUrl,
					updatedAt: now
				})
				.where(and(eq(leads.id, lead.id), eq(leads.clientId, required.clientId)))
				.returning();
		} else {
			created = true;
			[lead] = await tx
				.insert(leads)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					contactId: contact.id,
					sourceId: source.id,
					siteId: input.siteId,
					funnelId: input.funnelId,
					pageId: input.pageId,
					pageVersionId: input.pageVersionId,
					hostname: input.hostname,
					domainKind: input.domainKind,
					isTest: input.isTest,
					message: input.message ?? null,
					landingUrl: input.landingUrl ?? null
				})
				.returning();
			await tx.insert(leadStatusHistory).values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				leadId: lead.id,
				fromStatus: 'new',
				toStatus: 'new',
				reason: 'lead_created',
				requestId: input.requestId
			});
		}

		const [existingScore] = await tx
			.select()
			.from(leadScores)
			.where(and(eq(leadScores.leadId, lead.id), eq(leadScores.clientId, required.clientId)))
			.limit(1);
		if (existingScore) {
			await tx
				.update(leadScores)
				.set({ score: input.score, computedAt: now, updatedAt: now })
				.where(
					and(eq(leadScores.id, existingScore.id), eq(leadScores.clientId, required.clientId))
				);
		} else {
			await tx.insert(leadScores).values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				leadId: lead.id,
				score: input.score
			});
		}
		await tx.insert(leadScoreEvents).values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			leadId: lead.id,
			score: input.score,
			reason: input.scoreReason
		});

		for (const consent of input.consents) {
			await tx.insert(consentRecords).values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				contactId: contact.id,
				leadId: lead.id,
				purpose: consent.purpose,
				decision: consent.decision,
				source: 'form_submit',
				copyVersion: consent.copyVersion,
				evidence: consent.evidence
			});
		}

		const [existingAttribution] = await tx
			.select()
			.from(attributionResults)
			.where(
				and(
					eq(attributionResults.leadId, lead.id),
					eq(attributionResults.clientId, required.clientId)
				)
			)
			.limit(1);
		if (existingAttribution) {
			await tx
				.update(attributionResults)
				.set({ ...input.attribution, computedAt: now, updatedAt: now })
				.where(
					and(
						eq(attributionResults.id, existingAttribution.id),
						eq(attributionResults.clientId, required.clientId)
					)
				);
		} else {
			await tx.insert(attributionResults).values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				leadId: lead.id,
				...input.attribution
			});
		}

		if (visitor) {
			await tx
				.update(attributionTouchpoints)
				.set({ leadId: lead.id })
				.where(
					and(
						eq(attributionTouchpoints.clientId, required.clientId),
						eq(attributionTouchpoints.visitorId, visitor.id),
						isNull(attributionTouchpoints.leadId)
					)
				);
		}

		const eventNames = created
			? ([
					['form_submitted', input.formSubmittedEventId],
					['lead_created', input.leadCreatedEventId]
				] as const)
			: ([['form_submitted', input.formSubmittedEventId]] as const);
		const insertedEvents = [];
		for (const [name, eventId] of eventNames) {
			const [row] = await tx
				.insert(analyticsEvents)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					eventId,
					name,
					taxonomyVersion: input.taxonomyVersion,
					visitorId: visitor?.id ?? null,
					sessionId: input.sessionId ?? null,
					contactId: contact.id,
					leadId: lead.id,
					siteId: input.siteId,
					funnelId: input.funnelId,
					pageId: input.pageId,
					pageVersionId: input.pageVersionId,
					properties: {
						hostname: input.hostname,
						domainKind: input.domainKind,
						landingUrl: input.landingUrl ?? undefined
					},
					isTest: input.isTest
				})
				.returning();
			insertedEvents.push(row);
		}

		return { contact, lead, created, source, visitor: visitor ?? null, events: insertedEvents };
	});
}

export async function updateLeadStatusForTenant(
	ctx: TenantContext,
	input: {
		leadId: string;
		status: 'new' | 'working' | 'qualified' | 'won' | 'lost' | 'spam';
		reason: string;
		actorId?: string | null;
		requestId: string;
	}
) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		const [lead] = await tx
			.select()
			.from(leads)
			.where(and(eq(leads.id, input.leadId), eq(leads.clientId, required.clientId)))
			.limit(1);
		if (!lead) return null;
		const [updated] = await tx
			.update(leads)
			.set({ status: input.status, updatedAt: new Date() })
			.where(and(eq(leads.id, lead.id), eq(leads.clientId, required.clientId)))
			.returning();
		const [history] = await tx
			.insert(leadStatusHistory)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				leadId: lead.id,
				fromStatus: lead.status,
				toStatus: input.status,
				reason: input.reason,
				actorId: input.actorId ?? null,
				requestId: input.requestId
			})
			.returning();
		return { lead: updated, history };
	});
}
