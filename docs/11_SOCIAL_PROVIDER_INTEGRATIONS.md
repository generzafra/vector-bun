# Social Provider Integrations

## Architecture

Use `SocialProvider` adapters.

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

Social performance should support post → click → lead → qualified → sale where data exists (`docs/30`). Engagement is not automatically business success. Phase 5 may persist social → lead on the existing attribution path; that is not the publish exit.
