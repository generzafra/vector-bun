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

---

## ADR-0005

### Date

22 August 2026

### Status

Accepted

### Decision

`docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md` is the standing public frontend, UX, and sales-funnel quality standard. It governs Delivery Plane marketing experiences. Control Plane stays operational. Client brand and offer override visual style; they do not lower the quality bar. Security, legal, accessibility, performance, and tenant isolation override decorative experimentation.

### Alternatives considered

Treat frontend quality as per-client taste; copy reference sites; generate arbitrary HTML from the model.

### Consequences

Funnel work uses shared tokens and section variants. AI proposes schemas and variants, not production markup. Public pages pass the Frontend Release Gate before publication. Vector 24 remains reusable engine, original client experience.

---

## ADR-0006

### Date

22 August 2026

### Status

Accepted

### Decision

`docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md` is the standing Vector product visual-language standard. It governs Control Plane identity and Vector-native product motifs (intelligence, opportunity, automation, activity). It does not replace `docs/27` and does not become the visual identity of Delivery client sites or the MGE marketing site.

Capability tokens (spacing, radius, motion, section variants) stay in the shared engine. Identity tokens are per plane: Control uses the Vector palette; Delivery uses client tokens.

Recommended `src/lib/vector/` paths in the visual contract map to `packages/ui` tokens and `apps/control/src/lib/vector` in this monorepo.

Official PNG/SVG artwork may replace the interim Control mark later.

### Alternatives considered

Apply the Vector hero and black/blue identity to every Delivery funnel; keep Control unstyled indefinitely; create a competing `docs/frontend` copy of `docs/27`.

### Consequences

Control can look like VECTOR without cloning Vector onto `theircompany.com`. Agents must read `docs/28` for Control work and `docs/27` for public Delivery work.

### Security impact

Visual only. No change to tenant scoping, CSRF, or capabilities.

### Operational impact

Existing Control screens adopt shared tokens incrementally. No new product modules are required to accept this ADR.

### Reversal path

Revert Control to local CSS and stop importing `@vector/ui/tokens.css`. Delivery is unaffected.
