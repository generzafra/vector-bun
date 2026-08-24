import { afterEach, expect, test } from 'bun:test';
import {
	MemoryAnalyticsProvider,
	PostHogAnalyticsProvider,
	sanitizeAnalyticsProperties
} from '@vector/analytics';
import { env } from '@vector/config';
import { ForbiddenError, TenantContextError, requireTenantContext } from '@vector/contracts';
import {
	clients,
	countAnalyticsEventsForTenant,
	countLaunchTransitionsForTenant,
	db,
	getLaunchForTenant,
	getPublishedHomeForTenant,
	getSiteForTenant,
	insertLaunchEventForTenant,
	listLaunchEventsForTenant
} from '@vector/db';
import {
	captureLead,
	contextFor,
	createClient,
	deliveryTenantContext,
	getAnalyticsReport,
	login,
	recordDeliveryEvent,
	resetAnalyticsProvider,
	resolveSession,
	setAnalyticsProvider,
	switchActiveClient
} from '@vector/domain';
import { eq } from 'drizzle-orm';
import { app } from '../apps/api/src/app';

afterEach(() => {
	resetAnalyticsProvider();
});

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

function stepCount(
	report: Awaited<ReturnType<typeof getAnalyticsReport>>,
	bucket: 'production' | 'preview',
	name: string
) {
	return report.conversion[bucket].steps.find((step) => step.name === name)?.count ?? 0;
}

function stepRate(
	report: Awaited<ReturnType<typeof getAnalyticsReport>>,
	bucket: 'production' | 'preview',
	name: string
) {
	return (
		report.conversion[bucket].steps.find((step) => step.name === name)?.rateFromPrevious ?? null
	);
}

test('sanitize strips form fields and secrets from provider payloads', () => {
	const cleaned = sanitizeAnalyticsProperties({
		email: 'ada@alpha.test',
		name: 'Ada',
		phone: '5551112222',
		message: 'Need a consult',
		company: 'Alpha Dental',
		password: 'secret',
		token: 'abc',
		hostname: 'alpha.example',
		page_id: 'page-1'
	});
	expect(cleaned.email).toBeUndefined();
	expect(cleaned.name).toBeUndefined();
	expect(cleaned.phone).toBeUndefined();
	expect(cleaned.message).toBeUndefined();
	expect(cleaned.company).toBeUndefined();
	expect(cleaned.password).toBeUndefined();
	expect(cleaned.token).toBeUndefined();
	expect(cleaned.hostname).toBe('alpha.example');
	expect(cleaned.page_id).toBe('page-1');
});

test('PostHog and memory skip isTest events and never send form PII', async () => {
	const bodies: Array<Record<string, unknown>> = [];
	const posthog = new PostHogAnalyticsProvider(
		'phc_test',
		'https://ph.test',
		async (_url, init) => {
			bodies.push(JSON.parse(String(init?.body)) as Record<string, unknown>);
			return new Response('1', { status: 200 });
		}
	);
	const memory = new MemoryAnalyticsProvider();
	const preview = {
		eventId: crypto.randomUUID(),
		name: 'form_submitted' as const,
		clientId: crypto.randomUUID(),
		visitorId: crypto.randomUUID(),
		occurredAt: new Date(),
		isTest: true,
		properties: { email: 'ada@alpha.test', hostname: 'preview-alpha.localhost' }
	};
	const production = {
		...preview,
		eventId: crypto.randomUUID(),
		isTest: false,
		properties: { email: 'ada@alpha.test', hostname: 'alpha.example', page_id: 'home' }
	};
	await posthog.track(preview);
	await memory.track(preview);
	expect(bodies).toHaveLength(0);
	expect(memory.tracks).toHaveLength(0);

	await posthog.track(production);
	await memory.track(production);
	expect(bodies).toHaveLength(1);
	const props = bodies[0]?.properties as Record<string, unknown>;
	expect(props.email).toBeUndefined();
	expect(props.hostname).toBe('alpha.example');
	expect(props.client_id).toBe(production.clientId);
	expect(memory.tracks).toHaveLength(1);
	expect(memory.tracks[0]?.properties.email).toBeUndefined();
	expect(memory.tracks[0]?.properties.hostname).toBe('alpha.example');
});

test('missing TenantContext cannot read analytics', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(countAnalyticsEventsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(countLaunchTransitionsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('missing analytics.read is forbidden', async () => {
	const { alpha } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.3.2'
	);
	expect(session.clientId).toBe(alpha.id);
	const ctx = contextFor(session, 'analytics-cap');
	const actor = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'analytics.read')
	};
	await expect(getAnalyticsReport(actor, ctx)).rejects.toBeInstanceOf(ForbiddenError);
});

test('user on client A cannot read client B analytics', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'10.0.3.3'
	);
	const alphaCtx = contextFor(session, 'analytics-alpha');
	expect(alphaCtx.clientId).toBe(alpha.id);
	const published = await pageIds(alphaCtx);
	await recordDeliveryEvent(
		deliveryTenantContext({ ...alphaCtx, requestId: 'analytics-alpha-evt' }),
		{
			name: 'page_viewed',
			visitorId: crypto.randomUUID(),
			sessionId: crypto.randomUUID(),
			hostname: 'alpha.example',
			domainKind: 'production',
			...published
		},
		'analytics-alpha-evt',
		'10.0.3.3'
	);
	const own = await getAnalyticsReport(session, alphaCtx);
	expect(own.sourceOfTruth).toBe('postgres');
	expect(JSON.stringify(own).toLowerCase()).not.toContain('beta logistics');
	await expect(getAnalyticsReport(session, alphaCtx, beta.id)).rejects.toBeInstanceOf(
		TenantContextError
	);
	await expect(
		getAnalyticsReport(session, { ...alphaCtx, clientId: beta.id })
	).rejects.toBeInstanceOf(TenantContextError);
});

test('preview events stay out of production buckets and adapters', async () => {
	const { alpha } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.3.4'
	);
	await switchActiveClient(session, session.token, alpha.id, 'analytics-bucket');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'analytics-bucket');
	const published = await pageIds(ctx);
	const memory = new MemoryAnalyticsProvider();
	setAnalyticsProvider(memory);
	const before = await getAnalyticsReport(actor, ctx);

	await recordDeliveryEvent(
		deliveryTenantContext({ ...ctx, requestId: 'analytics-preview' }),
		{
			name: 'cta_clicked',
			visitorId: crypto.randomUUID(),
			sessionId: crypto.randomUUID(),
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview',
			...published
		},
		'analytics-preview',
		'10.0.3.41'
	);
	await recordDeliveryEvent(
		deliveryTenantContext({ ...ctx, requestId: 'analytics-prod' }),
		{
			name: 'cta_clicked',
			visitorId: crypto.randomUUID(),
			sessionId: crypto.randomUUID(),
			hostname: 'alpha.example',
			domainKind: 'production',
			...published
		},
		'analytics-prod',
		'10.0.3.42'
	);

	const after = await getAnalyticsReport(actor, ctx);
	expect(stepCount(after, 'preview', 'cta_clicked')).toBe(
		stepCount(before, 'preview', 'cta_clicked') + 1
	);
	expect(stepCount(after, 'production', 'cta_clicked')).toBe(
		stepCount(before, 'production', 'cta_clicked') + 1
	);
	expect(memory.tracks).toHaveLength(1);
	expect(memory.tracks[0]?.isTest).toBe(false);
	expect(memory.tracks[0]?.name).toBe('cta_clicked');
	expect(memory.tracks[0]?.properties.email).toBeUndefined();
});

test('conversion rates stay null when a step has no views', async () => {
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.3.5'
	);
	const slug = `anl-${crypto.randomUUID().slice(0, 8)}`;
	const created = await createClient(
		session,
		{ name: 'Analytics Empty', slug, timezone: 'UTC' },
		'analytics-empty'
	);
	await switchActiveClient(session, session.token, created.id, 'analytics-empty-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'analytics-empty');
	const report = await getAnalyticsReport(actor, ctx);
	expect(report.conversion.production.leads).toBe(0);
	expect(report.conversion.preview.leads).toBe(0);
	expect(stepCount(report, 'production', 'page_viewed')).toBe(0);
	expect(stepRate(report, 'production', 'page_viewed')).toBeNull();
	expect(stepRate(report, 'production', 'cta_clicked')).toBeNull();
	expect(stepRate(report, 'production', 'form_started')).toBeNull();
	expect(stepRate(report, 'production', 'form_submitted')).toBeNull();
	expect(stepRate(report, 'production', 'lead_created')).toBeNull();
	expect(report.conversion.sources).toHaveLength(0);
});

test('launch transitions stay tenant scoped', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.3.66'
	);
	await switchActiveClient(session, session.token, alpha.id, 'analytics-launch-alpha');
	let actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const alphaCtx = contextFor(actor, 'analytics-launch-alpha');
	const before = await getAnalyticsReport(actor, alphaCtx);
	expect(before.launch).not.toBeNull();

	await switchActiveClient(session, session.token, beta.id, 'analytics-launch-beta');
	actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const betaCtx = contextFor(actor, 'analytics-launch-beta');
	const betaLaunch = await getLaunchForTenant(betaCtx);
	if (!betaLaunch) throw new Error('Beta launch missing');
	const marker = `analytics-isolation-${crypto.randomUUID()}`;
	await insertLaunchEventForTenant(betaCtx, {
		launchId: betaLaunch.id,
		fromStatus: betaLaunch.status,
		toStatus: 'paused',
		reason: marker,
		actorId: actor.userId,
		requestId: 'analytics-launch-beta'
	});

	await switchActiveClient(session, session.token, alpha.id, 'analytics-launch-back');
	actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const after = await getAnalyticsReport(actor, contextFor(actor, 'analytics-launch-back'));
	expect(JSON.stringify(after)).not.toContain(marker);
	expect(JSON.stringify(after).toLowerCase()).not.toContain('beta logistics');
	const betaEvents = await listLaunchEventsForTenant(betaCtx);
	expect(betaEvents.some((row) => row.reason === marker && row.clientId === beta.id)).toBe(true);
	expect((await listLaunchEventsForTenant(alphaCtx)).some((row) => row.reason === marker)).toBe(
		false
	);
	await expect(
		getAnalyticsReport(actor, { ...betaCtx, requestId: 'analytics-launch-beta-leak' })
	).rejects.toBeInstanceOf(TenantContextError);
});

test('production lead attribution appears only in the owning tenant report', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.3.7'
	);
	await switchActiveClient(session, session.token, alpha.id, 'analytics-attr-alpha');
	let actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const alphaCtx = contextFor(actor, 'analytics-attr-alpha');
	const campaign = `implants-${crypto.randomUUID().slice(0, 8)}`;
	await captureLead(
		deliveryTenantContext({ ...alphaCtx, requestId: 'analytics-attr-cap' }),
		{
			name: 'Ada Alpha',
			email: `anl-${crypto.randomUUID()}@alpha.test`,
			consentLeadFollowUp: true,
			consentMarketing: false,
			landingUrl: `https://alpha.example/?utm_source=google&utm_medium=cpc&utm_campaign=${campaign}`,
			utmSource: 'google',
			utmMedium: 'cpc',
			utmCampaign: campaign,
			hostname: 'alpha.example',
			domainKind: 'production',
			visitorId: crypto.randomUUID(),
			sessionId: crypto.randomUUID(),
			...(await pageIds(alphaCtx))
		},
		'analytics-attr-cap',
		'10.0.3.71'
	);
	const alphaReport = await getAnalyticsReport(actor, alphaCtx);
	expect(
		alphaReport.conversion.sources.some(
			(row) => row.source === 'google' && row.campaign === campaign
		)
	).toBe(true);
	expect(alphaReport.conversion.previewSources.some((row) => row.campaign === campaign)).toBe(
		false
	);

	await switchActiveClient(session, session.token, beta.id, 'analytics-attr-beta');
	actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const betaReport = await getAnalyticsReport(actor, contextFor(actor, 'analytics-attr-beta'));
	expect(betaReport.conversion.sources.some((row) => row.campaign === campaign)).toBe(false);
});

test('missing analytics.read returns 403 and route ids do not leak the other tenant', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/analytics/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('warehouse');
});
