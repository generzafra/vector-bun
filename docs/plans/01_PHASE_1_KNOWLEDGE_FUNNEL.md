# Phase 1 — Knowledge and Funnel

**Status:** Outline  
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
