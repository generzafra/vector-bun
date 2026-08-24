# Phase 2 — Leads and Analytics

**Status:** Slices 1–3 done — lead capture, production PostHog wiring, conversion reporting, and launch-funnel counts.  
**Prerequisite:** Phase 1 exit met. Do not start until one client can publish a preview funnel with launch state.

---

## Goal

A visitor from a tracked source can submit a lead that becomes a tenant-scoped contact with attribution, and operators can see readiness-to-live timing.

## Exit gate

Acquisition source can be traced to a lead. Operators can see readiness-to-live timing events. Public conversion elements emit the Vector event taxonomy; do not invent ad-hoc names in components.

## In scope

- Contacts, leads, lead lifecycle, lead score v1, deduplication
- Versioned event taxonomy (`page_viewed`, `form_started`, `form_submitted`, `lead_created`, …)
- PostHog adapter for behavioral events; Postgres remains source of truth for leads and outcomes
- Attribution v1: first touch, last non-direct, source, campaign
- Launch-funnel analytics and readiness / launch timing events
- Consent capture at form submit (ledger foundation)

## Out of scope

- Multi-touch attribution, revenue warehouse, session replay unless privacy config exists
- Resend sends, Grok API, social
- Changing success metrics after the fact
- Applying Vector Control identity tokens to Delivery funnels

If Control gains operator analytics views in this phase, style them with `docs/28` chart/token rules. Public conversion UI stays `docs/27`.

## New packages and tables

- `packages/analytics`, `packages/compliance` (consent records)
- `contacts`, `contact_identities`, `leads`, `lead_sources`, `lead_scores`, `lead_status_history`
- `visitors`, `sessions` (analytics), `analytics_events`, `attribution_touchpoints`, `attribution_results`
- Launch timing events on `client_launches` / `client_launch_events`

## Vector 24 hook

Emit and store `vector_ready_at` and related timestamps. Report contract → readiness separately from readiness → live. Do not hide client delays inside production time.

## Do not start until

Phase 1 preview publish, form config, and launch states exist.

## Slice 1 — Lead capture, consent, taxonomy, attribution v1 (done)

A visitor from a tracked source can submit the Delivery lead form and become a tenant-scoped contact and lead. Consent is recorded at submit. Public conversion elements emit the versioned Vector taxonomy. Attribution is first touch and last non-direct. Operators can list leads and see recorded readiness-to-live interval splits. Same path for every client. No custom engineering.

- Packages: `packages/analytics`, `packages/compliance`
- Tables: `contacts`, `contact_identities`, `leads`, `lead_sources`, `lead_scores`, `lead_score_events`, `lead_status_history`, `consent_records`, `visitors`, `analytics_sessions`, `analytics_events`, `attribution_touchpoints`, `attribution_results`
- Capabilities: `leads.read`, `leads.manage`, `analytics.read`
- Delivery: persist on `?/lead`; emit `page_viewed`, `form_started`, `form_submitted`, `lead_created`
- Preview: `is_test`, no production email
- Control: `/leads`; Launch shows contract→ready and ready→live seconds without a 24-hour SLA
- Isolation: Alpha cannot read Beta contacts, leads, consent, or events; same email does not merge across tenants

## Slice 2 — PostHog production wiring and conversion reporting (done)

Keep Postgres as the source of truth. PostHog receives production taxonomy events only. Preview/`is_test` events and form fields never leave Vector. Control `/analytics` reports conversion from Postgres using `page_viewed` → `cta_clicked` → `form_started` → `form_submitted` → `lead_created`. Rates are null when the previous step is zero. Delivery emits `cta_clicked` from nav and CTA sections without inventing names.

## Slice 3 — Launch-funnel analytics (done)

Control `/analytics` shows recorded launch transition counts plus contract→ready and ready→live seconds. Launch data requires `launch.read`. Alpha cannot read Beta events, attribution, or launch transitions. A 24-hour SLA is not measured.

## Locked attachments

`lead_status` is `new | working | qualified | won | lost | spam`. Attribution is first touch / last non-direct. That is Outcomes O2 seed, not `sales_outcomes` or a goal dashboard. Client Value V1 waits for O1–O3. Do not reopen this exit. See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).
