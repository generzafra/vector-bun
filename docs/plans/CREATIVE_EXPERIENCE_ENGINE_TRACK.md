# Creative Experience Engine — CE0–CE7

**Status:** Execution specification — accepted 8 October 2026 (ADR-0014). No CE slice is in code.  
**Track:** Cross-cutting extension of Creative and First Reveal. Not a Vector phase. Not `docs/31`.  
**Design blueprint:** [VECTOR_CREATIVE_EXPERIENCE_ENGINE_CURSOR_IMPLEMENTATION.md](VECTOR_CREATIVE_EXPERIENCE_ENGINE_CURSOR_IMPLEMENTATION.md)  
**Standing law:** [`docs/27`](../27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md) (public quality and the Frontend Release Gate), [`docs/09`](../09_FUNNEL_ENGINE_DESIGN_SYSTEM.md) (section grammar), [`docs/29`](../29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md) (media, rights, composition), [`docs/28`](../28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md) (Control chrome only), [`docs/10`](../10_SEO_AEO_CONTENT_STANDARD.md), [`docs/14`](../14_SECURITY_PRIVACY_COMPLIANCE.md)  
**Sequence:** [SHIP_REMAINING.md](SHIP_REMAINING.md). Next implementation slice is Wave D **CE0**. O15 Ask Vector, V1 lead and goal value join, O4 Overview, O5 Today, O9 offer versions, O10 `CRMProvider`, O11 revenue events, O12 attribution confidence, O13 recommendation evidence, and O14 monthly growth review are in. This track is Wave D. Do not start CE1 ahead of CE0.

Where this file and the blueprint disagree on order or current status, this file wins. Where either disagrees with a charter or an accepted ADR on product law, the charter or ADR wins.

---

## 1. Goal

Turn confirmed client material into a distinctive, mobile-first sales page on the engines Vector already has.

Governing principle, from the blueprint:

> Explore cheaply. Art-direct intentionally. Compose authentic media. Validate the rendered experience. Reveal only when credible. Measure what customers do. Learn without losing the client's identity.

AI proposes validated data for approved components. Trusted code renders it. Models do not emit HTML, CSS, or JavaScript for a client site.

---

## 2. What this track is not

- A new funnel engine, Creative Engine, `ImageProvider`, asset store, approval product, analytics ledger, or `packages/creative-experience-engine`
- A reason to rebuild FR0–FR8 or to put Knowledge / Funnel / Autonomy / Portfolio in the default client nav
- Permission to generate three expensive websites, invent proof, or paint Delivery with `docs/28`
- Permission to add cinematic or interactive section variants before a real client needs them (`docs/09`)
- A claim that pixel screenshots, vision-model review, or Core Web Vitals targets are already measured

`docs/27` remains the publication gate. The First Reveal Gate stays a pre-client gate on the same renderer.

---

## 3. Already satisfied — do not rebuild

| Blueprint need                                                 | Repo status on 8 October 2026                                                                                                           |
| -------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| Cheap direction manifests, one winner draft                    | Thin FR4–FR5                                                                                                                            |
| Winner-only image spend                                        | Thin FR6: one `ImageProvider` job when strategy is hybrid. Typography-led and authentic do not generate                                 |
| Rights, size, alt text, prohibited style, invented-proof check | C7 `creative_qa_reviews`                                                                                                                |
| Pre-client reveal                                              | Thin FR8 on Control `/reveal`: one direction, rationale, desktop or phone frame, approve or request changes. Approving does not publish |
| Deterministic first-screen checks                              | FR7 remainder: contrast when both colors exist, form, section count, headline and action. **Not** pixel screenshots                     |
| Placed share cards on a published page                         | Thin C5                                                                                                                                 |

---

## 4. Still open

| Slice   | Work                                                                                                                 | Maps to            | Gate                                                                        |
| ------- | -------------------------------------------------------------------------------------------------------------------- | ------------------ | --------------------------------------------------------------------------- |
| **CE0** | Fixture audit and baseline notes. Five synthetic industries. No production behavior change                           | —                  | Wave D, before CE1                                                          |
| **CE1** | Versioned creative brief and experience fields on the existing direction manifest. Legacy pages keep rendering       | FR4                | After CE0                                                                   |
| **CE2** | Section width modes and a small grammar: 3 heroes, 3 story sections, 2 conversion treatments, with mobile treatments | FR2, `docs/09`     | After CE1. No cinematic or interactive variant until a real client needs it |
| **CE3** | Winner asset-gap list, focal points, responsive derivatives, typography-led fallback                                 | C4. Thin FR6 stays | With C4                                                                     |
| **CE4** | Allowlisted M0–M2 motion. M3, WebGL, and video wait                                                                  | `docs/27` motion   | After CE2                                                                   |
| **CE5** | Desktop and mobile screenshots, geometry checks, fingerprint v1. A high score cannot override a hard blocker         | FR7 remainder      | After CE2. Current FR7 does not include this                                |
| **CE6** | Plain-language change categories and a revision linked to the prior direction                                        | Thin FR8           | After CE5. Do not publish on approve                                        |
| **CE7** | Learning from Phase 7 outcomes. No invented ROI                                                                      | C8                 | Wave D, after Phase 7 coverage                                              |

Default motion is restrained. M3 is a later opt-in. Design fingerprints are privacy-safe derived features, not another tenant's copy or media. Image-layout embeddings wait for a privacy review.

Performance targets in the blueprint are goals. Do not report them as measured until a real lab run or field sample exists. `docs/27` is the performance law.

---

## 5. Rules

- Extend `VisualDirectionManifest` and `PageDocument`. Do not fork a second renderer or a second persisted page model.
- Media pointers are tenant-scoped asset ids. Raw storage keys are not authorization.
- Confirmed facts beat model inference. Separate fact, approved claim, inferred tone, and suggestion.
- Authentic approved photography outranks generated lookalikes. Generated people are not staff, clients, or testimonials.
- Exact logos and marketing text stay in deterministic composition.
- Hard blockers (cross-tenant access, missing primary action, prohibited claims, unlicensed imagery) override any score. Operators may override aesthetic checks with a written reason. They may not override security, tenancy, or illegal-claim failures.
- Preview hosts stay `noindex`. Unknown hosts fail closed. Approval is not publication.
- Costs stay on the existing image-job ledger: integer micros, idempotency, tenant scope, pause, and budget. A failed image step falls back to an intentional typographic page.
- Fingerprints must not create a cross-tenant pool of customer copy.

---

## 6. Tests when a slice starts

`bun:test`. Cross-tenant isolation on every new tenant-owned row. Explicit `TenantContext`. Legacy page versions still render. Rights and prohibited styles fail closed. No `generateImage` on `AIProvider`. No second object store.

CE5 adds viewport checks at 320, 390, 768, and 1440. CE0 fixtures use synthetic data, never another tenant's records.

---

## 7. Do not start until

Wave C's current slice is done, or the user explicitly asks for a CE slice. CE0 is the first slice of this track, not the next slice of the repository. Do not pull screenshot infrastructure, Playwright, or a new browser platform forward without an ADR if the repo has no suitable runner. Do not start Ask Vector, ads, billing, or video from this track.
