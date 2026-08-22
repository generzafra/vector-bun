# Social Provider Integrations

## Architecture

Use `SocialProvider` adapters in `packages/social`. LinkedIn, X, Facebook, and Instagram are registered. Memory is the test/default adapter. Official API adapters run when `SOCIAL_ADAPTER=official`. Official token refresh needs `LINKEDIN_CLIENT_ID` / `LINKEDIN_CLIENT_SECRET`, `X_CLIENT_ID` / `X_CLIENT_SECRET`, or `META_APP_ID` / `META_APP_SECRET`. Official LinkedIn, X, and Facebook adapters upload approved C0 image bytes. Official Instagram Graph publish requires media plus a short-lived signed fetch URL and fails closed for text-only. `SOCIAL_PUBLISHING_PAUSED` disables outbound publish but still allows validate, refresh, and metrics through the inner adapter.

## Initial priority

Implement only platforms required by active clients. Do not build every network in advance.

## Required adapter capabilities

Connection validation, publish, scheduled publish if supported, metrics, token refresh, normalized failures.

## Security

OAuth tokens encrypted at rest and never given to the model or browser.

## Lifecycle

Idea → Draft → Reviewed → Approved → Scheduled → Publishing → Published or Failed → Archived.

## Guardrails

Posting frequency limits, similarity checks, asset validation, client content policy, official APIs only.

Social receives already approved, channel-ready creative derivatives from the Creative Engine (`docs/29`). It must not become an independent image-generation system. Phase 5 may publish text-only or operator-uploaded approved assets until later Creative slices exist. C0 general asset storage is required before Social stores media blobs.

Social performance should support post → click → lead → qualified → sale where data exists (`docs/30`). Engagement is not automatically business success. Phase 5 Slice 2 persists social → lead when a lead is captured with `utm_medium=social` and `utm_content=post:{social_post_id}` on the existing `lead_sources` / attribution path. That is not the publish exit.
