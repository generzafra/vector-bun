# Observability, SRE, and Disaster Recovery

## Logs

Structured logs with service, request, trace, tenant, actor, operation, result, error code. No secrets.

## Metrics

HTTP latency, errors, DB latency, queue delay, provider failures, AI cost, email health, funnel render time, event ingestion failures.

Also report infrastructure demand separately from tenant count: requests per second, concurrent visitors, cache hit rate, analytics volume, workflow volume, webhook volume, asset bandwidth, CPU, memory, PostgreSQL connections, storage growth, and per-tenant workload share.

Vector 24 product metrics: median time to Vector Ready, median ready-to-live, percentage launched under 24 hours and 12 hours, manual interventions per launch, automation failures per launch, client-blocked hours, internal build hours.

Business data health is observable beside technical health (`docs/30`): lead ingestion, CRM sync delay, stale revenue import, expired social/search connections, incomplete attribution. Stale outcome data must degrade recommendation confidence.

Phase 6 adds search/GEO signals: Search Console sync health, Bing sync health, SEO crawl health, schema validation health, GEO measurement health, GEO measurement age, GEO query coverage, and GEO cost. A stale GEO snapshot must not be displayed as current.

## Initial SLOs

Revise after measurement. Starting internal targets:

- Public cached responses: primarily edge served.
- Origin p95: under 500 ms for ordinary page requests.
- API p95: under 500 ms for ordinary CRUD requests.
- Lead submission success: above 99.9% excluding upstream outages.
- Critical webhook loss: 0 after retry and reconciliation.

## Scale triggers

Review infrastructure when any of the following persist: CPU above 70% in normal sustained periods, memory above 80%, swap activity, PostgreSQL connection pressure, material database or origin p95 regression, queue delay beyond workflow expectations, rising lead-submission failures, webhook backlog, unexpected cache-hit drop, or one tenant causing disproportionate load.

## Kill switches

Privileged and audited.

Client-level: pause outbound automation, social, marketing email, AI execution, public site, or experiments.

Platform-level: disable a provider, model, automation class, global publishing, or outbound email.

## Tracing

OpenTelemetry across request, service, database, model, provider, and workflow.

## Backups

Automated PostgreSQL backup, encrypted off server copy, scheduled restore test.

## DR

Document RPO, RTO, secret rotation, provider reconnect, incident ownership, client communication. Design so the platform can leave a single physical host without changing client domains.
