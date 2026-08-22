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

## Governance

All new events require dictionary documentation and owner. Do not create layout specific event names.
