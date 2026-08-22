import { afterEach, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { classifyInboundReply, evaluateSendEligibility } from '@vector/compliance';
import { env } from '@vector/config';
import {
	ForbiddenError,
	LIVE_REQUIRED_ITEM_KEYS,
	TenantContextError,
	requireTenantContext
} from '@vector/contracts';
import {
	clients,
	countEmailEventsByTypeForTenant,
	db,
	emailDomains,
	getEmailContactForTenant,
	getPublishedHomeForTenant,
	getSiteForTenant,
	listEmailMessagesForTenant,
	listInboundMessagesForTenant,
	listSuppressionsForTenant
} from '@vector/db';
import {
	addClientSuppression,
	captureLead,
	contextFor,
	deliveryTenantContext,
	enrollEligibleLeads,
	enrollEligibleLeadsForOperator,
	getEmailOverview,
	getLaunch,
	login,
	processDueNurtureForOperator,
	processDueNurtureSteps,
	processEmailWebhook,
	recalculateReadiness,
	reviewInboundMessage,
	resetDomainEmailProvider,
	resetWorkflowRuntime,
	resolveSession,
	setDomainEmailProvider,
	switchActiveClient,
	unsubscribeByToken,
	upsertSendingDomain
} from '@vector/domain';
import {
	MemoryEmailProvider,
	createUnsubscribeToken,
	evaluateSendingDomain,
	resetDnsLookup,
	setDnsLookup
} from '@vector/email';
import { app } from '../apps/api/src/app';

const memory = new MemoryEmailProvider();

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
}

async function adminOn(clientId: string, ip: string, requestId: string) {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		ip
	);
	await switchActiveClient(session, session.token, clientId, `${requestId}-switch`);
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	return actor;
}

async function pageIds(ctx: ReturnType<typeof contextFor>) {
	const [published, site] = await Promise.all([
		getPublishedHomeForTenant(ctx),
		getSiteForTenant(ctx)
	]);
	if (!published || !site) throw new Error('Published home missing. Seed and publish first.');
	return {
		siteId: site.id,
		funnelId: published.page.funnelId,
		pageId: published.page.id,
		pageVersionId: published.version.id
	};
}

function readyLookup(domain: string) {
	return async (name: string) => {
		if (name === domain) return ['v=spf1 include:resend.com ~all'];
		if (name === `resend._domainkey.${domain}`) return ['v=DKIM1; k=rsa; p=test'];
		if (name === `_dmarc.${domain}`) return ['v=DMARC1; p=none;'];
		return [];
	};
}

async function readyDomain(
	actor: Awaited<ReturnType<typeof adminOn>>,
	ctx: ReturnType<typeof contextFor>,
	domain: string
) {
	setDnsLookup(readyLookup(domain));
	return upsertSendingDomain(
		actor,
		ctx,
		{
			domain,
			fromAddress: `hello@${domain}`,
			fromName: 'Client Alpha Dental',
			fromApproved: true,
			dkimSelector: 'resend'
		},
		'email-ready-domain'
	);
}

afterEach(() => {
	resetDnsLookup();
	resetDomainEmailProvider();
	resetWorkflowRuntime();
	memory.reset();
});

test('send eligibility follows global then client then consent then topic', () => {
	const base = {
		email: 'a@alpha.test',
		isTest: false,
		sendingPaused: false,
		connectionActive: true,
		domainReady: true,
		fromApproved: true,
		globalSuppressed: false,
		clientSuppressed: false,
		marketingConsent: 'granted' as const,
		topicAllowed: true,
		jurisdiction: 'us_can_spam' as const,
		jurisdictionAllowsMarketing: true,
		sequenceApproved: true
	};
	expect(evaluateSendEligibility(base).allowed).toBe(true);
	expect(evaluateSendEligibility({ ...base, isTest: true }).blockedBy).toBe('preview_or_test');
	expect(evaluateSendEligibility({ ...base, globalSuppressed: true }).blockedBy).toBe(
		'global_suppression'
	);
	expect(evaluateSendEligibility({ ...base, clientSuppressed: true }).blockedBy).toBe(
		'client_suppression'
	);
	expect(evaluateSendEligibility({ ...base, marketingConsent: 'denied' }).blockedBy).toBe(
		'consent'
	);
	expect(evaluateSendEligibility({ ...base, topicAllowed: false }).blockedBy).toBe('topic');
	expect(evaluateSendEligibility({ ...base, jurisdictionAllowsMarketing: false }).blockedBy).toBe(
		'jurisdiction'
	);
	expect(evaluateSendEligibility({ ...base, sequenceApproved: false }).blockedBy).toBe('campaign');
	expect(evaluateSendEligibility({ ...base, domainReady: false }).blockedBy).toBe('domain');
});

test('sending domain readiness is machine-checked from DNS records', () => {
	const ready = evaluateSendingDomain({
		domain: 'mail.alpha.test',
		fromAddress: 'hello@mail.alpha.test',
		fromApproved: true,
		records: {
			apex: ['v=spf1 include:_spf.resend.com ~all'],
			dkim: ['v=DKIM1; k=rsa; p=abc'],
			dmarc: ['v=DMARC1; p=quarantine;']
		}
	});
	expect(ready.ready).toBe(true);
	const missing = evaluateSendingDomain({
		domain: 'mail.alpha.test',
		fromAddress: 'hello@mail.alpha.test',
		fromApproved: true,
		records: { apex: [], dkim: [], dmarc: [] }
	});
	expect(missing.ready).toBe(false);
	expect(missing.spf.ok).toBe(false);
});

test('live launch requires email sending; Vector Ready does not', async () => {
	expect(LIVE_REQUIRED_ITEM_KEYS).toContain('email.sending');
	expect(LIVE_REQUIRED_ITEM_KEYS).toContain('domain.production');
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.3.2', 'email-ready-gate');
	const ctx = contextFor(actor, 'email-ready-gate');
	const launch = await getLaunch(actor, ctx);
	expect(launch.readiness.vectorReady).toBe(true);
	expect(launch.items.find((item) => item.key === 'email.sending')?.blocking).toBe(false);
});

test('missing TenantContext cannot read email records', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listEmailMessagesForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listSuppressionsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(countEmailEventsByTypeForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(processDueNurtureSteps(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(enrollEligibleLeads(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(listInboundMessagesForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('user on client A cannot read client B email', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.3.3'
	);
	const ctx = contextFor(session, 'email-iso');
	expect(ctx.clientId).toBe(alpha.id);
	const own = await getEmailOverview(session, ctx);
	expect(JSON.stringify(own)).not.toContain(beta.id);
	await expect(getEmailOverview(session, ctx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant email through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/email/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('warehouse');
});

test('missing email.manage returns 403', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.3.4'
	);
	const ctx = contextFor(session, 'email-cap');
	const actor = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'email.manage')
	};
	await expect(
		upsertSendingDomain(
			actor,
			ctx,
			{
				domain: 'blocked.alpha.test',
				fromAddress: 'hello@blocked.alpha.test',
				fromName: 'Blocked',
				fromApproved: true
			},
			'email-cap'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(
		enrollEligibleLeadsForOperator(actor, ctx, 'email-cap-enroll')
	).rejects.toBeInstanceOf(ForbiddenError);
	await expect(processDueNurtureForOperator(actor, ctx, 'email-cap-due')).rejects.toBeInstanceOf(
		ForbiddenError
	);
	await expect(
		reviewInboundMessage(
			actor,
			ctx,
			{ id: '00000000-0000-4000-8000-000000000001' },
			'email-cap-inbound'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
});

test('preview and denied-marketing leads do not send production email', async () => {
	setDomainEmailProvider(memory);
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.3.5', 'email-preview');
	const ctx = contextFor(actor, 'email-preview');
	const domain = `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`;
	await readyDomain(actor, ctx, domain);
	const pages = await pageIds(ctx);
	await captureLead(
		deliveryTenantContext(ctx, 'email-preview-lead'),
		{
			name: 'Preview Lead',
			email: `preview-${crypto.randomUUID()}@alpha.test`,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...pages
		},
		'email-preview-lead',
		'10.0.3.51'
	);
	await captureLead(
		deliveryTenantContext({ ...ctx, requestId: 'email-denied' }, 'email-denied'),
		{
			name: 'Denied Marketing',
			email: `denied-${crypto.randomUUID()}@alpha.test`,
			consentLeadFollowUp: true,
			consentMarketing: false,
			hostname: 'alpha.example',
			domainKind: 'production',
			...pages
		},
		'email-denied',
		'10.0.3.52'
	);
	expect(memory.sent).toHaveLength(0);
});

test('eligible production lead completes the approved welcome sequence', async () => {
	setDomainEmailProvider(memory);
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.3.6', 'email-complete');
	const ctx = contextFor(actor, 'email-complete');
	const domain = `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`;
	const saved = await readyDomain(actor, ctx, domain);
	expect(saved.status).toBe('ready');
	const launch = await recalculateReadiness(actor, ctx, 'email-complete-ready');
	expect(launch.items.find((item) => item.key === 'email.sending')?.status).toBe('complete');
	const email = `nurture-${crypto.randomUUID()}@alpha.test`;
	const captured = await captureLead(
		deliveryTenantContext(ctx, 'email-complete-lead'),
		{
			name: 'Nurture Lead',
			email,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'alpha.example',
			domainKind: 'production',
			...(await pageIds(ctx))
		},
		'email-complete-lead',
		'10.0.3.53'
	);
	expect(captured.nurture?.enrolled).toBe(true);
	expect(memory.sent.filter((row) => row.to === email)).toHaveLength(1);
	expect(memory.sent.find((row) => row.to === email)?.subject).toContain('consult request');
	await processDueNurtureSteps(ctx, new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
	expect(memory.sent.filter((row) => row.to === email)).toHaveLength(2);
	const overview = await getEmailOverview(actor, ctx);
	expect(
		overview.enrollments.some((row) => row.email === email && row.status === 'completed')
	).toBe(true);
	expect(overview.workflows.adapter).toBe('in-process');
	expect(JSON.stringify(overview)).not.toContain(beta.id);
	expect(memory.skipped).toHaveLength(0);
});

test('client suppression stays on one tenant; global complaint blocks both', async () => {
	setDomainEmailProvider(memory);
	const { alpha, beta } = await seededClients();
	const shared = `shared-${crypto.randomUUID()}@example.test`;
	const alphaActor = await adminOn(alpha.id, '10.0.3.7', 'email-sup-a');
	const alphaCtx = contextFor(alphaActor, 'email-sup-a');
	await readyDomain(alphaActor, alphaCtx, `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`);
	await addClientSuppression(
		alphaActor,
		alphaCtx,
		{ email: shared, reason: 'operator' },
		'email-sup-a'
	);
	await captureLead(
		deliveryTenantContext(alphaCtx, 'email-sup-a-lead'),
		{
			name: 'Suppressed Alpha',
			email: shared,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'alpha.example',
			domainKind: 'production',
			...(await pageIds(alphaCtx))
		},
		'email-sup-a-lead',
		'10.0.3.54'
	);
	expect(memory.sent.filter((row) => row.to === shared)).toHaveLength(0);

	const betaActor = await adminOn(beta.id, '10.0.3.8', 'email-sup-b');
	const betaCtx = contextFor(betaActor, 'email-sup-b');
	await readyDomain(betaActor, betaCtx, `mail-${crypto.randomUUID().slice(0, 8)}.beta.test`);
	const betaLead = await captureLead(
		deliveryTenantContext(betaCtx, 'email-sup-b-lead'),
		{
			name: 'Open Beta',
			email: shared,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'beta.example',
			domainKind: 'production',
			...(await pageIds(betaCtx))
		},
		'email-sup-b-lead',
		'10.0.3.55'
	);
	expect(betaLead.nurture?.enrolled).toBe(true);
	expect(memory.sent.some((row) => row.to === shared && row.clientId === beta.id)).toBe(true);

	const betaOverview = await getEmailOverview(betaActor, betaCtx);
	const sent = betaOverview.messages.find(
		(row) => row.toAddress === shared && row.status === 'sent'
	);
	expect(sent?.providerMessageId).toBeTruthy();
	await processEmailWebhook(
		{},
		JSON.stringify({
			type: 'email.complained',
			created_at: new Date().toISOString(),
			data: { email_id: sent?.providerMessageId, to: [shared] }
		}),
		'email-complaint',
		'10.0.3.9'
	);
	memory.reset();
	const later = `later-${crypto.randomUUID()}@example.test`;
	await captureLead(
		deliveryTenantContext(alphaCtx, 'email-sup-global'),
		{
			name: 'After Complaint',
			email: shared,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'alpha.example',
			domainKind: 'production',
			...(await pageIds(alphaCtx))
		},
		'email-sup-global',
		'10.0.3.56'
	);
	expect(memory.sent.filter((row) => row.to === shared)).toHaveLength(0);
	expect(later).toContain('later');
});

test('unsubscribe token records consent denial and client suppression', async () => {
	setDomainEmailProvider(memory);
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.3.10', 'email-unsub');
	const ctx = contextFor(actor, 'email-unsub');
	await readyDomain(actor, ctx, `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`);
	const email = `unsub-${crypto.randomUUID()}@alpha.test`;
	const captured = await captureLead(
		deliveryTenantContext(ctx, 'email-unsub-lead'),
		{
			name: 'Unsub Lead',
			email,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'alpha.example',
			domainKind: 'production',
			...(await pageIds(ctx))
		},
		'email-unsub-lead',
		'10.0.3.57'
	);
	expect(memory.sent).toHaveLength(1);
	const token = createUnsubscribeToken(env.EMAIL_UNSUBSCRIBE_SECRET, {
		clientId: alpha.id,
		contactId: captured.contact.id,
		email
	});
	const result = await unsubscribeByToken({ token }, 'email-unsub', alpha.id);
	expect(result.email).toBe(email);
	memory.reset();
	await processDueNurtureSteps(ctx, new Date(Date.now() + 2 * 24 * 60 * 60 * 1000));
	expect(memory.sent.filter((row) => row.to === email)).toHaveLength(0);
	const overview = await getEmailOverview(actor, ctx);
	expect(
		overview.suppressions.some((row) => row.email === email && row.reason === 'unsubscribe')
	).toBe(true);
	const emailContact = await getEmailContactForTenant(ctx, email);
	expect(emailContact?.topicPreferences.welcome).toBe(false);
	expect(emailContact?.topicPreferences.marketing).toBe(false);
});

function engagementCount(
	overview: Awaited<ReturnType<typeof getEmailOverview>>,
	lane: 'production' | 'preview',
	name: string
) {
	return overview.engagement[lane].steps.find((step) => step.name === name)?.count ?? 0;
}

test('denied-marketing leads still sync an email contact', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.3.11', 'email-sync');
	const ctx = contextFor(actor, 'email-sync');
	const email = `sync-${crypto.randomUUID()}@alpha.test`;
	await captureLead(
		deliveryTenantContext(ctx, 'email-sync-lead'),
		{
			name: 'Sync Denied',
			email,
			consentLeadFollowUp: true,
			consentMarketing: false,
			hostname: 'alpha.example',
			domainKind: 'production',
			...(await pageIds(ctx))
		},
		'email-sync-lead',
		'10.0.3.58'
	);
	const synced = await getEmailContactForTenant(ctx, email);
	expect(synced?.email).toBe(email);
	expect(synced?.clientId).toBe(alpha.id);
});

test('opened and clicked events stay on the message tenant', async () => {
	setDomainEmailProvider(memory);
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '10.0.3.12', 'email-engage-a');
	const alphaCtx = contextFor(alphaActor, 'email-engage-a');
	await readyDomain(alphaActor, alphaCtx, `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`);
	const alphaEmail = `open-${crypto.randomUUID()}@alpha.test`;
	await captureLead(
		deliveryTenantContext(alphaCtx, 'email-engage-a-lead'),
		{
			name: 'Open Alpha',
			email: alphaEmail,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'alpha.example',
			domainKind: 'production',
			...(await pageIds(alphaCtx))
		},
		'email-engage-a-lead',
		'10.0.3.59'
	);
	const before = await getEmailOverview(alphaActor, alphaCtx);
	const sent = before.messages.find((row) => row.toAddress === alphaEmail && row.status === 'sent');
	expect(sent?.providerMessageId).toBeTruthy();
	await processEmailWebhook(
		{},
		JSON.stringify({
			type: 'email.delivered',
			created_at: new Date().toISOString(),
			data: { email_id: sent?.providerMessageId, to: [alphaEmail] }
		}),
		'email-engage-delivered',
		'10.0.3.13'
	);
	await processEmailWebhook(
		{},
		JSON.stringify({
			type: 'email.opened',
			created_at: new Date().toISOString(),
			data: { email_id: sent?.providerMessageId, to: [alphaEmail] }
		}),
		'email-engage-opened',
		'10.0.3.14'
	);
	await processEmailWebhook(
		{},
		JSON.stringify({
			type: 'email.clicked',
			created_at: new Date().toISOString(),
			data: { email_id: sent?.providerMessageId, to: [alphaEmail] }
		}),
		'email-engage-clicked',
		'10.0.3.15'
	);

	const betaActor = await adminOn(beta.id, '10.0.3.16', 'email-engage-b');
	const betaCtx = contextFor(betaActor, 'email-engage-b');
	await readyDomain(betaActor, betaCtx, `mail-${crypto.randomUUID().slice(0, 8)}.beta.test`);
	const betaEmail = `open-${crypto.randomUUID()}@beta.test`;
	await captureLead(
		deliveryTenantContext(betaCtx, 'email-engage-b-lead'),
		{
			name: 'Open Beta',
			email: betaEmail,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'beta.example',
			domainKind: 'production',
			...(await pageIds(betaCtx))
		},
		'email-engage-b-lead',
		'10.0.3.60'
	);
	const betaSent = (await getEmailOverview(betaActor, betaCtx)).messages.find(
		(row) => row.toAddress === betaEmail && row.status === 'sent'
	);
	await processEmailWebhook(
		{},
		JSON.stringify({
			type: 'email.opened',
			created_at: new Date().toISOString(),
			data: { email_id: betaSent?.providerMessageId, to: [betaEmail] }
		}),
		'email-engage-b-opened',
		'10.0.3.17'
	);

	const afterAlpha = await getEmailOverview(alphaActor, alphaCtx);
	const afterBeta = await getEmailOverview(betaActor, betaCtx);
	expect(engagementCount(afterAlpha, 'production', 'opened')).toBe(
		engagementCount(before, 'production', 'opened') + 1
	);
	expect(engagementCount(afterAlpha, 'production', 'clicked')).toBe(
		engagementCount(before, 'production', 'clicked') + 1
	);
	expect(engagementCount(afterAlpha, 'production', 'delivered')).toBe(
		engagementCount(before, 'production', 'delivered') + 1
	);
	expect(engagementCount(afterBeta, 'production', 'opened')).toBeGreaterThanOrEqual(1);
	expect(JSON.stringify(afterAlpha.engagement)).not.toContain(beta.id);
	expect(JSON.stringify(afterAlpha)).not.toContain(betaEmail);
});

test('eligible leads waiting on a sending domain enroll without a custom script', async () => {
	setDomainEmailProvider(memory);
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.3.18', 'email-backfill');
	const ctx = contextFor(actor, 'email-backfill');
	await db
		.update(emailDomains)
		.set({
			status: 'pending',
			fromApproved: false,
			spfReady: false,
			dkimReady: false,
			dmarcReady: false
		})
		.where(eq(emailDomains.clientId, alpha.id));
	const email = `wait-${crypto.randomUUID()}@alpha.test`;
	const captured = await captureLead(
		deliveryTenantContext(ctx, 'email-backfill-lead'),
		{
			name: 'Waiting Lead',
			email,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'alpha.example',
			domainKind: 'production',
			...(await pageIds(ctx))
		},
		'email-backfill-lead',
		'10.0.3.61'
	);
	expect(captured.nurture?.enrolled).toBe(false);
	expect(memory.sent.some((row) => row.to === email)).toBe(false);
	await readyDomain(actor, ctx, `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`);
	expect(memory.sent.some((row) => row.to === email)).toBe(false);
	const result = await enrollEligibleLeads(ctx, { leadId: captured.lead.id });
	expect(result.enrolled).toBe(1);
	expect(memory.sent.some((row) => row.to === email)).toBe(true);
	const overview = await getEmailOverview(actor, ctx);
	expect(overview.enrollments.some((row) => row.email === email && row.status === 'active')).toBe(
		true
	);
});

test('inbound classifier flags human-review classes and never allows auto-reply', () => {
	expect(classifyInboundReply('Hello', 'Thanks for the consult.').classification).toBe('general');
	expect(classifyInboundReply('Refund please', 'I want my money back').classification).toBe(
		'refund'
	);
	expect(classifyInboundReply('Lawsuit', 'I hired an attorney').requiresHumanReview).toBe(true);
	expect(classifyInboundReply('Refund please', 'I want my money back').autoReplyAllowed).toBe(
		false
	);
});

test('inbound replies stay drafts on the recipient tenant and never send', async () => {
	setDomainEmailProvider(memory);
	const { alpha, beta } = await seededClients();
	const alphaActor = await adminOn(alpha.id, '10.0.3.20', 'email-in-a');
	const alphaCtx = contextFor(alphaActor, 'email-in-a');
	const domain = `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`;
	await readyDomain(alphaActor, alphaCtx, domain);
	const from = `reply-${crypto.randomUUID()}@alpha.test`;
	const sentBefore = memory.sent.length;
	const applied = await processEmailWebhook(
		{},
		JSON.stringify({
			type: 'email.received',
			created_at: new Date().toISOString(),
			data: {
				email_id: `inb-${crypto.randomUUID()}`,
				from,
				to: [`hello@${domain}`],
				subject: 'I want a refund',
				text: 'Please refund this consult. <script>alert(1)</script>'
			}
		}),
		'email-inbound-a',
		'10.0.3.21'
	);
	expect(applied[0]).toMatchObject({
		ok: true,
		clientId: alpha.id,
		classification: 'refund',
		autoReply: false,
		sent: false
	});
	expect(memory.sent).toHaveLength(sentBefore);

	const alphaOverview = await getEmailOverview(alphaActor, alphaCtx);
	const inbound = alphaOverview.inbound.find((row) => row.fromAddress === from);
	expect(inbound?.classification).toBe('refund');
	expect(inbound?.requiresHumanReview).toBe(true);
	expect(inbound?.status).toBe('received');
	expect(inbound?.textBody).not.toContain('<script>');
	expect(inbound?.textBody).toContain('Please refund this consult.');

	const betaActor = await adminOn(beta.id, '10.0.3.22', 'email-in-b');
	const betaCtx = contextFor(betaActor, 'email-in-b');
	const betaOverview = await getEmailOverview(betaActor, betaCtx);
	expect(betaOverview.inbound.some((row) => row.fromAddress === from)).toBe(false);
	expect(JSON.stringify(betaOverview)).not.toContain(from);

	const reviewed = await reviewInboundMessage(
		alphaActor,
		alphaCtx,
		{ id: inbound?.id },
		'email-in-review'
	);
	expect(reviewed.status).toBe('reviewed');
	expect(reviewed.autoReply).toBe(false);
	expect(memory.sent).toHaveLength(sentBefore);
});

test('unknown or ambiguous inbound recipients fail closed', async () => {
	setDomainEmailProvider(memory);
	const { alpha, beta } = await seededClients();
	const unknown = await processEmailWebhook(
		{},
		JSON.stringify({
			type: 'email.received',
			created_at: new Date().toISOString(),
			data: {
				email_id: `inb-${crypto.randomUUID()}`,
				from: 'stranger@example.test',
				to: ['nobody@unknown-inbound.test'],
				subject: 'Hello',
				text: 'Anyone there?'
			}
		}),
		'email-inbound-unknown',
		'10.0.3.23'
	);
	expect(unknown[0]).toMatchObject({
		skipped: true,
		reason: 'unknown_recipient',
		autoReply: false
	});

	const shared = `shared-${crypto.randomUUID().slice(0, 8)}.test`;
	const alphaActor = await adminOn(alpha.id, '10.0.3.24', 'email-in-amb-a');
	const betaActor = await adminOn(beta.id, '10.0.3.25', 'email-in-amb-b');
	setDnsLookup(readyLookup(shared));
	await upsertSendingDomain(
		alphaActor,
		contextFor(alphaActor, 'email-in-amb-a'),
		{
			domain: shared,
			fromAddress: `hello@${shared}`,
			fromName: 'Alpha',
			fromApproved: true,
			dkimSelector: 'resend'
		},
		'email-in-amb-a'
	);
	await upsertSendingDomain(
		betaActor,
		contextFor(betaActor, 'email-in-amb-b'),
		{
			domain: shared,
			fromAddress: `hello@${shared}`,
			fromName: 'Beta',
			fromApproved: true,
			dkimSelector: 'resend'
		},
		'email-in-amb-b'
	);
	const ambiguous = await processEmailWebhook(
		{},
		JSON.stringify({
			type: 'email.received',
			created_at: new Date().toISOString(),
			data: {
				email_id: `inb-${crypto.randomUUID()}`,
				from: 'shared-sender@example.test',
				to: [`hello@${shared}`],
				subject: 'Which tenant?',
				text: 'Do not attach this to the wrong client.'
			}
		}),
		'email-inbound-ambiguous',
		'10.0.3.26'
	);
	expect(ambiguous[0]).toMatchObject({
		skipped: true,
		reason: 'ambiguous_recipient',
		autoReply: false
	});
	expect(memory.sent).toHaveLength(0);
});
