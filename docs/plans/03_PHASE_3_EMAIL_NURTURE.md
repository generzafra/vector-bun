# Phase 3 — Email and Nurture

**Status:** Outline  
**Prerequisite:** Phase 2 exit met. Do not start until a lead can be attributed from source.

---

## Goal

An eligible new lead can enter and complete one approved nurture sequence without bypassing consent or suppression.

## Exit gate

Eligible lead completes an approved nurture safely. Sending-domain readiness is machine-checked.

## In scope

- `EmailProvider` adapter with Resend as the first implementation
- Trigger.dev durable workflows for lead-captured and nurture steps
- Suppression + consent order: global → client → consent → topic → jurisdiction → campaign → send
- One welcome / nurture sequence
- Inbound and delivery webhooks (`sent`, `delivered`, `bounced`, `complained`, …)
- Automated email domain readiness (SPF, DKIM, DMARC documented, From approved)
- Unsubscribe and complaint handling

## Out of scope

- Auto-send of legal, refund, dispute, negotiation, or unapproved pricing replies
- Production Grok drafting (Phase 4)
- Custom SMTP or a Vector-owned MTA
- Broad broadcast to unconsented lists

## New packages and tables

- `packages/email`, `packages/automation` (Trigger.dev contracts)
- `email_connections`, `email_domains`, `email_contacts`, `email_topics`, `email_segments`
- `email_campaigns`, `email_sequences`, `email_sequence_steps`, `email_messages`, `email_events`
- `email_suppressions`, `consent_records`, `consent_events`

## Vector 24 hook

Email domain access and readiness checks become blocking readiness items. Missing DNS or From identity prevents VECTOR READY.

## Do not start until

Phase 2 contacts, leads, consent capture, and event taxonomy exist.
