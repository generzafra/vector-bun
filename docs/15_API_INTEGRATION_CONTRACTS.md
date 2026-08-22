# API and Integration Contracts

## Rule

Domain models are provider independent.

## Provider adapters

AIProvider, EmailProvider, SocialProvider, AnalyticsProvider, StorageProvider, SearchProvider.

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
