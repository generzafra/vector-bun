# System Architecture

## Architectural style

Modular monolith with clear internal package boundaries and a separate Control Plane and Delivery Plane.

## Control Plane

Authenticated management of clients, brand data, funnels, campaigns, agents, approvals, analytics, policies, and integrations. Client and operator share this plane. Navigation differs by capability (`docs/30`). Do not fork `apps/client`.

## Delivery Plane

Public funnel rendering, lead endpoints, webhooks, analytics ingestion, asset delivery, provider calls, experiments, and scheduled execution. One logical Delivery Plane serves many client custom domains by hostname lookup.

Public rendering path:

```text
Client Knowledge → Brand Configuration → Funnel / Page Schema → Approved Component Variants → SvelteKit Delivery Renderer → Client Custom Domain
```

Visual quality, conversion narrative, motion, and anti-generic rules live in `docs/27`. Page schema, publishing, and safe composition live in `docs/09`. Control / Vector product identity lives in `docs/28`. Client media ingest, generation, composition, approval, and derivatives live in `docs/29`. Authenticated client outcomes, goals, and business-language reporting live in `docs/30`. Delivery appearance stays client-specific. The Creative Engine is a Control-managed subsystem; Delivery consumes approved derivatives only. The compositor is trusted software, not an image model. Delivery continues to collect conversion signals; Control presents outcomes.

## Product topology

```text
maxglobalexpo.com          sells MGE / Vector
vector.maxglobalexpo.com   Control Plane
client custom domains      Delivery Plane
```

MGE, Vector, and client websites are three layers of one ecosystem, not one giant website.

## Stack

Svelte 5, SvelteKit, Bun, Hono, PostgreSQL, Drizzle, Redis, Trigger.dev, Grok, PostHog, Resend, R2, Cloudflare, Docker Compose, Traefik.

## Source of truth

PostgreSQL owns durable business state. Provider systems own their provider native state. Vector stores normalized references and synchronized outcomes.

## Initial single-server deployment

The first production stage may run primarily on one application server:

```text
Cloudflare → Traefik → Docker Compose
  control, delivery, api, PostgreSQL, Redis, supporting services
```

External workloads stay external: xAI, Resend, PostHog, R2, social and search APIs.

Search and generative-discovery vendors stay behind `SearchProvider` in `packages/search` (`docs/15`, `docs/plans/06_PHASE_6_SEO_AEO.md`). Do not add a crawl index or a second search database.

Guidance for the first 10–20 ordinary marketing clients: 8–12 vCPU, 16–32 GB RAM, NVMe. Prefer 32 GB when commercially reasonable. This is guidance, not a capacity guarantee. Scale from measured workload, not tenant count.

## Scaling metrics

Do not scale from client count alone. Watch requests per second, concurrent visitors, database load, cache hit rate, analytics volume, workflow volume, webhook volume, asset bandwidth, render latency, CPU, memory, PostgreSQL connections, and storage growth.

## Edge caching

Design the Delivery Plane for Cloudflare edge caching of static assets, stable public pages, prerendered content, and R2 media. Do not cache personalized, consent-sensitive, authenticated, or experiment-sensitive responses without an explicit cache key and policy.

## Scale-out

Single-server deployment must not become a permanent architectural dependency.

1. One host: control, delivery, API, PostgreSQL, Redis.
2. Split when measured: control/API, delivery, PostgreSQL, workers.
3. Horizontal delivery behind Cloudflare / load balancer; client custom domains stay unchanged.

Separate a component only when delivery saturates the host, PostgreSQL needs dedicated resources, webhooks contend with the API, workers need separate compute, an SLA requires isolation, compliance requires separation, or an enterprise contract requires a dedicated deployment.

## Publication versus code

Vector code deployment is not client page publication. Normal marketing edits update database-backed immutable page versions and invalidate cache. Code deploy is for new platform capability, new component types, security fixes, adapters, and infrastructure.

## Extraction rule

Do not create microservices until one module has a demonstrated independent scaling, security, availability, or deployment requirement.

Hosting, Vector 24, and scale-out detail: `26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md`.
