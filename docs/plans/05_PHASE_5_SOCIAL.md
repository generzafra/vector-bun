# Phase 5 — Social

**Status:** Outline  
**Prerequisite:** Phase 4 exit met. Do not start until AI actions are typed, approved, and costed.

---

## Goal

Approved social content can publish reliably to at least two priority platforms through official APIs.

## Exit gate

Approved content publishes to two platforms. Required social connections are readiness-gated.

## In scope

- `SocialProvider` adapters; implement only platforms required by active clients
- Connection validation, publish, scheduled publish if supported, metrics, token refresh
- Content lifecycle: idea → draft → reviewed → approved → scheduled → published | failed
- Official APIs only. Encrypted tokens. Never expose tokens to browser or model
- Frequency and similarity guardrails
- Automated social connection readiness checks
- Trigger.dev publish workflow

## Out of scope

- Full network matrix in advance
- Fully autonomous comment replies
- Browser automation for production publishing
- Posting without approval on first clients

## New packages and tables

- `packages/social`
- `social_connections`, `social_accounts`, `social_posts`, `social_publications`
- `social_metrics`, `social_provider_events`

## Vector 24 hook

Required social accounts and connection permissions become readiness items. Missing access blocks VECTOR READY when the package includes social.

## Do not start until

Phase 4 approval queue and content versioning exist.
