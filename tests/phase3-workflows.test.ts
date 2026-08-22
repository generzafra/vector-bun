import { afterEach, expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { MemoryTriggerClient, TriggerWorkflowRuntime } from '@vector/automation';
import { env } from '@vector/config';
import { ValidationError } from '@vector/contracts';
import {
	clients,
	db,
	getPublishedHomeForTenant,
	getSiteForTenant,
	listEmailEnrollmentsForTenant,
	listInboundMessagesForTenant
} from '@vector/db';
import {
	captureLead,
	contextFor,
	deliveryTenantContext,
	dispatchWorkflow,
	getEmailOverview,
	login,
	processEmailWebhook,
	processInboundEmailWorkflow,
	processPlatformDueNurtureSweep,
	resetDomainEmailProvider,
	resetWorkflowRuntime,
	resolveSession,
	setDomainEmailProvider,
	setWorkflowRuntime,
	switchActiveClient,
	upsertSendingDomain
} from '@vector/domain';
import { MemoryEmailProvider, resetDnsLookup, setDnsLookup } from '@vector/email';

const memory = new MemoryEmailProvider();
const trigger = new MemoryTriggerClient();

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
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
			fromName: 'Ready',
			fromApproved: true,
			dkimSelector: 'resend'
		},
		`${ctx.requestId}-domain`
	);
}

afterEach(() => {
	resetDnsLookup();
	resetDomainEmailProvider();
	resetWorkflowRuntime();
	memory.reset();
	trigger.reset();
});

test('workflow runtime defaults to in-process and requires a tenant contract', async () => {
	const { alpha } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.2', 'wf-default');
	const overview = await getEmailOverview(actor, contextFor(actor, 'wf-default'));
	expect(overview.workflows.adapter).toBe('in-process');
	await expect(
		dispatchWorkflow('lead-captured', { requestId: 'missing-tenant' })
	).rejects.toBeInstanceOf(ValidationError);
});

test('Trigger adapter enqueues lead-captured and does not enroll until the worker runs', async () => {
	setDomainEmailProvider(memory);
	setWorkflowRuntime(new TriggerWorkflowRuntime(trigger));
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.3', 'wf-queue');
	const ctx = contextFor(actor, 'wf-queue');
	await readyDomain(actor, ctx, `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`);
	const email = `queue-${crypto.randomUUID()}@alpha.test`;
	const captured = await captureLead(
		deliveryTenantContext(ctx, 'wf-queue-lead'),
		{
			name: 'Queued Lead',
			email,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'alpha.example',
			domainKind: 'production',
			...(await pageIds(ctx))
		},
		'wf-queue-lead',
		'10.0.4.4'
	);
	expect(captured.nurture).toMatchObject({ enrolled: false, reason: 'queued', queued: true });
	expect(memory.sent.filter((row) => row.to === email)).toHaveLength(0);
	expect((await listEmailEnrollmentsForTenant(ctx)).some((row) => row.email === email)).toBe(false);
	expect(trigger.calls).toHaveLength(1);
	expect(trigger.calls[0]?.name).toBe('lead-captured');
	expect(trigger.calls[0]?.payload).toMatchObject({
		organizationId: alpha.organizationId,
		clientId: alpha.id,
		leadId: captured.lead.id
	});
	expect(JSON.stringify(trigger.calls[0]?.payload)).not.toContain(beta.id);
});

test('inbound Trigger enqueue stays off the other tenant and never sends', async () => {
	setDomainEmailProvider(memory);
	setWorkflowRuntime(new TriggerWorkflowRuntime(trigger));
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.5', 'wf-in-q');
	const ctx = contextFor(actor, 'wf-in-q');
	const domain = `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`;
	await readyDomain(actor, ctx, domain);
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
				text: 'Please refund this consult.'
			}
		}),
		'wf-inbound-q',
		'10.0.4.6'
	);
	expect(applied[0]).toMatchObject({
		queued: true,
		clientId: alpha.id,
		autoReply: false,
		sent: false
	});
	expect(memory.sent).toHaveLength(sentBefore);
	expect((await listInboundMessagesForTenant(ctx)).some((row) => row.fromAddress === from)).toBe(
		false
	);
	expect(trigger.calls[0]?.name).toBe('inbound-email');
	expect(trigger.calls[0]?.payload).toMatchObject({ clientId: alpha.id });
	expect(JSON.stringify(trigger.calls[0]?.payload)).not.toContain(beta.id);

	const mismatched = await processInboundEmailWorkflow({
		organizationId: beta.organizationId,
		clientId: beta.id,
		providerEventId: `mismatch-${crypto.randomUUID()}`,
		requestId: 'wf-inbound-mismatch',
		inbound: {
			providerEventId: `mismatch-${crypto.randomUUID()}`,
			providerMessageId: `msg-${crypto.randomUUID()}`,
			fromAddress: from,
			toAddress: `hello@${domain}`,
			subject: 'Wrong tenant',
			textBody: 'Do not store this on Beta.',
			occurredAt: new Date()
		}
	});
	expect(mismatched).toMatchObject({ skipped: true, reason: 'tenant_mismatch', autoReply: false });
	const betaActor = await adminOn(beta.id, '10.0.4.7', 'wf-in-b');
	expect(
		(await listInboundMessagesForTenant(contextFor(betaActor, 'wf-in-b'))).some(
			(row) => row.fromAddress === from
		)
	).toBe(false);
});

test('platform due-sweep fans out one tenant job and does not attach Beta to Alpha', async () => {
	setDomainEmailProvider(memory);
	const { alpha, beta } = await seededClients();
	const actor = await adminOn(alpha.id, '10.0.4.8', 'wf-sweep');
	const ctx = contextFor(actor, 'wf-sweep');
	await readyDomain(actor, ctx, `mail-${crypto.randomUUID().slice(0, 8)}.alpha.test`);
	const email = `sweep-${crypto.randomUUID()}@alpha.test`;
	const captured = await captureLead(
		deliveryTenantContext(ctx, 'wf-sweep-lead'),
		{
			name: 'Sweep Lead',
			email,
			consentLeadFollowUp: true,
			consentMarketing: true,
			hostname: 'alpha.example',
			domainKind: 'production',
			...(await pageIds(ctx))
		},
		'wf-sweep-lead',
		'10.0.4.9'
	);
	expect(captured.nurture?.enrolled).toBe(true);
	setWorkflowRuntime(new TriggerWorkflowRuntime(trigger));
	const result = await processPlatformDueNurtureSweep(
		{ requestId: 'wf-sweep-run' },
		new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
	);
	expect(result.tenants).toBeGreaterThanOrEqual(1);
	const alphaJobs = trigger.calls.filter(
		(call) =>
			call.name === 'nurture-due-sweep' &&
			typeof call.payload === 'object' &&
			call.payload !== null &&
			'clientId' in call.payload &&
			call.payload.clientId === alpha.id
	);
	expect(alphaJobs).toHaveLength(1);
	expect(alphaJobs[0]?.payload).toMatchObject({
		organizationId: alpha.organizationId,
		clientId: alpha.id
	});
	expect(JSON.stringify(alphaJobs[0]?.payload)).not.toContain(beta.id);
});
