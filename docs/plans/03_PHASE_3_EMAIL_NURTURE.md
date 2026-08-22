# Phase 3 — Email and Nurture

**Status:** Slices 1–2 done — EmailProvider, consent/suppression gate, machine-checked sending domains, welcome sequence, webhooks, unsubscribe, contact sync, engagement reporting, and operator due-step / backfill enroll.  
**Prerequisite:** Phase 2 exit met. Do not start until a lead can be attributed from source.

---

## Goal

An eligible new lead can enter and complete one approved nurture sequence without bypassing consent or suppression.

## Exit gate

Eligible lead completes an approved nurture safely. Sending-domain readiness is machine-checked.

## In scope

- `EmailProvider` adapter with Resend as the first implementation
- Trigger.dev durable workflow _contracts_ for lead-captured and nurture steps (in-process runner in this slice)
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
- Trigger.dev cloud registration (contracts exist; production task host is a later slice)

## New packages and tables

- `packages/email`, `packages/automation` (Trigger.dev contracts)
- `email_connections`, `email_domains`, `email_contacts`, `email_topics`
- `email_sequences`, `email_sequence_steps`, `email_sequence_enrollments`, `email_messages`, `email_events`
- `email_suppressions`, `consent_events`
- Reserved for later slices: `email_segments`, `email_campaigns`, `email_inbound_messages`

## Vector 24 hook

Email domain access is machine-checked on `email.sending`. Missing DNS or From identity blocks **production send** and **live launch**. VECTOR READY still requires only blocking knowledge + preview items so Phase 1 is not reopened. `email.sending` is required in `LIVE_REQUIRED_ITEM_KEYS`.

## Do not start until

Phase 2 contacts, leads, consent capture, and event taxonomy exist.

## Slice 1 — Adapter, eligibility, domain readiness, welcome sequence (done)

An eligible production lead with marketing consent can complete the seeded `welcome_v1` sequence. Preview/`is_test` never calls a production provider. Send order is fail-closed. Alpha cannot read Beta messages, suppressions, or domains. The same email suppressed on Alpha does not suppress Beta unless a global complaint row exists.

- Packages: `packages/email`, `packages/automation`
- Capabilities: `email.read`, `email.manage`
- Delivery: `/unsubscribe` on a known host; token must match that tenant
- Control: `/email`
- Isolation: missing TenantContext fails closed; route client id cannot leak the other tenant

## Slice 2 — Contact sync, engagement, due steps, backfill enroll (done)

Operators can see tenant-scoped sent → delivered → opened → clicked from Postgres. Email contacts sync from leads even when send is blocked. Opened and clicked webhooks stay on the message tenant. Eligible production leads that waited on a sending domain enroll through the same lead-captured workflow when an operator runs enroll-eligible — no custom script. Due nurture steps process through `email.manage` (Control and `POST /v1/email/nurture/process-due`). Preview stays separate and never sends.

- Control `/email` shows engagement, waiting count, enroll-eligible, and process-due
- API: `POST /v1/email/nurture/enroll-eligible`, `POST /v1/email/nurture/process-due`
- Isolation: Alpha opened/clicked counts do not include Beta events
- Trigger.dev cloud hosting remains a later slice; sweep contracts run in-process
