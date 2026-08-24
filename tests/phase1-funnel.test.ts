import { expect, test } from 'bun:test';
import { eq } from 'drizzle-orm';
import { env } from '@vector/config';
import { ForbiddenError, TenantContextError, requireTenantContext } from '@vector/contracts';
import {
	auditLogs,
	clients,
	db,
	getPublishedHomeForTenant,
	pageVersions,
	updatePageVersionDocumentForTenant
} from '@vector/db';
import {
	composeFunnel,
	contextFor,
	getFunnel,
	login,
	publishFunnel,
	resolveDeliveryPage,
	resolveSession,
	switchActiveClient,
	tryUpdatePublishedDocument
} from '@vector/domain';
import { composeLeadPage, parsePageDocument, previewHostname } from '@vector/funnel-engine';
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

test('unknown section types are rejected', () => {
	expect(() =>
		parsePageDocument({
			schemaVersion: 1,
			identity: { displayName: 'X' },
			narrative: {
				audience: 'Patients',
				primaryConversion: 'Book',
				offer: 'Consult'
			},
			theme: { tokens: {} },
			seo: { title: 'Title', description: 'Description text here', noindex: true },
			sections: [{ id: 'hero', type: 'hero-cinematic', headline: 'Nope' }]
		})
	).toThrow();
});

test('compose uses approved claims only and keeps clients visually distinct', () => {
	const alpha = composeLeadPage(
		{
			clientSlug: 'alpha',
			brand: {
				displayName: 'Client Alpha Dental',
				tagline: null,
				audience: 'Local patients who need implant consults',
				offer: 'Guided implant consults with a clear treatment plan',
				primaryConversion: 'Book an implant consult',
				brandPersonality: 'premium',
				tokens: { accent: '#0f4c5c' }
			},
			services: [
				{
					name: 'Implant consult',
					outcome: 'A clear implant plan in one visit',
					summary: 'Assessment, imaging review, and next-step recommendation.'
				}
			],
			offers: [
				{
					name: 'Consult package',
					summary: 'Exam and written treatment plan',
					startingPriceMinor: 15000,
					currency: 'USD'
				}
			],
			claims: [
				{
					kind: 'approved',
					statement: 'Consults include a written treatment plan',
					evidence: null
				},
				{ kind: 'prohibited', statement: 'Guaranteed implant success', evidence: null }
			]
		},
		{ preview: true }
	);
	expect(alpha.sections[0]?.type).toBe('hero-editorial');
	expect(alpha.seo.noindex).toBe(true);
	expect(JSON.stringify(alpha)).toContain('written treatment plan');
	expect(JSON.stringify(alpha)).not.toContain('Guaranteed implant success');
	expect(JSON.stringify(alpha)).not.toContain('warehouse');

	const beta = composeLeadPage(
		{
			clientSlug: 'beta',
			brand: {
				displayName: 'Client Beta Logistics',
				tagline: null,
				audience: 'Warehouse operators who need faster throughput',
				offer: 'Automation that reduces dock-to-stock time',
				primaryConversion: 'Request a warehouse assessment',
				brandPersonality: 'technology',
				tokens: { accent: '#d4b06a' }
			},
			services: [
				{
					name: 'Warehouse assessment',
					outcome: 'Faster dock-to-stock without extra headcount',
					summary: 'Process review and automation recommendation.'
				}
			],
			offers: [
				{
					name: 'Assessment sprint',
					summary: 'Two-week operations review',
					startingPriceMinor: 750000,
					currency: 'USD'
				}
			],
			claims: [
				{
					kind: 'approved',
					statement: 'Assessment covers inbound and outbound docks',
					evidence: null
				}
			]
		},
		{ preview: true }
	);
	expect(beta.sections[0]?.type).toBe('hero-minimal');
	expect(JSON.stringify(beta)).toContain('dock-to-stock');
	expect(JSON.stringify(beta)).not.toContain('implant');
});

test('missing TenantContext cannot read a published page', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(getPublishedHomeForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
});

test('user on client A cannot read or publish client B funnel', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.30'
	);
	const ctx = contextFor(session, 'funnel-read');
	expect(ctx.clientId).toBe(alpha.id);
	const own = await getFunnel(session, ctx);
	expect(JSON.stringify(own)).toContain('Alpha');
	expect(JSON.stringify(own)).not.toContain('Beta Logistics');
	expect(JSON.stringify(own)).not.toContain('warehouse-assessment');

	await expect(getFunnel(session, ctx, beta.id)).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		composeFunnel(session, { ...ctx, clientId: beta.id }, 'funnel-hijack')
	).rejects.toBeInstanceOf(TenantContextError);
	await expect(
		publishFunnel(session, { ...ctx, clientId: beta.id }, 'funnel-hijack-pub')
	).rejects.toBeInstanceOf(TenantContextError);
});

test('route client id cannot leak the other tenant funnel through the API', async () => {
	const { beta } = await seededClients();
	const loginRes = await app.request('/v1/auth/login', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD })
	});
	const cookie = sessionCookie(loginRes);
	const res = await app.request(`/v1/funnel/${beta.id}`, { headers: { cookie } });
	expect(res.status).toBeGreaterThanOrEqual(400);
	const text = await res.text();
	expect(text.toLowerCase()).not.toContain('beta logistics');
	expect(text.toLowerCase()).not.toContain('warehouse');
});

test('missing pages.manage returns 403', async () => {
	const { session } = await login(
		{ email: env.SEED_USER_A_EMAIL, password: env.SEED_USER_A_PASSWORD },
		'127.0.0.31'
	);
	const ctx = contextFor(session, 'funnel-cap');
	const actor = {
		...session,
		permissions: session.permissions.filter((cap) => cap !== 'pages.manage')
	};
	await expect(composeFunnel(actor, ctx, 'funnel-cap')).rejects.toBeInstanceOf(ForbiddenError);
});

test('publish writes an audit row and published versions stay immutable', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.0.31'
	);
	await switchActiveClient(session, session.token, alpha.id, 'funnel-switch');
	const actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	const ctx = contextFor(actor, 'funnel-audit');
	await composeFunnel(actor, ctx, 'funnel-compose');
	const published = await publishFunnel(actor, ctx, 'funnel-publish');
	const [audit] = await db
		.select()
		.from(auditLogs)
		.where(eq(auditLogs.entityId, published.published.id));
	expect(audit?.action).toBe('pages.publish');
	expect(audit?.clientId).toBe(alpha.id);
	expect(audit?.clientId).not.toBe(beta.id);

	const snapshot = JSON.stringify(published.published.document);
	const updated = await tryUpdatePublishedDocument(
		actor,
		ctx,
		published.published.id,
		published.published.document
	);
	expect(updated).toBeNull();
	const [frozen] = await db
		.select()
		.from(pageVersions)
		.where(eq(pageVersions.id, published.published.id));
	expect(JSON.stringify(frozen?.document)).toBe(snapshot);
	expect(
		updatePageVersionDocumentForTenant(ctx, published.published.id, published.published.document)
	).resolves.toBeNull();
});

test('preview host serves only the bound tenant and unknown hosts leak nothing', async () => {
	const { alpha, beta } = await seededClients();
	const { session } = await login(
		{ email: env.SEED_ADMIN_EMAIL, password: env.SEED_ADMIN_PASSWORD },
		'10.0.0.32'
	);
	await switchActiveClient(session, session.token, alpha.id, 'funnel-alpha');
	let actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	await composeFunnel(actor, contextFor(actor, 'funnel-alpha-c'), 'funnel-alpha-c');
	await publishFunnel(actor, contextFor(actor, 'funnel-alpha-p'), 'funnel-alpha-p');

	await switchActiveClient(session, session.token, beta.id, 'funnel-beta');
	actor = await resolveSession(session.token);
	if (!actor) throw new Error('session missing');
	await composeFunnel(actor, contextFor(actor, 'funnel-beta-c'), 'funnel-beta-c');
	await publishFunnel(actor, contextFor(actor, 'funnel-beta-p'), 'funnel-beta-p');

	const alphaHost = `${previewHostname('alpha', env.DELIVERY_PREVIEW_PARENT_HOST)}:5184`;
	const betaHost = previewHostname('beta', env.DELIVERY_PREVIEW_PARENT_HOST);
	const alphaPage = await resolveDeliveryPage(alphaHost, '/', 'delivery-alpha');
	const betaPage = await resolveDeliveryPage(betaHost, '/', 'delivery-beta');
	expect(alphaPage.kind).toBe('page');
	expect(betaPage.kind).toBe('page');
	if (alphaPage.kind !== 'page' || betaPage.kind !== 'page') throw new Error('expected pages');
	expect(alphaPage.clientId).toBe(alpha.id);
	expect(betaPage.clientId).toBe(beta.id);
	expect(alphaPage.document.seo.noindex).toBe(true);
	expect(JSON.stringify(alphaPage.document)).toContain('implant');
	expect(JSON.stringify(alphaPage.document)).not.toContain('warehouse');
	expect(JSON.stringify(betaPage.document)).toContain('warehouse');
	expect(JSON.stringify(betaPage.document)).not.toContain('implant');

	const unknown = await resolveDeliveryPage('evil.example', '/', 'delivery-unknown');
	expect(unknown).toEqual({ kind: 'unknown_host', host: 'evil.example' });
	expect(JSON.stringify(unknown).toLowerCase()).not.toContain('alpha');
	expect(JSON.stringify(unknown).toLowerCase()).not.toContain('beta');

	const otherPath = await resolveDeliveryPage(betaHost, `/clients/${alpha.id}`, 'delivery-path');
	expect(otherPath.kind).toBe('unknown_host');
	expect(JSON.stringify(otherPath)).not.toContain('implant');
});
