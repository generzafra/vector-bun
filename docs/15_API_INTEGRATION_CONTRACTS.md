# API and Integration Contracts

## Rule

Domain models are provider independent.

## Provider adapters

AIProvider, EmailProvider, SocialProvider, AnalyticsProvider, StorageProvider, SearchProvider.

`StorageProvider` is implemented in `packages/storage`. Local disk is the default. Cloudflare R2 is selected when R2 credentials are present. Object keys are `clients/{client_id}/...`. Metadata lives in PostgreSQL. Raw keys are not authorization.

## Every adapter

- Typed input and result
- Timeout
- Retry policy
- Idempotency
- Normalized errors
- Connection health
- Audit hooks
- Metrics
- Rate limit awareness

## Webhooks

Verify signatures where supported, store event IDs, deduplicate, acknowledge quickly, process durable work asynchronously.

## Phase 1 Control API

Authenticated session cookie plus CSRF on mutations. Tenant context is the active client, never a route id alone.

- `GET /v1/domains` — list hostnames for the active client
- `GET /v1/domains/:clientId` — same list only when the actor already owns that client
- `POST /v1/domains` — submit `production` or `redirect` hostname (`pages.manage`)
- `POST /v1/domains/:id/verify` — confirm the Delivery challenge token
- `POST /v1/domains/:id/activate` — serve the published funnel on that host
- `POST /v1/domains/:id/disable` — remove the host from routing

Delivery challenge: `GET /.well-known/vector-domain` on the submitted Host. Unknown hosts return no tenant data.
