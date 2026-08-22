# API and Integration Contracts

## Rule

Domain models are provider independent.

## Provider adapters

AIProvider, EmailProvider, SocialProvider, AnalyticsProvider, StorageProvider, SearchProvider.

Later Creative Engine adapters (`docs/29`): ImageProvider, then VideoProvider and ImageTransformProvider. Do not add `generateImage` to `AIProvider`. Do not invent `AssetStorageProvider`.

Later Outcomes adapters (`docs/30`): CRMProvider, then RevenueProvider, BookingProvider, CommerceProvider, AdProvider, and BillingProvider. Do not couple the domain to one CRM, ad network, or payment processor. Do not let AI change ad budgets automatically.

`StorageProvider` is implemented in `packages/storage`. Local disk is the default. Cloudflare R2 is selected when R2 credentials are present. Object keys are `clients/{client_id}/...`. Metadata lives in PostgreSQL. Raw keys are not authorization. Creative bytes use the same adapter under `clients/{client_id}/creative/...` when C0 ships.

## Every adapter

- Typed input and result
- Timeout
- Retry policy
- Idempotency
- Normalized errors
- Connection health
- Audit hooks
- Metrics
- Rate limit awareness

## Webhooks

Verify signatures where supported, store event IDs, deduplicate, acknowledge quickly, process durable work asynchronously.

## Phase 1 Control API

Authenticated session cookie plus CSRF on mutations. Tenant context is the active client, never a route id alone.

- `GET /v1/domains` — list hostnames for the active client
- `GET /v1/domains/:clientId` — same list only when the actor already owns that client
- `POST /v1/domains` — submit `production` or `redirect` hostname (`pages.manage`)
- `POST /v1/domains/:id/verify` — confirm the Delivery challenge token
- `POST /v1/domains/:id/activate` — serve the published funnel on that host
- `POST /v1/domains/:id/disable` — remove the host from routing

Delivery challenge: `GET /.well-known/vector-domain` on the submitted Host. Unknown hosts return no tenant data.

## Phase 2 Control API

Authenticated session cookie. Tenant context is the active client, never a route id alone.

- `GET /v1/leads` — list leads for the active client (`leads.read`)
- `GET /v1/leads/:clientId` — same list only when the actor already owns that client
- `POST /v1/leads/:id/status` — update lead status (`leads.manage`, CSRF)
- `GET /v1/analytics` — conversion and launch-funnel report for the active client (`analytics.read`)
- `GET /v1/analytics/:clientId` — same report only when the actor already owns that client

Postgres is the source of truth for leads and conversion counts. PostHog is an optional production fan-out.

## Phase 3 Control API

Authenticated session cookie plus CSRF on mutations. Tenant context is the active client, never a route id alone.

- `GET /v1/email` — sending domain, sequence, enrollments, messages, suppressions, engagement, inbound drafts, workflow runner (`email.read`)
- `GET /v1/email/:clientId` — same overview only when the actor already owns that client
- `POST /v1/email/domains` — upsert sending domain and run DNS checks (`email.manage`, CSRF)
- `POST /v1/email/domains/:id/recheck` — repeat SPF/DKIM/DMARC checks
- `POST /v1/email/suppressions` — add a client suppression
- `POST /v1/email/nurture/enroll-eligible` — sync contacts and enroll waiting production leads
- `POST /v1/email/nurture/process-due` — send due approved-sequence steps

Public, signature or token authenticated:

- `POST /v1/email/inbound/:id/review` — mark an inbound draft reviewed; never sends
- `POST /v1/webhooks/resend` — verify Svix signature (memory adapter accepts unsigned JSON in tests), dedupe event ids, apply bounce/complaint, store inbound drafts
- `POST /v1/public/email/unsubscribe` — HMAC token; records marketing denied + client suppression

Delivery `GET/POST /unsubscribe` on a known hostname. Token `clientId` must match the host tenant.

## Phase 4 Control API

Authenticated session cookie plus CSRF on mutations. Tenant context is the active client, never a route id alone.

- `GET /v1/funnel` — existing pages overview; includes `intelligenceDraft` when the current latest draft was created by an approved Intelligence run (`pages.read`)
- `GET /v1/intelligence` — agents, runs, decisions, approvals, feedback, tool-call audit, unpublished artifacts, activity, cost ledger, provider and pause status (`ai.read`)
- `GET /v1/intelligence/:clientId` — same overview only when the actor already owns that client
- `POST /v1/intelligence/runs` — start a typed draft (`ai.manage`, CSRF). Body: `agentKey`, optional `brief`, optional `idempotencyKey`
- `POST /v1/intelligence/approvals/:id/decide` — approve or reject; may write an unpublished page draft for funnel/copy; never publishes, sends, or executes (`ai.manage`, CSRF)
- `POST /v1/intelligence/pause` — set the client AI kill switch (`ai.manage`, CSRF)

`AIProvider` lives in `packages/ai`. Memory is the default. xAI Grok is selected when `XAI_API_KEY` is present. `AI_EXECUTION_PAUSED` wraps the adapter as disabled. Tokens stay in env, not the browser, logs, or prompts.

## Phase 5 Control API

Authenticated session cookie plus CSRF on mutations. Tenant context is the active client, never a route id alone.

- `GET /v1/social` — connections, accounts, posts, publications, Creative C0 library, readiness (`social.read`)
- `GET /v1/social/:clientId` — same overview only when the actor already owns that client
- `POST /v1/social/connections` — store an encrypted platform token and required account (`social.manage`, CSRF)
- `POST /v1/social/connections/:id/refresh` — rotate encrypted tokens through the platform adapter (`social.manage`, CSRF)
- `POST /v1/social/posts` — create an idea or draft; optional approved creative asset
- `POST /v1/social/posts/:id/transition` — idea → draft → reviewed → approved
- `POST /v1/social/posts/:id/schedule` — schedule an approved post
- `POST /v1/social/posts/:id/publish` — publish an approved post through the `social-publish` workflow
- `POST /v1/social/publish/process-due` — publish due scheduled posts for the active tenant
- `POST /v1/social/metrics/sync` — refetch tenant-scoped publication metrics
- `POST /v1/creative/assets` — operator upload into the C0 library (`social.manage`, CSRF, multipart)
- `GET /v1/creative/assets/:id` — tenant-scoped bytes
- `POST /v1/creative/assets/:id/rights` — confirm rights
- `POST /v1/creative/assets/:id/approve` — approve after rights are confirmed

`SocialProvider` lives in `packages/social`. Memory is the default. Official LinkedIn, X, and Meta (Facebook / Instagram) adapters run when `SOCIAL_ADAPTER=official`. Tokens are encrypted with `TOKEN_ENCRYPTION_KEY` and never returned in JSON. Refresh uses official OAuth token endpoints when client or app credentials are configured. Official adapters upload approved C0 images. `GET /v1/public/social-media` serves a short-lived HMAC grant so Instagram can fetch tenant-scoped bytes; forged, expired, or cross-tenant grants fail closed. Official Instagram Graph publish is media-required. `social-due-sweep` is tenant-scoped; `social-due-sweep-platform` fans out one job per client with due posts.
