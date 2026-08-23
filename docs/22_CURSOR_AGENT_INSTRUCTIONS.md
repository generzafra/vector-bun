# Cursor Agent Instructions

## Read before coding

`AGENTS.md`, all P0 documents, and `docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md` whenever the work touches onboarding, domains, hosting, delivery, launch, or scaling. Read `docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md` before creating or materially editing public frontend, funnels, landing pages, conversion, motion, or CRO variants. Read `docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md` and `docs/frontend/VECTOR_FRONTEND_MAP.md` before Control Plane or Vector-identity UI work. Read `docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md` before client images, generated media, composition, derivatives, creative approval, or social/email/funnel asset work. Read `docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md` before authenticated client UX, goals, sales outcomes, revenue, data health, notifications, or entitlements. Client UI is outcome-first; do not expose platform internals by default. Read `docs/plans/06_PHASE_6_SEO_AEO.md` and `docs/10_SEO_AEO_CONTENT_STANDARD.md` before SEO, AEO, GEO, structured data, search providers, answer targets, generative-visibility measurement, or search-to-outcome reporting. Phase 6 S0–S2 are in; the next slice is S3.

## Work method

Implement one bounded vertical slice at a time.

Before changes:

1. State goal and affected modules.
2. Identify architecture or security implications.
3. State tests to add.
4. If the work is onboarding, deployment, domain management, analytics, or automation, answer: does this architecture support repeatable client launch without custom engineering?
5. If the work is public frontend, state audience, primary conversion, page narrative, brand direction, proof, selected `docs/27` references, components to reuse, mobile behavior, and analytics events before coding.

After changes:

1. Run relevant tests.
2. Update docs.
3. Record material architectural decisions.
4. Do not claim completion if tests are skipped.
5. If a repeated manual launch step was discovered, record it, classify it, automate it if safe, add a test, add it to the launch checklist, and update Vector 24 metrics.

## Constraints

Bun, TypeScript, Svelte 5, SvelteKit, Hono, PostgreSQL, Drizzle.
No premature microservices.
No unrestricted AI tools.
No tenant unscoped repositories.
No client secrets in code or frontend.
No provider specific concepts leaking into core domain without an adapter.
No per-client application fork or deployment for a normal client.
No 24-hour launch promise from contract signing.
No architecture that cannot leave a single physical server later.
No generic AI-style public marketing page.
No production publication of a public page that fails the Frontend Release Gate in `docs/27`.

## Public frontend work item

For substantial public UI, fill the Frontend Work Item in `docs/27` §85: business objective, audience, primary and secondary conversion, narrative, brand, reference principles, proof, existing components, new reusable capability, motion, mobile, analytics, SEO/AEO/GEO, accessibility, performance, acceptance criteria.

Workflow: business context → conversion strategy → visual direction → component selection → implementation → QA → measurement. Not: prompt → generic template → launch.
