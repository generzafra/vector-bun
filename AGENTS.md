# AGENTS.md — Vector

You are working on **Vector, an Autonomous Growth Operating System**.

## Read first

Before implementation, read:

1. `VECTOR_MASTER_IMPLEMENTATION_PLAN.md`
2. `docs/01_PRODUCT_VISION_AND_POSITIONING.md`
3. `docs/02_SCOPE_AND_MVP.md`
4. `docs/03_TENANCY_AND_DOMAIN_MODEL.md`
5. `docs/04_SYSTEM_ARCHITECTURE.md`
6. `docs/05_DATA_MODEL.md`
7. `docs/07_AI_AGENT_ARCHITECTURE_GOVERNANCE.md`
8. `docs/14_SECURITY_PRIVACY_COMPLIANCE.md`
9. `docs/18_QA_TEST_STRATEGY.md`
10. `docs/21_ROADMAP_ACCEPTANCE_GATES.md`
11. `docs/plans/README.md` and the plan for the current phase. Phase 0–5 exits are met (Phase 5 via ADR-0010). Phase 6 S0–S8 are in. Phase 6 may exit after S1–S4 plus Control backlog. Phase 7 S0–S4 are in and the Phase 7 exit is met (tenant-scoped experiment proposals on published page versions; approve / pause / start on Control `/experiments`; sticky Delivery assignment; predetermined metrics with bot / source-imbalance checks and no early stop; policy-gated decision + learning object). Phase 8 S0 is in (action policy catalog, Level 3 evaluate-only gate, privileged client kill-switch events, Control `/autonomy`). Standing search rules: `docs/10_SEO_AEO_CONTENT_STANDARD.md`. Phase 7 plan: `docs/plans/07_PHASE_7_CRO.md`. Phase 8 plan: `docs/plans/08_PHASE_8_AUTONOMY.md`.
12. `docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md` when the work touches onboarding, domains, hosting, delivery, launch, or scaling. Its decisions are folded into `01`, `03`, `04`, `05`, `16`, `17`, `19`, and `21`; where it is more specific, it governs.
13. `docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md` when the work touches public frontend, marketing sites, funnels, landing pages, conversion, motion, or CRO variants. Its quality bar is folded into `01`, `02`, `04`, `07`, `09`, `10`, `13`, `17`, `18`, `21`, `22`, and `26`; where it is more specific on public experience, it governs.
14. `docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md` when the work touches Control Plane UI, Vector product chrome, or Vector-native intelligence / opportunity / automation visuals. Living paths live in `docs/frontend/`. This is Control / Vector identity, not client Delivery identity.
15. `docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md` when the work touches client images, social or email graphics, funnel or campaign media, Open Graph images, generated imagery, video, resizing, or creative approval. Public art direction stays in `docs/27`. Control identity stays in `docs/28`.
16. `docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md` when the work touches authenticated client UX, goals, lead stages, sales outcomes, revenue, attribution confidence, data health, offers as commercial propositions, notifications, entitlements, or client-success health. Client dashboards use `docs/28` chrome. Delivery visitor UX stays `docs/27`.

## Non negotiable architecture

- TypeScript is the default language.
- Bun is the default runtime.
- Svelte 5 and SvelteKit power control and delivery UIs.
- Hono powers the API.
- PostgreSQL is the durable business source of truth.
- Drizzle owns schema and migrations.
- Redis is transient infrastructure, not the business source of truth.
- Trigger.dev owns durable production workflows.
- External providers sit behind Vector owned adapters.
- Grok is accessed through an `AIProvider` abstraction. Image and video models use separate `ImageProvider` / later `VideoProvider` adapters (`docs/29`).
- AI output is never trusted execution input without schema, policy, and domain validation.
- Every tenant owned query requires explicit tenant context.
- Audit important state changes and automated actions.
- One logical Delivery Plane serves many client custom domains. Do not fork an application per client.
- MGE website and Vector application stay separate products. MGE should become a Vector tenant.
- Vector 24 measures Vector Ready to live, not contract signing to live.
- Design so the platform can leave a single physical server without changing client domains.

## Implementation behavior

Do not implement the entire roadmap in one change.

Prefer small vertical slices with tests and updated documentation.

Do not introduce microservices, Kubernetes, Kafka, Elasticsearch, or a new database without an accepted ADR and demonstrated requirement.

Do not give AI agents unrestricted SQL, shell, filesystem, arbitrary HTTP, or secrets.

Do not bypass consent, suppression, approval, or tenant checks.

## Frontend and funnel governance

For any public-facing frontend, marketing site, sales funnel, landing page, service page, product page, campaign page, conversion flow, public form, interactive selling experience, or CRO variant, read `docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md` before implementation.

Treat it as the standing visual, interaction, responsive, accessibility, performance, funnel, and conversion quality standard.

Do not generate generic AI-style marketing sites.

All public frontend work must:

- define the audience, primary conversion, and page narrative before coding
- use approved client brand inputs
- use Vector design tokens and component capabilities, not cloned templates
- preserve semantic HTML, accessibility, performance, SEO/AEO/GEO, and analytics
- pass the Frontend Release Gate in `docs/27` before publication

Control Plane UI stays authenticated and operational. Do not apply MGE cream/cinema tokens or cinematic marketing art direction to Control. Control identity follows `docs/28`. Delivery client sites keep client brand tokens and `docs/27`; do not paint tenants with Vector Black / Blue.

Security, privacy, legal, tenant isolation, accessibility, and performance override decorative experimentation.

## Definition of done

A feature is done only when applicable tests pass, authorization and tenant scoping are present, errors are handled, observability is included, and relevant docs are updated.
Public marketing pages are also done only when the Frontend Release Gate in `docs/27` is met.

## Creative Asset Governance

For any task involving client images, social graphics, email graphics, funnel visuals, campaign media, Open Graph images, generated imagery, video, image editing, resizing, or creative assets, read `docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md` and `docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md`.

Do not ask an image model to create final exact brand typography or logos when Vector can compose them deterministically. Prefer authentic client media when suitable. All generated client creative must be tenant-scoped, versioned, rights-aware, auditable, and subject to the configured approval policy. Bytes go through `StorageProvider`. Image models stay behind `ImageProvider`, not `AIProvider`.

## Client Experience and Revenue Outcomes

For work involving authenticated client UX, dashboards, goals, KPIs, lead stages, sales outcomes, revenue, attribution confidence, data health, offers, client notifications, entitlements, client health, or business reporting, read `docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md`.

Client-facing interfaces must prioritize business outcomes and decisions. Do not expose technical platform complexity by default. Do not present uncertain attribution or estimates as factual. AI must not invent sales or revenue. Where outcome data exists, optimize beyond lead volume toward qualified leads, sales, and attributable business value. Client and operator stay one Control app.

## SEO, AEO, and GEO Governance

For work involving technical SEO, search visibility, structured data, answer targets, AEO, GEO, generative-engine visibility, AI citations, AI discovery, search content, entity optimization, Search Console, Bing Webmaster, search audits, generative visibility measurement, or search-to-business-outcome reporting, read:

- `docs/plans/06_PHASE_6_SEO_AEO.md`
- `docs/10_SEO_AEO_CONTENT_STANDARD.md`

Also read as applicable: `docs/07`, `docs/13`, `docs/15`, `docs/18`, `docs/20`, `docs/26`, `docs/27`, `docs/29`, `docs/30`.

Rules:

- SEO is foundational. GEO does not replace it.
- AEO focuses on answerability and factual clarity.
- GEO means Generative Engine Optimization. Observations are probabilistic, engine-specific, and time-sensitive.
- Never promise rankings or AI citations. Never treat a single generative response as stable visibility.
- Never fabricate authority, reviews, press, experts, or third-party mentions.
- Keep all client search and GEO data tenant-scoped.
- Use official or approved providers and measurement methods. Do not scrape restricted consumer AI interfaces.
- One `SearchProvider` family. Do not invent extra search adapter families.
- Optimize toward qualified business outcomes where reliable outcome data exists.
- `GEO visibility observed ≠ visit proven ≠ lead proven`.
