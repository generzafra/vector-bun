# Client Onboarding and Operations

## Gates

Commercial → Business knowledge → Technical connection → Baseline → Growth plan → Launch → Autonomy graduation.

These gates nest with Vector 24:

```text
Commercial                     → signed_at
Business + technical + claims  → readiness items → VECTOR READY → clock starts
Generation / QA / approvals    → internal build
Baseline                       → may run in parallel
Growth plan                    → part of generation
Launch                         → launching / live
Autonomy graduation            → after live, outside the 24-hour clock
```

## Vector 24

A normal, fully ready client should move from completed onboarding to a live initial Vector Growth System within 24 hours.

Commercial wording: launch within 24 hours after all Vector Readiness requirements are complete. Do not measure the SLA from contract signing.

This is a mature-state architectural constraint, not a first-client promise. Every recurring manual launch step should be evaluated for automation or standardization.

Detail: `26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md`.

## Vector Readiness Gate

The 24-hour period begins only at **VECTOR READY**.

Required categories: business facts, brand assets, approved and prohibited claims, audience and competitors, domain access, email sending access, social access, legal and compliance, approval contacts.

Vector calculates readiness, shows blockers, and distinguishes optional from blocking items. Missing critical requirements prevent the SLA clock from starting.

## Onboarding wizard

Provide a structured wizard that saves progress and scores readiness:

1. Business
2. Products and Services
3. Customers
4. Locations
5. Pricing
6. Offers
7. Competitors
8. Brand
9. Claims and Proof
10. Domain
11. Email
12. Social
13. Analytics
14. Compliance
15. Approvals
16. Readiness Review

Clients may upload logos, catalogs, pricing, photos, testimonials, legal pages, and existing-site references. Extracted facts need authority classification and may require approval before publication.

The 16 steps above are the **readiness catalog** (what Vector must know), not the client-facing form. Do not require a non-technical owner to complete every step. Execution: Outcomes QuickStart and capability-filtered nav in [`docs/plans/OUTCOMES_TRACK.md`](plans/OUTCOMES_TRACK.md) (CU0–CU1 in; next O8); Creative confirm in [`docs/plans/CREATIVE_TRACK.md`](plans/CREATIVE_TRACK.md) C1. Sequence: [`docs/plans/SHIP_REMAINING.md`](plans/SHIP_REMAINING.md) Wave A. Full URL-extraction QuickStart may wait for Wave E.

The target onboarding philosophy is Creative QuickStart (`docs/29`): Vector gathers what it can from a URL, logo, and supplied materials; the client confirms; Vector asks only for missing blockers. That is the mature Vector 24 path, not a Phase 5 rebuild of the wizard. Creative Readiness (logo, visual direction, rights, and either authentic assets, approved generation, or a typography-led system) is additive to the existing readiness catalog.

Outcomes QuickStart (`docs/30`) asks in plain language: primary goal, what counts as a good lead, what happens after contact, what counts as a sale, whether a CRM or booking tool exists, high-intent notification preference, and who approves campaigns. Vector 24 should launch with goal, conversion definition, a minimal pipeline (already `new` → `won`/`lost`), an outcome method, and notification defaults. Revenue value may stay optional. CU0 (client-simple Control nav) must ship before more operator screens are shown to clients.

Onboarding does not end at data collection. After Vector Ready:

```text
Creative QuickStart / asset sufficiency
        ↓
First Reveal generation (`docs/plans/FIRST_REVEAL_TRACK.md`)
        ↓
Direction approval (Control, `docs/28` chrome, business language)
        ↓
Launch preparation
```

Do not require the client to pick component families. Do not auto-show the raw first compose. Optional Value Baseline (`docs/plans/CLIENT_VALUE_TRACK.md`) may collect current tools, spend, and owner time; it is skippable and not a Vector Ready blocker.

## Required client decisions

Goals, conversion definitions, approval contacts, approved claims, prohibited claims, markets, communication policy, email consent policy, social channels, reporting cadence.

To apply `docs/27` without custom engineering, also collect: target audience, primary and secondary conversion, desired brand perception, approved colors and typography, photography and media, products and services, pricing approach, proof, testimonials, case studies, competitors, and prohibited claims. Missing proof or brand inputs is a readiness blocker when the public page would otherwise invent them.

## Launch classes

- **A — Simple local service:** 1–4 hours after readiness.
- **B — Standard professional or service:** 4–12 hours.
- **C — Complex business:** 12–24 hours.
- **D — Regulated or complex enterprise:** may exceed 24 hours; do not promise Vector 24 blindly.

## First client ramp

Client 1 human-led. Client 2 heavily assisted. Client 3 workflow-driven. Clients 4–5 measure cycle time. Later clients target Vector Ready → live within 24 hours. Do not force the first implementations into the final SLA.

## Launch state machine

`draft` → `onboarding` → `blocked` | `vector_ready` → `generating` → `qa` → `awaiting_client_approval` → `awaiting_domain` → `launching` → `live` | `launch_failed` | `paused`.

Every transition is auditable. Operators need a portfolio launch dashboard with status, SLA clock, blocker, owner, next action, class, and readiness score.

## SLA measurement

Report separately: contract → readiness, readiness → internal build complete, build complete → client approval, approval → domain ready, domain ready → live.

Vector 24 KPI: `vector_ready_at` → `live_at`, excluding documented client-caused pauses.

## Human review

Fast launch is not zero review. Before first production launch: verify facts, claims, pricing, offer, lead destination, legal links, forms, mobile, email sender, tracking, custom domain, and no cross-tenant leakage. Use exception-based review, not a full manual rebuild.

## Successful launch

A homepage load is not a launch. Launch requires production custom domain, HTTPS, approved copy, working lead form and storage, lead notification, attribution, analytics events, SEO/AEO/GEO metadata, correct sitemap and robots (including AI-crawler policy), factual schema and production `llms.txt` from approved knowledge, included email and social programs ready, provider health, audit events, mobile QA, no tenant leakage, and recorded client launch approval. Capture target markets, languages, priority services, official entity facts, and approved claims during onboarding. Do not make clients invent GEO prompts. Do not wait for generative citation before launch.

## Launch principle

New clients begin under high supervision. Autonomy increases by workflow class after demonstrated reliability.

## Operator model

Operate by exception. Surface approvals, anomalies, failures, and opportunities rather than requiring constant manual dashboard monitoring.
