import { and, desc, eq, inArray, isNotNull, max } from 'drizzle-orm';
import { assertSameClient, requireTenantContext, type TenantContext } from '@vector/contracts';
import { normalizeHostname, type PageDocument } from '@vector/funnel-engine';
import { db } from './client';
import {
	clientDomains,
	creativeDerivatives,
	funnelAssetManifests,
	funnels,
	pageVersions,
	pages,
	sites
} from './schema';

export function assertPageClient(ctx: TenantContext, clientId: string) {
	return assertSameClient(ctx, clientId);
}

/** Hostname bootstrap only. Page reads after this must use TenantContext. */
export async function findActiveDomainByHostname(host: string | null | undefined) {
	const hostname = normalizeHostname(host);
	if (!hostname) return null;
	const [row] = await db
		.select()
		.from(clientDomains)
		.where(and(eq(clientDomains.hostname, hostname), eq(clientDomains.status, 'active')))
		.limit(1);
	return row ?? null;
}

export async function getSiteForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db.select().from(sites).where(eq(sites.clientId, required.clientId)).limit(1);
	return row ?? null;
}

export async function getLeadFunnelForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(funnels)
		.where(and(eq(funnels.clientId, required.clientId), eq(funnels.slug, 'lead')))
		.limit(1);
	return row ?? null;
}

export async function getHomePageForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const funnel = await getLeadFunnelForTenant(required);
	if (!funnel) return null;
	const [row] = await db
		.select()
		.from(pages)
		.where(
			and(eq(pages.clientId, required.clientId), eq(pages.funnelId, funnel.id), eq(pages.path, '/'))
		)
		.limit(1);
	return row ?? null;
}

export async function getPreviewDomainForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(clientDomains)
		.where(and(eq(clientDomains.clientId, required.clientId), eq(clientDomains.kind, 'preview')))
		.limit(1);
	return row ?? null;
}

export async function getProductionDomainForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(clientDomains)
		.where(
			and(
				eq(clientDomains.clientId, required.clientId),
				eq(clientDomains.kind, 'production'),
				eq(clientDomains.status, 'active')
			)
		)
		.limit(1);
	return row ?? null;
}

export async function listPageVersionsForTenant(ctx: TenantContext, pageId: string) {
	const required = requireTenantContext(ctx);
	return db
		.select()
		.from(pageVersions)
		.where(and(eq(pageVersions.clientId, required.clientId), eq(pageVersions.pageId, pageId)))
		.orderBy(desc(pageVersions.version));
}

export async function listLatestDraftPageVersionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const rows = await db
		.select({
			id: pageVersions.id,
			pageId: pageVersions.pageId,
			status: pageVersions.status,
			version: pageVersions.version
		})
		.from(pageVersions)
		.where(and(eq(pageVersions.clientId, required.clientId), eq(pageVersions.status, 'draft')));
	const latest = new Map<(typeof rows)[number]['pageId'], (typeof rows)[number]>();
	for (const row of rows) {
		const current = latest.get(row.pageId);
		if (!current || row.version > current.version) latest.set(row.pageId, row);
	}
	return [...latest.values()];
}

export async function getPublishedPageVersionMetaForTenant(ctx: TenantContext, versionId: string) {
	const required = requireTenantContext(ctx);
	const rows = await listPublishedPageVersionMetaForTenant(required, [versionId]);
	return rows[0] ?? null;
}

export async function listPublishedPageVersionMetaForTenant(
	ctx: TenantContext,
	versionIds: string[]
) {
	const required = requireTenantContext(ctx);
	if (versionIds.length === 0) return [];
	return db
		.select({
			id: pageVersions.id,
			pageId: pageVersions.pageId,
			status: pageVersions.status,
			version: pageVersions.version
		})
		.from(pageVersions)
		.where(
			and(
				eq(pageVersions.clientId, required.clientId),
				eq(pageVersions.status, 'published'),
				inArray(pageVersions.id, versionIds)
			)
		);
}

export async function getPageVersionForTenant(ctx: TenantContext, versionId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(pageVersions)
		.where(and(eq(pageVersions.id, versionId), eq(pageVersions.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function getLatestDraftForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const page = await getHomePageForTenant(required);
	if (!page) return null;
	const [row] = await db
		.select()
		.from(pageVersions)
		.where(
			and(
				eq(pageVersions.clientId, required.clientId),
				eq(pageVersions.pageId, page.id),
				eq(pageVersions.status, 'draft')
			)
		)
		.orderBy(desc(pageVersions.version))
		.limit(1);
	return row ?? null;
}

export async function insertDraftPageVersionForTenant(ctx: TenantContext, document: PageDocument) {
	const required = requireTenantContext(ctx);
	const page = await getHomePageForTenant(required);
	if (!page) return null;
	const [versionRow] = await db
		.select({ version: max(pageVersions.version) })
		.from(pageVersions)
		.where(and(eq(pageVersions.clientId, required.clientId), eq(pageVersions.pageId, page.id)));
	const [draft] = await db
		.insert(pageVersions)
		.values({
			organizationId: required.organizationId,
			clientId: required.clientId,
			pageId: page.id,
			version: (versionRow?.version ?? 0) + 1,
			status: 'draft',
			document
		})
		.returning();
	return draft ?? null;
}

export async function getPageForTenant(ctx: TenantContext, pageId: string) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.select()
		.from(pages)
		.where(and(eq(pages.id, pageId), eq(pages.clientId, required.clientId)))
		.limit(1);
	return row ?? null;
}

export async function updatePagePublishedVersionForTenant(
	ctx: TenantContext,
	pageId: string,
	publishedVersionId: string
) {
	const required = requireTenantContext(ctx);
	const version = await getPublishedPageVersionMetaForTenant(required, publishedVersionId);
	if (!version || version.pageId !== pageId) {
		return null;
	}
	const [row] = await db
		.update(pages)
		.set({ publishedVersionId, updatedAt: new Date() })
		.where(and(eq(pages.id, pageId), eq(pages.clientId, required.clientId)))
		.returning();
	return row ?? null;
}

export async function listPublishedPageVersionsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			id: pageVersions.id,
			pageId: pageVersions.pageId,
			version: pageVersions.version,
			publishedAt: pageVersions.publishedAt,
			path: pages.path,
			title: pages.title
		})
		.from(pageVersions)
		.innerJoin(pages, eq(pages.id, pageVersions.pageId))
		.where(
			and(
				eq(pageVersions.clientId, required.clientId),
				eq(pages.clientId, required.clientId),
				eq(pageVersions.status, 'published')
			)
		)
		.orderBy(pages.path, desc(pageVersions.version));
}

export async function listPublishedPagesForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			id: pages.id,
			path: pages.path,
			title: pages.title,
			publishedVersionId: pages.publishedVersionId
		})
		.from(pages)
		.where(and(eq(pages.clientId, required.clientId), isNotNull(pages.publishedVersionId)));
}

export async function listPublishedPageDocumentsForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db
		.select({
			id: pages.id,
			path: pages.path,
			title: pages.title,
			document: pageVersions.document
		})
		.from(pages)
		.innerJoin(pageVersions, eq(pageVersions.id, pages.publishedVersionId))
		.where(
			and(eq(pages.clientId, required.clientId), eq(pageVersions.clientId, required.clientId))
		);
}

export async function getPublishedHomeForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	const page = await getHomePageForTenant(required);
	if (!page?.publishedVersionId) return null;
	const [row] = await db
		.select()
		.from(pageVersions)
		.where(
			and(
				eq(pageVersions.id, page.publishedVersionId),
				eq(pageVersions.clientId, required.clientId),
				eq(pageVersions.status, 'published')
			)
		)
		.limit(1);
	return row ? { page, version: row } : null;
}

export async function composeLeadFunnelForTenant(
	ctx: TenantContext,
	input: {
		siteName: string;
		title: string;
		hostname: string;
		document: PageDocument;
	}
) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		let [site] = await tx
			.select()
			.from(sites)
			.where(eq(sites.clientId, required.clientId))
			.limit(1);
		if (!site) {
			[site] = await tx
				.insert(sites)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					name: input.siteName
				})
				.returning();
		}

		let [funnel] = await tx
			.select()
			.from(funnels)
			.where(and(eq(funnels.clientId, required.clientId), eq(funnels.slug, 'lead')))
			.limit(1);
		if (!funnel) {
			[funnel] = await tx
				.insert(funnels)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					siteId: site.id,
					name: 'Lead funnel',
					slug: 'lead',
					purpose: 'lead'
				})
				.returning();
		}

		let [page] = await tx
			.select()
			.from(pages)
			.where(
				and(
					eq(pages.clientId, required.clientId),
					eq(pages.funnelId, funnel.id),
					eq(pages.path, '/')
				)
			)
			.limit(1);
		if (!page) {
			[page] = await tx
				.insert(pages)
				.values({
					organizationId: required.organizationId,
					clientId: required.clientId,
					funnelId: funnel.id,
					path: '/',
					title: input.title
				})
				.returning();
		} else {
			[page] = await tx
				.update(pages)
				.set({ title: input.title, updatedAt: new Date() })
				.where(and(eq(pages.id, page.id), eq(pages.clientId, required.clientId)))
				.returning();
		}

		const [versionRow] = await tx
			.select({ version: max(pageVersions.version) })
			.from(pageVersions)
			.where(and(eq(pageVersions.clientId, required.clientId), eq(pageVersions.pageId, page.id)));
		const [draft] = await tx
			.insert(pageVersions)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				pageId: page.id,
				version: (versionRow?.version ?? 0) + 1,
				status: 'draft',
				document: input.document
			})
			.returning();

		const [domain] = await tx
			.select()
			.from(clientDomains)
			.where(and(eq(clientDomains.clientId, required.clientId), eq(clientDomains.kind, 'preview')))
			.limit(1);
		if (!domain) {
			await tx.insert(clientDomains).values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				hostname: input.hostname,
				kind: 'preview',
				status: 'pending',
				isCanonical: true
			});
		}

		return { site, funnel, page, draft };
	});
}

export async function publishLatestDraftForTenant(ctx: TenantContext) {
	const required = requireTenantContext(ctx);
	return db.transaction(async (tx) => {
		const [funnel] = await tx
			.select()
			.from(funnels)
			.where(and(eq(funnels.clientId, required.clientId), eq(funnels.slug, 'lead')))
			.limit(1);
		if (!funnel) return null;
		const [page] = await tx
			.select()
			.from(pages)
			.where(
				and(
					eq(pages.clientId, required.clientId),
					eq(pages.funnelId, funnel.id),
					eq(pages.path, '/')
				)
			)
			.limit(1);
		if (!page) return null;
		const [draft] = await tx
			.select()
			.from(pageVersions)
			.where(
				and(
					eq(pageVersions.clientId, required.clientId),
					eq(pageVersions.pageId, page.id),
					eq(pageVersions.status, 'draft')
				)
			)
			.orderBy(desc(pageVersions.version))
			.limit(1);
		if (!draft) return null;

		const [draftManifest] = await tx
			.select()
			.from(funnelAssetManifests)
			.where(
				and(
					eq(funnelAssetManifests.clientId, required.clientId),
					eq(funnelAssetManifests.pageVersionId, draft.id)
				)
			)
			.limit(1);

		const [versionRow] = await tx
			.select({ version: max(pageVersions.version) })
			.from(pageVersions)
			.where(and(eq(pageVersions.clientId, required.clientId), eq(pageVersions.pageId, page.id)));
		const [published] = await tx
			.insert(pageVersions)
			.values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				pageId: page.id,
				version: (versionRow?.version ?? 0) + 1,
				status: 'published',
				document: draft.document,
				publishedAt: new Date()
			})
			.returning();

		if (draftManifest) {
			await tx.insert(funnelAssetManifests).values({
				organizationId: required.organizationId,
				clientId: required.clientId,
				pageVersionId: published.id,
				schemaVersion: draftManifest.schemaVersion,
				ogCompositionId: draftManifest.ogCompositionId,
				socialCompositionId: draftManifest.socialCompositionId,
				emailCompositionId: draftManifest.emailCompositionId,
				placedAt: draftManifest.placedAt,
				placedBy: draftManifest.placedBy
			});
		}

		const draftDerivatives = await tx
			.select()
			.from(creativeDerivatives)
			.where(
				and(
					eq(creativeDerivatives.clientId, required.clientId),
					eq(creativeDerivatives.pageVersionId, draft.id)
				)
			);
		if (draftDerivatives.length > 0) {
			await tx.insert(creativeDerivatives).values(
				draftDerivatives.map((row) => ({
					organizationId: required.organizationId,
					clientId: required.clientId,
					pageVersionId: published.id,
					sourceAssetId: row.sourceAssetId,
					slot: row.slot,
					widthPx: row.widthPx,
					focalX: row.focalX,
					focalY: row.focalY,
					altText: row.altText,
					status: row.status
				}))
			);
		}

		await tx
			.update(pages)
			.set({
				publishedVersionId: published.id,
				title: published.document.seo.title,
				updatedAt: new Date()
			})
			.where(and(eq(pages.id, page.id), eq(pages.clientId, required.clientId)));

		await tx
			.update(clientDomains)
			.set({ status: 'active', updatedAt: new Date() })
			.where(and(eq(clientDomains.clientId, required.clientId), eq(clientDomains.kind, 'preview')));

		return { page, draft, published };
	});
}

export async function updatePageVersionDocumentForTenant(
	ctx: TenantContext,
	versionId: string,
	document: PageDocument
) {
	const required = requireTenantContext(ctx);
	const [row] = await db
		.update(pageVersions)
		.set({ document })
		.where(
			and(
				eq(pageVersions.id, versionId),
				eq(pageVersions.clientId, required.clientId),
				eq(pageVersions.status, 'draft')
			)
		)
		.returning();
	return row ?? null;
}
