# Phase 5 — Social

**Status:** Slices 1–6 done — Creative C0 library, LinkedIn, X, Facebook, and Instagram publish (memory in tests; official adapters registered), official C0 image upload, official OAuth install, Meta Page picker, token refresh, scheduled due sweep, metrics sync, and social → lead on the existing attribution path. Required social connections are readiness-gated. Phase 5 exit is not met until production tokens publish reliably on at least two official platforms.  
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

## Slice 1 — Creative C0 and two-platform publish (done)

Approved text posts publish to LinkedIn and X. Creative C0 stores tenant-scoped versions and rights on the existing `StorageProvider`. Required social accounts gate `social.access`. Official adapters exist; tests use memory. Tokens are encrypted and never returned.

## Slice 2 — Refresh, scheduled sweep, metrics, social → lead (done)

Expired or near-expiry connections refresh through `SocialProvider.refreshConnection` before publish. Failed refresh marks the connection expired and does not publish. Scheduled posts fire through tenant-scoped `social-due-sweep`; a platform sweep fans out one tenant job per client with due posts. Metrics sync writes tenant-scoped snapshots. A lead captured with `utm_medium=social` and `utm_content=post:{id}` joins that post on the existing attribution path. Alpha cannot refresh, publish, measure, or attribute Beta. Official media upload and production OAuth install remain later slices. This does not accept the Phase 5 exit.

## Slice 3 — Meta adapters (done)

Facebook and Instagram are first-class `SocialProvider` platforms (`social_platform` adds `facebook` | `instagram`). Official adapters call Meta Graph (`adapter: meta`). Facebook text posts use `/{page-id}/feed`. Official Instagram publish fails closed with `SOCIAL_MEDIA_UNSUPPORTED` until media upload exists; the memory adapter still accepts text-only for tests. Token refresh uses `fb_exchange_token` and fails closed without `META_APP_ID` / `META_APP_SECRET`. YouTube and TikTok stay later. This does not accept the Phase 5 exit.

## Slice 4 — Official C0 media publish (done)

Domain loads approved, rights-confirmed C0 bytes through tenant-scoped `StorageProvider.getObject`. Official LinkedIn, X, and Facebook adapters upload those bytes. Official Instagram Graph creates a container from a short-lived signed `/v1/public/social-media` grant (HMAC, expiry, tenant key check) so Instagram can fetch the image without a second object store. Raw storage keys are not authorization. Grants and bytes never appear in Control or API JSON. Production OAuth install, YouTube, and TikTok stay later. This does not accept the Phase 5 exit.

## Slice 5 — Official OAuth install (done)

Control starts official OAuth for LinkedIn, X, Facebook, and Instagram. The server encrypts a short-lived PKCE state (no new table), exchanges the code, and stores tokens with `TOKEN_ENCRYPTION_KEY`. Tokens, verifiers, and grants never appear in Control or API JSON. Alpha state cannot complete as Beta. Forged or expired state fails closed. Official adapters fail closed without client or app credentials. Meta stores the first Page token; Instagram also requires that Page’s professional account. Paste-token upsert stays as an advanced fallback. YouTube, TikTok, and a Page picker stay later. This does not accept the Phase 5 exit.

## Slice 6 — Meta Page picker (done)

When Facebook or Instagram OAuth finds more than one eligible Page, Control asks the operator to pick one. The pending user token stays in an encrypted HttpOnly cookie / selection blob. Public page names go to the UI; Page tokens never do. A single eligible Page still connects immediately. Instagram choices are Pages that already have a professional account. Alpha cannot finish Beta’s selection. YouTube and TikTok stay later. This does not accept the Phase 5 exit.
