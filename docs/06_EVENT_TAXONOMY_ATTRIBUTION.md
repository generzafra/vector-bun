# Event Taxonomy and Attribution

## Objective

Create one stable vocabulary that all funnels and clients use.

## Standard

Lower snake case semantic events.

## Core events

`page_viewed`, `service_viewed`, `offer_viewed`, `cta_clicked`, `form_started`, `form_abandoned`, `form_submitted`, `lead_created`, `booking_completed`, `purchase_completed`, `return_visit`.

## Required properties

Tenant, site, funnel, page version, campaign, experiment variant, visitor, session, UTM values, referrer, consent state, timestamp.

## Attribution v1

First touch, last non direct touch, source and campaign attribution.

Phase 2 emits `page_viewed`, `cta_clicked`, `form_started`, `form_submitted`, and `lead_created` from Delivery. Postgres stores events, touchpoints, attribution results, and conversion counts. The PostHog adapter is optional and does not receive preview/test events or form PII. Control `/analytics` reports production and preview buckets separately. Do not invent names in components.

Later outcome events (`docs/30`) — `lead_qualified`, `deal_won`, `deal_lost`, `purchase_completed`, `revenue_recorded`, `refund_recorded` — need a dictionary owner before emit. Do not treat them as equally authoritative with form submits. Revenue and sales events record their source of truth. Attribution confidence labels (`directly attributed` / `estimated` / `unattributed`) are Outcomes-track work; v1 must not present uncertain association as fact.

Phase 6 S7 records `ai_referral` / `generative_search_referral` only when a lead arrives with observable UTMs (`utm_medium=generative` or `utm_medium=organic` with google/bing, plus the Vector campaign when used). Those become `geo_referral_events`. Do not manufacture attribution from a GEO mention or citation observation. `GEO visibility observed ≠ visit proven ≠ lead proven`. Revenue stays unknown until a later revenue row exists.

## Governance

All new events require dictionary documentation and owner. Do not create layout specific event names.
