# QA and Test Strategy

## Test layers

Unit, integration, end to end, security, tenant isolation, provider contract, AI regression, performance, accessibility.

## Highest priority invariants

Tenant isolation, authorization, consent, suppression, lead deduplication, attribution correctness, provider idempotency, approval policies, hostname-to-tenant routing, preview isolation, launch-time cross-tenant leakage.

## AI evaluation

Evaluate structured schema compliance, factual grounding, brand compliance, policy compliance, tool selection, refusal behavior, cost, latency, and tenant safety.

## Launch QA

A client launch is not complete until automated checks cover broken links, metadata, alt text, schema, form submission, conversion events, mobile layout, status codes, canonical host, sitemap, robots, analytics events, email readiness when included, provider health, and no tenant leakage.

## Infrastructure tests

Before claiming support for 20 ordinary clients, load-test cached and uncached public traffic, concurrent lead submissions, analytics ingestion, webhook bursts, database concurrency, Control Plane use under public traffic, and deploy-while-serving.

## Release gate

Critical end to end workflows and cross tenant leakage suite must pass before production.
