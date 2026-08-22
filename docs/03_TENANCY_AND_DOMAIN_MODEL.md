# Tenancy and Domain Model

## Hierarchy

Organization → Client → Site and business resources.

An organization may be Maximum Global Exposure or a future agency partner. A client is the operating tenant whose marketing data must be isolated. MGE itself should become a Vector client once the platform can operate production tenants.

## Rule

Every client owned record requires `client_id`.

## TenantContext

All tenant services require explicit organization, client, actor, role, and request context.

## One logical Delivery Plane

Vector serves many client websites from one logical delivery application. Do not create a complete independent application deployment for every normal client.

```text
Visitor → custom domain → Cloudflare → Delivery Plane
  → hostname lookup → client + site + published page → response
```

The same process may serve `cebudentalclinic.com` and `abcplumbing.com` while loading completely different tenant configuration.

Shared infrastructure must never imply shared business data. Each client may independently own domain, brand, design tokens, content, offers, funnels, forms, leads, campaigns, analytics, email, social, SEO/AEO, AI policies, experiments, assets, and provider connections.

Multi-tenant hosting must not create visually cloned websites. The engine is shared. Brand and strategy are client-specific.

## Domain routing

Request hostname → normalized hostname → verified `client_domains` record → client → site → page.

Unknown hostnames fail closed. Host header validation is mandatory.

Clients experience their own custom domain. Do not use `theircompany.vector.maxglobalexpo.com` as the production identity except for temporary preview URLs.

## Preview hostnames

Before production launch, every client receives a private preview, for example:

```text
preview-{client-slug}.vector.maxglobalexpo.com
```

Preview requirements: `noindex`, access control where practical, no production marketing email, no production social publishing, test-mode analytics, test lead routing. Preview must not become indexed public content.

## Domain activation

A site is not live until HTTPS works, the canonical hostname works, redirect hostnames behave correctly, the health check passes, and sitemap plus metadata use production URLs.

Recommended flow: domain submitted → ownership instructions → DNS validation → configuration → SSL → canonical selected → redirect validation → health check → publish.

## Isolation

Use shared PostgreSQL initially with explicit scoping, compound indexes, service authorization, and cross tenant automated tests. Consider row level security after query behavior stabilizes.

## Dedicated infrastructure

The default is shared multi-tenant infrastructure. Future premium options may include dedicated delivery, dedicated database, or fully dedicated deployments. These must not complicate the MVP.

## Forbidden

- Unscoped tenant repository methods
- Using client supplied IDs without tenant verification
- Exposing raw object store keys as authorization
- AI retrieval across clients
- Falling through an unknown hostname to another tenant
- Serving production content from a preview hostname
