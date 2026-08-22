# VECTOR Architecture and Operations Appendix

## MGE Separation, Multi-Client Hosting, Scaling, and Vector 24 Launch Standard

**Project:** Vector — Autonomous Growth OS  
**Status:** Architecture and operations decision appendix. Governing decisions have been folded into the parent documents listed below.  
**Version:** 1.1  
**Date:** 22 August 2026  
**Intended location:** `/docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md`

---

# 1. Purpose

This document formalizes several product, deployment, and operations decisions that supplement the existing Vector implementation documentation.

It specifically establishes:

1. The separation between the Maximum Global Exposure website and the Vector application.
2. The relationship between MGE, Vector, and client websites.
3. The intended multi-client website hosting model.
4. The initial single-server deployment model.
5. The criteria for scaling beyond one server.
6. The operational objective of launching a newly onboarded client within 24 hours.
7. The Vector Readiness Gate that must be satisfied before the launch SLA begins.
8. The automation and product design requirements necessary to make rapid client launch repeatable.

This document is the detailed appendix for decisions that were later folded into:

- `01_PRODUCT_VISION_AND_POSITIONING.md` — MGE versus Vector product split, dogfooding, Vector 24 commercial wording
- `03_TENANCY_AND_DOMAIN_MODEL.md` — shared Delivery Plane, preview hostnames, domain activation, dedicated infrastructure options
- `04_SYSTEM_ARCHITECTURE.md` — single-server start, scale-out stages, edge cache, publication versus code deploy
- `05_DATA_MODEL.md` — readiness, launch, and usage entities
- `16_OBSERVABILITY_SRE_DR.md` — infrastructure metrics, SLOs, scale triggers, kill switches
- `17_CLIENT_ONBOARDING_OPERATIONS.md` — Vector 24, readiness gate, wizard, launch classes, SLA clock
- `19_DEPLOYMENT_ENVIRONMENTS.md` — surfaces, server guidance, domain activation, twenty-client tests
- `21_ROADMAP_ACCEPTANCE_GATES.md` — phase work items required by Vector 24
- `22_CURSOR_AGENT_INSTRUCTIONS.md`, `23_DECISION_LOG.md`, `24_RISK_REGISTER.md`, `25_GLOSSARY.md`
- `VECTOR_MASTER_IMPLEMENTATION_PLAN.md`
- `27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md` — public experience quality; reusable engine, original client experience. Where that standard is more specific on frontend, UX, and conversion, it governs.

Where this appendix is more specific, it should govern unless superseded by a later accepted ADR.

---

# 2. MGE and Vector Are Separate Products

## 2.1 Maximum Global Exposure

Maximum Global Exposure is the commercial company and customer acquisition brand.

Primary domain:

```text
maxglobalexpo.com
```

Its primary responsibilities are:

- Present MGE services.
- Explain the Vector value proposition.
- Generate MGE leads.
- Convert prospects into clients.
- Publish case studies.
- Show packages and offers.
- Collect onboarding requests.
- Direct clients to the Vector application.
- Demonstrate MGE's own use of Vector.

The MGE website is not the Vector application.

## 2.2 Vector

Vector is the proprietary operating platform.

Recommended initial application location:

```text
vector.maxglobalexpo.com
```

A dedicated independent Vector domain may be introduced later if Vector becomes a standalone software brand.

Vector owns:

- Client management.
- Client knowledge.
- Funnels.
- Websites.
- Leads.
- Contacts.
- Campaigns.
- Social operations.
- Email operations.
- SEO and AEO operations.
- Analytics.
- Attribution.
- Experiments.
- AI agents.
- Automation.
- Approvals.
- Reporting.
- Usage controls.
- Provider integrations.

## 2.3 MGE Should Become a Vector Tenant

Once Vector is capable of operating production clients, Maximum Global Exposure should itself be configured as a Vector client.

This creates:

- A real internal dogfooding environment.
- A production reference implementation.
- A live demonstration for prospects.
- Continuous testing of the same client workflows being sold commercially.
- An internal benchmark for launch speed and conversion optimization.

The architecture should therefore support:

```text
MGE Company
    ↓
MGE Website
    ↓
Powered by Vector
```

without merging the MGE marketing website and the Vector control application into one product.

---

# 3. Commercial and Technical Relationship

The intended hierarchy is:

```text
Maximum Global Exposure
        │
        │ sells and operates
        ▼
      Vector
Autonomous Growth OS
        │
        │ provisions and manages
        ▼
Vector Growth Systems
        │
        ├── Client A
        ├── Client B
        ├── Client C
        └── MGE itself
```

The customer should experience:

```text
theircompany.com
```

not:

```text
theircompany.vector.maxglobalexpo.com
```

unless a temporary preview URL is being used before custom-domain launch.

Vector should remain invisible as infrastructure unless MGE deliberately brands the client implementation as "Powered by Vector."

---

# 4. Multi-Client Website Hosting Model

## 4.1 One Logical Delivery Platform

Vector should use one logical delivery application capable of serving many client websites.

Do not create a complete independent application deployment for every normal client.

Request flow:

```text
Visitor
  ↓
Client custom domain
  ↓
Cloudflare
  ↓
Vector Delivery Plane
  ↓
Hostname lookup
  ↓
Client + site + published page configuration
  ↓
Rendered response
```

Example:

```text
cebudentalclinic.com
        ↓
client_domains
        ↓
client_id = cl_0017
        ↓
site_id = site_0044
        ↓
published page version
```

A separate request:

```text
abcplumbing.com
```

may be served by the exact same application process while loading a completely different tenant configuration.

## 4.2 Client Isolation

Although websites share infrastructure, client data must remain logically isolated.

Every client can have independent:

- Domain.
- Brand.
- Design tokens.
- Typography.
- Content.
- Products and services.
- Offers.
- Funnel structure.
- Forms.
- Leads.
- Contacts.
- Campaigns.
- Analytics.
- Email programs.
- Social accounts.
- SEO rules.
- AEO configuration.
- AI policies.
- Approval policies.
- Experiments.
- Assets.
- Provider connections.

The shared infrastructure must never imply shared business data.

## 4.3 Website Uniqueness

Multi-tenant hosting must not create visually cloned websites.

Vector standardizes:

- Rendering engine.
- Component capabilities.
- Security.
- Analytics.
- SEO infrastructure.
- Forms.
- Performance.
- Accessibility.
- Deployment.
- Provider integrations.

Vector does not force:

- Identical page composition.
- Identical hero sections.
- Identical typography.
- Identical visual hierarchy.
- Identical motion.
- Identical tone.
- Identical funnel strategy.

The engine is shared. The brand and strategy are client-specific.

Vector 24 depends on reusable frontend infrastructure that does not produce cloned sites. Repeated manual frontend launch work should become a component, variant, token, onboarding field, QA check, or publishing action. Public quality is governed by `docs/27`. Operating goal: **reusable engine, original client experience.**

---

# 5. Initial Single-Server Deployment

## 5.1 Recommended Starting Model

For the first production stage, Vector may run primarily on one application server.

Example:

```text
Cloudflare
    ↓
Traefik
    ↓
Docker Compose
    ├── Vector Control
    ├── Vector Delivery
    ├── Vector API
    ├── PostgreSQL
    ├── Redis
    └── supporting services
```

Third-party workloads remain external where applicable:

```text
Vector Server
    ├── xAI / Grok API
    ├── Resend
    ├── PostHog
    ├── Cloudflare R2
    ├── Social APIs
    └── Search APIs
```

This keeps the application server focused on:

- HTTP requests.
- SvelteKit rendering.
- API execution.
- Database work.
- Authentication.
- Lead processing.
- Webhooks.
- Configuration.
- Workflow coordination.

## 5.2 Initial Server Guidance

For approximately the first 10 to 20 ordinary marketing clients, a reasonable starting server target is:

```text
8–12 vCPU
16–32 GB RAM
NVMe storage
```

When commercially reasonable, prefer 32 GB RAM for additional PostgreSQL, Redis, application, and monitoring headroom.

This is guidance, not a fixed capacity guarantee.

Actual scaling must be driven by measured workload.

---

# 6. Client Count Is Not the Primary Scaling Metric

Do not scale based only on the number of clients.

The important metrics are:

- Requests per second.
- Concurrent visitors.
- Database query load.
- Cache hit rate.
- Analytics event volume.
- Background workflow volume.
- Webhook volume.
- Asset bandwidth.
- Funnel render latency.
- CPU utilization.
- Memory pressure.
- PostgreSQL connection count.
- Storage growth.

Examples:

```text
100 clients × 500 visits/month
```

may be easier than:

```text
10 clients × 1,000,000 visits/month
```

Therefore Vector must report infrastructure demand separately from tenant count.

---

# 7. Cloudflare and Edge Caching

The Delivery Plane should be designed to take advantage of edge caching.

Where safe:

```text
Visitor
  ↓
Cloudflare Edge
  ↓
Cached public response
```

without requiring every page view to reach the origin server.

High cacheability candidates:

- Static assets.
- Images.
- JavaScript bundles.
- CSS.
- Fonts.
- Stable public pages.
- Pre-rendered content.
- R2 media.

Do not cache personalized, consent-sensitive, authenticated, or experiment-sensitive responses without an explicit cache key and policy.

Cloudflare edge caching should be treated as a major component of Vector's scale strategy.

---

# 8. Scale-Out Architecture

Vector must be designed so that initial single-server deployment does not become a permanent architectural dependency.

## 8.1 Stage 1

```text
Server 1
├── Control
├── Delivery
├── API
├── PostgreSQL
└── Redis
```

## 8.2 Stage 2

Possible separation:

```text
Server 1
├── Control
└── API

Server 2
└── Delivery

Server 3
└── PostgreSQL

Server 4
└── Workers / supporting services
```

## 8.3 Stage 3

Horizontal delivery scale:

```text
Cloudflare / Load Balancer
        ↓
 ┌──────┼──────┐
 ↓      ↓      ↓
D1      D2      D3
 \      |      /
  \     |     /
    PostgreSQL
```

The client custom domain must remain unchanged during infrastructure scaling.

## 8.4 Extraction Criteria

Separate a component only when measured requirements justify it.

Examples:

- Delivery traffic saturates the application host.
- PostgreSQL requires dedicated resources.
- Webhook traffic causes API contention.
- Background tasks require separate compute.
- Client SLA requires failure isolation.
- Compliance requires infrastructure separation.
- High-value enterprise clients require dedicated deployment.

Do not split services merely in anticipation of hypothetical scale.

---

# 9. Dedicated Client Infrastructure

The default is shared multi-tenant infrastructure.

Vector should nonetheless support future dedicated deployments for specific enterprise or regulated clients.

Possible models:

### Shared

Normal default.

### Dedicated Delivery

Client has an isolated public delivery runtime while sharing control services.

### Dedicated Database

Client uses separate database infrastructure.

### Fully Dedicated

Dedicated control, delivery, database, and provider configuration.

These should be premium enterprise deployment options and must not complicate the initial MVP.

---

# 10. Vector 24

## 10.1 Definition

**Vector 24** is the internal operational standard that a normal, fully ready client should be capable of moving from completed onboarding to a live initial Vector Growth System within 24 hours.

Recommended commercial wording:

> Launch within 24 hours after all Vector Readiness requirements are complete.

Do not guarantee a 24-hour launch measured from contract signing.

## 10.2 Why Vector 24 Matters

Vector 24 is not merely a marketing claim.

It is an architectural constraint.

It forces the platform to eliminate:

- Manual project setup.
- Manual analytics installation.
- Manual funnel configuration.
- Manual lead routing.
- Manual metadata setup.
- Manual schema creation.
- Manual email workflow wiring.
- Manual campaign scaffolding.
- Repetitive deployment work.
- Repetitive DNS instructions.
- Repetitive QA.

Every recurring manual task that prevents a normal client launch inside the target window should be evaluated for automation or standardization.

---

# 11. Vector Readiness Gate

The 24-hour launch period begins only when the client reaches **VECTOR READY** status.

## 11.1 Required Readiness Categories

### Business

- Business name confirmed.
- Business description confirmed.
- Products and services confirmed.
- Prices or pricing policy confirmed where applicable.
- Locations and service areas confirmed.
- Primary conversion goal confirmed.
- Main offer confirmed.

### Brand

- Logo available.
- Brand colors available or approved for Vector creation.
- Typography available or approved for Vector selection.
- Business photography or approved visual strategy.
- Brand tone approved.

### Claims

- Approved marketing claims.
- Prohibited claims.
- Guarantees.
- Licenses or credentials if used.
- Testimonials and their usage approval.

### Audience

- Target customer.
- Priority markets.
- Personas.
- Known objections.
- Competitors.

### Domain

- Domain ownership confirmed.
- DNS access available or delegated.
- Canonical domain selected.

### Email

- Sending domain selected.
- Required DNS control available.
- From identity confirmed.
- Consent and communication policy confirmed.

### Social

- Required social accounts identified.
- Connection permissions available.

### Legal and Compliance

- Privacy policy status known.
- Terms status known where applicable.
- Cookie and analytics policy configured where applicable.
- Marketing consent policy approved.
- Jurisdictions identified.

### Approval

- Client approval contact.
- MGE account owner.
- Content approval expectations.
- Launch approval authority.

## 11.2 Readiness Status

Vector should calculate readiness.

Example:

```text
Business Information       ✓
Products / Services        ✓
Pricing                    ✓
Primary Offer              ✓
Brand Assets               ✓
Claims                     ✓
Domain Access              ✓
Email Access               ✓
Social Access              ✓
Compliance Configuration   ✓
Approval Contacts          ✓

VECTOR READY
```

Missing critical requirements prevent the SLA clock from starting.

---

# 12. 24-Hour Launch Workflow

The target workflow should eventually be:

```text
VECTOR READY
      ↓
Research
      ↓
Strategy
      ↓
Funnel architecture
      ↓
Copy
      ↓
SEO / AEO
      ↓
Lead capture
      ↓
Analytics
      ↓
Email nurture
      ↓
Social launch content
      ↓
QA
      ↓
Human approval
      ↓
Domain activation
      ↓
LIVE
```

The sequence may execute many branches concurrently when dependencies permit.

Example:

```text
                   Client Knowledge
                         ↓
        ┌────────────────┼────────────────┐
        ↓                ↓                ↓
     Research         Funnel          Social
        ↓                ↓                ↓
    SEO / AEO          Copy           Calendar
        │                │                │
        └────────────────┼────────────────┘
                         ↓
                       QA
                         ↓
                      Launch
```

---

# 13. Launch Classes

Not all clients should carry the same 24-hour expectation.

## Class A — Simple Local Service

Examples:

- Plumbing.
- Cleaning.
- Salon.
- Contractor.
- Local professional.
- Simple clinic where claims are non-sensitive.
- Restaurant.

Target internal build time after readiness:

```text
1–4 hours
```

## Class B — Standard Professional or Service Business

Target:

```text
4–12 hours
```

## Class C — Complex Business

Examples:

- Large catalog.
- Multiple locations.
- Complex integrations.
- Multiple funnels.
- Complex approval structure.

Target:

```text
12–24 hours
```

## Class D — Regulated or Complex Enterprise

May exceed 24 hours.

Examples:

- Highly regulated services.
- Complex ecommerce.
- Enterprise SSO.
- Dedicated infrastructure.
- Complex compliance.
- Large migrations.
- Extensive custom integrations.

Vector 24 should not be promised blindly to these clients.

---

# 14. First Client Ramp

Vector 24 is a mature-state operational target.

Expected early progression:

## Client 1

Human led.

Objective:
Discover missing platform capability and documentation.

## Client 2

Heavily assisted.

Objective:
Reduce custom engineering.

## Client 3

Mostly workflow driven.

Objective:
Validate repeatability.

## Clients 4–5

Optimization and standardization.

Objective:
Measure launch cycle time.

## Later clients

Target:

```text
Vector Ready → Live within 24 hours
```

Do not artificially force the first implementations into the final SLA before the platform is ready.

---

# 15. Automation Requirements for Vector 24

The following must ultimately become automated or near-automated.

## Client Provisioning

- Create tenant.
- Create brand.
- Create site.
- Create default roles.
- Create default policies.
- Create provider connection checklist.

## Funnel

- Generate funnel structure.
- Generate draft pages.
- Configure forms.
- Configure conversion destinations.
- Configure tracking.
- Generate metadata.
- Generate structured data.
- Generate Open Graph data.
- Generate sitemap.
- Generate robots configuration.
- Configure redirects.

## Analytics

- Assign tenant analytics configuration.
- Configure event instrumentation.
- Configure acquisition parameters.
- Configure conversion definitions.
- Configure PostHog project or tenant mapping.

## Lead Operations

- Create lead pipeline.
- Configure lead scoring baseline.
- Configure lead notifications.
- Configure attribution.
- Configure eligible nurture path.

## Email

- Create domain verification workflow.
- Validate SPF, DKIM, and DMARC requirements.
- Configure approved sender.
- Create nurture drafts.
- Configure suppression.
- Configure webhooks.

## Social

- Validate connections.
- Generate initial calendar.
- Generate platform-specific drafts.
- Queue approval.
- Schedule approved items.

## SEO and AEO

- Generate technical baseline.
- Generate sitemap.
- Generate metadata.
- Generate structured data.
- Generate initial page targets.
- Generate content opportunities.
- Generate FAQ opportunities.

## QA

Automate checks for:

- Broken internal links.
- Broken outbound links.
- Missing metadata.
- Missing alt text.
- Invalid schema.
- Form submission.
- Conversion events.
- Mobile layout.
- HTTP status codes.
- Canonical correctness.
- Sitemap inclusion.
- robots rules.
- Analytics events.
- Email workflow readiness.
- Provider connection health.

---

# 16. Client Onboarding UX Requirement

Vector must include a structured onboarding wizard.

Suggested sections:

```text
1. Business
2. Products and Services
3. Customers
4. Locations
5. Pricing
6. Offers
7. Competitors
8. Brand
9. Claims and Proof
10. Domain
11. Email
12. Social
13. Analytics
14. Compliance
15. Approvals
16. Readiness Review
```

The onboarding system should:

- Save progress.
- Show completion percentage.
- Identify blocking requirements.
- Allow uploads.
- Validate required fields.
- Connect provider accounts.
- Surface missing access.
- Generate a readiness score.
- Distinguish optional from blocking information.
- Create internal tasks for unresolved items.

---

# 17. Client Assets and Knowledge Ingestion

Clients should be able to provide:

- Logo.
- Brand guide.
- Product catalog.
- Service list.
- Pricing files.
- Company profile.
- Existing website.
- Images.
- Videos.
- Testimonials.
- Case studies.
- FAQs.
- Legal pages.
- Sales materials.
- Social links.
- Existing analytics references.

Vector Intelligence may extract and structure this information, but extracted facts must be classified by authority and may require approval before publication.

---

# 18. Human Review Must Remain in the 24-Hour System

Fast launch does not mean zero review.

Before the first production launch:

- Verify business facts.
- Review claims.
- Review pricing.
- Review primary offer.
- Review lead destination.
- Review legal links.
- Verify forms.
- Verify mobile behavior.
- Verify email sender.
- Verify tracking.
- Verify custom domain.
- Verify no cross-tenant leakage.

A normal launch should use a concise exception-based review rather than a full manual rebuild.

---

# 19. Launch State Machine

Recommended client launch states:

```text
draft
onboarding
blocked
vector_ready
generating
qa
awaiting_client_approval
awaiting_domain
launching
live
launch_failed
paused
```

Every transition should be auditable.

## Important timestamps

Store:

```text
signed_at
onboarding_started_at
vector_ready_at
generation_started_at
qa_started_at
approval_requested_at
approval_received_at
launch_started_at
live_at
```

This allows Vector to measure:

- Time to readiness.
- Internal build time.
- Client approval delay.
- DNS delay.
- Total time to live.

---

# 20. SLA Measurement

Do not hide client delays inside MGE production performance.

Report separately:

```text
Contract → Readiness
Readiness → Internal Build Complete
Build Complete → Client Approval
Approval → Domain Ready
Domain Ready → Live
```

The Vector 24 KPI is:

```text
vector_ready_at → live_at
```

excluding documented client-caused pauses.

---

# 21. Vector 24 Dashboard

Operators should see:

```text
CLIENT             STATUS               CLOCK
ABC Dental         Generating           02:14
XYZ Plumbing       Awaiting Approval    Paused
QRS Consulting     QA                   07:51
```

Show:

- Blocking issue.
- Owner.
- Next action.
- SLA clock state.
- Estimated complexity class.
- Readiness score.

Do not require operators to manually track launch status in spreadsheets.

---

# 22. Infrastructure Acceptance Criteria for 20 Clients

Before claiming that the initial infrastructure safely supports 20 clients, run load tests based on realistic traffic.

Minimum tests should include:

- Cached homepage traffic.
- Uncached landing page traffic.
- Simultaneous lead submissions.
- Analytics event ingestion.
- Webhook bursts.
- Database query concurrency.
- Control Plane usage while public traffic is active.
- Deployment while sites remain available.

Define initial internal SLOs such as:

```text
Public cached responses: primarily edge served
Origin p95 target: < 500 ms for ordinary page requests
API p95 target: < 500 ms for ordinary CRUD requests
Lead submission success: > 99.9% excluding upstream outages
Critical webhook loss: 0 after retry/reconciliation
```

Exact values may be revised after real measurement.

---

# 23. Scaling Triggers

Create alerts and review infrastructure when any of the following persist:

- CPU > 70% during normal sustained periods.
- Memory > 80%.
- Swap activity appears.
- PostgreSQL connection pressure.
- Database p95 latency materially increases.
- Origin p95 latency exceeds SLO.
- Queue delay materially exceeds workflow expectations.
- Lead submission failures increase.
- Provider webhook backlog grows.
- Cache hit ratio drops unexpectedly.
- One tenant causes a disproportionate workload.

Scale based on measurements, not intuition.

---

# 24. Noisy Neighbor Controls

Multi-tenancy introduces noisy-neighbor risk.

Implement:

- Per-client API rate limits.
- Per-client workflow concurrency limits.
- Per-client AI budgets.
- Per-client email quotas.
- Per-client provider rate controls.
- Per-client upload limits.
- Per-client analytics abuse detection.

A single client must not be able to exhaust shared resources.

---

# 25. Operational Kill Switches

Vector should include:

### Client-level

- Pause all outbound automation.
- Pause social.
- Pause marketing email.
- Pause AI execution.
- Pause public site.
- Pause experiments.

### Platform-level

- Disable provider.
- Disable model.
- Disable automation class.
- Disable publishing globally.
- Disable outbound email globally.

Kill-switch actions must be privileged and audited.

---

# 26. Deployment Strategy for Client Websites

Client websites should not require separate full code deployments for normal content updates.

Preferred model:

```text
Vector code deployment
    ≠
Client page publication
```

Client publication should generally update database-backed immutable page versions and invalidate relevant cache.

This allows:

- Fast client launches.
- Fast copy updates.
- Fast experiment launches.
- No Git deployment for every normal marketing edit.
- Lower operational risk.

Code deployment remains necessary for:

- New platform capability.
- New component type.
- Security fixes.
- New provider adapters.
- Infrastructure changes.

---

# 27. Preview Environment

Before production launch, every client should receive a private preview.

Example:

```text
preview-{client-slug}.vector.maxglobalexpo.com
```

or another verified preview scheme.

Requirements:

- `noindex`.
- Access control where practical.
- No production marketing email.
- No production social publishing.
- Test-mode analytics classification.
- Test lead routing.

Preview must not accidentally become indexed public content.

---

# 28. Domain Activation Workflow

Recommended:

```text
domain submitted
→ ownership instructions
→ DNS validation
→ configuration
→ SSL active
→ canonical selected
→ redirect validation
→ health check
→ publish
```

Where Cloudflare account architecture permits, automate as much of this process as safely possible.

Do not consider a site live until:

- HTTPS works.
- Canonical hostname works.
- Redirect hostnames behave correctly.
- Health check passes.
- Sitemap uses the production domain.
- Metadata uses production URLs.

---

# 29. Vector 24 as a Product Metric

Add platform metrics:

```text
median_time_to_vector_ready
median_ready_to_live
percentage_launched_under_24h
percentage_launched_under_12h
manual_interventions_per_launch
automation_failures_per_launch
client_blocked_hours
internal_build_hours
```

The goal should be to reduce:

```text
manual_interventions_per_launch
```

without increasing:

```text
launch defects
```

---

# 30. Commercial Positioning Guidance

Once operational performance proves the capability, MGE may market:

> Your complete growth infrastructure launched in as little as 24 hours.

Preferred qualification:

> 24-hour launch begins once all required business information, access, approvals, and Vector Readiness requirements are complete.

Do not advertise guaranteed 24-hour launch for:

- Highly regulated clients.
- Complex ecommerce.
- Large migrations.
- Custom enterprise integrations.
- Dedicated infrastructure.
- Projects dependent on external approvals.

---

# 31. Definition of a Successful Vector Launch

A client is not considered successfully launched simply because the homepage loads.

Launch requires:

- Production custom domain.
- HTTPS.
- Correct brand.
- Approved copy.
- Lead form working.
- Lead stored.
- Lead notification working.
- Attribution working.
- Analytics events working.
- SEO metadata working.
- Sitemap and robots behavior correct.
- Email nurture ready when included.
- Social program ready when included.
- Provider health verified.
- Audit events recorded.
- Mobile QA passed.
- No tenant leakage.
- Client launch approval recorded.

---

# 32. Cursor Implementation Requirements

Cursor must treat this document as an implementation constraint.

When building client onboarding, deployment, domain management, analytics, or automation, Cursor should ask internally:

> Does this architecture support repeatable client launch without custom engineering?

If the answer is no, document the limitation.

When a repeated manual launch step is discovered:

1. Record it.
2. Determine whether it is client-specific or universal.
3. Automate it if safe and repeatable.
4. Add a test.
5. Add it to the launch checklist.
6. Update Vector 24 metrics.

---

# 33. Required Additions to Existing Roadmap

Add the following roadmap work if not already present.

## Phase 1

- Client readiness model.
- Onboarding completion scoring.
- Launch state machine.
- Preview domain model.

## Phase 2

- Launch funnel analytics.
- Readiness and launch timing events.

## Phase 3

- Automated email domain readiness checks.

## Phase 5

- Automated social connection readiness checks.

## Phase 8

- Launch automation policies.
- Low-risk auto-execution.

## Phase 9

- Portfolio launch dashboard.
- Multi-client noisy-neighbor controls.
- Usage quotas.
- Scaling alerts.

---

# 34. Required New Data Entities

Consider adding:

```text
client_readiness
client_readiness_items
client_launches
client_launch_events
client_launch_blocks
client_launch_approvals
infrastructure_usage_snapshots
tenant_usage_limits
tenant_usage_events
```

Suggested `client_launches` fields:

```text
id
client_id
launch_class
status
vector_ready_at
generation_started_at
qa_started_at
approval_requested_at
approval_received_at
domain_ready_at
launch_started_at
live_at
paused_at
paused_seconds
failure_reason
created_at
updated_at
```

---

# 35. Final Decision

The intended model is:

```text
MGE
 sells
  ↓
Vector
 operates
  ↓
Many independent client growth systems
 served from
  ↓
One logical multi-tenant platform
```

The initial platform may run primarily on one capable server for the first 10 to 20 normal clients.

The architecture must not depend on remaining on one physical server.

Client count alone does not determine scale.

Vector should use Cloudflare and external providers to reduce origin workload.

Normal client websites should be dynamically selected by custom hostname from one shared Delivery Plane.

Most client launches should not require new application code.

The long-term operational target is:

# VECTOR 24

> A normal client that has completed all Vector Readiness requirements can be launched with a production-ready initial growth system within 24 hours.

This target should directly influence onboarding, deployment, automation, QA, provider integration, domain management, analytics, and operator UX throughout the product.
