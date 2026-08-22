# Phase 5 — Social

**Status:** Outline  
**Prerequisite:** Phase 4 exit met. Do not start until AI actions are typed, approved, and costed.

---

## Goal

Approved social content can publish reliably to at least two priority platforms through official APIs.

## Exit gate

Approved content publishes to two platforms. Required social connections are readiness-gated.

Creative C0 is in scope so Social does not invent a second media store. `ImageProvider`, composition, generated social families, funnel hero generation, video, and Creative QuickStart are **not** the Phase 5 exit.

## In scope

- `SocialProvider` adapters; implement only platforms required by active clients
- Connection validation, publish, scheduled publish if supported, metrics, token refresh
- Content lifecycle: idea → draft → reviewed → approved → scheduled → published | failed
- Official APIs only. Encrypted tokens. Never expose tokens to browser or model
- Frequency and similarity guardrails
- Automated social connection readiness checks
- Trigger.dev publish workflow
- Creative C0: tenant-scoped general asset library on existing `StorageProvider` (`clients/{client_id}/creative/...` or equivalent), rights/status/version metadata, operator upload. Posts may attach an approved asset id or stay text-only
- Charter: `docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md`

## Out of scope

- Full network matrix in advance
- Fully autonomous comment replies
- Browser automation for production publishing
- Posting without approval on first clients
- `ImageProvider` / Grok image generation
- Deterministic compositor, channel derivative engine, social creative families
- Funnel asset manifests or hero image generation
- Video generation
- Creative QuickStart onboarding rebuild
- A second object-store adapter

## New packages and tables

- `packages/social`
- `social_connections`, `social_accounts`, `social_posts`, `social_publications`
- `social_metrics`, `social_provider_events`
- Creative C0 tables as needed (`assets` / versions / rights). Do not overload `brand_assets` into a campaign library without an explicit schema decision. Do not mutate applied Phase 1 migrations by hand.

## Vector 24 hook

Required social accounts and connection permissions become readiness items. Missing access blocks VECTOR READY when the package includes social.

## Do not start until

Phase 4 approval queue and content versioning exist.

## Locked attachments

Charters: `docs/11`, `docs/28`, `docs/29`, `docs/30`. Track lock: [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).

Must take: Creative C0. May take: social → lead on existing attribution. Must not take as this exit: C2–C9, O1–O20 (Today, goals, Ask Vector, entitlements), autonomous replies, a second object store.
