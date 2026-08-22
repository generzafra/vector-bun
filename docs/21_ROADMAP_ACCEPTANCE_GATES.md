# Roadmap and Acceptance Gates

Detailed execution plans: [plans/README.md](plans/README.md). Implement one phase at a time. Cursor Grok Bot is the development agent. Production Grok API starts in Phase 4.

## Phase 0

Plan: [plans/00_PHASE_0_FOUNDATION.md](plans/00_PHASE_0_FOUNDATION.md).

Repository, CI, environment validation, PostgreSQL, tenant context, auth, RBAC, audit.

**Exit:** cross tenant tests pass and staging deploy succeeds.

## Phase 1

Plan: [plans/01_PHASE_1_KNOWLEDGE_FUNNEL.md](plans/01_PHASE_1_KNOWLEDGE_FUNNEL.md).

Client knowledge, assets, funnel engine, custom domains, forms, client readiness model, onboarding completion scoring, launch state machine, preview domain model.

**Exit:** one client can publish a production lead funnel, including a private preview hostname and tracked launch state.

## Phase 2

Plan: [plans/02_PHASE_2_LEADS_ANALYTICS.md](plans/02_PHASE_2_LEADS_ANALYTICS.md).

Contacts, leads, event taxonomy, PostHog, attribution, launch-funnel analytics, readiness and launch timing events.

**Exit:** acquisition source can be traced to lead, and operators can see readiness-to-live timing.

## Phase 3

Plan: [plans/03_PHASE_3_EMAIL_NURTURE.md](plans/03_PHASE_3_EMAIL_NURTURE.md).

Resend, suppression, nurture, inbound events, automated email domain readiness checks.

**Exit:** eligible lead completes approved nurture safely, and sending-domain readiness is machine-checked.

## Phase 4

Plan: [plans/04_PHASE_4_INTELLIGENCE.md](plans/04_PHASE_4_INTELLIGENCE.md).

Production `AIProvider` and xAI Grok API, prompts, structured outputs, initial agents, approvals, cost ledger.

**Exit:** all AI actions are typed, auditable, tenant scoped, cost attributable.

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

**Exit:** one full experiment completes with a durable learning object.

## Phase 8

Plan: [plans/08_PHASE_8_AUTONOMY.md](plans/08_PHASE_8_AUTONOMY.md).

Progressive autonomy, launch automation policies, low-risk auto-execution.

**Exit:** low-risk workflows and selected launch steps run without daily human intervention and remain auditable.

## Phase 9

Plan: [plans/09_PHASE_9_SCALE.md](plans/09_PHASE_9_SCALE.md).

Multi-client operational scale: usage quotas, noisy-neighbor controls, scaling alerts, portfolio launch dashboard, cost dashboards, client-level SLAs, bulk monitoring.

**Exit:** operators can oversee many clients by exception, including Vector 24 clocks, and a single tenant cannot exhaust shared resources.

## Vector 24

Vector 24 is a mature-state operational target after the first supervised clients, not a Phase 0–2 promise. Do not claim 24-hour launch until readiness, launch states, preview, QA, and domain activation are productized.

When a repeated manual launch step is discovered: record it, classify it as client-specific or universal, automate it if safe, add a test, add it to the launch checklist, and update Vector 24 metrics.
