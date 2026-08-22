import { and, count, desc, eq, isNull, lte, notExists, or } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { db } from './client';
import {
	consentEvents,
	consentRecords,
	contacts,
	emailConnections,
	emailContacts,
	emailDomains,
	emailEvents,
	emailMessages,
	emailSequenceEnrollments,
	emailSequenceSteps,
	emailSequences,
	emailSuppressions,
	emailTopics,
	leads,
	type EmailDomainCheckDetail,
	type EmailTopicPreferences
} from './schema';

export function assertEmailClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

export async function getEmailConnectionForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(emailConnections)
		.where(eq(emailConnections.clientId, required.clientId))
		.limit(1);
	return row ?? null;
}

export async function ensureEmailConnectionForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const existing = await getEmailConnectionForTenant(required);
	if (existing) return existing;
	const [row] = await db
		.insert(emailConnections)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			provider: 'resend',
			status: 'active'
		})
		.returning();
	return row;
}

export async function listEmailDomainsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(emailDomains)
		.where(eq(emailDomains.clientId, required.clientId))
		.orderBy(desc(emailDomains.createdAt));
}

export async function getReadyEmailDomainForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(emailDomains)
		.where(and(eq(emailDomains.clientId, required.clientId), eq(emailDomains.status, 'ready')))
		.orderBy(desc(emailDomains.updatedAt))
		.limit(1);
	return row ?? null;
}

export async function getEmailDomainForTenant(ctx: TenantContext, domainId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(emailDomains)
		.where(and(eq(emailDomains.id, domainId), eq(emailDomains.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function upsertEmailDomainForTenant(
	ctx: TenantContext,
	input: {
		domain: string;
		fromAddress: string;
		fromName: string;
		fromApproved: boolean;
		dkimSelector: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(emailDomains)
		.where(and(eq(emailDomains.clientId, required.clientId), eq(emailDomains.domain, input.domain)))
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(emailDomains)
			.set({
				fromAddress: input.fromAddress,
				fromName: input.fromName,
				fromApproved: input.fromApproved,
				dkimSelector: input.dkimSelector,
				updatedAt: new Date()
			})
			.where(and(eq(emailDomains.id, existing.id), eq(emailDomains.clientId, required.clientId)))
			.returning();
		return row;
	}
	const [row] = await db
		.insert(emailDomains)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function updateEmailDomainCheckForTenant(
	ctx: TenantContext,
	domainId: string,
	input: {
		status: 'pending' | 'ready' | 'failed';
		spfReady: boolean;
		dkimReady: boolean;
		dmarcReady: boolean;
		checkDetail: EmailDomainCheckDetail;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(emailDomains)
		.set({
			...input,
			lastCheckedAt: new Date(),
			updatedAt: new Date()
		})
		.where(and(eq(emailDomains.id, domainId), eq(emailDomains.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function getApprovedWelcomeSequenceForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [sequence] = await db
		.select()
		.from(emailSequences)
		.where(
			and(
				eq(emailSequences.clientId, required.clientId),
				eq(emailSequences.key, 'welcome_v1'),
				eq(emailSequences.status, 'approved')
			)
		)
		.limit(1);
	if (!sequence) return null;
	const steps = await db
		.select()
		.from(emailSequenceSteps)
		.where(
			and(
				eq(emailSequenceSteps.clientId, required.clientId),
				eq(emailSequenceSteps.sequenceId, sequence.id)
			)
		)
		.orderBy(emailSequenceSteps.stepIndex);
	return { sequence, steps };
}

export async function listEmailSequencesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db.select().from(emailSequences).where(eq(emailSequences.clientId, required.clientId));
}

export async function getEnrollmentForLead(ctx: TenantContext, leadId: string, sequenceId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(emailSequenceEnrollments)
		.where(
			and(
				eq(emailSequenceEnrollments.clientId, required.clientId),
				eq(emailSequenceEnrollments.leadId, leadId),
				eq(emailSequenceEnrollments.sequenceId, sequenceId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function insertEnrollmentForTenant(
	ctx: TenantContext,
	input: {
		sequenceId: string;
		contactId: string;
		leadId: string;
		email: string;
		nextStepAt: Date;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(emailSequenceEnrollments)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			status: 'active',
			currentStepIndex: 0,
			...input
		})
		.returning();
	return row;
}

export async function listDueEnrollmentsForTenant(ctx: TenantContext, now: Date) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(emailSequenceEnrollments)
		.where(
			and(
				eq(emailSequenceEnrollments.clientId, required.clientId),
				eq(emailSequenceEnrollments.status, 'active'),
				lte(emailSequenceEnrollments.nextStepAt, now)
			)
		)
		.orderBy(emailSequenceEnrollments.nextStepAt)
		.limit(50);
}

export async function getEnrollmentForTenant(ctx: TenantContext, enrollmentId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(emailSequenceEnrollments)
		.where(
			and(
				eq(emailSequenceEnrollments.id, enrollmentId),
				eq(emailSequenceEnrollments.clientId, required.clientId)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function updateEnrollmentForTenant(
	ctx: TenantContext,
	enrollmentId: string,
	input: Partial<{
		status: 'active' | 'completed' | 'cancelled' | 'suppressed';
		currentStepIndex: number;
		nextStepAt: Date | null;
		completedAt: Date | null;
	}>
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(emailSequenceEnrollments)
		.set({ ...input, updatedAt: new Date() })
		.where(
			and(
				eq(emailSequenceEnrollments.id, enrollmentId),
				eq(emailSequenceEnrollments.clientId, required.clientId)
			)
		)
		.returning();
	return row ?? null;
}

export async function cancelActiveEnrollmentsForEmail(ctx: TenantContext, email: string) {
	const required = requireTenantContext(ctx);
	return db
		.update(emailSequenceEnrollments)
		.set({ status: 'suppressed', nextStepAt: null, updatedAt: new Date() })
		.where(
			and(
				eq(emailSequenceEnrollments.clientId, required.clientId),
				eq(emailSequenceEnrollments.email, email),
				eq(emailSequenceEnrollments.status, 'active')
			)
		)
		.returning();
}

export async function upsertEmailContactForTenant(
	ctx: TenantContext,
	input: {
		contactId: string;
		email: string;
		topicPreferences?: EmailTopicPreferences;
	}
) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(emailContacts)
		.where(and(eq(emailContacts.clientId, required.clientId), eq(emailContacts.email, input.email)))
		.limit(1);
	if (existing) {
		const [row] = await db
			.update(emailContacts)
			.set({
				contactId: input.contactId,
				topicPreferences: input.topicPreferences ?? existing.topicPreferences,
				updatedAt: new Date()
			})
			.where(and(eq(emailContacts.id, existing.id), eq(emailContacts.clientId, required.clientId)))
			.returning();
		return row;
	}
	const [row] = await db
		.insert(emailContacts)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			contactId: input.contactId,
			email: input.email,
			topicPreferences: input.topicPreferences ?? { welcome: true }
		})
		.returning();
	return row;
}

export async function getEmailContactForTenant(ctx: TenantContext, email: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(emailContacts)
		.where(and(eq(emailContacts.clientId, required.clientId), eq(emailContacts.email, email)))
		.limit(1);
	return row ?? null;
}

export async function syncEmailContactsFromLeadsForTenant(ctx: TenantContext, limit = 200) {
	const required = requireTenantContext(ctx);
	const missing = await db
		.select({ contact: contacts })
		.from(contacts)
		.leftJoin(
			emailContacts,
			and(eq(emailContacts.contactId, contacts.id), eq(emailContacts.clientId, required.clientId))
		)
		.where(and(eq(contacts.clientId, required.clientId), isNull(emailContacts.id)))
		.limit(limit);
	const synced = [];
	for (const row of missing) {
		synced.push(
			await upsertEmailContactForTenant(required, {
				contactId: row.contact.id,
				email: row.contact.email,
				topicPreferences: { welcome: true }
			})
		);
	}
	return synced;
}

export async function listUnenrolledProductionLeadsForTenant(ctx: TenantContext, limit = 25) {
	const required = requireTenantContext(ctx);
	const sequence = await getApprovedWelcomeSequenceForTenant(required);
	if (!sequence) return [];
	return db
		.select({ lead: leads, contact: contacts })
		.from(leads)
		.innerJoin(contacts, eq(contacts.id, leads.contactId))
		.where(
			and(
				eq(leads.clientId, required.clientId),
				eq(leads.isTest, false),
				notExists(
					db
						.select({ id: emailSequenceEnrollments.id })
						.from(emailSequenceEnrollments)
						.where(
							and(
								eq(emailSequenceEnrollments.clientId, required.clientId),
								eq(emailSequenceEnrollments.leadId, leads.id),
								eq(emailSequenceEnrollments.sequenceId, sequence.sequence.id)
							)
						)
				)
			)
		)
		.orderBy(leads.createdAt)
		.limit(limit);
}

export async function countUnenrolledProductionLeadsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const sequence = await getApprovedWelcomeSequenceForTenant(required);
	if (!sequence) return 0;
	const [row] = await db
		.select({ total: count() })
		.from(leads)
		.where(
			and(
				eq(leads.clientId, required.clientId),
				eq(leads.isTest, false),
				notExists(
					db
						.select({ id: emailSequenceEnrollments.id })
						.from(emailSequenceEnrollments)
						.where(
							and(
								eq(emailSequenceEnrollments.clientId, required.clientId),
								eq(emailSequenceEnrollments.leadId, leads.id),
								eq(emailSequenceEnrollments.sequenceId, sequence.sequence.id)
							)
						)
				)
			)
		);
	return Number(row?.total ?? 0);
}

export async function countEmailContactsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({ total: count() })
		.from(emailContacts)
		.where(eq(emailContacts.clientId, required.clientId));
	return Number(row?.total ?? 0);
}

export async function countEmailMessagesByStatusForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			status: emailMessages.status,
			isTest: emailMessages.isTest,
			total: count()
		})
		.from(emailMessages)
		.where(eq(emailMessages.clientId, required.clientId))
		.groupBy(emailMessages.status, emailMessages.isTest);
}

export async function countEmailEventsByTypeForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			type: emailEvents.type,
			isTest: emailMessages.isTest,
			total: count()
		})
		.from(emailEvents)
		.innerJoin(
			emailMessages,
			and(
				eq(emailMessages.id, emailEvents.messageId),
				eq(emailMessages.clientId, required.clientId)
			)
		)
		.where(eq(emailEvents.clientId, required.clientId))
		.groupBy(emailEvents.type, emailMessages.isTest);
}

export async function countEmailEnrollmentsByStatusForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			status: emailSequenceEnrollments.status,
			total: count()
		})
		.from(emailSequenceEnrollments)
		.where(eq(emailSequenceEnrollments.clientId, required.clientId))
		.groupBy(emailSequenceEnrollments.status);
}

export async function latestMarketingConsentForContact(ctx: TenantContext, contactId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(consentRecords)
		.where(
			and(
				eq(consentRecords.clientId, required.clientId),
				eq(consentRecords.contactId, contactId),
				eq(consentRecords.purpose, 'marketing')
			)
		)
		.orderBy(desc(consentRecords.occurredAt))
		.limit(1);
	return row ?? null;
}

export async function insertConsentEventForTenant(
	ctx: TenantContext,
	input: {
		contactId: string;
		purpose: 'lead_follow_up' | 'marketing' | 'analytics';
		decision: 'granted' | 'denied';
		source: string;
		copyVersion: number;
		requestId: string;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(consentEvents)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	await db.insert(consentRecords).values({
		organizationId: required.organizationId,
		clientId: required.clientId,
		contactId: input.contactId,
		purpose: input.purpose,
		decision: input.decision,
		source: input.source,
		copyVersion: input.copyVersion,
		evidence: {
			hostname: 'unsubscribe',
			copyVersion: input.copyVersion,
			text: input.source
		}
	});
	return row;
}

export async function isEmailSuppressed(email: string, clientId: string) {
	const normalized = email.trim().toLowerCase();
	const [globalRow] = await db
		.select()
		.from(emailSuppressions)
		.where(and(eq(emailSuppressions.scope, 'global'), eq(emailSuppressions.email, normalized)))
		.limit(1);
	if (globalRow) return { global: true, client: false };
	const [clientRow] = await db
		.select()
		.from(emailSuppressions)
		.where(
			and(
				eq(emailSuppressions.scope, 'client'),
				eq(emailSuppressions.clientId, clientId),
				eq(emailSuppressions.email, normalized)
			)
		)
		.limit(1);
	return { global: false, client: Boolean(clientRow) };
}

export async function insertClientSuppressionForTenant(
	ctx: TenantContext,
	input: {
		email: string;
		reason: 'unsubscribe' | 'bounce' | 'complaint' | 'operator';
		source: string;
	}
) {
	const required = requireTenantContext(ctx);
	const email = input.email.trim().toLowerCase();
	const [existing] = await db
		.select()
		.from(emailSuppressions)
		.where(
			and(
				eq(emailSuppressions.scope, 'client'),
				eq(emailSuppressions.clientId, required.clientId),
				eq(emailSuppressions.email, email)
			)
		)
		.limit(1);
	if (existing) return existing;
	const [row] = await db
		.insert(emailSuppressions)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			email,
			scope: 'client',
			reason: input.reason,
			source: input.source
		})
		.returning();
	return row;
}

export async function insertGlobalSuppression(input: {
	email: string;
	reason: 'unsubscribe' | 'bounce' | 'complaint' | 'operator';
	source: string;
}) {
	const email = input.email.trim().toLowerCase();
	const [existing] = await db
		.select()
		.from(emailSuppressions)
		.where(and(eq(emailSuppressions.scope, 'global'), eq(emailSuppressions.email, email)))
		.limit(1);
	if (existing) return existing;
	const [row] = await db
		.insert(emailSuppressions)
		.values({
			email,
			scope: 'global',
			reason: input.reason,
			source: input.source
		})
		.returning();
	return row;
}

export async function listSuppressionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(emailSuppressions)
		.where(
			or(
				eq(emailSuppressions.clientId, required.clientId),
				and(eq(emailSuppressions.scope, 'global'), isNull(emailSuppressions.clientId))
			)
		)
		.orderBy(desc(emailSuppressions.createdAt))
		.limit(200);
}

export async function insertEmailMessageForTenant(
	ctx: TenantContext,
	input: {
		contactId: string;
		leadId?: string | null;
		enrollmentId?: string | null;
		sequenceId?: string | null;
		stepIndex?: number | null;
		toAddress: string;
		fromAddress: string;
		subject: string;
		status: 'queued' | 'sent' | 'skipped' | 'failed';
		provider: string;
		providerMessageId?: string | null;
		idempotencyKey: string;
		skipReason?: string | null;
		isTest: boolean;
	}
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.insert(emailMessages)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return row;
}

export async function getEmailMessageByIdempotency(ctx: TenantContext, idempotencyKey: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(emailMessages)
		.where(
			and(
				eq(emailMessages.clientId, required.clientId),
				eq(emailMessages.idempotencyKey, idempotencyKey)
			)
		)
		.limit(1);
	return row ?? null;
}

export async function updateEmailMessageForTenant(
	ctx: TenantContext,
	messageId: string,
	input: Partial<{
		status: 'queued' | 'sent' | 'delivered' | 'bounced' | 'complained' | 'skipped' | 'failed';
		providerMessageId: string | null;
		skipReason: string | null;
	}>
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(emailMessages)
		.set({ ...input, updatedAt: new Date() })
		.where(and(eq(emailMessages.id, messageId), eq(emailMessages.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function listEmailMessagesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(emailMessages)
		.where(eq(emailMessages.clientId, required.clientId))
		.orderBy(desc(emailMessages.createdAt))
		.limit(100);
}

export async function listEmailEnrollmentsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(emailSequenceEnrollments)
		.where(eq(emailSequenceEnrollments.clientId, required.clientId))
		.orderBy(desc(emailSequenceEnrollments.createdAt))
		.limit(100);
}

export async function findEmailMessageByProviderId(providerMessageId: string) {
	const [row] = await db
		.select()
		.from(emailMessages)
		.where(eq(emailMessages.providerMessageId, providerMessageId))
		.limit(1);
	return row ?? null;
}

export async function insertEmailEventForTenant(
	ctx: TenantContext,
	input: {
		messageId: string;
		providerEventId: string;
		type: string;
		payload?: Record<string, string | number | boolean | null>;
		occurredAt: Date;
	}
) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(emailEvents)
		.where(
			and(
				eq(emailEvents.clientId, required.clientId),
				eq(emailEvents.providerEventId, input.providerEventId)
			)
		)
		.limit(1);
	if (existing) return { event: existing, duplicate: true };
	const [row] = await db
		.insert(emailEvents)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			...input
		})
		.returning();
	return { event: row, duplicate: false };
}

export async function findContactForUnsubscribe(
	clientId: string,
	contactId: string,
	email: string
) {
	const [row] = await db
		.select()
		.from(contacts)
		.where(
			and(eq(contacts.id, contactId), eq(contacts.clientId, clientId), eq(contacts.email, email))
		)
		.limit(1);
	return row ?? null;
}

export async function getContactForTenant(ctx: TenantContext, contactId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(contacts)
		.where(and(eq(contacts.id, contactId), eq(contacts.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function getLeadWithContactForTenant(ctx: TenantContext, leadId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select({ lead: leads, contact: contacts })
		.from(leads)
		.innerJoin(contacts, eq(contacts.id, leads.contactId))
		.where(and(eq(leads.id, leadId), eq(leads.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function ensureWelcomeTopicForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [existing] = await db
		.select()
		.from(emailTopics)
		.where(and(eq(emailTopics.clientId, required.clientId), eq(emailTopics.slug, 'welcome')))
		.limit(1);
	if (existing) return existing;
	const [row] = await db
		.insert(emailTopics)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			slug: 'welcome',
			name: 'Welcome'
		})
		.returning();
	return row;
}
