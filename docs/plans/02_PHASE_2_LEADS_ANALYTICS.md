# Phase 2 — Leads and Analytics

**Status:** Outline  
**Prerequisite:** Phase 1 exit met. Do not start until one client can publish a preview funnel with launch state.

---

## Goal

A visitor from a tracked source can submit a lead that becomes a tenant-scoped contact with attribution, and operators can see readiness-to-live timing.

## Exit gate

Acquisition source can be traced to a lead. Operators can see readiness-to-live timing events.

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

## New packages and tables

- `packages/analytics`, `packages/compliance` (consent records)
- `contacts`, `contact_identities`, `leads`, `lead_sources`, `lead_scores`, `lead_status_history`
- `visitors`, `sessions` (analytics), `analytics_events`, `attribution_touchpoints`, `attribution_results`
- Launch timing events on `client_launches` / `client_launch_events`

## Vector 24 hook

Emit and store `vector_ready_at` and related timestamps. Report contract → readiness separately from readiness → live. Do not hide client delays inside production time.

## Do not start until

Phase 1 preview publish, form config, and launch states exist.
