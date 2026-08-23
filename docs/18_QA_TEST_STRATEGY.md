# QA and Test Strategy

## Test layers

Unit, integration, end to end, security, tenant isolation, provider contract, AI regression, performance, accessibility.

## Highest priority invariants

Tenant isolation, authorization, consent, suppression, lead deduplication, attribution correctness, provider idempotency, approval policies, hostname-to-tenant routing, preview isolation, launch-time cross-tenant leakage, workflow tenant payloads.

## AI evaluation

Evaluate structured schema compliance, factual grounding, brand compliance, policy compliance, tool selection, refusal behavior, cost, latency, and tenant safety.

## Launch QA

A client launch is not complete until automated checks cover broken links, metadata, alt text, schema, form submission, conversion events, mobile layout, status codes, canonical host, sitemap, robots (including preview `noindex` and AI-crawler policy), production `llms.txt` isolation, analytics events, email readiness when included, provider health, and no tenant leakage.

Phase 7 CRO tests also cover: Alpha cannot read Beta `experiment_*` rows; Alpha cannot attach a Beta page version; Alpha cannot approve, pause, start, or measure a Beta experiment; missing TenantContext fails closed; revenue and qualified-lead primary metrics are rejected until coverage exists; control and challenger must be different published versions of the same tenant page; a second open experiment on the same page and primary metric is rejected while proposed, approved, or paused; only one experiment may run on a page; definition fields lock after propose; approve does not start assignment; start stamps `launchedAt` and Delivery assignment is sticky and tenant-scoped; preview assignments are `is_test`; pause stops exposure; measurement uses predetermined metrics only; bots and test traffic are excluded; source imbalance and unmet horizon or sample block a decision; a higher count on a tiny sample is not a win; a decision requires a launched ready experiment; challenger promotion requires a higher predetermined primary count; Alpha cannot decide or read a Beta learning object; promotion updates only the owning tenant published pointer; `experiments.read` / `experiments.manage` authorize list, create, transitions, measurement, and decide (`docs/13`, `docs/plans/07_PHASE_7_CRO.md`).

Phase 8 autonomy tests also cover: AI draft runs stay capped at autonomy 2; Level 3 auto-execute is gated by catalog, risk class, ceiling, and kill switch even at confidence 100; S1 trusted software may succeed only for `internal_weekly_report` from observed tenant analytics (`is_test` excluded) with `sent: false` and `published: false`; replay uses tenant-scoped idempotency; pause records a blocked execution and does not succeed; default ceiling 2 blocks execute; legal reply, page publish, and later launch classes do not succeed; email message counts and published page-version counts stay unchanged; S2 records tenant-scoped `launch_automation_policies` for generate drafts, wire tracking, and queue QA without executing or creating drafts; generate drafts cannot be enabled; unpublished drafts only; kill switch and live/launching/launch-failed statuses block later execute; Alpha cannot read or write Beta launch automation policies; ceiling cannot be 4 or 5; pause requires a reason and writes tenant-scoped `ai_kill_switch_events`; Alpha cannot read Beta kill-switch events or executions, or set Beta pause/ceiling/execute via route id; missing TenantContext fails closed; `ai.manage` is required to pause, raise the ceiling, execute, or change launch automation (`docs/07`, `docs/plans/08_PHASE_8_AUTONOMY.md`).

Phase 6 search/GEO tests also cover: factual JSON-LD fail-closed when knowledge is missing; Alpha cannot read Beta `seo_*` / `geo_*` or search tokens; backlog items without a knowledge or official-query source cannot be marked publish-ready; prohibited claims cannot become answer targets; FAQ gaps stay source-backed and do not create pages; GEO query sets stay at or under `GEO_QUERY_LIMIT`; mention is not treated as citation; stale GEO snapshots are not shown as current; one observation is not treated as a visibility pattern; fact representations stay tenant-scoped and may attach only approved claims; a GEO mention does not create a referred lead; search/GEO → lead requires observable UTMs and stays tenant-scoped; revenue is not invented from visibility; full generated answers are not stored; `measureGenerativeVisibility` records only manual / operator-assisted methods and stays `unsupported` for live generative APIs; official adapters do not call consumer AI URLs when recording; client-facing copy never claims guaranteed ranking or AI citation; cadence, monthly GEO budget, and pause fail closed; Alpha cannot read Beta cadence or portfolio queue items; scheduled search jobs do not record GEO observations or scrape consumer AI interfaces (`docs/10`, `docs/plans/06_PHASE_6_SEO_AEO.md`).

The Design Review Checklist and Frontend Release Gate in `docs/27` are part of frontend QA. Release review of a public page must include mobile, tablet, desktop, keyboard navigation, reduced motion, form states, loading/error/success, accessibility, performance, conversion path, metadata, and analytics instrumentation. A page that merely renders is not production-ready.

Control visual QA uses the `docs/28` checklists and `docs/frontend/VECTOR_UI_MIGRATION_STATUS.md`. Do not treat a Control restyle as a Delivery identity change.

Creative QA (`docs/29`) combines deterministic checks (dimensions, format, size, logo, required text, contrast, rights, tenant) with optional AI visual review. AI review does not replace deterministic validation. Failed generation must fall back; public pages must never render a broken image. Cross-tenant asset, generation, and rights tests are required for every new tenant-owned creative resource.

Outcomes QA (`docs/30`) covers stage transitions, revenue recording and isolation, attribution-confidence labels, goal math, entitlements, notification routing, client-health scoring, and data-confidence display. Client-facing screens also pass the client UX checklist: plain language, estimates labeled, action obvious, mobile Today/approvals usable.

## Infrastructure tests

Before claiming support for 20 ordinary clients, load-test cached and uncached public traffic, concurrent lead submissions, analytics ingestion, webhook bursts, database concurrency, Control Plane use under public traffic, and deploy-while-serving.

## Release gate

Critical end to end workflows and cross tenant leakage suite must pass before production.
