import { rm } from 'node:fs/promises';
import { isAbsolute, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { env } from '@vector/config';

const PROTECTED_SLUGS = new Set(['alpha', 'beta']);

/** Throwaway slugs end in `-<8 hex>`, such as `o11-1a2b3c4d`. A real slug such as `elise` does not match. */
export const TEST_TENANT_SLUG = '^[a-z][a-z0-9-]*-[0-9a-f]{8}$';

/** Global complaint rows the email test leaves with no client. A real address does not match. */
const TEST_GLOBAL_SUPPRESSION_EMAIL =
	'^shared-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}@example\\.test$';

const MEMBER_EMAIL = '^member-[0-9a-f]{8}@vector\\.test$';

const repoRoot = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

type FkEdge = { child: string; parent: string };
type Sql = ReturnType<typeof postgres>;

let deleteOrder: string[] | null = null;

function refuseProduction() {
	if (process.env.NODE_ENV === 'production') {
		throw new Error('Tenant purge is refused in production');
	}
}

function assertIdentifier(name: string) {
	if (!/^[a-z_][a-z0-9_]*$/.test(name)) {
		throw new Error(`Unexpected table name ${name}`);
	}
	return name;
}

function assertUuid(id: string) {
	if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
		throw new Error('Invalid tenant id');
	}
	return id;
}

function quoteLiteral(value: string) {
	return `'${value.replaceAll("'", "''")}'`;
}

function uuidIn(ids: string[]) {
	return ids.map((id) => `'${assertUuid(id)}'::uuid`).join(', ');
}

/**
 * Delete children before parents. Self-references are ignored.
 * A cycle throws instead of disabling foreign keys.
 */
export function orderTenantDeletes(tables: string[], edges: FkEdge[]) {
	const remaining = new Set(tables);
	const order: string[] = [];
	const relevant = edges.filter((edge) => edge.child !== edge.parent);
	while (remaining.size > 0) {
		const ready = [...remaining]
			.filter(
				(table) =>
					!relevant.some(
						(edge) =>
							edge.parent === table && remaining.has(edge.child) && remaining.has(edge.parent)
					)
			)
			.sort();
		if (ready.length === 0) {
			throw new Error(`Tenant purge hit a foreign-key cycle: ${[...remaining].sort().join(', ')}`);
		}
		for (const table of ready) {
			order.push(table);
			remaining.delete(table);
		}
	}
	return order;
}

async function withSql<T>(fn: (sql: Sql) => Promise<T>) {
	const sql = postgres(env.DATABASE_URL, { max: 1, prepare: false });
	try {
		return await fn(sql);
	} finally {
		await sql.end({ timeout: 1 });
	}
}

async function loadDeleteOrder(sql: Sql) {
	if (deleteOrder) return deleteOrder;
	const tableRows = await sql<{ table_name: string }[]>`
		SELECT c.relname AS table_name
		FROM pg_class c
		JOIN pg_namespace n ON n.oid = c.relnamespace
		JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'client_id' AND NOT a.attisdropped
		WHERE n.nspname = 'public' AND c.relkind = 'r'
	`;
	const tables = tableRows.map((row) => assertIdentifier(row.table_name));
	if (!tables.includes('clients')) tables.push('clients');
	const edgeRows = await sql<{ child: string; parent: string }[]>`
		SELECT DISTINCT child.relname AS child, parent.relname AS parent
		FROM pg_constraint con
		JOIN pg_class child ON child.oid = con.conrelid
		JOIN pg_class parent ON parent.oid = con.confrelid
		JOIN pg_namespace n ON n.oid = child.relnamespace
		WHERE con.contype = 'f'
			AND n.nspname = 'public'
			AND child.relname <> parent.relname
			AND EXISTS (
				SELECT 1 FROM pg_attribute a
				WHERE a.attrelid = child.oid AND a.attname = 'client_id' AND NOT a.attisdropped
			)
			AND (
				parent.relname = 'clients'
				OR EXISTS (
					SELECT 1 FROM pg_attribute a
					WHERE a.attrelid = parent.oid AND a.attname = 'client_id' AND NOT a.attisdropped
				)
			)
	`;
	const edges = edgeRows.map((row) => ({
		child: assertIdentifier(row.child),
		parent: assertIdentifier(row.parent)
	}));
	deleteOrder = orderTenantDeletes(tables, edges);
	if (deleteOrder.at(-1) !== 'clients') {
		throw new Error('Tenant purge would delete clients before dependent rows');
	}
	return deleteOrder;
}

function storageRoots() {
	const configured = isAbsolute(env.STORAGE_LOCAL_DIR)
		? env.STORAGE_LOCAL_DIR
		: resolve(repoRoot, env.STORAGE_LOCAL_DIR);
	return [
		...new Set([
			configured,
			resolve(repoRoot, '.data/storage'),
			resolve(repoRoot, '.data/test-storage')
		])
	];
}

async function removeTenantStorage(clientIds: string[]) {
	for (const clientId of clientIds) {
		if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clientId)) {
			continue;
		}
		for (const root of storageRoots()) {
			const base = resolve(root, 'clients');
			const dir = resolve(base, clientId);
			if (!dir.startsWith(base + sep)) continue;
			await rm(dir, { recursive: true, force: true });
		}
	}
}

/**
 * Delete one or more throwaway tenants and the rows that belong to them.
 * Seed clients alpha and beta are refused. Foreign keys are not cascaded.
 */
export async function purgeTenants(clientIds: string[]) {
	refuseProduction();
	const ids = [...new Set(clientIds)];
	if (ids.length === 0) return 0;
	const deleted = await withSql(async (sql) => {
		const found = await sql.unsafe<{ id: string; slug: string }[]>(
			`SELECT id, slug FROM clients WHERE id IN (${uuidIn(ids)})`
		);
		const protectedSlug = found.map((row) => row.slug).find((slug) => PROTECTED_SLUGS.has(slug));
		if (protectedSlug) {
			throw new Error(`Refusing to purge seed client ${protectedSlug}`);
		}
		const deleteIds = found.map((row) => row.id);
		if (deleteIds.length === 0) return 0;
		const order = await loadDeleteOrder(sql);
		const list = uuidIn(deleteIds);
		await sql.begin(async (tx) => {
			for (const table of order) {
				const statement =
					table === 'clients'
						? `DELETE FROM clients WHERE id IN (${list})`
						: `DELETE FROM ${assertIdentifier(table)} WHERE client_id IN (${list})`;
				await tx.unsafe(statement);
			}
		});
		return deleteIds;
	});
	if (typeof deleted === 'number') return deleted;
	await removeTenantStorage(deleted);
	return deleted.length;
}

/** Delete member-*@vector.test users left on a seed client by isolation tests. */
export async function purgeOrphanTestMembers() {
	refuseProduction();
	return withSql(async (sql) => {
		const found = await sql.unsafe<{ id: string }[]>(
			`SELECT id FROM users
			 WHERE email ~ ${quoteLiteral(MEMBER_EMAIL)}
				AND lower(email) <> lower(${quoteLiteral(env.SEED_ADMIN_EMAIL)})
				AND lower(email) <> lower(${quoteLiteral(env.SEED_USER_A_EMAIL)})`
		);
		const ids = found.map((row) => row.id);
		if (ids.length === 0) return 0;
		const list = uuidIn(ids);
		await sql.begin(async (tx) => {
			await tx.unsafe(`DELETE FROM memberships WHERE user_id IN (${list})`);
			await tx.unsafe(`DELETE FROM sessions WHERE user_id IN (${list})`);
			await tx.unsafe(`DELETE FROM users WHERE id IN (${list})`);
		});
		return ids.length;
	});
}

/** Remove leftover test clients. Clients that do not match the test slug stay. */
export async function purgeTestTenants() {
	refuseProduction();
	const { ids, skippedSlugs } = await withSql(async (sql) => {
		const found = await sql.unsafe<{ id: string }[]>(
			`SELECT id FROM clients
			 WHERE slug ~ ${quoteLiteral(TEST_TENANT_SLUG)}
				AND slug NOT IN ('alpha', 'beta')`
		);
		const skipped = await sql.unsafe<{ slug: string }[]>(
			`SELECT slug FROM clients
			 WHERE slug NOT IN ('alpha', 'beta')
				AND slug !~ ${quoteLiteral(TEST_TENANT_SLUG)}
			 ORDER BY slug`
		);
		return {
			ids: found.map((row) => row.id),
			skippedSlugs: skipped.map((row) => row.slug)
		};
	});
	const clients = await purgeTenants(ids);
	const users = await purgeOrphanTestMembers();
	return { clients, users, skippedSlugs };
}

const SEED_ACTIVITY_SLUGS = ['alpha', 'beta'] as const;

/**
 * Rows the seed created. Every other public table with client_id is test activity
 * and is cleared for alpha and beta. A new tenant table is cleared unless it is added here.
 */
const SEED_STRUCTURE_TABLES = [
	'ai_client_settings',
	'brands',
	'claims',
	'client_domains',
	'client_launches',
	'client_readiness',
	'client_readiness_items',
	'client_settings',
	'email_sequence_steps',
	'email_sequences',
	'email_topics',
	'funnels',
	'memberships',
	'offers',
	'pages',
	'page_versions',
	'services',
	'sites'
] as const;

const WELCOME_STEPS = {
	alpha: [
		{
			subject: 'We received your consult request',
			body: 'Thanks for contacting Client Alpha Dental. A teammate will review your request.'
		},
		{
			subject: 'Next step for your implant consult',
			body: 'If you still want an implant consult, reply to this email with a preferred time.'
		}
	],
	beta: [
		{
			subject: 'We received your assessment request',
			body: 'Thanks for contacting Client Beta Logistics. A teammate will review your request.'
		},
		{
			subject: 'Next step for your warehouse assessment',
			body: 'If you still want a warehouse assessment, reply with the site address and dock hours.'
		}
	]
} as const;

/**
 * Delete test activity on Client Alpha and Client Beta.
 * Keeps the seed brand, one service, one offer, two claims, the preview domain,
 * the lead homepage's published version, launch and readiness shells, and welcome_v1.
 * Older page drafts, extra sequences, goals, social, creative, search, and autonomy history go.
 * Sessions for those two clients are included, so an open Control login on them ends.
 * Global complaint suppressions for shared-<uuid>@example.test are removed. Other global suppressions stay.
 * Local files under clients/<id> for those two clients are removed. Seed stores no media.
 */
export async function clearSeedClientActivity() {
	refuseProduction();
	const kept = SEED_STRUCTURE_TABLES.map((table) => quoteLiteral(table)).join(', ');
	const result = await withSql(async (sql) => {
		const clients = await sql.unsafe<{ id: string; slug: string }[]>(
			`SELECT id, slug FROM clients WHERE slug IN ('alpha', 'beta') ORDER BY slug`
		);
		const slugs = new Set(clients.map((row) => row.slug));
		for (const slug of SEED_ACTIVITY_SLUGS) {
			if (!slugs.has(slug)) throw new Error(`Seed client ${slug} is missing. Run bun run db:seed.`);
		}
		const bySlug = Object.fromEntries(clients.map((row) => [row.slug, row.id])) as Record<
			(typeof SEED_ACTIVITY_SLUGS)[number],
			string
		>;
		const tableRows = await sql.unsafe<{ table_name: string }[]>(
			`SELECT c.relname AS table_name
			 FROM pg_class c
			 JOIN pg_namespace n ON n.oid = c.relnamespace
			 JOIN pg_attribute a ON a.attrelid = c.oid AND a.attname = 'client_id' AND NOT a.attisdropped
			 WHERE n.nspname = 'public' AND c.relkind = 'r'
				AND c.relname NOT IN (${kept})
			 ORDER BY c.relname`
		);
		const tables = tableRows.map((row) => assertIdentifier(row.table_name));
		const tableList = tables.map((table) => quoteLiteral(table)).join(', ');
		const edgeRows =
			tables.length === 0
				? []
				: await sql.unsafe<{ child: string; parent: string }[]>(
						`SELECT DISTINCT child.relname AS child, parent.relname AS parent
						 FROM pg_constraint con
						 JOIN pg_class child ON child.oid = con.conrelid
						 JOIN pg_class parent ON parent.oid = con.confrelid
						 JOIN pg_namespace n ON n.oid = child.relnamespace
						 WHERE con.contype = 'f'
							AND n.nspname = 'public'
							AND child.relname <> parent.relname
							AND child.relname IN (${tableList})
							AND parent.relname IN (${tableList})`
					);
		const order = orderTenantDeletes(
			tables,
			edgeRows.map((row) => ({
				child: assertIdentifier(row.child),
				parent: assertIdentifier(row.parent)
			}))
		);
		const list = uuidIn(clients.map((row) => row.id));
		const alpha = quoteLiteral(assertUuid(bySlug.alpha));
		const beta = quoteLiteral(assertUuid(bySlug.beta));
		const deleted: Record<string, number> = {};
		const note = (table: string, count: number) => {
			if (count > 0) deleted[table] = (deleted[table] ?? 0) + count;
		};
		await sql.begin(async (tx) => {
			for (const table of order) {
				const removed = await tx.unsafe(
					`DELETE FROM ${assertIdentifier(table)} WHERE client_id IN (${list})`
				);
				note(table, Number(removed.count ?? 0));
			}

			const extraSteps = await tx.unsafe(
				`DELETE FROM email_sequence_steps
				 WHERE client_id IN (${list})
					AND (
						sequence_id NOT IN (
							SELECT id FROM email_sequences
							WHERE client_id IN (${list}) AND key = 'welcome_v1'
						)
						OR step_index NOT IN (0, 1)
					)`
			);
			note('email_sequence_steps', Number(extraSteps.count ?? 0));

			const extraSequences = await tx.unsafe(
				`DELETE FROM email_sequences
				 WHERE client_id IN (${list}) AND key <> 'welcome_v1'`
			);
			note('email_sequences', Number(extraSequences.count ?? 0));

			const extraTopics = await tx.unsafe(
				`DELETE FROM email_topics
				 WHERE client_id IN (${list}) AND slug <> 'welcome'`
			);
			note('email_topics', Number(extraTopics.count ?? 0));

			const extraVersions = await tx.unsafe(
				`DELETE FROM page_versions
				 WHERE client_id IN (${list})
					AND id NOT IN (
						SELECT version_id FROM (
							SELECT COALESCE(
								p.published_version_id,
								(
									SELECT pv.id FROM page_versions pv
									WHERE pv.page_id = p.id
									ORDER BY (pv.status = 'published') DESC, pv.version DESC
									LIMIT 1
								)
							) AS version_id
							FROM pages p
							JOIN funnels f ON f.id = p.funnel_id
							WHERE p.client_id IN (${list})
								AND f.slug = 'lead'
								AND p.path = '/'
						) kept
						WHERE version_id IS NOT NULL
					)`
			);
			note('page_versions', Number(extraVersions.count ?? 0));

			const extraPages = await tx.unsafe(
				`DELETE FROM pages
				 WHERE client_id IN (${list})
					AND id NOT IN (
						SELECT p.id FROM pages p
						JOIN funnels f ON f.id = p.funnel_id
						WHERE p.client_id IN (${list}) AND f.slug = 'lead' AND p.path = '/'
					)`
			);
			note('pages', Number(extraPages.count ?? 0));

			const extraFunnels = await tx.unsafe(
				`DELETE FROM funnels WHERE client_id IN (${list}) AND slug <> 'lead'`
			);
			note('funnels', Number(extraFunnels.count ?? 0));

			const extraDomains = await tx.unsafe(
				`DELETE FROM client_domains WHERE client_id IN (${list}) AND kind <> 'preview'`
			);
			note('client_domains', Number(extraDomains.count ?? 0));

			const extraServices = await tx.unsafe(
				`DELETE FROM services
				 WHERE (client_id = ${alpha}::uuid AND slug <> 'implant-consult')
					OR (client_id = ${beta}::uuid AND slug <> 'warehouse-assessment')`
			);
			note('services', Number(extraServices.count ?? 0));

			const extraOffers = await tx.unsafe(
				`DELETE FROM offers
				 WHERE (client_id = ${alpha}::uuid AND name <> 'Consult package')
					OR (client_id = ${beta}::uuid AND name <> 'Assessment sprint')`
			);
			note('offers', Number(extraOffers.count ?? 0));

			const extraClaims = await tx.unsafe(
				`DELETE FROM claims
				 WHERE (
						client_id = ${alpha}::uuid
						AND statement NOT IN (
							'Consults include a written treatment plan',
							'Guaranteed implant success'
						)
					) OR (
						client_id = ${beta}::uuid
						AND statement NOT IN (
							'Assessment covers inbound and outbound docks',
							'Guaranteed 50 percent cost reduction'
						)
					)`
			);
			note('claims', Number(extraClaims.count ?? 0));

			const testGlobalSuppressions = await tx.unsafe(
				`DELETE FROM email_suppressions
				 WHERE client_id IS NULL
					AND scope = 'global'
					AND reason = 'complaint'
					AND source = 'provider_webhook'
					AND email ~ ${quoteLiteral(TEST_GLOBAL_SUPPRESSION_EMAIL)}`
			);
			note('email_suppressions', Number(testGlobalSuppressions.count ?? 0));

			await tx.unsafe(
				`UPDATE email_sequences
				 SET status = 'approved', version = 1, name = 'Welcome nurture',
					approved_at = COALESCE(approved_at, now()), updated_at = now()
				 WHERE client_id IN (${list}) AND key = 'welcome_v1'`
			);
			await tx.unsafe(
				`UPDATE email_topics SET name = 'Welcome'
				 WHERE client_id IN (${list}) AND slug = 'welcome'`
			);
			for (const slug of SEED_ACTIVITY_SLUGS) {
				const clientId = quoteLiteral(assertUuid(bySlug[slug]));
				for (const [index, step] of WELCOME_STEPS[slug].entries()) {
					await tx.unsafe(
						`UPDATE email_sequence_steps AS step
						 SET subject = ${quoteLiteral(step.subject)},
							text_body = ${quoteLiteral(step.body)},
							html_body = ${quoteLiteral(`<p>${step.body}</p>`)},
							topic = 'welcome',
							delay_minutes = ${index === 0 ? 0 : 1440}
						 FROM email_sequences seq
						 WHERE step.sequence_id = seq.id
							AND seq.client_id = ${clientId}::uuid
							AND seq.key = 'welcome_v1'
							AND step.step_index = ${index}`
					);
				}
			}

			await tx.unsafe(
				`UPDATE client_launches SET
					launch_class = 'B',
					status = 'draft',
					signed_at = NULL,
					onboarding_started_at = NULL,
					vector_ready_at = NULL,
					generation_started_at = NULL,
					qa_started_at = NULL,
					approval_requested_at = NULL,
					approval_received_at = NULL,
					domain_ready_at = NULL,
					launch_started_at = NULL,
					live_at = NULL,
					paused_at = NULL,
					paused_seconds = 0,
					resume_status = NULL,
					failure_reason = NULL,
					updated_at = now()
				 WHERE client_id IN (${list})`
			);
			await tx.unsafe(
				`UPDATE client_readiness_items SET
					status = 'pending',
					detail = NULL,
					completed_at = NULL,
					updated_at = now()
				 WHERE client_id IN (${list})`
			);
			await tx.unsafe(
				`UPDATE ai_client_settings SET
					paused = false,
					autonomy_ceiling = 2,
					cost_ceiling_micros = 5000000,
					updated_at = now()
				 WHERE client_id IN (${list})`
			);
		});
		return { slugs: clients.map((row) => row.slug), deleted, ids: clients.map((row) => row.id) };
	});
	await removeTenantStorage(result.ids);
	const users = await purgeOrphanTestMembers();
	return { slugs: result.slugs, deleted: result.deleted, users };
}
