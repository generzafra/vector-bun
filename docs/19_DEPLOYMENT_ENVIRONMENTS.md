# Deployment and Environments

## Environments

Local, development, staging, production. Preview is required for each client launch, not merely optional.

## Product surfaces

- `maxglobalexpo.com` — MGE marketing site; eventually a Vector tenant.
- `vector.maxglobalexpo.com` — Vector Control Plane.
- Client custom domains — Delivery Plane production sites.
- `preview-{client-slug}.vector.maxglobalexpo.com` — private pre-launch preview.

## Stack

Cloudflare → Traefik → Docker Compose → control, delivery, api, PostgreSQL, Redis and supporting services.

Initial production may live on one capable host. Architect around one logical Vector platform so hosts can be split later without changing client domains.

## Initial server guidance

For about the first 10–20 ordinary marketing clients: 8–12 vCPU, 16–32 GB RAM, NVMe. Prefer 32 GB when commercially reasonable. Client count is not the scaling metric.

## Edge and publication

Cache static assets, stable public pages, prerendered content, and R2 media at Cloudflare when safe. Do not cache personalized, consent-sensitive, authenticated, or experiment-sensitive responses without an explicit cache key and policy. Approved creative derivatives (`docs/29`) should use immutable versioned URLs; do not overwrite a cached public asset in place.

Client page publication updates immutable page versions and invalidates relevant cache. It is not a Vector code deployment.

## Domain activation

domain submitted → ownership instructions → DNS validation → configuration → SSL → canonical selected → redirect validation → health check → publish.

Do not mark live until HTTPS, canonical host, redirects, health check, and production sitemap/metadata are correct.

## Scale-out

Stage 1: one host. Stage 2: split control/API, delivery, PostgreSQL, and workers when measured. Stage 3: horizontal delivery. Dedicated delivery, database, or full isolation are later enterprise options.

## Twenty-client acceptance

Before claiming the initial infrastructure safely supports 20 clients, load-test cached homepages, uncached landing pages, simultaneous lead submissions, analytics ingestion, webhook bursts, database concurrency, Control Plane use under public traffic, and deploy-while-serving.

Starting SLOs are in `16_OBSERVABILITY_SRE_DR.md`.

## Deployment

GitHub Actions with type check, tests, build, migration validation, deployment, smoke tests.

## Rule

Development must not perform real client side effects. Use provider sandboxes or explicit test accounts. Preview must not send production email or social or become indexed. Test or demo First Reveal and Client Value data must never appear as production client value.

Optional Trigger.dev: set `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF`, then `bun run dev:jobs`. Tests ignore the secret key and stay in-process. The task host is `apps/jobs`, not a separate Vector product.

## Kubernetes

Not planned until demonstrated scaling or availability requirements justify it.

Hosting and Vector 24 detail: `26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md`.
