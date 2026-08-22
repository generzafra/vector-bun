# Roadmap and Acceptance Gates

Detailed execution plans: [plans/README.md](plans/README.md). Implement one phase at a time. Cursor Grok Bot is the development agent. Production Grok API starts in Phase 4.

## Phase 0

Plan: [plans/00_PHASE_0_FOUNDATION.md](plans/00_PHASE_0_FOUNDATION.md).

Repository, CI, environment validation, PostgreSQL, tenant context, auth, RBAC, audit.

**Exit:** cross tenant tests pass and staging deploy succeeds.

**Status (22 August 2026):** Phase 0 exit is met. Isolation tests pass against Compose Postgres. Staging for this phase is GitHub Actions (`prettier --check`, typecheck, `bun test`, migrate, Control/Delivery/API builds). A live VPS is not required.

## Phase 1

Plan: [plans/01_PHASE_1_KNOWLEDGE_FUNNEL.md](plans/01_PHASE_1_KNOWLEDGE_FUNNEL.md).

Client knowledge, assets, funnel engine, custom domains, forms, client readiness model, onboarding completion scoring, launch state machine, preview domain model.

**Exit:** one client can publish a production lead funnel, including a private preview hostname and tracked launch state. That funnel must meet the Frontend Release Gate in `docs/27` for the MVP component set (tokens, accessible nav/forms, hero/proof/CTA, mobile-first, metadata).

**Status (22 August 2026):** Phase 1 exit is met for the MVP component set. Seeded Alpha/Beta publish to private preview hosts with tracked launch state. Delivery uses client tokens, skip-link navigation, labeled lead form states (error / loading / success), hero/proof/CTA/services, mobile overflow and reduced-motion rules, and hostname-aware metadata (preview `noindex`, production canonical). Analytics events and structured data stay in later phases. Control later adopted `docs/28` identity on existing operator screens; that restyle does not reopen this gate and does not apply Vector identity to Delivery.

## Phase 2

Plan: [plans/02_PHASE_2_LEADS_ANALYTICS.md](plans/02_PHASE_2_LEADS_ANALYTICS.md).

Contacts, leads, event taxonomy, PostHog, attribution, launch-funnel analytics, readiness and launch timing events.

**Exit:** acquisition source can be traced to lead, and operators can see readiness-to-live timing. Public conversion elements emit the Vector event taxonomy.

**Status (22 August 2026):** Phase 2 exit is met. Acquisition source traces to a tenant-scoped lead. Operators see readiness-to-live clock splits and launch-funnel transition counts. Public conversion elements emit `page_viewed`, `cta_clicked`, `form_started`, `form_submitted`, and `lead_created`. Control `/analytics` reports Postgres conversion (preview separated). PostHog is optional, production-only, and never receives test events or form PII.

## Phase 3

Plan: [plans/03_PHASE_3_EMAIL_NURTURE.md](plans/03_PHASE_3_EMAIL_NURTURE.md).

Resend, suppression, nurture, inbound events, automated email domain readiness checks.

**Exit:** eligible lead completes approved nurture safely, and sending-domain readiness is machine-checked.

**Status (22 August 2026):** Slices 1–2 are implemented. An eligible production lead can complete seeded `welcome_v1` without bypassing consent or suppression. SPF/DKIM/DMARC/From are machine-checked. Preview leads do not send. `email.sending` is required for live launch and does not block VECTOR READY. Operators see Postgres engagement, sync contacts from leads, process due steps, and enroll leads that waited on a sending domain. Trigger.dev cloud hosting is not registered; workflow contracts run in-process.

## Phase 4

Plan: [plans/04_PHASE_4_INTELLIGENCE.md](plans/04_PHASE_4_INTELLIGENCE.md).

Production `AIProvider` and xAI Grok API, prompts, structured outputs, initial agents, approvals, cost ledger.

**Exit:** all AI actions are typed, auditable, tenant scoped, cost attributable. Frontend recommendations and draft page structures respect brand, `docs/27`, accessibility, conversion, and approval policy. Control recommendation UI, when built, follows `docs/28` plus master plan §28.3.

## Phase 5

Plan: [plans/05_PHASE_5_SOCIAL.md](plans/05_PHASE_5_SOCIAL.md).

Social adapters, calendar, approval, publishing, automated social connection readiness checks.

**Exit:** approved content can publish to at least two priority platforms, and required social connections are readiness-gated.

## Phase 6

Plan: [plans/06_PHASE_6_SEO_AEO.md](plans/06_PHASE_6_SEO_AEO.md).

SEO and AEO operational models.

**Exit:** Vector can produce an evidence-based prioritized search backlog.

## Phase 7

Plan: [plans/07_PHASE_7_CRO.md](plans/07_PHASE_7_CRO.md).

CRO experiments from hypothesis through recorded learning.

**Exit:** one full experiment completes with a durable learning object. Frontend experiment variants can be created, reviewed, measured, and promoted through the CRO system without lowering the `docs/27` quality bar.

## Phase 8

Plan: [plans/08_PHASE_8_AUTONOMY.md](plans/08_PHASE_8_AUTONOMY.md).

Progressive autonomy, launch automation policies, low-risk auto-execution.

**Exit:** low-risk workflows and selected launch steps run without daily human intervention and remain auditable.

## Phase 9

Plan: [plans/09_PHASE_9_SCALE.md](plans/09_PHASE_9_SCALE.md).

Multi-client operational scale: usage quotas, noisy-neighbor controls, scaling alerts, portfolio launch dashboard, cost dashboards, client-level SLAs, bulk monitoring.

**Exit:** operators can oversee many clients by exception, including Vector 24 clocks, and a single tenant cannot exhaust shared resources. Multiple clients can launch from the same engine without appearing to use the same templated website. The portfolio dashboard uses `docs/28` operational density. Client sites still must not share Vector product chrome.

## Vector 24

Vector 24 is a mature-state operational target after the first supervised clients, not a Phase 0–2 promise. Do not claim 24-hour launch until readiness, launch states, preview, QA, and domain activation are productized.

When a repeated manual launch step is discovered: record it, classify it as client-specific or universal, automate it if safe, add a test, add it to the launch checklist, and update Vector 24 metrics.
