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

---

## ADR-0007

### Date

22 August 2026

### Status

Accepted

### Decision

Trigger.dev is the production workflow host for Phase 3 email contracts. Vector owns a `WorkflowRuntime` adapter. In-process is the default when `TRIGGER_SECRET_KEY` is unset and for every `bun test` run. Official tasks live in `apps/jobs` and only call domain handlers. Tenant workflows require `organizationId`, `clientId`, and `requestId`. The platform due-sweep may list tenant IDs that have due work, then each tenant job runs with explicit `TenantContext`.

### Alternatives considered

Keep in-process forever; call Trigger.dev APIs from domain modules; run a Vector-owned queue/worker microservice.

### Consequences

Local and CI do not need a Trigger.dev project. Production can enqueue lead-captured, inbound, and due-sweep work without changing consent or send order. Secrets stay in env.

### Security impact

Tasks have no unrestricted SQL, shell, filesystem, HTTP, or secrets. Inbound workers re-validate the recipient tenant. Missing tenant fields fail closed.

### Operational impact

Operators still process due steps from Control. Trigger.dev cron is optional and does not change VECTOR READY.

### Reversal path

Unset `TRIGGER_SECRET_KEY`. The factory returns the in-process runtime.

---

## ADR-0008

### Date

22 August 2026

### Status

Accepted

### Decision

`docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md` is the standing Creative Engine charter. It governs ingest, generation, deterministic composition, storage metadata, rights, versioning, approval, derivatives, and distribution of client media.

The document number is **29**. `docs/28` remains Control / Vector product identity. `docs/27` remains public Delivery art direction and quality. Do not treat 29 as a second 28, and do not apply Vector Black / Blue to tenant campaign creative.

Phase 1 `brand_assets` plus `StorageProvider` is Creative C0 partial (identity files only). Phase 4 `AIProvider` stays text, structured output, and tools. Image and video models use separate `ImageProvider` / later `VideoProvider` adapters. Do not invent `AssetStorageProvider`. Do not reopen Phase 1 or Phase 4 exits.

Creative work follows the C0–C9 track in `docs/29` §63. That track is cross-cutting. Phase 5 exit remains two-platform social publish. C0 is the only Creative foundation Phase 5 must take so Social does not own a second media store. Funnel hero generation, video, Creative QuickStart, and creative learning objects wait for later slices or later phases.

### Alternatives considered

Renumber 29 as 28 and move the visual-language standard; fold image generation into `AIProvider`; require generated visuals before Phase 5 social publish; rewrite historical Phase 1 and Phase 4 exits.

### Consequences

Agents read 29 for client media work. Social, email, and funnel consume approved asset references. Operators still upload logos on `/knowledge` until C0 generalizes the library.

### Security impact

Generated and uploaded media stay tenant-scoped, rights-aware, and approval-gated. Raw storage keys are not authorization. Models must not publish, overwrite approved logos, or invent proof.

### Operational impact

No Creative Engine code is required to accept this ADR. Phase 5 may start. Vector 24 still treats automated creative as a mature-state requirement, not a first-client promise.

### Reversal path

Supersede this ADR. Leave `docs/29` as historical. Keep Phase 1 `brand_assets` and `StorageProvider`.

---

## ADR-0009

### Date

22 August 2026

### Status

Accepted

### Decision

`docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md` is the standing client-experience, revenue-intelligence, and growth-outcomes charter. It governs authenticated client information architecture, business-language copy, goals, sales outcomes, optional revenue, attribution confidence, data health, notifications, entitlements, and client-success health.

`docs/27` remains public visitor UX. `docs/28` remains Control / Vector identity — client dashboards use those tokens. `docs/29` remains the Creative Engine. Do not invent a third visual language.

Phase 2 already has `leads.status` including `won` / `lost`, `lead_status_history`, scores, and attribution v1. Do not replace that enum (`new | working | qualified | won | lost | spam`) or edit applied migration `0006_phase2_leads.sql`. `appointment` / `proposal` live on `sales_outcomes` (or a later additive stage). Phase 1 `offers` is the knowledge-priced offer; campaign-offer fields extend that domain. Phase 4 recommendation cards already carry finding, evidence, impact, risk, and confidence for operators. Do not reopen Phase 2, 3, or 4 exits.

Outcomes work follows the O1–O20 track in `docs/30` §88. Client and operator stay one Control app with capability-based navigation. Phase 5 exit remains two-platform social publish. Social may persist post → lead on the existing attribution path. Ask Vector, CRM adapters, ads, billing, entitlements, and a full Today dashboard are later slices. Revenue amounts are optional. AI must not invent sales or revenue. Uncertain attribution must not be presented as fact.

This is the last numbered charter in `/docs`. Further product law is an ADR or a fold into an existing document, not `docs/31`.

### Alternatives considered

Reopen Phase 2 to add goals and revenue; replace `lead_status`; create `apps/client`; require Ask Vector before Phase 5 social; treat 30 as a second Control visual language.

### Consequences

Agents read 30 for client UX and outcome work. Operators keep the current infrastructure nav until Outcomes slices land. First paying-client readiness includes a primary goal and won/lost capture; it does not require billing or ads.

### Security impact

Goals, outcomes, revenue, health, and entitlements are tenant-owned. Revenue is commercially sensitive. Cross-tenant aggregation is MGE-internal and capability-gated. Client Sales must not receive `ai.manage` or unrestricted knowledge rights.

### Operational impact

No Outcomes code is required to accept this ADR. Phase 5 may start. Internal contribution-margin views stay hidden from clients.

### Reversal path

Supersede this ADR. Leave `docs/30` as historical. Keep Phase 2 lead statuses and Phase 1 `offers`.

---

## ADR-0010

### Date

23 August 2026

### Status

Accepted

### Decision

Phase 5 exit is met. Approved content publishes through official LinkedIn member OAuth (`w_member_social`, `urn:li:person:{id}`). Official X OAuth and the X adapter are installed; live tweet write is blocked only by provider HTTP 402. Required social connections gate `social.access`.

LinkedIn Company Page posting (`w_organization_social`, organization ACLs) is withdrawn from this exit. Facebook and Instagram official app credentials are not part of this acceptance. C0 image attach works in adapters and tests; this live confirmation was text-only because Client Alpha had no authentic approved logo in the Social library.

Do not reopen Phase 0–4. Do not start Phase 6 until this record is accepted. YouTube, TikTok, autonomous replies, C2–C9, and O1–O20 stay later.

### Alternatives considered

Keep Phase 5 open until a paid X write plan publishes a live tweet; require a live LinkedIn Company Page; treat memory-adapter tests as the two-platform exit.

### Consequences

Agents treat Phase 5 as closed. Paid X write access or a later Company Page slice can be additive. They do not reopen this exit.

### Security impact

Tokens stay encrypted and server-side. Official OAuth uses PKCE. Publish stays approval-gated and tenant-scoped.

### Operational impact

`bun test` against the shared seed database overwrites Client Alpha official social tokens. Reconnect official OAuth after those tests before another live publish.

### Reversal path

Supersede this ADR and reopen Phase 5 if official LinkedIn member publish regresses or if the X 402 exception is no longer accepted.

---

## ADR-0011

### Date

23 August 2026

### Status

Accepted

### Decision

Phase 6 includes GEO (Generative Engine Optimization) as a named third surface beside SEO and AEO. The official slice spec remains `docs/plans/06_PHASE_6_SEO_AEO.md`. Standing content rules fold into `docs/10`. Charters still stop at `docs/30`. Do not add `docs/31`.

`SearchProvider` remains the only search adapter family. Do not invent `SearchPerformanceProvider`, `SearchIndexProvider`, `GenerativeVisibilityProvider`, or `SearchResearchProvider`.

The Phase 6 exit stays an evidence-based SEO/AEO/GEO backlog. Must-take is the technical SEO baseline plus launch-time GEO-readiness surfaces (path-aware canonicals, published-URL sitemap, AI-crawler robots, factual JSON-LD, production `llms.txt` from approved knowledge). Live generative measurement and search/GEO → qualified-lead reporting are later, not this exit.

GEO observations are probabilistic. No universal AI-rank or GEO score. No scraping of restricted consumer AI interfaces. Preview must not serve production sitemap, schema, or `llms.txt`.

### Alternatives considered

Keep Phase 6 as SEO/AEO only; create `docs/31` for GEO; require live ChatGPT/Perplexity measurement to exit Phase 6; add four new provider families.

### Consequences

Agents treat GEO as in-scope for Phase 6 documentation and S1–S4 implementation. S5+ measurement waits for a compliant method. Outcome join stays `docs/30` additive.

### Security impact

Search-property tokens stay encrypted and server-side. GEO rows are tenant-owned. Retained generative answers are untrusted retrieved content. Alpha cannot read Beta search or GEO data.

### Operational impact

No search package code is required to accept this ADR. Vector 24 does not wait for generative citation. GEO monitoring requires query and budget caps when measurement ships.

### Reversal path

Supersede this ADR. Leave `docs/10` GEO sections as historical. Keep Phase 6 exit as a search backlog without GEO-readiness surfaces.

### Implementation note (23 August 2026)

S1 Delivery GEO-readiness and S2 `packages/search` (memory default; official GSC/Bing when `SEARCH_ADAPTER=official`), `seo.read` / `seo.manage`, Control `/search`, and first-ship `seo_*` tables are in. S3 (answer targets) is next. The ADR lock is unchanged.
