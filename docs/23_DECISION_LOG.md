# Architecture Decision Log

Record material decisions using this format.

## ADR Template

### ID

ADR-XXXX

### Date

### Status

Proposed / Accepted / Superseded / Rejected

### Context

### Decision

### Alternatives considered

### Consequences

### Security impact

### Operational impact

### Reversal path

---

## ADR-0001

### Date

22 August 2026

### Status

Accepted

### Decision

Begin as a modular monolith with Control Plane and Delivery Plane boundaries.

### Reason

Reduces operational complexity while preserving future extraction boundaries.

---

## ADR-0002

### Date

22 August 2026

### Status

Accepted

### Decision

Maximum Global Exposure and Vector are separate products. MGE (`maxglobalexpo.com`) sells. Vector (`vector.maxglobalexpo.com`) operates. Client production sites use the client's custom domain. MGE should become a Vector tenant for dogfooding.

### Alternatives considered

One combined MGE-plus-Vector website; per-client Vector subdomains as the production identity.

### Consequences

Three layers in one ecosystem. The MGE site can later run on Vector without merging the control application into the marketing site.

---

## ADR-0003

### Date

22 August 2026

### Status

Accepted

### Decision

Serve many client websites from one logical Delivery Plane selected by verified hostname. Start on one capable server for the first 10–20 ordinary marketing clients. Scale from measured workload, not tenant count. Use Cloudflare edge caching where safe. Dedicated infrastructure is a later enterprise option only.

### Alternatives considered

One application deployment per client; one physical server as a permanent architecture; Kubernetes from day one.

### Consequences

Client domains stay stable while hosts are split later. Shared infrastructure never implies shared business data or cloned visual identity.

---

## ADR-0004

### Date

22 August 2026

### Status

Accepted

### Decision

Vector 24 is an architectural and operational requirement: a normal client that has completed Vector Readiness can be launched within 24 hours. The SLA clock starts at Vector Ready, not at contract signing. Launch classes A–D and a launch state machine are required. The first clients are exempt from the final SLA.

### Alternatives considered

Measure 24 hours from signing; skip readiness gating; promise Vector 24 to every client including regulated enterprise.

### Consequences

Onboarding, domain, analytics, email, social, QA, and publication must be productized. Commercial wording must stay qualified.
