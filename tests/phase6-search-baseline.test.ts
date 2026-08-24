import { expect, test } from 'bun:test';
import { randomUUID } from 'node:crypto';
import { and, eq, ne } from 'drizzle-orm';
import { env } from '@vector/config';
import { TenantContextError, requireTenantContext } from '@vector/contracts';
import {
	clientDomains,
	clients,
	db,
	getLeadFunnelForTenant,
	listPublishedPagesForTenant,
	pageVersions,
	pages
} from '@vector/db';
import {
	activateClientDomain,
	contextFor,
	deliveryLlmsTxt,
	deliveryRobotsTxt,
	deliverySitemapXml,
	login,
	resolveDeliveryPage,
	resolveSession,
	submitClientDomain,
	switchActiveClient,
	verifyClientDomain
} from '@vector/domain';
import {
	composeLeadPage,
	isLlmsTxtPath,
	jsonLdScript,
	publicCanonicalUrl,
	publicJsonLd,
	publicLlmsTxt,
	publicPageMeta,
	publicRobotsTxt
} from '@vector/funnel-engine';

const alphaDoc = composeLeadPage(
	{
		clientSlug: 'alpha',
		brand: {
			displayName: 'Client Alpha Dental',
			tagline: null,
			audience: 'Local patients who need implant consults',
			offer: 'Guided implant consults with a clear treatment plan',
			primaryConversion: 'Book an implant consult',
			brandPersonality: 'premium',
			tokens: { accent: '#0f4c5c', background: '#111111', text: '#f4f4f0' }
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
				statement: 'Plans are written after imaging review',
				evidence: 'Chart note'
			},
			{ kind: 'prohibited', statement: 'Guaranteed implant success', evidence: null }
		]
	},
	{ preview: false }
);

async function seededClients() {
	const [alpha] = await db.select().from(clients).where(eq(clients.slug, 'alpha')).limit(1);
	const [beta] = await db.select().from(clients).where(eq(clients.slug, 'beta')).limit(1);
	if (!alpha || !beta) throw new Error('Seed clients missing. Run bun run db:seed.');
	return { alpha, beta };
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
	requestId: string
) {
	const submitted = await submitClientDomain(
		actor,
		ctx,
		{ hostname, kind: 'production' },
		`${requestId}-s`
	);
	const verified = await verifyClientDomain(actor, ctx, submitted.id, `${requestId}-v`);
	return activateClientDomain(actor, ctx, verified.id, `${requestId}-a`);
}

test('path-aware canonicals stay null on preview and join origin plus path on production', () => {
	expect(
		publicPageMeta({
			title: alphaDoc.seo.title,
			description: alphaDoc.seo.description,
			origin: 'http://preview-alpha.localhost:5184',
			domainKind: 'preview',
			pathname: '/about'
		}).canonical
	).toBeNull();
	expect(publicCanonicalUrl('https://alpha.example/', '/about/')).toBe(
		'https://alpha.example/about'
	);
	expect(
		publicPageMeta({
			title: alphaDoc.seo.title,
			description: alphaDoc.seo.description,
			origin: 'https://alpha.example',
			domainKind: 'production',
			pathname: '/about'
		}).canonical
	).toBe('https://alpha.example/about');
});

test('preview robots disallow all and production robots allow retrieval crawlers', () => {
	const preview = publicRobotsTxt({
		domainKind: 'preview',
		origin: 'https://preview-alpha.example'
	});
	expect(preview).toContain('Disallow: /');
	expect(preview).not.toContain('Sitemap:');
	expect(preview).not.toContain('GPTBot');
	const production = deliveryRobotsTxt({
		domainKind: 'production',
		origin: 'https://alpha.example'
	});
	expect(production).toContain('Sitemap: https://alpha.example/sitemap.xml');
	expect(production).toContain('User-agent: GPTBot');
	expect(production).toContain('User-agent: ClaudeBot');
	expect(production).toContain('User-agent: PerplexityBot');
	expect(production).toContain('User-agent: Google-Extended');
	expect(
		publicRobotsTxt({
			domainKind: 'production',
			origin: 'https://alpha.example',
			aiCrawlerPolicy: 'disallow'
		})
	).toContain('Disallow: /');
});

test('production JSON-LD uses visible facts and never invents ratings or authors', () => {
	expect(
		publicJsonLd({
			domainKind: 'preview',
			origin: 'https://alpha.example',
			document: alphaDoc
		})
	).toBeNull();
	const jsonLd = publicJsonLd({
		domainKind: 'production',
		origin: 'https://alpha.example',
		pathname: '/',
		document: alphaDoc
	});
	expect(jsonLd).not.toBeNull();
	const serialized = JSON.stringify(jsonLd);
	expect(serialized).toContain('Organization');
	expect(serialized).toContain('Client Alpha Dental');
	expect(serialized).toContain('FAQPage');
	expect(serialized).toContain('Service');
	expect(serialized).toContain('Implant consult');
	expect(serialized).not.toContain('AggregateRating');
	expect(serialized).not.toContain('Guaranteed implant success');
	expect(jsonLdScript(jsonLd)).not.toContain('<');
	expect(
		publicJsonLd({
			domainKind: 'production',
			origin: 'https://alpha.example',
			document: {
				...alphaDoc,
				identity: { displayName: '   ' }
			}
		})
	).toBeNull();
});

test('llms.txt is production-only and omits prohibited claims', () => {
	const knowledge = {
		displayName: 'Client Alpha Dental',
		tagline: null,
		offer: 'Guided implant consults with a clear treatment plan',
		audience: 'Local patients who need implant consults',
		services:
			alphaDoc.sections.find(
				(section) => section.type === 'services' || section.type === 'services-editorial'
			)?.items ?? [],
		claims: [
			{
				kind: 'approved' as const,
				statement: 'Plans are written after imaging review',
				evidence: 'Chart note'
			},
			{ kind: 'prohibited' as const, statement: 'Guaranteed implant success', evidence: null }
		]
	};
	expect(
		publicLlmsTxt({ domainKind: 'preview', origin: 'https://alpha.example', knowledge })
	).toBeNull();
	const body = publicLlmsTxt({
		domainKind: 'production',
		origin: 'https://alpha.example',
		knowledge
	});
	expect(body).toContain('# Client Alpha Dental');
	expect(body).toContain('Implant consult');
	expect(body).toContain('Plans are written after imaging review');
	expect(body).toContain('Official website: https://alpha.example/');
	expect(body).not.toContain('Guaranteed implant success');
	expect(
		publicLlmsTxt({
			domainKind: 'production',
			origin: 'https://alpha.example',
			knowledge: { ...knowledge, displayName: '  ' }
		})
	).toBeNull();
});

test('missing TenantContext cannot list published pages or build GEO files', () => {
	expect(() => requireTenantContext(null)).toThrow(TenantContextError);
	expect(listPublishedPagesForTenant(null as never)).rejects.toBeInstanceOf(TenantContextError);
	expect(deliverySitemapXml(null as never, 'https://alpha.example')).rejects.toBeInstanceOf(
		TenantContextError
	);
	expect(deliveryLlmsTxt(null as never, 'https://alpha.example')).rejects.toBeInstanceOf(
		TenantContextError
	);
});

test('preview hosts 404 sitemap and llms.txt while production stays tenant-scoped', async () => {
	const { alpha, beta } = await seededClients();
	await cleanupManagedDomains(alpha.id, beta.id);
	const alphaHost = uniqueHost('alpha-geo');
	const betaHost = uniqueHost('beta-geo');
	const alphaActor = await adminOn(alpha.id, '10.0.6.10', 'geo-alpha');
	const betaActor = await adminOn(beta.id, '10.0.6.11', 'geo-beta');
	const alphaCtx = contextFor(alphaActor, 'geo-alpha');
	const betaCtx = contextFor(betaActor, 'geo-beta');
	const funnel = await getLeadFunnelForTenant(betaCtx);
	if (!funnel) throw new Error('beta funnel missing');
	let extraPageId: string | null = null;
	try {
		await submitVerifiedActive(alphaActor, alphaCtx, alphaHost, 'geo-alpha');
		await submitVerifiedActive(betaActor, betaCtx, betaHost, 'geo-beta');

		expect(isLlmsTxtPath('/llms.txt')).toBe(true);
		expect((await resolveDeliveryPage(alphaHost, '/sitemap.xml', 'geo-map')).kind).toBe('sitemap');
		expect((await resolveDeliveryPage(alphaHost, '/llms.txt', 'geo-llms')).kind).toBe('llms');
		expect(
			(await resolveDeliveryPage('preview-alpha.localhost', '/sitemap.xml', 'geo-preview-map')).kind
		).toBe('unknown_host');
		expect(
			(await resolveDeliveryPage('preview-alpha.localhost', '/llms.txt', 'geo-preview-llms')).kind
		).toBe('unknown_host');

		const [extraPage] = await db
			.insert(pages)
			.values({
				organizationId: beta.organizationId,
				clientId: beta.id,
				funnelId: funnel.id,
				path: '/docks',
				title: 'Beta docks'
			})
			.returning();
		extraPageId = extraPage.id;
		const [version] = await db
			.insert(pageVersions)
			.values({
				organizationId: beta.organizationId,
				clientId: beta.id,
				pageId: extraPage.id,
				version: 1,
				status: 'published',
				document: alphaDoc,
				publishedAt: new Date()
			})
			.returning();
		await db
			.update(pages)
			.set({ publishedVersionId: version.id })
			.where(and(eq(pages.id, extraPage.id), eq(pages.clientId, beta.id)));

		const alphaPaths = (await listPublishedPagesForTenant(alphaCtx)).map((page) => page.path);
		const betaPaths = (await listPublishedPagesForTenant(betaCtx)).map((page) => page.path);
		expect(alphaPaths).toContain('/');
		expect(alphaPaths).not.toContain('/docks');
		expect(betaPaths).toContain('/docks');

		const alphaMap = await deliverySitemapXml(alphaCtx, `https://${alphaHost}`);
		const betaMap = await deliverySitemapXml(betaCtx, `https://${betaHost}`);
		expect(alphaMap).toContain(`https://${alphaHost}/`);
		expect(alphaMap).not.toContain('/docks');
		expect(alphaMap).not.toContain(betaHost);
		expect(betaMap).toContain(`https://${betaHost}/docks`);

		const alphaLlms = await deliveryLlmsTxt(alphaCtx, `https://${alphaHost}`);
		const betaLlms = await deliveryLlmsTxt(betaCtx, `https://${betaHost}`);
		expect(alphaLlms).toContain('implant');
		expect(alphaLlms?.toLowerCase()).not.toContain('warehouse');
		expect(betaLlms?.toLowerCase()).toContain('warehouse');
		expect(betaLlms?.toLowerCase()).not.toContain('implant');
		expect(alphaLlms).not.toContain('Guaranteed implant success');
	} finally {
		if (extraPageId) {
			await db.delete(pageVersions).where(eq(pageVersions.pageId, extraPageId));
			await db.delete(pages).where(eq(pages.id, extraPageId));
		}
		await cleanupManagedDomains(alpha.id, beta.id);
	}
});
