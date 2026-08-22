# Phase 1 — Knowledge and Funnel

**Status:** Phase 1 exit met — knowledge, preview-funnel, launch/readiness, storage, production domain activation, and the MVP Frontend Release Gate.
**Prerequisite:** Phase 0 exit met. Do not start until cross-tenant tests pass and Phase 0 CI deploy succeeds.

---

## Goal

A supervised operator can ingest client knowledge, compose one lead funnel from approved section types, publish an immutable page version to a private preview host, and track launch state.

Public pages follow `docs/27`. Implement the MVP frontend foundation (tokens, accessible nav/forms, several hero variants, trust/proof/CTA, mobile-first, metadata). Do not build every cinematic variant. Do not generate a generic AI landing page.

## Exit gate

One client can publish a production-grade lead funnel, including a private preview hostname and a tracked launch state. The published funnel must pass the Frontend Release Gate in `docs/27` for the Phase 1 component set.

## In scope

- Brand / knowledge profile, products, services, offers, approved and prohibited claims
- R2 (or S3-compatible) storage adapter for brand and page assets
- Funnel schema, controlled section types, immutable published versions
- Lead form configuration (no full CRM yet)
- `client_domains`, hostname lookup, preview `preview-{slug}.vector.maxglobalexpo.com`
- Preview: `noindex`, no production email or social, test lead routing
- Readiness model, onboarding completion score, launch state machine

## Out of scope

- PostHog, attribution, Resend, Grok API, social publish
- Custom production domain go-live as the only identity (preview is enough to exit)
- Vector 24 SLA, portfolio launch dashboard
- Visual page builder, arbitrary HTML/CSS from the model

## New packages and tables

- `packages/funnel-engine`, `packages/storage`, `packages/content`
- Tables: `brands`, `brand_assets`, `products`, `services`, `offers`, `knowledge_*` as needed
- `sites`, `funnels`, `pages`, `page_versions`, `forms`, `form_fields`
- `client_domains`
- `client_readiness`, `client_readiness_items`, `client_launches`, `client_launch_events`, `client_launch_blocks`, `client_launch_approvals`

## Vector 24 hook

Introduce readiness items and launch states now. Clock fields may exist. Do not promise or measure a 24-hour SLA. First clients stay human-led.

Publication updates an immutable page version and cache invalidation. It is not a Vector code deploy.

## Do not start until

Phase 0 isolation tests, session auth, and CI are green.

## Slice 1 — Client knowledge (done)

Operator can capture a tenant-scoped brand profile, services, offers, and approved/prohibited claims for the active client. Same profile shape for every client. No custom engineering.

- Tables: `brands`, `services`, `offers`, `claims`
- Capabilities: `knowledge.read`, `knowledge.manage`
- Control: `/knowledge`
- Isolation: actor context must match the client; Alpha cannot read or write Beta knowledge

## Slice 2 — Funnel schema and preview host (done)

Operator composes one lead funnel from approved section types, publishes an immutable page version, and Delivery renders it on `preview-{slug}` only. Same compose + preview hostname pattern for every client. No custom engineering. No visual page builder.

- Package: `packages/funnel-engine`
- Tables: `sites`, `funnels`, `pages`, `page_versions`, `client_domains`
- Capabilities: `pages.read`, `pages.manage`
- Control: `/funnel`
- Delivery: hostname lookup, then TenantContext page load; unknown hosts 404 with no tenant data
- Preview: `noindex`, no production email, lead POST acknowledges only (no CRM persist)
- Isolation: Alpha preview host cannot serve Beta copy; route IDs on Delivery 404

## Slice 3 — Readiness and launch state (done)

Operator tracks a tenant-scoped readiness checklist and launch state machine. Same catalog and states for every client. No custom engineering. Clock fields exist. Vector 24 SLA is not measured or promised.

- Tables: `client_readiness`, `client_readiness_items`, `client_launches`, `client_launch_events`, `client_launch_blocks`, `client_launch_approvals`
- Capabilities: `launch.read`, `launch.manage`
- Control: `/launch`
- `vector_ready` requires blocking items: brand identity/narrative, service, approved and prohibited claims, published preview
- `launching` / `live` require an active production domain; transitions fail closed until activation
- Isolation: Alpha cannot read or transition Beta; launch events do not leak across tenants

## Slice 4 — Brand asset storage (done)

Operator uploads tenant-scoped brand assets through a `StorageProvider`. Local files are the default. Cloudflare R2 is used when R2 credentials are present. Same key pattern and validation for every client. No custom engineering.

- Package: `packages/storage`
- Table: `brand_assets`
- Keys: `clients/{client_id}/brand/{purpose}/{id}-{filename}`
- Validation: 2MB max, PNG/JPEG/WEBP/ICO, magic-byte check
- Control: `/knowledge` asset list, upload, mediated preview at `/knowledge/asset/:id`
- Readiness: `assets.uploaded` completes when the tenant has at least one brand asset
- Isolation: Alpha cannot read, write, or download Beta objects; raw keys are not authorization
- Historical note: this is Creative C0 partial (identity files only). The general Creative Engine library, rights, generation, and derivatives live in `docs/29` and do not reopen this exit.

## Slice 5 — Production domain activation (done)

Operator submits a tenant-scoped production or redirect hostname, verifies ownership through Delivery `/.well-known/vector-domain`, then activates it on the shared Delivery Plane. Same path for every client. No custom engineering. Preview stays `noindex` and is not the production identity.

- Table: `client_domains` verification token, verified/activated timestamps
- Capabilities: `pages.read`, `pages.manage`
- Control: `/launch` production domain section
- Delivery: hostname lookup, HTTP challenge, production robots/sitemap, redirect 308
- Readiness: `domain.production` completes when a production hostname is active
- Isolation: Alpha cannot read or activate Beta hostnames; unknown hosts 404 with no tenant data; first-come hostname reservation does not leak the other tenant

## Slice 6 — Frontend Release Gate, MVP set (done)

The seeded preview funnels meet the Phase 1 subset of `docs/27` §88: tokens, accessible nav/forms, hero/proof/CTA, mobile-first, metadata. Same renderer for every client. Client tokens and personality keep Alpha and Beta distinct. No cloned reference sites. Control may later adopt `docs/28` without changing this Delivery exit.

- Preview: `noindex`, no public canonical
- Production: indexable canonical from the request origin
- Lead form: labels, preserved values, error / sending / success
- Mobile: overflow clipped, wrap, 44px-class targets, reduced motion
- Out of this slice: analytics events (Phase 2), consent UI (Phase 3), structured data (Phase 6)

## Locked attachments

`docs/27` MVP gate is met. `brand_assets` + `offers` + `StorageProvider` are Creative C0 / Outcomes offer seed only. Do not reopen this exit for generated heroes, campaign-offer versions, or a client Today dashboard. See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).
