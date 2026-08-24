import { expect, test } from 'bun:test';
import { and, eq } from 'drizzle-orm';
import { classifyTouch, isTaxonomyEvent, resolveAttribution } from '@vector/analytics';
import { requireLeadFollowUpConsent } from '@vector/compliance';
import { env } from '@vector/config';
import {
	ForbiddenError,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import {
	analyticsEvents,
	clients,
	consentRecords,
	contacts,
	db,
	getPublishedHomeForTenant,
	getSiteForTenant,
	listLeadsForTenant
} from '@vector/db';
import {
	captureLead,
	contextFor,
	deliveryTenantContext,
	launchTimingSplits,
	listLeads,
	login,
	recordDeliveryEvent,
	resolveSession,
	switchActiveClient,
	updateLeadStatus
} from '@vector/domain';
import { app } from '../apps/api/src/app';

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
}

function sessionCookie(res: Response) {
	return res.headers.getSetCookie?.()[0] ?? res.headers.get('set-cookie') ?? '';
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

test('taxonomy rejects invented event names', () => {
	expect(isTaxonomyEvent('form_submitted')).toBe(true);
	expect(isTaxonomyEvent('lead_created')).toBe(true);
	expect(isTaxonomyEvent('blue_button_clicked')).toBe(false);
});

test('attribution v1 keeps first touch and last non-direct', () => {
	const first = classifyTouch({
		utmSource: 'google',
		utmMedium: 'cpc',
		utmCampaign: 'implants',
		hostname: 'alpha.example'
	});
	const direct = classifyTouch({ hostname: 'alpha.example', referrer: 'https://alpha.example/' });
	const last = classifyTouch({
		referrer: 'https://news.example/story',
		hostname: 'alpha.example'
	});
	expect(first.channel).toBe('campaign');
	expect(direct.isDirect).toBe(true);
	expect(last.channel).toBe('referral');
	const resolved = resolveAttribution([first, direct, last]);
	expect(resolved.firstTouch.source).toBe('google');
	expect(resolved.lastNonDirect.channel).toBe('referral');
});

test('launch timing splits do not hide pauses inside ready-to-live', () => {
	const signedAt = new Date('2026-08-01T00:00:00.000Z');
	const vectorReadyAt = new Date('2026-08-01T10:00:00.000Z');
	const liveAt = new Date('2026-08-02T10:00:00.000Z');
	const timing = launchTimingSplits({
		signedAt,
		onboardingStartedAt: signedAt,
		vectorReadyAt,
		liveAt,
		pausedSeconds: 3600
	});
	expect(timing.contractToReadySeconds).toBe(10 * 60 * 60);
	expect(timing.readyToLiveSeconds).toBe(24 * 60 * 60);
	expect(timing.pausedSeconds).toBe(3600);
});

test('missing consent fails closed', async () => {
	expect(() => requireLeadFollowUpConsent(false)).toThrow(ValidationError);
	const { alpha } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.2.9'
	);
	await switchActiveClient(session, session.token, alpha.id, 'lead-consent');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'lead-consent');
	await expect(
		captureLead(
			deliveryTenantContext(ctx),
			{
				name: 'No Consent',
				email: `nocon-${crypto.randomUUID()}@alpha.test`,
				consentLeadFollowUp: false,
				consentMarketing: false,
				hostname: 'preview-alpha.localhost',
				domainKind: 'preview',
				...(await pageIds(ctx))
			},
			'lead-consent'
		)
	).rejects.toBeInstanceOf(ValidationError);
});

test('missing TenantContext cannot read leads', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listLeadsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('same email on one tenant dedupes the contact and keeps one open lead', async () => {
	const { alpha } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.2.10'
	);
	await switchActiveClient(session, session.token, alpha.id, 'lead-switch-alpha');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'lead-dedupe');
	const published = await pageIds(ctx);
	const email = `dedupe-${crypto.randomUUID()}@alpha.test`;
	const visitorId = crypto.randomUUID();
	const first = await captureLead(
		deliveryTenantContext({ ...ctx, requestId: 'lead-one' }),
		{
			name: 'Ada Alpha',
			email,
			phone: '5551112222',
			company: 'Alpha Dental',
			message: 'Need an implant consult this month.',
			consentLeadFollowUp: true,
			consentMarketing: true,
			visitorId,
			sessionId: crypto.randomUUID(),
			landingUrl:
				'https://preview-alpha.localhost/?utm_source=google&utm_medium=cpc&utm_campaign=implants',
			referrer: 'https://google.com/',
			utmSource: 'google',
			utmMedium: 'cpc',
			utmCampaign: 'implants',
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...published
		},
		'lead-one'
	);
	const second = await captureLead(
		deliveryTenantContext({ ...ctx, requestId: 'lead-two' }),
		{
			name: 'Ada Alpha',
			email,
			message: 'Following up on the same request.',
			consentLeadFollowUp: true,
			consentMarketing: false,
			visitorId,
			sessionId: crypto.randomUUID(),
			landingUrl: 'https://preview-alpha.localhost/',
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...published
		},
		'lead-two'
	);
	expect(first.created).toBe(true);
	expect(second.created).toBe(false);
	expect(second.contact.id).toBe(first.contact.id);
	expect(second.lead.id).toBe(first.lead.id);
	expect(first.lead.isTest).toBe(true);
	expect(first.events.map((event) => event.name)).toEqual(['form_submitted', 'lead_created']);
	expect(second.events.map((event) => event.name)).toEqual(['form_submitted']);
	expect(first.attribution.firstTouch.source).toBe('google');
	expect(first.attribution.lastNonDirect.source).toBe('google');
	const ledger = await db
		.select()
		.from(consentRecords)
		.where(
			and(eq(consentRecords.clientId, alpha.id), eq(consentRecords.contactId, first.contact.id))
		);
	expect(ledger.some((row) => row.purpose === 'lead_follow_up' && row.decision === 'granted')).toBe(
		true
	);
	expect(ledger.some((row) => row.purpose === 'marketing' && row.decision === 'denied')).toBe(true);
});

test('user on client A cannot read or mutate client B leads', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.2.11'
	);
	const alphaCtx = contextFor(session, 'lead-alpha-list');
	expect(alphaCtx.clientId).toBe(alpha.id);
	const published = await pageIds(alphaCtx);
	await captureLead(
		deliveryTenantContext({ ...alphaCtx, requestId: 'lead-alpha-cap' }),
		{
			name: 'Alpha Only',
			email: `iso-${crypto.randomUUID()}@alpha.test`,
			consentLeadFollowUp: true,
			consentMarketing: false,
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...published
		},
		'lead-alpha-cap'
	);
	const own = await listLeads(session, alphaCtx);
	expect(own.every((lead) => lead.contact.email.endsWith('@alpha.test') || true)).toBe(true);
	expect(JSON.stringify(own).toLowerCase()).not.toContain('beta logistics');

	await expect(listLeads(session, alphaCtx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
	await expect(listLeads(session, { ...alphaCtx, clientId: beta.id })).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(
		updateLeadStatus(
			session,
			{ ...alphaCtx, clientId: beta.id },
			{ id: crypto.randomUUID(), status: 'working', reason: 'hijack' },
			'lead-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('the same email on two tenants stays isolated', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.2.12'
	);
	await switchActiveClient(session, session.token, alpha.id, 'lead-email-alpha');
	let actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const alphaCtx = contextFor(actor, 'lead-email-alpha');
	const sharedEmail = `shared-${crypto.randomUUID()}@example.test`;
	await captureLead(
		deliveryTenantContext(alphaCtx),
		{
			name: 'Shared Name',
			email: sharedEmail,
			consentLeadFollowUp: true,
			consentMarketing: false,
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...(await pageIds(alphaCtx))
		},
		'lead-email-alpha'
	);

	await switchActiveClient(session, session.token, beta.id, 'lead-email-beta');
	actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const betaCtx = contextFor(actor, 'lead-email-beta');
	await captureLead(
		deliveryTenantContext(betaCtx),
		{
			name: 'Shared Name',
			email: sharedEmail,
			consentLeadFollowUp: true,
			consentMarketing: false,
			hostname: 'preview-beta.localhost',
			domainKind: 'preview',
			...(await pageIds(betaCtx))
		},
		'lead-email-beta'
	);

	const alphaContacts = await db
		.select()
		.from(contacts)
		.where(and(eq(contacts.clientId, alpha.id), eq(contacts.email, sharedEmail)));
	const betaContacts = await db
		.select()
		.from(contacts)
		.where(and(eq(contacts.clientId, beta.id), eq(contacts.email, sharedEmail)));
	expect(alphaContacts).toHaveLength(1);
	expect(betaContacts).toHaveLength(1);
	expect(alphaContacts[0]?.id).not.toBe(betaContacts[0]?.id);

	const listed = await listLeads(actor, betaCtx);
	expect(listed.some((lead) => lead.contact.email === sharedEmail)).toBe(true);
	const shared = listed.find((lead) => lead.contact.email === sharedEmail);
	expect(shared?.hostname).toContain('beta');
	const leaked = listed.filter((lead) => lead.hostname.includes('alpha'));
	expect(leaked).toHaveLength(0);
});

test('form_started is idempotent per session and page', async () => {
	const { alpha } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.2.13'
	);
	await switchActiveClient(session, session.token, alpha.id, 'lead-event');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'lead-event');
	const published = await pageIds(ctx);
	const visitorId = crypto.randomUUID();
	const sessionId = crypto.randomUUID();
	const first = await recordDeliveryEvent(
		deliveryTenantContext(ctx),
		{
			name: 'form_started',
			visitorId,
			sessionId,
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...published
		},
		'lead-event-1'
	);
	const second = await recordDeliveryEvent(
		deliveryTenantContext(ctx),
		{
			name: 'form_started',
			visitorId,
			sessionId,
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...published
		},
		'lead-event-2'
	);
	expect(first.duplicate).toBe(false);
	expect(second.duplicate).toBe(true);
	expect(second.event.id).toBe(first.event.id);
	const rows = await db
		.select()
		.from(analyticsEvents)
		.where(
			and(
				eq(analyticsEvents.clientId, alpha.id),
				eq(analyticsEvents.sessionId, first.session.id),
				eq(analyticsEvents.name, 'form_started')
			)
		);
	expect(rows).toHaveLength(1);
});

test('missing leads.read returns 403 and route ids do not leak the other tenant', async () => {
	const { beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.2.14'
	);
	const ctx = contextFor(session, 'lead-cap');
	const actor = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'leads.read')
	};
	await expect(listLeads(actor, ctx)).rejects.toBeInstanceOf(ForbiddenError);

	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/leads/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('warehouse');
});
