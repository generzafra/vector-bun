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

Agents treat GEO as in-scope for Phase 6 documentation and S1–S7 implementation. Official generative-engine APIs stay later. Revenue rows stay later Outcomes work.

### Security impact

Search-property tokens stay encrypted and server-side. GEO rows are tenant-owned. Retained generative answers are untrusted retrieved content. Alpha cannot read Beta search or GEO data.

### Operational impact

No search package code is required to accept this ADR. Vector 24 does not wait for generative citation. GEO monitoring requires query and budget caps when measurement ships.

### Reversal path

Supersede this ADR. Leave `docs/10` GEO sections as historical. Keep Phase 6 exit as a search backlog without GEO-readiness surfaces.

### Implementation note (23 August 2026)

S1–S8 are in: Delivery GEO-readiness, `packages/search`, answer targets, GEO query/observation schema, first compliant measurement, visibility snapshots, search/GEO → lead when UTMs are observable, and cadence/budget/portfolio queues. Official generative-engine APIs remain `unsupported`. Revenue is not assigned from a mention. Scheduled search jobs never scrape consumer AI interfaces. The ADR lock is unchanged.

---

## ADR-0012

### Date

24 August 2026

### Status

Accepted

### Decision

Numbered charters in `/docs` still stop at `docs/30` (ADR-0009, ADR-0011). Do not add `docs/31` or `docs/32`.

Two product needs land as **cross-cutting tracks**, the same shape as Creative C0–C9 and Outcomes O1–O20:

1. **First Reveal (FR0–FR9).** Slice spec: `docs/plans/FIRST_REVEAL_TRACK.md`. Standing law folds into `docs/09` (renderer and direction metadata), `docs/17` (onboarding → reveal), `docs/26` (Vector 24 ready-to-first-reveal metrics), `docs/27` (public quality bar; Frontend Release Gate still governs publication), and `docs/29` (media: C1, C3, C5, C7). Authenticated reveal chrome uses `docs/28`. Delivery visitor UX stays `docs/27`.
2. **Client Value (V0–V5).** Slice spec: `docs/plans/CLIENT_VALUE_TRACK.md`. Standing law folds into `docs/30` (outcomes remain the source of truth) and `docs/20` (MGE operating cost ≠ client-facing value). This extends Outcomes as O21–O22 / V0–V5. It does not sit above `docs/30` as a second sales or revenue ledger.

Phase mapping is locked in `docs/plans/CROSS_CUTTING_TRACKS.md`. Tracks never reopen an exited phase. Phase 1 remains the `docs/27` MVP Frontend Release Gate. First Reveal Gate is a **pre-client** gate on the first paying-client bar, not a Phase 1 exit rewrite. Client Value V0 (activity proof without an ROI claim) may appear on that same bar. Replacement-cost, time-savings, and revenue-linked ROI wait for Outcomes coverage.

`docs/28` remains Control / Vector identity. `docs/29` remains the Creative Engine. First Reveal must not treat 28 as Creative.

### Alternatives considered

Number `docs/31` and `docs/32` as new charters and wire them into every file; add Phase 10 / Phase 11; reopen Phase 1 so a Framer-class first site is the funnel exit; fold the long specs only into `docs/27` and `docs/30` with no track table.

### Consequences

Agents read the track specs when implementing first-preview composition or client ROI. GEO still must not become `docs/31`. Creative C7 (QA and client approval) attaches to Phase 5’s later calendar and to first-paying-client readiness. C9 video stays unattached.

### Security impact

Direction candidates, scores, gate results, value snapshots, baselines, and benchmarks are tenant-owned. Replacement-cost and salary/time baselines are commercially sensitive. AI may explain value; trusted software calculates it. AI must not invent revenue, hours saved, or agency cost. Preview hosts stay `noindex`. Control reveal UI must not leak Vector identity onto tenant Delivery pages.

### Operational impact

No First Reveal or Value Engine code is required to accept this ADR. Do not generate three full websites by default. Do not delay a launch for mature ROI.

### Reversal path

Supersede this ADR. Leave the track specs as historical. Keep `docs/27` publication gate, `docs/29` Creative track, and `docs/30` Outcomes track.

---

## ADR-0013

### Date

24 August 2026

### Status

Accepted

### Context

Phase 0–5 and 7–8 exits are met. Phase 6 S0–S8 and Phase 9 S0–S1 are in. A thin first-client bar (FR0–FR2, thin FR7, O1/O6/O7) is in. Creative C1–C9, Outcomes O3–O20, First Reveal FR3–FR9, Client Value V0–V5, Phase 9 S2–S4, and client-simple Control UX remain unimplemented. Agents need a Cursor-ready sequence without new numbered charters or Phase 10/11.

### Decision

Remaining work is sequenced as **execution plans under `docs/plans/`**, not as `docs/31+` and not as new Vector phases.

- Index and waves: `docs/plans/SHIP_REMAINING.md`
- Client operating UX (CU0–CU1) + Outcomes O3–O20: `docs/plans/OUTCOMES_TRACK.md`
- Creative C1–C9: `docs/plans/CREATIVE_TRACK.md`
- First Reveal remainder: existing `docs/plans/FIRST_REVEAL_TRACK.md`
- Client Value remainder: existing `docs/plans/CLIENT_VALUE_TRACK.md`
- Phase 9 S2–S4 + SRE/DR/retention: `docs/plans/PLATFORM_OPS_TRACK.md` (S2–S4 rules stay in `docs/plans/09_PHASE_9_SCALE.md`)
- Extra Delivery families, Control chrome leftovers, extra networks: `docs/plans/SURFACE_COMPLETENESS_TRACK.md`

Client-simple UX is first-class Outcomes work (`docs/30` §2, §5, §81–85). It is not a Delivery catalog leftover. Default client nav is Overview / Today / Leads / Campaigns / Approvals / Insights. The `docs/17` 16-step catalog is readiness inventory, not the client form. CU0–CU1 must not wait for Phase 9 Creative QuickStart extraction.

Next implementation slice is Wave A in `SHIP_REMAINING.md`.

ADR-0012 still governs: charters stop at `docs/30`; First Reveal and Client Value are tracks; tracks never reopen an exited phase.

### Alternatives considered

Add `docs/31` for remaining work; treat leftover catalogs as one mega-phase; bury client UX under Control chrome leftovers; implement Creative C1–C9 before CU0.

### Consequences

Agents read `SHIP_REMAINING.md` before picking a remaining slice. Charters remain product law. No `apps/client` fork. No `generateImage` on `AIProvider`.

### Security impact

Every new tenant-owned table still requires `client_id`, explicit `TenantContext`, fail-closed missing context, and cross-tenant tests. Capability-filtered nav is authorization, not cosmetics.

### Operational impact

First clients stay supervised. Vector 24 remains a mature-state target. Do not delay a first paying client for Ask Vector, ads, billing, video, or cinematic Delivery families.

### Reversal path

Supersede this ADR. Keep the track specs as historical. Do not add numbered charters past 30 without a further ADR.

---

## ADR-0014

### Date

8 October 2026

### Status

Accepted

### Context

The 8 October 2026 Creative Experience Engine blueprint asks for art-directed client landing pages: briefs, a wider component grammar, winner-only media, rendered screenshot QA, restrained motion, and client feedback. Wave B is already in (thin FR3, thin FR4–FR5, C1–C3, thin C5, thin FR6, C7, deterministic FR7, thin FR8). The blueprint's original snapshot still named FR6 as the next slice. Standing charters stop at `docs/30`. `docs/09` still withholds cinematic and interactive variants until a real client needs them. `docs/27` remains the publication gate.

### Decision

Adopt the blueprint as a cross-cutting **execution track**, not as a phase and not as `docs/31`.

- Design blueprint: `docs/plans/VECTOR_CREATIVE_EXPERIENCE_ENGINE_CURSOR_IMPLEMENTATION.md`
- Sequence and current status: `docs/plans/CREATIVE_EXPERIENCE_ENGINE_TRACK.md`
- Register CE0–CE7 on Wave D in `docs/plans/SHIP_REMAINING.md` and `docs/plans/CROSS_CUTTING_TRACKS.md`

The track extends `packages/funnel-engine`, Delivery sections, `packages/contracts`, `packages/images`, and `packages/compose`. It does not add `packages/creative-experience-engine`, a second renderer, a second asset store, or `generateImage` on `AIProvider`.

Thin FR6, C7, deterministic FR7, and thin FR8 stay as built. Pixel screenshots are CE5 and are not claimed shipped. Structured reveal feedback is CE6. C4 derivatives are CE3. C8 learning is CE7.

The next implementation slice remains Wave C **O4 / O5**. CE0 does not jump that queue. ADR-0012 and ADR-0013 still govern charter limits and remaining-work sequencing.

### Alternatives considered

Treat the blueprint as the next implementation and restart FR6. Add `docs/31`. Build a separate creative-experience package and renderer. Pull screenshot QA into Wave C ahead of Overview and Today. Ignore the blueprint and leave its stale "FR6 is next" prompt in force.

### Consequences

Agents read the track file before any CE slice. The blueprint supplies design detail. Charters still win on product law. Five synthetic industry fixtures, width modes, M0–M2 motion, fingerprints, and screenshot evidence wait for Wave D. M3, WebGL, and video stay later. A manifest score is not a screenshot review. Approval of a reveal is not publication.

### Security impact

Briefs, experience manifests, fingerprints, visual QA reports, and creative feedback are tenant-owned when persisted. Fingerprints must not pool one client's copy or media for another client. Media references stay tenant-scoped asset ids. Models cannot emit executable HTML, CSS, or JavaScript. Hard blockers for tenancy, prohibited claims, and unlicensed imagery override scores and operator aesthetic overrides.

### Operational impact

No CE code is required to accept this ADR. Do not add Playwright or a new browser platform without a later ADR if no suitable runner exists. Performance numbers in the blueprint are targets, not measured results. Image spend stays on the existing job ledger.

### Reversal path

Supersede this ADR. Leave the blueprint and track spec as historical. Keep `docs/27`, `docs/09`, and `docs/29` as the law for public pages, section grammar, and media.

