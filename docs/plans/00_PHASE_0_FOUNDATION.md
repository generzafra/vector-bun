# Phase 0 — Foundation

**Status:** Exit met (22 August 2026)  
**Depth:** Deep execution plan  
**Prerequisite:** None. This is the first implementation slice.  
**Do not start later phases until this exit gate is met.**

Cursor Grok Bot implements this phase. Do not call the xAI Grok API. Do not run production marketing jobs from Cursor Automations.

Governing docs: `AGENTS.md`, `docs/03`, `docs/04`, `docs/05`, `docs/14`, `docs/18`, `docs/19`, `docs/21`, master plan §5–7, §29, §40–41.

---

## Goal

Stand up a Bun TypeScript modular monolith that can create organizations and clients, authenticate humans, authorize by capability, audit mutations, and prove that tenant A cannot read tenant B.

## Exit gate

From `docs/21_ROADMAP_ACCEPTANCE_GATES.md`:

- Cross-tenant isolation tests pass.
- Staging-style deploy succeeds.

**Staging for Phase 0** means GitHub Actions against Compose services: format check, typecheck, tests, migration apply, and app builds. A live VPS is not required.

## Out of scope

- Production Grok API, prompts, agents
- Resend, PostHog, social providers, R2
- Trigger.dev tasks
- Funnel renderer and page schema
- Custom-domain activation and preview hostnames
- Readiness scoring, launch state machine, Vector 24 clock
- MFA, PostgreSQL row-level security
- Kubernetes, Traefik in production
- Per-client application forks
- Empty packages for `ai`, `email`, `social`, `automation`, `analytics`, `funnel-engine`

---

## Locked decisions

- SvelteKit Control **server** imports `packages/domain` directly. Operator UI does not require HTTP to `apps/api`.
- Hono `apps/api` exists for health, future Delivery/webhooks, and machine clients. It calls the same domain services.
- Shared business rules live in packages. Control and API must not fork them.
- Postgres is the session store in Phase 0. Redis is provisioned but used only as transient infrastructure later.
- Package manager is Bun, never npm.
- Local ports must not collide with MGE (`5182`, `3010`, `5435`, `6381`).

---

## Workspace

Expand the existing root `package.json` into a Bun workspace. Create only:

```text
apps/control                 SvelteKit Control Plane
apps/delivery                SvelteKit Delivery stub
apps/api                     Hono domain API
packages/config              typed env
packages/contracts           Zod schemas
packages/db                  Drizzle schema, repos, migrations
packages/auth                sessions, CSRF, RBAC
packages/domain              org/client/membership services
packages/observability       structured logs
packages/ui                  shared primitives, not client themes
infra/docker                 postgres + redis
.github/workflows/ci.yml
.env.example
```

### Local ports

| Service       | Port |
| ------------- | ---- |
| Control Vite  | 5183 |
| Delivery Vite | 5184 |
| API           | 3011 |
| Postgres      | 5436 |
| Redis         | 6382 |

### Request flow

```text
Operator → apps/control → packages/domain → packages/auth + packages/db → PostgreSQL
Visitor  → apps/delivery → fail closed 404 if host is unknown
Machine  → apps/api → packages/domain (same services)
```

Control `+page.server.ts` and form actions: Zod → session → capability → `packages/domain`. No Drizzle in route files.

---

## Schema (Phase 0 only)

From master plan §8.1, cut to foundation:

| Table              | Notes                                   |
| ------------------ | --------------------------------------- |
| `organizations`    | MGE or a future partner                 |
| `clients`          | Operating tenant. Has `organization_id` |
| `client_settings`  | Minimal: display name, timezone         |
| `users`            | Human accounts                          |
| `memberships`      | User ↔ org/client + role                |
| `roles`            | Named role                              |
| `permissions`      | Capability strings                      |
| `role_permissions` | Role ↔ permission                       |
| `sessions`         | Server-side sessions                    |
| `audit_logs`       | Mutations and auth events               |

`audit_logs.actor_type`: `human | system | automation | ai | provider_webhook`. Record the type now even if automation and AI actors are unused.

Rules:

- UUID primary keys (prefer sortable UUIDs, consistent with later `docs/05`).
- `client_id` on every tenant-owned row (`clients` itself is the tenant; `client_settings`, `memberships` that are client-scoped, `sessions` if bound to a client, `audit_logs` when the action is tenant-owned).
- UTC `timestamptz`. `created_at` / `updated_at` on mutable rows.
- Compound indexes beginning with `client_id` where the table is tenant-owned.
- No unscoped repository methods. Missing `TenantContext` fails closed.
- Never edit an applied migration.

Do **not** add `client_domains`, readiness, launch, knowledge, funnel, contact, or provider tables.

### TenantContext

Required on every tenant query:

```ts
type TenantContext = {
	organizationId: string;
	clientId: string;
	userId?: string;
	roleIds: string[];
	requestId: string;
};
```

---

## Auth and RBAC

- HttpOnly, `Secure`, `SameSite=Lax` session cookie
- Server-side session row in PostgreSQL
- argon2id passwords
- Login and password-reset rate limits
- CSRF on mutations
- Authorize by capability, never `user.role === 'Admin'`
- Permissions checked in domain services, not only route handlers

### Phase 0 capabilities

```text
clients.read
clients.manage
users.manage
audit.read
```

### Seed roles

- MGE Super Admin
- MGE Operator
- Client Owner
- Client Admin
- Read Only

---

## Apps

### Control (`apps/control`)

Authenticated operational UI. Not MGE cream/cinema tokens.

Minimum screens:

- Login
- Org / client switcher
- Client list and authorized create
- Membership list for the current client

Svelte 5 runes only. Validate new `.svelte` with Svelte MCP `svelte-autofixer`. Control is operational, not cinematic. Later Control chrome follows `docs/28`. The public quality bar in `docs/27` starts with Phase 1 Delivery funnels.

### Delivery (`apps/delivery`)

- Health route
- Unknown hostname → fail-closed 404
- No page engine, no tenant content

This proves the Delivery app exists and cannot leak a tenant.

### API (`apps/api`)

Thin Hono routes: Zod → auth → capability → the same domain services.

Phase 0 endpoints:

- `GET /health`
- A small authenticated org/client read used by isolation tests

Operator UX must not depend on this HTTP hop.

---

## Tests (hard gate)

Use `bun:test` against Compose Postgres.

Required cases:

1. User on client A cannot read or update client B.
2. Route IDs without tenant verification fail.
3. Missing `TenantContext` throws / fails closed.
4. Session cookie is HttpOnly.
5. Missing capability returns 403.
6. Client create and membership change write audit rows.
7. Delivery unknown host returns 404 and no other client payload.

Do not claim Phase 0 complete if these tests were skipped.

---

## CI and local infra

- `infra/docker/docker-compose.yml`: PostgreSQL 16 and Redis
- `.env.example` only. Never commit secrets
- GitHub Actions: `prettier --check`, typecheck, `bun test`, `drizzle-kit migrate` against service containers, build control, delivery, and API
- Seed: one organization (MGE), two clients, two users — used by isolation tests

---

## Build order

Execute in this sequence. Do not skip ahead.

1. Bun workspaces, shared tsconfig, `packages/config`
2. Compose + `.env.example`
3. `packages/db` + first committed Drizzle migration
4. Tenant context + organization, client, user, membership
5. Auth, sessions, CSRF, RBAC
6. Audit log writes
7. Cross-tenant isolation tests
8. Control screens, Delivery stub, API health
9. GitHub Actions CI

After each slice: run relevant tests, update docs, record an ADR if a material decision changed.

---

## Definition of done

- Workspaces and apps build
- Migrations apply cleanly in CI
- Isolation suite passes
- Login works locally on port 5183
- Delivery fail-closed on unknown hosts
- README / `docs/21` note Phase 0 exit as met only after the above
- No production provider calls

## Vector 24 hook

None to implement. Do not add launch clocks. Design so Client #50 will not need a forked app: one Control, one Delivery, shared packages, `client_id` everywhere.
