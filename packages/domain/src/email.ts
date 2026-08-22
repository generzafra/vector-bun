import { consumeRateLimit, requireCapability } from '@vector/auth';
import {
	ENROLL_ELIGIBLE_WORKFLOW,
	INBOUND_EMAIL_WORKFLOW,
	LEAD_CAPTURED_WORKFLOW,
	NURTURE_DUE_SWEEP_WORKFLOW,
	NURTURE_STEP_WORKFLOW,
	leadCapturedInputSchema,
	nurtureStepInputSchema
} from '@vector/automation';
import {
	CONSENT_COPY_VERSION,
	classifyInboundReply,
	evaluateSendEligibility,
	parseJurisdictionProfile,
	type SendEligibilityInput
} from '@vector/compliance';
import { env } from '@vector/config';
import {
	NotFoundError,
	UnauthorizedError,
	ValidationError,
	addEmailSuppressionSchema,
	assertActorOwnsContext,
	emailDomainIdSchema,
	emailInboundIdSchema,
	parseContract,
	requireTenantContext,
	unsubscribeTokenSchema,
	upsertEmailDomainSchema,
	type TenantContext
} from '@vector/contracts';
import {
	assertEmailClient,
	cancelActiveEnrollmentsForEmail,
	countEmailContactsForTenant,
	countEmailEnrollmentsByStatusForTenant,
	countEmailEventsByTypeForTenant,
	countEmailMessagesByStatusForTenant,
	countUnenrolledProductionLeadsForTenant,
	ensureEmailConnectionForTenant,
	ensureWelcomeTopicForTenant,
	findContactForUnsubscribe,
	findEmailDomainsByRecipient,
	findEmailMessageByProviderId,
	getApprovedWelcomeSequenceForTenant,
	getClientSettingsForTenant,
	getContactByEmailForTenant,
	getContactForTenant,
	getEmailConnectionForTenant,
	getInboundMessageForTenant,
	getEmailContactForTenant,
	getEmailDomainForTenant,
	getEmailMessageByIdempotency,
	getEnrollmentForLead,
	getEnrollmentForTenant,
	getLeadWithContactForTenant,
	getProductionDomainForTenant,
	getReadyEmailDomainForTenant,
	insertClientSuppressionForTenant,
	insertConsentEventForTenant,
	insertEmailEventForTenant,
	insertEmailMessageForTenant,
	insertEnrollmentForTenant,
	insertInboundMessageForTenant,
	insertGlobalSuppression,
	isEmailSuppressed,
	latestMarketingConsentForContact,
	listDueEnrollmentsForTenant,
	listEmailDomainsForTenant,
	listInboundMessagesForTenant,
	listEmailEnrollmentsForTenant,
	listEmailMessagesForTenant,
	listEmailSequencesForTenant,
	listSuppressionsForTenant,
	listUnenrolledProductionLeadsForTenant,
	markInboundReviewedForTenant,
	syncEmailContactsFromLeadsForTenant,
	updateEmailDomainCheckForTenant,
	updateEmailMessageForTenant,
	updateEnrollmentForTenant,
	upsertEmailContactForTenant,
	upsertEmailDomainForTenant
} from '@vector/db';
import {
	createUnsubscribeToken,
	emailProvider,
	evaluateSendingDomain,
	getDnsLookup,
	lookupSendingDomainRecords,
	parseUnsubscribeToken,
	type EmailProvider,
	type NormalizedEmailEvent,
	type NormalizedInboundEmail
} from '@vector/email';
import { previewOrigin as deliveryOriginForHost } from '@vector/funnel-engine';
import { logError, logInfo } from '@vector/observability';
import { recordAudit } from './audit';
import type { Actor } from './auth-service';

let providerOverride: EmailProvider | null = null;

export function setDomainEmailProvider(provider: EmailProvider) {
	providerOverride = provider;
}

export function getDomainEmailProvider() {
	return providerOverride ?? emailProvider();
}

export function resetDomainEmailProvider() {
	providerOverride = null;
}

function tenantFrom(input: {
	organizationId: string;
	clientId: string;
	requestId: string;
}): TenantContext {
	return {
		organizationId: input.organizationId,
		clientId: input.clientId,
		roleIds: [],
		requestId: input.requestId
	};
}

async function eligibilitySnapshot(
	ctx: TenantContext,
	input: { email: string; contactId: string; isTest: boolean; topic?: string }
): Promise<SendEligibilityInput> {
	const [suppressed, consent, connection, domain, sequence, settings, emailContact] =
		await Promise.all([
			isEmailSuppressed(input.email, ctx.clientId),
			latestMarketingConsentForContact(ctx, input.contactId),
			getEmailConnectionForTenant(ctx),
			getReadyEmailDomainForTenant(ctx),
			getApprovedWelcomeSequenceForTenant(ctx),
			getClientSettingsForTenant(ctx),
			getEmailContactForTenant(ctx, input.email)
		]);
	const topic = input.topic ?? 'welcome';
	const topicAllowed = emailContact?.topicPreferences?.[topic as 'welcome' | 'marketing'] !== false;
	return {
		email: input.email,
		isTest: input.isTest,
		sendingPaused: env.EMAIL_SENDING_PAUSED,
		connectionActive: connection?.status === 'active',
		domainReady: domain?.status === 'ready',
		fromApproved: Boolean(domain?.fromApproved),
		globalSuppressed: suppressed.global,
		clientSuppressed: suppressed.client,
		marketingConsent: consent?.decision ?? 'missing',
		topicAllowed,
		jurisdiction: parseJurisdictionProfile(settings?.jurisdictionProfile),
		jurisdictionAllowsMarketing: true,
		sequenceApproved: Boolean(sequence)
	};
}

function unsubscribeUrlFor(hostname: string | null, token: string) {
	if (hostname) {
		return `${deliveryOriginForHost(hostname, env.DELIVERY_ORIGIN)}/unsubscribe?token=${encodeURIComponent(token)}`;
	}
	return `${env.API_ORIGIN}/v1/public/email/unsubscribe?token=${encodeURIComponent(token)}`;
}

async function recheckStoredDomain(ctx: TenantContext, domainId: string) {
	const row = await getEmailDomainForTenant(ctx, domainId);
	if (!row) return null;
	const records = await lookupSendingDomainRecords(row.domain, row.dkimSelector, getDnsLookup());
	const check = evaluateSendingDomain({
		domain: row.domain,
		fromAddress: row.fromAddress,
		fromApproved: row.fromApproved,
		records
	});
	return updateEmailDomainCheckForTenant(ctx, row.id, {
		status: check.ready ? 'ready' : row.fromApproved ? 'failed' : 'pending',
		spfReady: check.spf.ok,
		dkimReady: check.dkim.ok,
		dmarcReady: check.dmarc.ok,
		checkDetail: {
			spf: check.spf.detail,
			dkim: check.dkim.detail,
			dmarc: check.dmarc.detail,
			fromMatchesDomain: check.fromMatchesDomain
		}
	});
}

export async function emailSendingReadiness(ctx: TenantContext) {
	const [connection, domain] = await Promise.all([
		getEmailConnectionForTenant(ctx),
		getReadyEmailDomainForTenant(ctx)
	]);
	const complete = Boolean(connection?.status === 'active' && domain);
	return {
		complete,
		detail: complete
			? `Sending domain ${domain?.domain} is ready`
			: 'SPF, DKIM, DMARC, or approved From is missing'
	};
}

const ENGAGEMENT_FUNNEL = ['sent', 'delivered', 'opened', 'clicked'] as const;
const SENT_MESSAGE_STATUSES = new Set(['sent', 'delivered', 'bounced', 'complained']);

function rate(numerator: number, denominator: number) {
	if (denominator === 0) return null;
	return Math.round((numerator * 1000) / denominator) / 10;
}

function sumWhere<T>(rows: T[], match: (row: T) => boolean, total: (row: T) => number) {
	return rows.filter(match).reduce((sum, row) => sum + total(row), 0);
}

function engagementBucket(
	messages: Array<{ status: string; isTest: boolean; total: number }>,
	events: Array<{ type: string; isTest: boolean; total: number }>,
	isTest: boolean
) {
	const sent = sumWhere(
		messages,
		(row) => row.isTest === isTest && SENT_MESSAGE_STATUSES.has(row.status),
		(row) => Number(row.total)
	);
	const delivered = sumWhere(
		messages,
		(row) => row.isTest === isTest && row.status === 'delivered',
		(row) => Number(row.total)
	);
	const bounced = sumWhere(
		messages,
		(row) => row.isTest === isTest && row.status === 'bounced',
		(row) => Number(row.total)
	);
	const complained = sumWhere(
		messages,
		(row) => row.isTest === isTest && row.status === 'complained',
		(row) => Number(row.total)
	);
	const skipped = sumWhere(
		messages,
		(row) => row.isTest === isTest && row.status === 'skipped',
		(row) => Number(row.total)
	);
	const opened = sumWhere(
		events,
		(row) => row.isTest === isTest && row.type === 'opened',
		(row) => Number(row.total)
	);
	const clicked = sumWhere(
		events,
		(row) => row.isTest === isTest && row.type === 'clicked',
		(row) => Number(row.total)
	);
	const counts = { sent, delivered, opened, clicked };
	return {
		steps: ENGAGEMENT_FUNNEL.map((name, index) => {
			const previous = index === 0 ? null : ENGAGEMENT_FUNNEL[index - 1];
			return {
				name,
				count: counts[name],
				rateFromPrevious: previous ? rate(counts[name], counts[previous]) : null
			};
		}),
		bounced,
		complained,
		skipped
	};
}

async function emailEngagementForTenant(ctx: TenantContext) {
	const [contacts, waiting, messages, events, enrollments] = await Promise.all([
		countEmailContactsForTenant(ctx),
		countUnenrolledProductionLeadsForTenant(ctx),
		countEmailMessagesByStatusForTenant(ctx),
		countEmailEventsByTypeForTenant(ctx),
		countEmailEnrollmentsByStatusForTenant(ctx)
	]);
	const enrollmentCounts = {
		active: 0,
		completed: 0,
		suppressed: 0,
		cancelled: 0
	};
	for (const row of enrollments) {
		if (row.status in enrollmentCounts) {
			enrollmentCounts[row.status as keyof typeof enrollmentCounts] += Number(row.total);
		}
	}
	return {
		contacts,
		waiting,
		enrollments: enrollmentCounts,
		production: engagementBucket(messages, events, false),
		preview: engagementBucket(messages, events, true)
	};
}

export async function getEmailOverview(actor: Actor, ctx: TenantContext, clientId?: string) {
	requireCapability(actor.permissions, 'email.read');
	const required = assertActorOwnsContext(actor, ctx);
	if (clientId) assertEmailClient(required, clientId);
	const [
		connection,
		domains,
		sequences,
		enrollments,
		messages,
		suppressions,
		health,
		engagement,
		inbound
	] = await Promise.all([
		getEmailConnectionForTenant(required),
		listEmailDomainsForTenant(required),
		listEmailSequencesForTenant(required),
		listEmailEnrollmentsForTenant(required),
		listEmailMessagesForTenant(required),
		listSuppressionsForTenant(required),
		getDomainEmailProvider().health(),
		emailEngagementForTenant(required),
		listInboundMessagesForTenant(required)
	]);
	return {
		connection,
		domains,
		sequences,
		enrollments,
		messages,
		suppressions,
		inbound,
		provider: health,
		readiness: await emailSendingReadiness(required),
		engagement
	};
}

export async function upsertSendingDomain(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'email.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(upsertEmailDomainSchema, input);
	await ensureEmailConnectionForTenant(required);
	await ensureWelcomeTopicForTenant(required);
	const row = await upsertEmailDomainForTenant(required, {
		domain: parsed.domain,
		fromAddress: parsed.fromAddress.toLowerCase(),
		fromName: parsed.fromName,
		fromApproved: parsed.fromApproved,
		dkimSelector: parsed.dkimSelector
	});
	const checked = await recheckStoredDomain(required, row.id);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'email.domain.upsert',
		entityType: 'email_domain',
		entityId: row.id,
		requestId
	});
	return checked ?? row;
}

export async function recheckSendingDomain(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'email.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(emailDomainIdSchema, input);
	const row = await recheckStoredDomain(required, parsed.id);
	if (!row) throw new NotFoundError('Email domain not found');
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'email.domain.recheck',
		entityType: 'email_domain',
		entityId: row.id,
		requestId
	});
	return row;
}

export async function addClientSuppression(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'email.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(addEmailSuppressionSchema, input);
	const row = await insertClientSuppressionForTenant(required, {
		email: parsed.email,
		reason: parsed.reason,
		source: 'operator'
	});
	await cancelActiveEnrollmentsForEmail(required, parsed.email.toLowerCase());
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'email.suppression.add',
		entityType: 'email_suppression',
		entityId: row.id,
		requestId,
		reason: parsed.reason
	});
	return row;
}

async function sendEnrollmentStep(ctx: TenantContext, enrollmentId: string, stepIndex: number) {
	const enrollment = await getEnrollmentForTenant(ctx, enrollmentId);
	if (!enrollment || enrollment.status !== 'active')
		return { skipped: true, reason: 'enrollment_inactive' };
	const sequence = await getApprovedWelcomeSequenceForTenant(ctx);
	if (!sequence) return { skipped: true, reason: 'sequence_missing' };
	const step = sequence.steps.find((row) => row.stepIndex === stepIndex);
	if (!step) {
		await updateEnrollmentForTenant(ctx, enrollment.id, {
			status: 'completed',
			nextStepAt: null,
			completedAt: new Date()
		});
		return { completed: true };
	}

	const contact = await getContactForTenant(ctx, enrollment.contactId);
	if (!contact) throw new NotFoundError('Contact not found');
	const lead = await getLeadWithContactForTenant(ctx, enrollment.leadId);
	const isTest = Boolean(lead?.lead.isTest);
	const snapshot = await eligibilitySnapshot(ctx, {
		email: enrollment.email,
		contactId: enrollment.contactId,
		isTest,
		topic: step.topic
	});
	const decision = evaluateSendEligibility(snapshot);
	const idempotencyKey = NURTURE_STEP_WORKFLOW.idempotencyKey({
		clientId: ctx.clientId,
		enrollmentId: enrollment.id,
		stepIndex
	});
	const existing = await getEmailMessageByIdempotency(ctx, idempotencyKey);
	if (existing) return { duplicate: true, message: existing };

	if (!decision.allowed) {
		const skipped = await insertEmailMessageForTenant(ctx, {
			contactId: enrollment.contactId,
			leadId: enrollment.leadId,
			enrollmentId: enrollment.id,
			sequenceId: enrollment.sequenceId,
			stepIndex,
			toAddress: enrollment.email,
			fromAddress: 'none',
			subject: step.subject,
			status: 'skipped',
			provider: 'none',
			idempotencyKey,
			skipReason: decision.detail,
			isTest
		});
		if (
			decision.blockedBy === 'global_suppression' ||
			decision.blockedBy === 'client_suppression' ||
			decision.blockedBy === 'consent'
		) {
			await updateEnrollmentForTenant(ctx, enrollment.id, {
				status: 'suppressed',
				nextStepAt: null
			});
		}
		return { skipped: true, reason: decision.blockedBy, message: skipped };
	}

	const domain = await getReadyEmailDomainForTenant(ctx);
	if (!domain) throw new ValidationError('Sending domain is not ready');
	const production = await getProductionDomainForTenant(ctx);
	const token = createUnsubscribeToken(env.EMAIL_UNSUBSCRIBE_SECRET, {
		clientId: ctx.clientId,
		contactId: enrollment.contactId,
		email: enrollment.email
	});
	const unsub = unsubscribeUrlFor(production?.hostname ?? null, token);
	const queued = await insertEmailMessageForTenant(ctx, {
		contactId: enrollment.contactId,
		leadId: enrollment.leadId,
		enrollmentId: enrollment.id,
		sequenceId: enrollment.sequenceId,
		stepIndex,
		toAddress: enrollment.email,
		fromAddress: domain.fromAddress,
		subject: step.subject,
		status: 'queued',
		provider: 'resend',
		idempotencyKey,
		isTest
	});
	const result = await getDomainEmailProvider().send({
		clientId: ctx.clientId,
		messageId: queued.id,
		idempotencyKey,
		fromAddress: domain.fromAddress,
		fromName: domain.fromName,
		to: enrollment.email,
		subject: step.subject,
		html: `${step.htmlBody}<p><a href="${unsub}">Unsubscribe</a></p>`,
		text: `${step.textBody}\n\nUnsubscribe: ${unsub}`,
		unsubscribeUrl: unsub,
		isTest
	});
	if (result.skipped) {
		await updateEmailMessageForTenant(ctx, queued.id, {
			status: 'skipped',
			providerMessageId: result.providerMessageId,
			skipReason: 'provider_skipped_test'
		});
		return { skipped: true, reason: 'provider_skipped_test' };
	}
	await updateEmailMessageForTenant(ctx, queued.id, {
		status: 'sent',
		providerMessageId: result.providerMessageId
	});
	const next = sequence.steps.find((row) => row.stepIndex === stepIndex + 1);
	if (!next) {
		await updateEnrollmentForTenant(ctx, enrollment.id, {
			status: 'completed',
			currentStepIndex: stepIndex,
			nextStepAt: null,
			completedAt: new Date()
		});
	} else {
		await updateEnrollmentForTenant(ctx, enrollment.id, {
			currentStepIndex: stepIndex + 1,
			nextStepAt: new Date(Date.now() + next.delayMinutes * 60_000)
		});
	}
	logInfo('email.nurture.sent', {
		requestId: ctx.requestId,
		clientId: ctx.clientId,
		enrollmentId: enrollment.id,
		stepIndex
	});
	return { sent: true, messageId: queued.id };
}

export async function processLeadCapturedWorkflow(input: unknown) {
	const parsed = parseContract(leadCapturedInputSchema, input);
	const ctx = tenantFrom(parsed);
	const captured = await getLeadWithContactForTenant(ctx, parsed.leadId);
	if (!captured) throw new NotFoundError('Lead not found');
	const sequence = await getApprovedWelcomeSequenceForTenant(ctx);
	if (!sequence) return { enrolled: false, reason: 'sequence_missing' };
	const existing = await getEnrollmentForLead(ctx, captured.lead.id, sequence.sequence.id);
	if (existing) return { enrolled: true, duplicate: true, enrollment: existing };
	await upsertEmailContactForTenant(ctx, {
		contactId: captured.contact.id,
		email: captured.contact.email,
		topicPreferences: { welcome: true }
	});
	const snapshot = await eligibilitySnapshot(ctx, {
		email: captured.contact.email,
		contactId: captured.contact.id,
		isTest: captured.lead.isTest,
		topic: 'welcome'
	});
	const decision = evaluateSendEligibility(snapshot);
	if (!decision.allowed) {
		logInfo('email.nurture.skip', {
			requestId: ctx.requestId,
			clientId: ctx.clientId,
			leadId: captured.lead.id,
			reason: decision.blockedBy
		});
		return { enrolled: false, reason: decision.blockedBy, detail: decision.detail };
	}
	const first = sequence.steps[0];
	const enrollment = await insertEnrollmentForTenant(ctx, {
		sequenceId: sequence.sequence.id,
		contactId: captured.contact.id,
		leadId: captured.lead.id,
		email: captured.contact.email,
		nextStepAt: new Date()
	});
	await recordAudit({
		organizationId: ctx.organizationId,
		clientId: ctx.clientId,
		actorType: 'automation',
		actorId: LEAD_CAPTURED_WORKFLOW.name,
		action: 'email.nurture.enroll',
		entityType: 'email_sequence_enrollment',
		entityId: enrollment.id,
		requestId: ctx.requestId
	});
	if (first && first.delayMinutes === 0) {
		await sendEnrollmentStep(ctx, enrollment.id, 0);
	} else if (first) {
		await updateEnrollmentForTenant(ctx, enrollment.id, {
			nextStepAt: new Date(Date.now() + first.delayMinutes * 60_000)
		});
	}
	return { enrolled: true, enrollmentId: enrollment.id };
}

export async function processNurtureStepWorkflow(input: unknown) {
	const parsed = parseContract(nurtureStepInputSchema, input);
	return sendEnrollmentStep(tenantFrom(parsed), parsed.enrollmentId, parsed.stepIndex);
}

export async function processDueNurtureSteps(ctx: TenantContext, now = new Date()) {
	const required = requireTenantContext(ctx);
	const due = await listDueEnrollmentsForTenant(required, now);
	const results = [];
	for (const enrollment of due) {
		results.push(await sendEnrollmentStep(required, enrollment.id, enrollment.currentStepIndex));
	}
	return results;
}

export async function processDueNurtureForOperator(
	actor: Actor,
	ctx: TenantContext,
	requestId: string,
	now = new Date()
) {
	requireCapability(actor.permissions, 'email.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const results = await processDueNurtureSteps(required, now);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'email.nurture.process_due',
		entityType: 'email_sequence_enrollment',
		entityId: NURTURE_DUE_SWEEP_WORKFLOW.name,
		requestId,
		reason: NURTURE_DUE_SWEEP_WORKFLOW.idempotencyKey({
			clientId: required.clientId,
			windowStart: now.toISOString().slice(0, 13)
		})
	});
	return {
		processed: results.length,
		sent: results.filter((row) => 'sent' in row && row.sent).length,
		results
	};
}

export async function enrollEligibleLeads(
	ctx: TenantContext,
	options: { limit?: number; leadId?: string } = {}
) {
	const required = requireTenantContext(ctx);
	const synced = await syncEmailContactsFromLeadsForTenant(required);
	const waiting = options.leadId
		? [{ lead: { id: options.leadId } }]
		: await listUnenrolledProductionLeadsForTenant(required, options.limit ?? 25);
	const results = [];
	for (const row of waiting) {
		results.push(
			await processLeadCapturedWorkflow({
				organizationId: required.organizationId,
				clientId: required.clientId,
				leadId: row.lead.id,
				requestId: required.requestId
			})
		);
	}
	return {
		synced: synced.length,
		attempted: results.length,
		enrolled: results.filter((row) => row.enrolled && !('duplicate' in row && row.duplicate))
			.length,
		results
	};
}

export async function enrollEligibleLeadsForOperator(
	actor: Actor,
	ctx: TenantContext,
	requestId: string
) {
	requireCapability(actor.permissions, 'email.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const result = await enrollEligibleLeads({ ...required, requestId });
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'email.nurture.enroll_eligible',
		entityType: 'email_sequence_enrollment',
		entityId: ENROLL_ELIGIBLE_WORKFLOW.name,
		requestId,
		reason: ENROLL_ELIGIBLE_WORKFLOW.idempotencyKey({
			clientId: required.clientId,
			windowStart: new Date().toISOString().slice(0, 13)
		})
	});
	return result;
}

export async function tryEnrollCapturedLead(ctx: TenantContext, leadId: string) {
	try {
		return await processLeadCapturedWorkflow({
			organizationId: ctx.organizationId,
			clientId: ctx.clientId,
			leadId,
			requestId: ctx.requestId
		});
	} catch (error) {
		logError('email.nurture.enroll', error, { clientId: ctx.clientId, leadId });
		return { enrolled: false, reason: 'error' };
	}
}

export async function unsubscribeByToken(
	input: unknown,
	requestId: string,
	hostnameClientId?: string,
	ip = '127.0.0.1'
) {
	const parsed = parseContract(unsubscribeTokenSchema, input);
	consumeRateLimit(`unsub:${ip}`, 20, 15 * 60_000);
	const payload = parseUnsubscribeToken(env.EMAIL_UNSUBSCRIBE_SECRET, parsed.token);
	if (!payload) throw new UnauthorizedError('Unsubscribe token is invalid');
	if (hostnameClientId && hostnameClientId !== payload.clientId) {
		throw new UnauthorizedError('Unsubscribe token does not match this host');
	}
	const contact = await findContactForUnsubscribe(
		payload.clientId,
		payload.contactId,
		payload.email
	);
	if (!contact) throw new NotFoundError('Contact not found');
	const tenant: TenantContext = {
		organizationId: contact.organizationId,
		clientId: contact.clientId,
		roleIds: [],
		requestId
	};
	await insertClientSuppressionForTenant(tenant, {
		email: payload.email,
		reason: 'unsubscribe',
		source: 'unsubscribe_link'
	});
	await insertConsentEventForTenant(tenant, {
		contactId: contact.id,
		purpose: 'marketing',
		decision: 'denied',
		source: 'unsubscribe',
		copyVersion: CONSENT_COPY_VERSION,
		requestId
	});
	await upsertEmailContactForTenant(tenant, {
		contactId: contact.id,
		email: payload.email,
		topicPreferences: { welcome: false, marketing: false }
	});
	await cancelActiveEnrollmentsForEmail(tenant, payload.email);
	await recordAudit({
		organizationId: tenant.organizationId,
		clientId: tenant.clientId,
		actorType: 'system',
		actorId: 'unsubscribe',
		action: 'email.unsubscribe',
		entityType: 'contact',
		entityId: contact.id,
		requestId
	});
	return { email: payload.email, clientId: tenant.clientId };
}

export async function processEmailWebhook(
	headers: Record<string, string | undefined>,
	payload: string,
	requestId: string,
	ip = '127.0.0.1'
) {
	consumeRateLimit(`email-hook:${ip}`, 120, 60_000);
	const parsed = await getDomainEmailProvider().verifyWebhook(headers, payload);
	const applied = [];
	for (const event of parsed.delivery) {
		applied.push(await applyProviderEvent(event, requestId));
	}
	for (const inbound of parsed.inbound) {
		applied.push(await applyInboundMessage(inbound, requestId));
	}
	return applied;
}

export async function reviewInboundMessage(
	actor: Actor,
	ctx: TenantContext,
	input: unknown,
	requestId: string
) {
	requireCapability(actor.permissions, 'email.manage');
	const required = assertActorOwnsContext(actor, ctx);
	const parsed = parseContract(emailInboundIdSchema, input);
	const existing = await getInboundMessageForTenant(required, parsed.id);
	if (!existing) throw new NotFoundError('Inbound message not found');
	const row = await markInboundReviewedForTenant(required, existing.id);
	await recordAudit({
		organizationId: required.organizationId,
		clientId: required.clientId,
		actorType: 'human',
		actorId: actor.userId,
		action: 'email.inbound.review',
		entityType: 'email_inbound_message',
		entityId: existing.id,
		requestId
	});
	return { ...row, autoReply: false };
}

async function applyProviderEvent(event: NormalizedEmailEvent, requestId: string) {
	const message = await findEmailMessageByProviderId(event.providerMessageId);
	if (!message) {
		logInfo('email.webhook.unknown_message', {
			requestId,
			providerMessageId: event.providerMessageId,
			type: event.type
		});
		return { skipped: true, reason: 'unknown_message' };
	}
	const ctx: TenantContext = {
		organizationId: message.organizationId,
		clientId: message.clientId,
		roleIds: [],
		requestId
	};
	const inserted = await insertEmailEventForTenant(ctx, {
		messageId: message.id,
		providerEventId: event.providerEventId,
		type: event.type,
		payload: { providerMessageId: event.providerMessageId },
		occurredAt: event.occurredAt
	});
	if (inserted.duplicate) return { duplicate: true, clientId: ctx.clientId };
	if (event.type === 'delivered') {
		await updateEmailMessageForTenant(ctx, message.id, { status: 'delivered' });
	}
	if (event.type === 'bounced' || event.type === 'complained') {
		await updateEmailMessageForTenant(ctx, message.id, { status: event.type });
		await insertClientSuppressionForTenant(ctx, {
			email: message.toAddress,
			reason: event.type === 'complained' ? 'complaint' : 'bounce',
			source: 'provider_webhook'
		});
		if (event.type === 'complained') {
			await insertGlobalSuppression({
				email: message.toAddress,
				reason: 'complaint',
				source: 'provider_webhook'
			});
		}
		await cancelActiveEnrollmentsForEmail(ctx, message.toAddress);
	}
	return { ok: true, clientId: ctx.clientId, type: event.type };
}

async function applyInboundMessage(inbound: NormalizedInboundEmail, requestId: string) {
	const domains = await findEmailDomainsByRecipient(inbound.toAddress);
	const clientIds = [...new Set(domains.map((row) => row.clientId))];
	if (clientIds.length !== 1) {
		logInfo('email.inbound.unresolved', {
			requestId,
			toAddress: inbound.toAddress,
			matches: clientIds.length
		});
		return {
			skipped: true,
			reason: clientIds.length === 0 ? 'unknown_recipient' : 'ambiguous_recipient',
			autoReply: false
		};
	}
	const domain = domains[0]!;
	const ctx: TenantContext = {
		organizationId: domain.organizationId,
		clientId: domain.clientId,
		roleIds: [],
		requestId
	};
	const contact = await getContactByEmailForTenant(ctx, inbound.fromAddress);
	const classified = classifyInboundReply(inbound.subject, inbound.textBody);
	const inserted = await insertInboundMessageForTenant(ctx, {
		contactId: contact?.id ?? null,
		fromAddress: inbound.fromAddress,
		toAddress: inbound.toAddress,
		subject: inbound.subject,
		textBody: inbound.textBody,
		classification: classified.classification,
		requiresHumanReview: classified.requiresHumanReview,
		provider: 'resend',
		providerEventId: inbound.providerEventId,
		providerMessageId: inbound.providerMessageId,
		occurredAt: inbound.occurredAt
	});
	if (inserted.duplicate) {
		return { duplicate: true, clientId: ctx.clientId, autoReply: false };
	}
	await recordAudit({
		organizationId: ctx.organizationId,
		clientId: ctx.clientId,
		actorType: 'automation',
		actorId: INBOUND_EMAIL_WORKFLOW.name,
		action: 'email.inbound.receive',
		entityType: 'email_inbound_message',
		entityId: inserted.message.id,
		requestId,
		reason: INBOUND_EMAIL_WORKFLOW.idempotencyKey({
			clientId: ctx.clientId,
			providerEventId: inbound.providerEventId
		})
	});
	return {
		ok: true,
		clientId: ctx.clientId,
		inboundId: inserted.message.id,
		classification: classified.classification,
		autoReply: classified.autoReplyAllowed,
		sent: false
	};
}
