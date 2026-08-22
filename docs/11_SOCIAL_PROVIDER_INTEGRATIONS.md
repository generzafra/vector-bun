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
