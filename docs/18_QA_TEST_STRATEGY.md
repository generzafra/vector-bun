# QA and Test Strategy

## Test layers

Unit, integration, end to end, security, tenant isolation, provider contract, AI regression, performance, accessibility.

## Highest priority invariants

Tenant isolation, authorization, consent, suppression, lead deduplication, attribution correctness, provider idempotency, approval policies, hostname-to-tenant routing, preview isolation, launch-time cross-tenant leakage, workflow tenant payloads.

## AI evaluation

Evaluate structured schema compliance, factual grounding, brand compliance, policy compliance, tool selection, refusal behavior, cost, latency, and tenant safety.

## Launch QA

A client launch is not complete until automated checks cover broken links, metadata, alt text, schema, form submission, conversion events, mobile layout, status codes, canonical host, sitemap, robots (including preview `noindex` and AI-crawler policy), production `llms.txt` isolation, analytics events, email readiness when included, provider health, and no tenant leakage.

Phase 6 search/GEO tests also cover: factual JSON-LD fail-closed when knowledge is missing; Alpha cannot read Beta `seo_*` / `geo_*` or search tokens; backlog items without a knowledge or official-query source cannot be marked publish-ready; prohibited claims cannot become answer targets; FAQ gaps stay source-backed and do not create pages; GEO query sets stay at or under `GEO_QUERY_LIMIT`; mention is not treated as citation; stale GEO snapshots are not shown as current; one observation is not treated as a visibility pattern; fact representations stay tenant-scoped and may attach only approved claims; a GEO mention does not create a referred lead; search/GEO → lead requires observable UTMs and stays tenant-scoped; revenue is not invented from visibility; full generated answers are not stored; `measureGenerativeVisibility` records only manual / operator-assisted methods and stays `unsupported` for live generative APIs; official adapters do not call consumer AI URLs when recording; client-facing copy never claims guaranteed ranking or AI citation (`docs/10`, `docs/plans/06_PHASE_6_SEO_AEO.md`).

The Design Review Checklist and Frontend Release Gate in `docs/27` are part of frontend QA. Release review of a public page must include mobile, tablet, desktop, keyboard navigation, reduced motion, form states, loading/error/success, accessibility, performance, conversion path, metadata, and analytics instrumentation. A page that merely renders is not production-ready.

Control visual QA uses the `docs/28` checklists and `docs/frontend/VECTOR_UI_MIGRATION_STATUS.md`. Do not treat a Control restyle as a Delivery identity change.

Creative QA (`docs/29`) combines deterministic checks (dimensions, format, size, logo, required text, contrast, rights, tenant) with optional AI visual review. AI review does not replace deterministic validation. Failed generation must fall back; public pages must never render a broken image. Cross-tenant asset, generation, and rights tests are required for every new tenant-owned creative resource.

Outcomes QA (`docs/30`) covers stage transitions, revenue recording and isolation, attribution-confidence labels, goal math, entitlements, notification routing, client-health scoring, and data-confidence display. Client-facing screens also pass the client UX checklist: plain language, estimates labeled, action obvious, mobile Today/approvals usable.

## Infrastructure tests

Before claiming support for 20 ordinary clients, load-test cached and uncached public traffic, concurrent lead submissions, analytics ingestion, webhook bursts, database concurrency, Control Plane use under public traffic, and deploy-while-serving.

## Release gate

Critical end to end workflows and cross tenant leakage suite must pass before production.
