import { expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';
import { env } from '@vector/config';
import {
	ForbiddenError,
	TenantContextError,
	ValidationError,
	requireTenantContext
} from '@vector/contracts';
import { clientDomains, clients, db, listClientDomainsForTenant } from '@vector/db';
import {
	activateClientDomain,
	contextFor,
	disableClientDomain,
	listClientDomains,
	login,
	recalculateReadiness,
	resolveDeliveryPage,
	resolveSession,
	submitClientDomain,
	switchActiveClient,
	verifyClientDomain
} from '@vector/domain';
import {
	isDomainChallengePath,
	isPreviewReservedHostname,
	isValidPublicHostname
} from '@vector/funnel-engine';
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

function uniqueHost(label: string) {
	return `${label}-${randomUUID().slice(0, 8)}.localhost`;
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

async function cleanupManagedDomains(...clientIds: string[]) {
	for (const clientId of clientIds) {
		await db
			.delete(clientDomains)
			.where(and(eq(clientDomains.clientId, clientId), ne(clientDomains.kind, 'preview')));
	}
}

async function submitVerifiedActive(
	actor: Awaited<ReturnType<typeof adminOn>>,
	ctx: ReturnType<typeof contextFor>,
	hostname: string,
	kind: 'production' | 'redirect',
	requestId: string
) {
	const submitted = await submitClientDomain(actor, ctx, { hostname, kind }, `${requestId}-s`);
	const verified = await verifyClientDomain(actor, ctx, submitted.id, `${requestId}-v`);
	return activateClientDomain(actor, ctx, verified.id, `${requestId}-a`);
}

test('missing TenantContext cannot read client domains', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listClientDomainsForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('preview-reserved and invalid hostnames are rejected', () => {
	expect(isPreviewReservedHostname('preview-alpha.localhost')).toBe(true);
	expect(isValidPublicHostname('preview-alpha.localhost')).toBe(false);
	expect(isValidPublicHostname('alpha-live.localhost')).toBe(true);
	expect(isDomainChallengePath('/.well-known/vector-domain')).toBe(true);
	expect(isDomainChallengePath('/')).toBe(false);
});

test('user on client A cannot submit or read client B domains', async () => {
	const { alpha, beta } = await seededClients();
	const host = uniqueHost('beta-claim');
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.50'
	);
	const ctx = contextFor(session, 'domain-read');
	expect(ctx.clientId).toBe(alpha.id);
	const own = await listClientDomains(session, ctx);
	expect(own.every((row) => row.clientId === alpha.id)).toBe(true);
	expect(JSON.stringify(own)).not.toContain(beta.id);

	await expect(listClientDomains(session, ctx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		submitClientDomain(
			session,
			{ ...ctx, clientId: beta.id },
			{ hostname: host, kind: 'production' },
			'domain-hijack'
		)
	).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant domain through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/domains/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('warehouse');
});

test(
	'admin can bind the active client before domain writes',
	async () => {
		const { alpha } = await seededClients();
		const actor = await adminOn(alpha.id, '10.0.0.48', 'domain-warm');
		expect(actor.clientId).toBe(alpha.id);
	},
	{ timeout: 15_000 }
);

test('missing pages.manage cannot submit a production domain', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.51'
	);
	const ctx = contextFor(session, 'domain-cap');
	const actor = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'pages.manage')
	};
	await expect(
		submitClientDomain(
			actor,
			ctx,
			{ hostname: uniqueHost('cap'), kind: 'production' },
			'domain-cap'
		)
	).rejects.toBeInstanceOf(ForbiddenError);
});

test('pending production domain cannot be activated', async () => {
	const { alpha } = await seededClients();
	await cleanupManagedDomains(alpha.id);
	const host = uniqueHost('alpha-early');
	const actor = await adminOn(alpha.id, '10.0.0.49', 'domain-early');
	const ctx = contextFor(actor, 'domain-early');
	try {
		const submitted = await submitClientDomain(
			actor,
			ctx,
			{ hostname: host, kind: 'production' },
			'domain-early'
		);
		try {
			await activateClientDomain(actor, ctx, submitted.id, 'domain-early-a');
			throw new Error('pending domain activated');
		} catch (error) {
			expect(error).toBeInstanceOf(ValidationError);
		}
	} finally {
		await cleanupManagedDomains(alpha.id);
	}
});

test('activated production host serves only that tenant', async () => {
	const { alpha, beta } = await seededClients();
	await cleanupManagedDomains(alpha.id, beta.id);
	const host = uniqueHost('alpha-live');
	const actor = await adminOn(alpha.id, '10.0.0.50', 'domain-act');
	const ctx = contextFor(actor, 'domain-act');
	try {
		const submitted = await submitClientDomain(
			actor,
			ctx,
			{ hostname: host, kind: 'production' },
			'domain-submit'
		);
		expect(submitted.clientId).toBe(alpha.id);

		const challenge = await resolveDeliveryPage(host, '/.well-known/vector-domain', 'domain-ch');
		expect(challenge.kind).toBe('domain_challenge');
		if (challenge.kind !== 'domain_challenge') throw new Error('expected challenge');
		expect(challenge.token).toBe(submitted.verificationToken);
		expect(JSON.stringify(challenge)).not.toContain(beta.id);

		await verifyClientDomain(actor, ctx, submitted.id, 'domain-verify');
		const active = await activateClientDomain(actor, ctx, submitted.id, 'domain-activate');
		expect(active.status).toBe('active');

		const page = await resolveDeliveryPage(host, '/', 'domain-page');
		expect(page.kind).toBe('page');
		if (page.kind !== 'page') throw new Error('expected page');
		expect(page.clientId).toBe(alpha.id);
		expect(page.domainKind).toBe('production');
		expect(JSON.stringify(page.document)).toContain('implant');
		expect(JSON.stringify(page.document)).not.toContain('warehouse');
	} finally {
		await cleanupManagedDomains(alpha.id);
	}
});

test('production robots and sitemap stay off preview hosts', async () => {
	const { alpha } = await seededClients();
	await cleanupManagedDomains(alpha.id);
	const host = uniqueHost('alpha-seo');
	const actor = await adminOn(alpha.id, '10.0.0.53', 'domain-seo');
	const ctx = contextFor(actor, 'domain-seo');
	try {
		await submitVerifiedActive(actor, ctx, host, 'production', 'domain-seo');
		expect(await resolveDeliveryPage(host, '/robots.txt', 'domain-robots')).toEqual({
			kind: 'robots',
			hostname: host,
			domainKind: 'production'
		});
		expect((await resolveDeliveryPage(host, '/sitemap.xml', 'domain-sitemap')).kind).toBe(
			'sitemap'
		);
		expect(
			await resolveDeliveryPage('preview-alpha.localhost', '/robots.txt', 'domain-preview-robots')
		).toEqual({
			kind: 'robots',
			hostname: 'preview-alpha.localhost',
			domainKind: 'preview'
		});
		expect(
			(await resolveDeliveryPage('preview-alpha.localhost', '/sitemap.xml', 'domain-preview-map'))
				.kind
		).toBe('unknown_host');
	} finally {
		await cleanupManagedDomains(alpha.id);
	}
});

test('active redirect hostname points at the tenant production host', async () => {
	const { alpha } = await seededClients();
	await cleanupManagedDomains(alpha.id);
	const host = uniqueHost('alpha-canon');
	const redirectHost = uniqueHost('www-alpha');
	const actor = await adminOn(alpha.id, '10.0.0.54', 'domain-redir');
	const ctx = contextFor(actor, 'domain-redir');
	try {
		await submitVerifiedActive(actor, ctx, host, 'production', 'domain-redir-p');
		await submitVerifiedActive(actor, ctx, redirectHost, 'redirect', 'domain-redir-r');
		expect(await resolveDeliveryPage(redirectHost, '/', 'domain-bounce')).toEqual({
			kind: 'redirect',
			hostname: redirectHost,
			targetHostname: host
		});
	} finally {
		await cleanupManagedDomains(alpha.id);
	}
});

test('activated production marks domain.production for that tenant only', async () => {
	const { alpha, beta } = await seededClients();
	await cleanupManagedDomains(alpha.id, beta.id);
	const host = uniqueHost('alpha-ready');
	const actor = await adminOn(alpha.id, '10.0.0.55', 'domain-ready');
	const ctx = contextFor(actor, 'domain-ready');
	try {
		await submitVerifiedActive(actor, ctx, host, 'production', 'domain-ready');
		const ready = await recalculateReadiness(actor, ctx, 'domain-ready');
		expect(ready.items.find((item) => item.key === 'domain.production')?.status).toBe('complete');
		expect(JSON.stringify(ready.events)).not.toContain(beta.id);
	} finally {
		await cleanupManagedDomains(alpha.id);
	}
});

test('another tenant cannot claim an active hostname', async () => {
	const { alpha, beta } = await seededClients();
	await cleanupManagedDomains(alpha.id, beta.id);
	const host = uniqueHost('alpha-taken');
	const actor = await adminOn(alpha.id, '10.0.0.56', 'domain-taken-a');
	const ctx = contextFor(actor, 'domain-taken-a');
	try {
		await submitVerifiedActive(actor, ctx, host, 'production', 'domain-taken-a');
		await switchActiveClient(actor, actor.token, beta.id, 'domain-taken-b-switch');
		const betaActor = await resolveSession(actor.token);
		if (!betaActor) throw new Error('session missing');
		const betaCtx = contextFor(betaActor, 'domain-taken-b');
		try {
			await submitClientDomain(
				betaActor,
				betaCtx,
				{ hostname: host, kind: 'production' },
				'domain-taken'
			);
			throw new Error('hostname reused across tenants');
		} catch (error) {
			expect(error).toBeInstanceOf(ValidationError);
		}
		const page = await resolveDeliveryPage(host, '/', 'domain-taken-page');
		expect(page).toMatchObject({ kind: 'page', clientId: alpha.id });
	} finally {
		await cleanupManagedDomains(alpha.id, beta.id);
	}
});

test('disable removes only that tenant hostname from routing', async () => {
	const { alpha, beta } = await seededClients();
	await cleanupManagedDomains(alpha.id);
	const host = uniqueHost('alpha-off');
	const actor = await adminOn(alpha.id, '10.0.0.52', 'domain-off');
	const ctx = contextFor(actor, 'domain-off');
	try {
		const active = await submitVerifiedActive(actor, ctx, host, 'production', 'domain-off');
		const disabled = await disableClientDomain(actor, ctx, active.id, 'domain-off-d');
		expect(disabled.status).toBe('disabled');
		expect(disabled.clientId).toBe(alpha.id);
		expect(await resolveDeliveryPage(host, '/', 'domain-off-page')).toEqual({
			kind: 'unknown_host',
			host
		});
		const ready = await recalculateReadiness(actor, ctx, 'domain-off-r');
		expect(ready.items.find((item) => item.key === 'domain.production')?.status).toBe('pending');
		expect(JSON.stringify(ready.events)).not.toContain(beta.id);
	} finally {
		await cleanupManagedDomains(alpha.id);
	}
});
