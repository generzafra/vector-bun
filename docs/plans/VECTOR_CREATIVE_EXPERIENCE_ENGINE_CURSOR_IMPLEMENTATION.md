# VECTOR CREATIVE EXPERIENCE ENGINE

## Cursor Implementation Blueprint, Architecture, Delivery Plan and Acceptance Standard

**Project:** Vector Autonomous Growth OS  
**Purpose:** Turn client-submitted materials into distinctive, immersive, commercially persuasive, mobile-first landing pages that feel individually art directed.  
**Document type:** Design blueprint for a cross-cutting execution track, NOT a new numbered charter or project phase.  
**Status:** Reconciled 8 October 2026 into `docs/plans/CREATIVE_EXPERIENCE_ENGINE_TRACK.md` (ADR-0014). This file is the design blueprint. The track file wins on sequence and on what is already built. Standing charters and accepted ADRs override both.  
**Prepared:** 8 October 2026  
**Execution spec:** `docs/plans/CREATIVE_EXPERIENCE_ENGINE_TRACK.md`  
**Scope:** AI-assisted creative interpretation, experience manifests, premium component grammar, media-aware composition, restrained motion, screenshot QA, First Reveal integration, and post-publication conversion learning.  
**Default mandate:** Extend existing Vector systems. Do not start a replacement funnel engine, creative engine, AI abstraction, workflow runtime, asset store, analytics layer, approval center or rendering application.

---

# 1. Executive Directive

Vector's public client landing pages must progress from **functional, section-based generation** to **intentionally art-directed sales experiences**.

The target is not maximum novelty, animation, or image-generation volume. The target is a consistently polished experience that makes a visitor immediately understand the offer, trust the company, emotionally connect with the product or service, and take the intended action.

**Product promise:**

> Vector interprets a client's real brand, products, imagery, audience and commercial offer; develops multiple inexpensive creative approaches; composes the strongest approach into a distinctive page; checks the actual rendered desktop/mobile experience; reveals only a credible, conversion-ready result; and measures business outcomes after publication.

Success is **not** “the generated page passed schema validation.” Success is an original-feeling, authentic, fast, accessible and persuasive page worthy of a paying client.

The Creative Experience Engine is an **extension** of:

- `packages/funnel-engine` for schemas, compositions, candidates and reveal gates.
- `apps/delivery` for Svelte-rendered, tenant-specific public experiences.
- `packages/contracts` for shared typed contracts.
- `packages/images` and `packages/compose` for image generation and deterministic art composition.
- Existing brand profiles, creative assets, funnel manifests, approvals, storage, workflows, tests, analytics and experiments.

It must never permit models to execute arbitrary JS/CSS/HTML on client-facing sites. AI proposes _data describing approved design capabilities_; trusted code validates and renders that data.

---

# 2. Read First: Repository Governance

Cursor must inspect current files, not rely solely on this snapshot. Read:

1. `AGENTS.md`
2. `VECTOR_MASTER_IMPLEMENTATION_PLAN.md`
3. `docs/plans/SHIP_REMAINING.md`
4. `docs/plans/CROSS_CUTTING_TRACKS.md`
5. `docs/plans/CREATIVE_TRACK.md`
6. `docs/plans/FIRST_REVEAL_TRACK.md`
7. `docs/09_FUNNEL_ENGINE_DESIGN_SYSTEM.md`
8. `docs/17_CLIENT_ONBOARDING_OPERATIONS.md`
9. `docs/18_QA_TEST_STRATEGY.md`
10. `docs/20_COSTS_USAGE_LIMITS.md`
11. `docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md`
12. `docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md`
13. `docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md`
14. `docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md`
15. `docs/14_SECURITY_PRIVACY_COMPLIANCE.md`
16. `docs/10_SEO_AEO_CONTENT_STANDARD.md`
17. `packages/funnel-engine/src/{schema,compose,candidate-score,first-reveal}.ts`
18. `apps/delivery/src/lib/sections/*`, `apps/delivery/src/routes/+page.svelte`, `apps/delivery/src/app.css`
19. Current `packages/contracts` manifest types, `packages/images`, `packages/compose`, asset and brand database tables, Control `/brand` and `/funnel` routes, existing tests, workflow adapters and CI.

**Precedence:** Standing charters and accepted ADRs override this blueprint. Changes to governed behavior require a documented ADR. Numbered charters stop at `docs/30`; **do not create `docs/31` or a new phase**. This track is adopted as `docs/plans/CREATIVE_EXPERIENCE_ENGINE_TRACK.md` (ADR-0014) and attached to Wave D. Do not silently resequence outstanding roadmap work. The next slice remains Wave D CE0.

## 2.1 Verified baseline at document creation

A repository inspection on 8 October 2026 showed:

- Delivery uses a single SvelteKit page renderer with hostname-based tenant delivery.
- Approved page schema currently has 12 section types: `hero-minimal`, `hero-split`, `hero-editorial`, `proof`, `proof-featured`, `services`, `services-editorial`, `offer`, `cta`, `cta-minimal`, `faq`, `lead-form`.
- Current `HeroEditorial.svelte` is text + CTA, and `HeroSplit.svelte` is text + informational aside; they are not yet immersive media compositions.
- `composeLeadPage` primarily assembles hero, service, offer, proof, FAQ, CTA and lead-form content based on a limited visual selection.
- `candidate-score.ts` scores mostly structural heuristics, not screenshots of the actual rendered result.
- `first-reveal.ts` checks the original thin gate plus contrast, form, section weight, and a first-screen description. That is still not screenshot, pixel, or AI visual review.
- `app.css` establishes responsive basic typography, spacing and reduced-motion rules, with a constrained central `main` column suitable for early MVP but not all cinematic compositions.
- Reconciled status on 8 October 2026: Wave B is in, including thin FR3, thin FR4–FR5, C1, C2, C3, thin C5, thin FR6 (one hybrid winner photo), C7, deterministic FR7 remainder, and thin FR8 on Control `/reveal`. C4, C6, C8, FR9, pixel screenshots, motion presets, and the CE grammar are open. The next repository slice is Wave D CE0. Do not restart FR6.

**Preserve** all implemented functionality, previous exit gates, tenant security and integration contracts. Do not regenerate completed milestones just to rename them.

---

# 3. Outcomes and Non-Goals

## 3.1 Required user outcomes

For the buyer visiting a client's page:

1. Understand what is offered, for whom, why it matters and what action to take within the first viewport.
2. Feel an appropriate brand-specific atmosphere, not a generic AI-SaaS template.
3. See authentic products, services, people or premises when provided and approved.
4. Access information and act quickly on mobile, keyboard or assistive technology.
5. Encounter genuine proof only; never synthetic reviews, false statistics or invented facilities.

For the Vector client:

1. Receive a credible first preview grounded in supplied material.
2. See their correct logo, products, brand visual cues and commercial offer.
3. Review a polished mobile and desktop experience rather than raw skeletons.
4. Approve or request precise changes in ordinary business language.
5. Obtain conversion measurements, not only an attractive static page.

For Vector operations:

1. Reuse proven capabilities across tenants while avoiding visually repetitive output.
2. Keep variable media and AI costs attributable, capped and predictable.
3. Use reliable preview, rollback, immutable publication and documented overrides.
4. Ship bounded vertical slices with tests.

## 3.2 Non-goals

- A free-form drag-and-drop site builder in this track.
- Generation or execution of arbitrary tenant code.
- Automatically generating three complete high-cost websites for every client.
- Mandatory cinematic video, WebGL or 3D for every tenant.
- Replacing client photos with invented depictions of actual business facilities.
- Rebranding client pages with Vector's own Control Plane palette.
- Building a new asset store, job system, CRM, approvals product, AI provider family or analytics ledger.
- Treating engagement, scroll depth or aesthetic scores as proof of incremental revenue.
- Requiring large design questionnaires during onboarding.

---

# 4. Core Experience Principles

1. **Business truth first:** The page may reinterpret presentation, never invent business facts.
2. **Brand specificity:** Real client material is a strong input, not an optional decorative garnish.
3. **Art direction before rendering:** Decide narrative, emotional intent, rhythm, imagery, composition and CTA before selecting component props.
4. **Structure with expressive freedom:** A broad but governed component grammar yields different page experiences without executing uncontrolled code.
5. **One coherent direction:** Avoid mixing random premium effects that do not tell the same story.
6. **Authentic-first media:** Client-owned photography and product images generally outrank synthetic lookalikes.
7. **Movement earns its place:** Motion explains, guides or enhances; it is not added because it is fashionable.
8. **Mobile is a separate composition:** Do not merely shrink a desktop experience.
9. **Performance is a creative constraint:** A light, confident page is more premium than a janky heavy page.
10. **Quality is visual and functional:** Scoring a manifest without inspecting rendered output is insufficient.
11. **Explore cheaply, polish selectively:** Multiple low-cost candidates; premium asset work concentrated on a winner.
12. **Learning is measurable:** Use consent-respecting, trustworthy conversion and business outcome data, not aesthetic intuition alone.

---

# 5. Proposed Operating Model

```text
Existing knowledge + client uploads + verified business information
                           |
                           v
          Brand / Asset / Offer Interpretation
                           |
                           v
          Structured Creative Experience Brief
                           |
                           v
      2-3 Lightweight Creative Experience Manifests
                           |
                           v
       Deterministic Component Compatibility + Validation
                           |
                           v
             Cheap Candidate Composition
                           |
                           v
       Objective Scoring + Diversity / Confidence Checks
                           |
                           v
                 Winner Selection
                           |
                           v
       Winner-Only Media Completion (FR6 / C2-C5)
                           |
                           v
       Final Brand-Safe Renderer + Motion Treatment
                           |
                           v
   Screenshot / A11y / Perf / Rights / Claims / Conversion QA
                           |
               pass? ------+------ no -> bounded repair / operator
                           |
                          yes
                           v
              Approval-Ready First Reveal (FR8)
                           |
                           v
        Existing Approval and Publication Policies
                           |
                           v
        Experiment / Measurement / Learning (Phase 7, C8)
```

Treat the Creative Experience Manifest as **an additive evolution of the existing visual-direction manifest**. Evaluate whether expanding existing contract types is cleaner than adding new entities. Avoid bifurcated “old” and “new” render pipelines.

---

# 6. Ingestion and Creative Interpretation

## 6.1 Accepted inputs

Use existing authorized knowledge and asset objects for:

- Brand name, official logos, colors, typography where permitted, brand guidelines.
- Product images, photography, artwork, videos, service brochures, portfolios, customer-approved examples.
- Primary product or service, price where confirmed, differentiation, geography, target audience, buyer stage, primary conversion.
- Brand adjectives and prohibited aesthetics, accessibility constraints, preferred visual references.
- Approved claims with evidence, reviews with provenance and usage authorization.
- Practical assets: image dimensions, orientation, crop tolerance, logos with transparency, source quality.

Do not assume uploaded documents, URLs or prompts confer image rights or authorize representation of actual employees, facilities or results. Keep rights and approval checks.

## 6.2 Creative Brief as an intermediate artifact

Each candidate generation starts from a typed, versioned **Creative Experience Brief** including:

- `clientId`, campaign/page intent, provenance and input versions.
- Audience, intent stage, primary conversion and offer hierarchy.
- Brand personality and allowed/prohibited visual treatments.
- Emotional promise (e.g. reassurance, exhilaration, prestige, discovery).
- Visual motifs supported by source materials.
- Priority authentic assets and focal points.
- Missing asset list and safe fallback options.
- Narrative plan: promise -> mechanism -> proof -> offer -> action.
- Required facts, claims and legal disclaimers.
- Mobile-specific hero recommendation.
- Allowed motion intensity and interaction purpose.
- Why this creative approach is appropriate, expressed in client-friendly language.
- Confidence and unknowns (never silently convert guesses into client facts).

Use existing brand profile and asset sufficiency snapshot if possible. The brief is not a separate tenant-independent “knowledge base”.

## 6.3 Extraction rules

- Confirmed client-supplied facts trump model inference.
- Separate extracted facts, approved facts, inferred tone and creative suggestions in typed fields.
- Prohibited styles and restricted claims fail closed.
- If media is insufficient, choose an elegant typography-led or abstract direction rather than fabrication.
- Preserve exact client logos, packaging, book covers and other assets designated as immutable.
- AI may derive palette suggestions but must not overwrite confirmed brand tokens without approval.
- High-stakes or regulated industries need stricter claim and imagery review.

## 6.4 Source to design mapping

Examples:

| Supplied evidence               | Potential treatment                                       | Prohibited shortcut                      |
| ------------------------------- | --------------------------------------------------------- | ---------------------------------------- |
| Strong authentic hotel photos   | Full-bleed editorial hero, restrained transitions         | Generate fake hotel interiors            |
| Pack-shot of a consumer product | Authentic product cutout with governed atmosphere         | Change label wording or product geometry |
| Technical SaaS screenshots      | Product-led showcase, progressive demo                    | Invent UI functions or metrics           |
| Sparse service-business assets  | Typography-led narrative, diagrams, evidence-backed proof | Fake employees or office photos          |
| Illustrated children's products | Playful color, soft motion, illustration-led sections     | Random generic cartoon template          |
| Boutique property photography   | Architectural editorial rhythm                            | Fabricate amenities or nearby landmarks  |

---

# 7. Creative Experience Manifest

## 7.1 Contract strategy

Prefer a **versioned extension** of the existing `VisualDirectionManifest` and compatible `PageDocument`. First inspect actual types in `packages/contracts`. The examples below are conceptual schemas, **not copy-paste migrations** and not authority to fork persisted state.

```ts
// Proposed fields: merge carefully with existing manifest contract.
type CreativeExperienceManifestV2 = {
	schemaVersion: 2;
	directionId: string;
	briefId: string;
	concept: {
		name: string;
		rationale: string;
		emotionalIntent: 'trust' | 'desire' | 'clarity' | 'excitement' | 'prestige' | 'warmth';
		visualMotifs: string[];
	};
	artDirection: {
		layoutLanguage: 'editorial' | 'cinematic' | 'modular' | 'expressive' | 'product_led';
		typographyCharacter: 'refined' | 'bold' | 'playful' | 'technical' | 'classic';
		density: 'sparse' | 'balanced' | 'dense';
		rhythm: Array<'dramatic' | 'intimate' | 'informative' | 'immersive' | 'conversion'>;
		motionLevel: 'none' | 'restrained' | 'expressive';
	};
	hero: {
		variant: string; // strict allowlist, never arbitrary component path
		mediaAssetId?: string;
		mediaRole: 'authentic' | 'generated_support' | 'typography_only';
		focalPoint?: { x: number; y: number };
		mobileTreatment: 'crop' | 'alternate_asset' | 'stack' | 'typography_first';
	};
	sections: Array<{
		id: string;
		role: 'mechanism' | 'benefits' | 'proof' | 'offer' | 'faq' | 'conversion' | 'story';
		variant: string; // registered section grammar only
		mediaAssetIds?: string[];
		motionPreset?: string; // registered preset only
	}>;
	conversion: { primaryAction: string; intentStage: string };
	costClass: 'R0' | 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
};
```

**Implementation rules:**

- Validate every field with Zod; use strict object contracts and bounded strings, arrays and numeric ranges.
- Do not accept arbitrary CSS, dynamic imports, external script links, arbitrary iframe HTML or user-authored Svelte templates.
- Persist immutable versions tied to the same tenant, page and existing page-version lifecycle.
- Existing v1 pages must remain renderable. Add an explicit compatibility adapter or discriminated schema union; do not silently reinterpret old data.
- Theme values must use validated tokens, allowlisted fonts and contrast requirements.
- Media pointers are IDs resolved through tenant-aware approved asset services, never raw storage paths.
- The manifest must not duplicate the authoritative copy, offer price, compliance or source-of-truth objects.

## 7.2 Narrative before layout

Before choosing component types, compute:

1. Visitor intent and anxiety.
2. Primary promise and credible differentiation.
3. A clear first-screen message and action.
4. Explanation or demonstration appropriate to product complexity.
5. Evidence-backed trust.
6. Offer and objections.
7. Final conversion action.

Not every page needs the same number or ordering of blocks, but all pages need a coherent conversion journey.

## 7.3 Candidate strategy

- Default: **three lightweight manifests**, compatible with the current adaptive-candidate plan.
- Force meaningful distinction across layout, hero, image framing, typography, rhythm and storytelling; swapping just colors is insufficient.
- Generate candidates in one bounded structured AI call where feasible.
- Reuse real assets across candidates; do not trigger three expensive media pipelines.
- Reject policy violations before candidate scoring.
- Render inexpensive previews when useful; avoid paying for production-grade artwork before selection.
- Score objective constraints first. Use screenshot review only for ambiguous/important cases, with strict budgets.
- Generate expensive creative material only for the strongest direction unless bounded fallback is justified.

---

# 8. Premium Design Grammar

## 8.1 A grammar, not an inventory of full-site templates

Extend `apps/delivery/src/lib/sections/` with a registry of approved section variants. Keep stable props, predictable content semantics, responsive contracts, QA fixtures and composable visual layers.

### Recommended section capability catalog

**Hero**

- Editorial photograph, edge-to-edge within full-bleed container.
- Cinematic product cutout with layered atmosphere.
- Architectural whitespace and oversized display type.
- Art-directed asymmetric collage using authentic assets.
- Interactive product/UI demonstration (only when genuine product material exists).
- Typography-only prestige mode for low-asset clients.

**Story / product**

- Scroll-led “one idea per viewport” product reveal.
- Sticky visual plus progressive explanatory copy.
- Editorial gallery with mixed media sizes and purposeful captions.
- Product benefit zoom or feature spotlight.
- Verified before/after comparison (evidence and consent required).
- Timeline or process visualization.

**Commercial trust and offer**

- Featured evidence-backed case study.
- Credible proof rail or press/reference grid with rights.
- Service portfolio and outcome cards, not repetitive icon grids.
- Interactive estimator with verified formulas or clearly labeled estimates.
- Plan/offer comparison when real package information exists.
- Elegant multi-step or short lead qualification where warranted.

**Conversion**

- Contextual sticky CTA (device-appropriate, never obstructive).
- High-impact final CTA with genuine relevant media.
- Click-to-book/request demo/contact with transparent next-step expectations.
- Friction-minimized lead forms with accessible validation.

Start with **3 genuinely excellent hero variants + 3 storytelling variants + 2 conversion variants**, not dozens of superficial variants. Additional types should prove real visual and narrative differentiation.

## 8.2 Component contract checklist

Every new component must declare:

- Intended industries/offer types and contraindications.
- Required and optional content/data.
- Minimum suitable media resolution, source aspect ratio and allowed crop.
- Desktop and mobile composition modes.
- Typography limits, overflow handling, min/max character bounds.
- Motion preset compatibility.
- SEO/crawlability/alt text requirements.
- Accessibility and reduced-motion behavior.
- Rendering/performance cost class.
- Testing fixtures with long copy, absent media and poor crop.

## 8.3 Full-bleed architecture

Current `app.css` constrains `main` to a central width. Evolve the renderer to support **section-level width modes** rather than removing all sensible layout constraints:

- `contained`: readable sections, forms, FAQs.
- `wide`: galleries or diagrams.
- `full_bleed`: cinematic media, hero visuals.
- `split_bleed`: mixed constrained text and edge-to-edge image.

Keep a safe readable text region even when the media is full width. Do not place every section in a global max-width wrapper and then attempt to simulate immersion with larger margins alone.

## 8.4 Typography as art direction

- Introduce validated typographic presets and responsive scales.
- Set display/body pairing intentionally; do not default every tenant to one serif or sans font.
- Support leading, optical length, paragraph width, letter spacing and meaningful section hierarchy.
- Use authentic brand fonts where licensed; include safe fallback and performance budgets.
- Protect line breaks on narrow widths, very long names, translations and dynamic prices.

## 8.5 Visual rhythm

A successful experience varies density intentionally: bold opening -> focused explanation -> immersive supporting visual -> compact evidence -> decisive conversion. Prevent endless identical cards or repeated dark gradient bands.

---

# 9. Media-Aware Composition

## 9.1 Media roles

Classify every asset: brand identity, product truth, people/facility truth, proof, editorial atmosphere, abstract/illustration, supporting decoration or video. The system must not mistake decorative AI output for documentary evidence.

## 9.2 Asset placement

- Determine hero eligibility via sharpness, size, rights, subject salience and crop feasibility.
- Store normalized focal point and crop intent as metadata; do not overwrite master files.
- Generate responsive immutable derivatives in C4, with appropriate format, dimensions, quality and fetch priority.
- Render above-the-fold authentic hero assets eagerly/with suitable preload only when warranted; lazy-load later media.
- Use real logo files and real text through deterministic layout, never bake exact client claims into generated pixels.
- Ensure mobile crops preserve the key subject or choose alternate assets.
- Make fallback typography intentional rather than broken-image-looking.

## 9.3 Winner-only premium media (FR6)

After selecting a candidate:

1. Compute an asset-gap manifest by section.
2. Prioritize supplied approved images.
3. Generate only non-deceptive support imagery required for the chosen concept.
4. Route through existing `ImageProvider`/job budgets, audit and tenant scoping.
5. Compose typography and logos via trusted Vector code.
6. Perform rights, claims, safety, focal-point and visual review.
7. Keep drafts unpublished until C7 approval policy and publication requirements pass.
8. Use typography-led fallback when generation fails or budget disallows an image.

Do not bring video generation forward merely to make the first hero look impressive. Static high-quality art direction often wins on speed, consistency and cost.

---

# 10. Immersive Motion and Interaction

## 10.1 Motion classes

- **M0 Static:** no motion.
- **M1 Restrained:** fade/translate, small hover refinements, simple media transitions.
- **M2 Expressive:** short choreographed image/typography transitions and deliberate progressive reveals.
- **M3 Cinematic:** conditional advanced scrolling or hero sequences for suitable clients only; requires extra performance and accessibility scrutiny.

Default to M1, allow M0 or M2 by manifest. M3 should be opt-in under separate feature flag and strict device/quality conditions.

## 10.2 Technical rules

- Prefer CSS transforms/opacity and native interaction over expensive continuous JavaScript.
- Avoid blocking render on animation libraries.
- Use `IntersectionObserver` only when necessary, clean up observers, and never compromise SSR output.
- Use accessible HTML text for essential claims even if animations wrap it.
- Honor `prefers-reduced-motion`; avoid forced smooth-scrolling and scroll hijacking.
- Maintain usable controls when animations fail or JS is disabled where feasible.
- Respect battery/device constraints and avoid pointless WebGL on low-end devices.
- Do not rely on auto-playing audio; video must have appropriate captions/transcripts, consent and fallbacks.

## 10.3 “Motion must earn its place” evaluation

For each animated element, answer:

1. What does the movement communicate or guide?
2. Would the page remain fully usable without it?
3. Can it be removed without damaging comprehension?
4. Does it degrade Core Web Vitals or low-end mobile behavior?

If the only explanation is “it looks cool,” remove or simplify it.

---

# 11. Creative Fingerprint and Anti-Sameness

Create a compact **design fingerprint** that summarizes the rendered experience without storing private customer copy in a cross-tenant retrieval pool.

Suggested fingerprint dimensions:

- Hero composition and silhouette.
- Section family sequence and width modes.
- Text-vs-image rhythm.
- Relative spacing and density.
- Typographic character and hierarchy.
- Media role distribution.
- Motion intensity and interaction type.
- Generic visual pattern indicators (not proprietary customer assets).

## 11.1 Similarity policy

- Compare candidates to recent generated designs using privacy-safe fingerprints, not images or tenant content exposed to other tenants.
- Use a configurable weighted similarity metric with test fixtures.
- High similarity should trigger _candidate revision_, not automatic aesthetic randomness.
- Similarity is secondary to brand fit, accessibility, conversion and industry appropriateness.
- Avoid rejecting inherently similar business designs, such as minimal legal-service pages, simply to force novelty.
- Do not expose one client's brand or protected media to another client.

## 11.2 Start simple

Version 1 should store a deterministic fingerprint of section sequence + hero variant + width rhythm + density + typography character + media roles. Add image-layout embeddings only after validated necessity, privacy review and measurement.

---

# 12. Visual Candidate and Quality Scoring

## 12.1 Fix the current scoring limitation

`candidate-score.ts` currently measures structural proxies. A candidate should not receive a very high **visual** score because it uses an editorial hero or a preferred density while the rendered result could still be visually weak.

Split scoring into **three distinct layers**:

1. **Manifest validity and policy:** schema, permissions, prohibited styling, rights, approved facts, component compatibility.
2. **Pre-render heuristic:** likely brand fit, CTA clarity, media sufficiency, responsive risk, computational cost, diversity.
3. **Rendered evidence:** actual screenshots, alignment, crop, visual hierarchy, contrast, overflow, and optional qualified model review.

Do not present heuristics as equivalent to visual inspection.

## 12.2 Suggested scoring dimensions

- Brand fit and correctness.
- Clarity of value proposition.
- Conversion-path completeness.
- Creative concept coherence.
- Visual composition quality, **only if rendered evidence exists**.
- Media quality and authenticity.
- Originality / similarity.
- Mobile usability.
- Accessibility.
- Performance.
- Claims, trust and approvals compliance.

**Hard blockers** such as cross-tenant leakage, inaccessible CTA, missing price accuracy, prohibited claims or unlicensed imagery override weighted averages. A 95/100 cannot bypass a hard blocker.

## 12.3 Screenshots and browser QA

Use existing CI/browser tooling if present; do not add a redundant testing platform. Suggested default viewport fixtures:

- 390 x 844 mobile.
- 768 x 1024 tablet.
- 1440 x 900 desktop.
- Additional 320px or 360px mobile stress case for overflow.

For every preview, validate:

- First viewport communicates company, offer and action.
- Correct logo and brand color identity.
- No clipped text, overlaps, phantom scrollbars, broken asset, empty huge blocks or awkward crop.
- Image focal points preserved at phone sizes.
- CTAs are accessible and work; form focus/errors/submit semantics are correct.
- No layout shift from unloaded media or web fonts beyond defined budgets.
- No accidental screenshot-only textual information.
- No false proof, placeholder content or invented social logos.

Use machine-checkable assertions for objective defects. For visually ambiguous cases, apply human/operator review or a budgeted vision-model reviewer to screenshots. Store reviewer evidence and uncertainty. Model approval never overrides deterministic safety/trust gates.

## 12.4 Performance targets

Use the standing `docs/27` performance gate as law. Provisional goals for quality tests (must validate under realistic mobile throttling):

- LCP <= 2.5 seconds at the 75th percentile for real-user production telemetry where sufficient data exists.
- CLS <= 0.1 at p75.
- INP <= 200ms at p75.
- Essential content server-rendered and indexable.
- No mandatory full-hero video download on mobile.

Treat these as targets, not fabricated measured outcomes; do not report target compliance until actual data or valid lab runs exist.

---

# 13. Conversion Architecture and Experimentation

Visual excellence cannot come at the cost of commercial usefulness.

- Maintain a single primary conversion action, with optional secondary action when justified.
- Above-the-fold copy must state who benefits and why, not poetic ambiguity alone.
- Position evidence where buyer objections arise.
- Clarify what happens after submitting a form, booking or purchase.
- Use concise forms by default; ask only essential fields.
- Never hide or distort real prices, eligibility or limitations for aesthetic reasons.
- Avoid manipulative countdowns, fake scarcity, invented results or dark-pattern CTAs.
- Preserve consent, suppression, accessibility, analytics and privacy behavior.
- Track versioned creative exposure and actual conversion events in the existing taxonomy.
- Connect experiment outcomes to qualified leads/sales when reliable data exists; preserve attribution uncertainty.
- Do not optimize toward scroll duration alone or prematurely auto-promote visually aggressive variants.

**Experiment hypotheses must be concrete:** “Authentic product photography with a product-focused hero increases qualified consultation submissions relative to abstract illustration,” not “cinematic pages perform better.” Use existing Phase 7 assignment, statistics, policy and learning objects.

---

# 14. First Reveal UX and Client Feedback

FR8 must show a **single polished winner** by default, not a wall of technical manifests or three low-quality concepts.

Recommended client experience:

1. A concise preview introduction: “Designed around your brand and offer.”
2. Desktop/mobile switch or equivalent responsive preview.
3. Optional two-sentence rationale: why imagery, mood and structure were selected.
4. Straightforward **Approve** and **Request changes** actions.
5. Feedback categories in ordinary language: “Too corporate,” “More premium,” “Use our photography,” “Lighter/darker,” “Not our brand,” “Change the messaging,” “Other.”
6. Preserve free-form feedback and explicitly recorded approvals.
7. Feedback creates a tenant-scoped revision proposal linked to the prior manifest, not silent overwrites.
8. Operator can inspect confidence, asset rights, QA failures, budget, model calls and previous revisions in Control-only views.

Use the existing approval requests, tenant permissions and publication flow. Approval of a design is not automatic publication unless existing policy explicitly permits it.

---

# 15. Architecture, Persistence and Versioning

## 15.1 Reuse first

Before introducing a table, ask whether the information belongs in existing:

- brand visual profiles and versions;
- creative assets and rights;
- creative compositions;
- image generation jobs and budgets;
- funnel asset manifests and page versions;
- visual direction candidates;
- approval requests;
- creative learning/experiment entities.

Add narrowly scoped persisted types only where a concrete lifecycle cannot be represented cleanly. Prefer append-only/versioned records and immutable publication references.

## 15.2 Proposed conceptual objects

- **Creative brief:** linked to existing brand/knowledge/asset versions and campaign/page.
- **Experience manifest:** versioned candidate and winner metadata, associated with existing direction object wherever possible.
- **Design fingerprint:** privacy-safe derived features and algorithm version.
- **Visual QA report:** screenshot references, measured diagnostics, reviewer metadata, gate version, decisions and override reason.
- **Creative feedback:** structured user preferences, request text, linked revision IDs.

Persist all tenant-owned records under explicit `TenantContext`. Treat the list as a modeling checklist, not a mandate to add five new tables.

## 15.3 Publication guarantees

- Preview/private hosts remain `noindex` and separated from production.
- Unknown hostnames fail closed.
- Only approved, correctly tenant-scoped media is served.
- Published page versions and media references are immutable.
- Rollbacks restore exact approved versions where possible.
- Caches and CDNs must not leak previous client content through shared keys.
- Public renderer consumes sanitized, validated data; client metadata never becomes executable code.

---

# 16. Security, Rights, Privacy and Budget

## 16.1 Security and tenant boundaries

- No cross-tenant asset fetching, design review, analytics or feedback access.
- Capability-based access; do not authorize based only on UI visibility or role display names.
- Signed/authorized previews, rate limits and secure asset URLs as appropriate.
- Sanitize untrusted text and reject arbitrary markup/render instructions.
- Do not send private client materials to unapproved generation providers.
- Record audit trails for generation, edits, approval, publication, override and rollback.
- Respect legal/compliance requirements in existing charters.

## 16.2 Asset governance

- Record provenance, license/usage scope, upload source, approval and derivative lineage.
- Do not alter official logos, packaging, book covers, identifiable faces or product claims without authorization.
- Generated imagery may establish mood or depict clearly fictional/abstract scenes, not impersonate actual proof.
- Generated people must not be presented as actual clients, employees or testimonials.
- Sensitive or regulated claims require approved source evidence and appropriate review.

## 16.3 Generation cost controls

Retain First Reveal cost classes:

- R0: validation and deterministic heuristics.
- R1: lightweight structured creative intelligence.
- R2: cheap composition and preview.
- R3: conditional assisted screenshot analysis.
- R4: winner-only premium asset generation.
- R5: bounded exceptional alternate direction.

Implement per-client/campaign budgets, idempotency, cost ledgers, provider failure recovery, retries and kill switches through existing services. A failed expensive-media step must degrade to an intentional static/typographic design without publishing unapproved partial assets.

---

# 17. Rollout Plan: Small, Testable Vertical Slices

**Important:** These are **CE** enhancement slices. They extend current Creative C and First Reveal FR work. Wave B is complete, including thin FR6, C7, deterministic FR7, and thin FR8. Do not restart FR0–FR8. The next repository slice is Wave D CE0. CE work is Wave D in `docs/plans/CREATIVE_EXPERIENCE_ENGINE_TRACK.md` and must not jump that queue.

## CE0 — Implementation Audit and Baseline Fixtures

**Goal:** Measure what exists before expanding it.

Tasks:

1. Inspect current schemas, manifest contracts, renderer, brand profiles, asset manifests, scoring and approval flow.
2. Build five fixture client profiles (luxury hospitality, packaged food, enterprise SaaS, local professional service, creative/children's publishing) using synthetic test information, not other tenants' actual data.
3. Capture screenshots at multiple viewport sizes.
4. Record current component coverage, repeated patterns, baseline quality and rendering defects.
5. Produce a path-specific implementation diff plan identifying existing migrations and reusable assets.

**Acceptance:** Baseline screenshots, inventory and failing gap examples exist; no production behavior changed; no speculative migration made.

## CE1 — Creative Brief and Manifest Evolution

**Goal:** Enable context-aware art direction.

Tasks:

1. Extend existing direction contract with required creative dimensions only.
2. Add schema versioning, migration/compatibility support, input provenance and confidence fields.
3. Derive structured brief from confirmed brand, assets, offer and audience.
4. Generate three meaningfully different low-cost candidates.
5. Validate prohibited styles, claims and component compatibility before composition.
6. Keep page-copy facts sourced from existing knowledge.

**Acceptance:** Two brands in same industry can generate intentionally different but brand-suitable manifests; legacy v1 pages render unchanged; wrong-tenant data cannot enter generation.

## CE2 — Premium Visual Grammar v1

**Goal:** Visible step change in presentation with bounded component count.

Tasks:

1. Refactor section layout container to support contained/wide/full-bleed/split-bleed.
2. Implement three premium hero variants with media-aware mobile treatment.
3. Implement three storytelling/product sections and two conversion treatments.
4. Create typed components, fixtures, accessibility tests and responsive visual baselines.
5. Maintain stable existing public pages and form semantics.

**Acceptance:** Five fixture industries have coherent and materially different results; pages work at 320/390/768/1440 widths; no clipped text, broken forms, invalid markup or cross-tenant assets.

## CE3 — FR6 Winner Media Completion / C4 Derivatives

**Goal:** Supply the best authentic or permitted generated visuals to the winning experience. Thin FR6 is already in: one supporting photo for a hybrid winner, and no photo for typography-led or authentic strategies. This slice is the remainder: an asset-gap list, C4 derivatives, focal points, and a typography-led fallback when generation is blocked.

Tasks:

1. Complete missing media requirements for winner only.
2. Integrate C4 derivatives with existing C0 assets and C5 manifests under actual roadmap rules.
3. Attach approved image versions, focal points, alt text and responsive sources.
4. Implement safe fallback when budget/provider/rights block generation.
5. Record costs and lineage.

**Acceptance:** Strong client uploads affect actual layout and imagery; weak-media clients receive a deliberately attractive typography-led page; no fabricated proof; no raw cross-tenant media URLs.

## CE4 — Motion Presets and Interaction

**Goal:** Premium but restrained immersion.

Tasks:

1. Implement M0-M2 motion presets as allowlisted component capabilities.
2. Preserve SSR readability and reduced-motion behavior.
3. Add only purposeful interactive sections with explicit accessibility specifications.
4. Defer M3/WebGL/video unless justified by an approved future slice.

**Acceptance:** No content is inaccessible when animations are off; no layout shifts caused by reveal logic; interactions work on keyboard, touch and mobile.

## CE5 — Screenshot-Based Quality / FR7 Completion

**Goal:** Gate the rendered result rather than merely the manifest. Deterministic FR7 checks are already in. Pixel screenshots, geometry checks, and vision-model review are not. Do not claim this slice is shipped.

Tasks:

1. Add actual desktop/mobile browser snapshots and deterministic geometry checks.
2. Expand QA reports with checks for crop, contrast, overflow, assets and primary CTA.
3. Add conditional budgeted visual review for uncertain/high-value cases.
4. Implement design fingerprint v1 and similarity warnings.
5. Require reasoned operator override for non-safety aesthetic cases; never permit override of security/tenant/illegal claims hard blockers.

**Acceptance:** Intentionally broken fixtures fail deterministically; false-positive cases have documented review; high score cannot override a critical blocker; screenshot review is auditable.

## CE6 — First Reveal Approval / FR8

**Goal:** Premium client-facing design review. Thin FR8 is already in on Control `/reveal`: one direction, a short rationale, a desktop or phone frame, and approve or request changes. Approving does not publish. This slice adds plain-language change categories and a revision linked to the prior direction. Do not rebuild that page.

Tasks:

1. Reveal only gated winning direction.
2. Provide responsive preview, concise rationale, approve/request-changes UX.
3. Structure revision preferences, retain original feedback and version lineage.
4. Honor existing approval/publish distinction.

**Acceptance:** Client can understand, approve or request changes without technical jargon; unapproved designs are not published; revisions preserve approved facts and media rights.

## CE7 — Commercial Learning / C8

**Goal:** Improve creative decisions from measured outcomes.

Tasks:

1. Connect experiment creative variants to approved page versions and existing analytics.
2. Compare qualified leads/sales when sufficiently observed; handle missing attribution explicitly.
3. Feed back learnings as tenant-scoped, evidence-backed design hypotheses.
4. Avoid auto-optimizing on small sample sizes or novelty scores alone.

**Acceptance:** Learning references valid experiment/outcome data, never invented ROI; change proposals remain policy governed.

---

# 18. Release Gates and Definition of Done

## 18.1 Minimum functional release gate

- [ ] All new schemas strictly validate and legacy pages remain supported.
- [ ] Tenant isolation and authorization are demonstrated by automated tests.
- [ ] Brand profiles and prohibited styles are respected.
- [ ] Assets have approved provenance and rights for their use.
- [ ] Page CTA, form, analytics and conversion route function end to end.
- [ ] Preview and production publication boundaries remain correct.
- [ ] No unsupported facts, fake testimonials or altered protected brand assets.
- [ ] Appropriate desktop/mobile rendering and reduced-motion support.
- [ ] No catastrophic regression in LCP, CLS, INP or bundle cost.
- [ ] Feature flags and rollback are available for new renderer behavior.

## 18.2 Premium First Reveal gate

- [ ] Concept coherently reflects submitted material and confirmed brand.
- [ ] First viewport answers what, who, why and next action.
- [ ] Hero has visual purpose and a strong mobile composition.
- [ ] Section sequence has intentional rhythm, not generic repetitive cards.
- [ ] No poor crops, overlaps, overflow, dead space, unusable contrast or broken images.
- [ ] Real client images are preferred where suitable and authorized.
- [ ] Motion is restrained, purposeful and optional for accessibility.
- [ ] Actual desktop and mobile screenshots are inspected/validated.
- [ ] Design similarity warning has been considered where applicable.
- [ ] Conversion mechanism is visible and functional.
- [ ] Client review can approve or request targeted changes.
- [ ] Existing `docs/27` Frontend Release Gate remains mandatory before production publication.

## 18.3 Quality demonstration set

Every major release should provide before/after screenshots for the five CE0 fixture clients and document:

- What specifically became more art-directed.
- Why the visual solution fits each brand.
- How the page remains understandable and convertible.
- Evidence from accessibility/performance tests.
- Media generation costs and fallback behavior.
- Any remaining generic patterns.

Do not declare success based on AI reviewer praise alone.

---

# 19. Suggested Test Matrix

| Test area         | Cases                                                                                           |
| ----------------- | ----------------------------------------------------------------------------------------------- |
| Schema/versioning | Existing v1, valid v2, invalid component, unknown motion, overlong copy                         |
| Multi-tenancy     | Client A cannot read B's manifests, assets, screenshots, feedback, fingerprints where sensitive |
| Rights/claims     | Expired asset license, unconfirmed logo, prohibited styles, fake testimonial rejection          |
| Media             | No uploads, portrait-only images, awkward aspect ratio, focal point at edge, corrupted image    |
| Responsiveness    | 320, 390, 768, 1440; landscape phone; large system text                                         |
| Accessibility     | Keyboard, focus order, contrast, reduced motion, semantic headings, form errors                 |
| Performance       | Slow mobile, cold cache, hero images, font fallback, no animation JS                            |
| Quality gate      | Broken crop, headline overflow, missing CTA, false proof, absent logo fallback                  |
| Publication       | Preview noindex, unknown host 404, draft-only media, approved immutable version, rollback       |
| Budget            | Provider timeout, insufficient budget, retry idempotency, fallback, cost attribution            |
| Experiments       | Stable assignments, valid conversion events, no early unsupported conclusions                   |
| Feedback          | Request change preserves facts and previously approved assets, auditable diff                   |

Prefer tests close to existing packages and repository conventions. Do not introduce an independent integration test framework without a reason.

---

# 20. Implementation Path Map (Starting Hypothesis)

Inspect first; exact edits depend on current tree and contracts.

| Existing path                                   | Expected extension                                                                              |
| ----------------------------------------------- | ----------------------------------------------------------------------------------------------- |
| `packages/funnel-engine/src/schema.ts`          | Versioned section grammar, width/media/motion fields with strict validation                     |
| `packages/funnel-engine/src/compose.ts`         | Brief-aware narrative and flexible sequence, not just personality layout switch                 |
| `packages/funnel-engine/src/candidate-score.ts` | Separate pre-render proxies from screenshot-backed visual quality                               |
| `packages/funnel-engine/src/first-reveal.ts`    | Extend thin checks through actual rendered QA, preserve existing gate APIs or version carefully |
| `packages/contracts`                            | Additive typed manifest/brief/QA contracts; no second competing schema source                   |
| `apps/delivery/src/lib/sections/`               | Premium approved hero/story/conversion components and component registry                        |
| `apps/delivery/src/routes/+page.svelte`         | Validated section width/layout handling, safe media resolution and metadata                     |
| `apps/delivery/src/app.css`                     | Section-level width strategy, typography scales and global reduced-motion fallback              |
| `packages/images` / `packages/compose`          | Winner-only generated support media and brand-safe deterministic composition                    |
| Existing C0 assets/C5 manifests                 | Approved asset references, later C4 derivatives, immutable publication                          |
| Control `/brand`, `/funnel`, `/approvals`       | Client-friendly direction, preview, feedback and existing approval integration                  |
| Existing tests / CI                             | Desktop/mobile screenshot assertions, security regression and design fixtures                   |
| `docs/plans/SHIP_REMAINING.md`                  | CE0–CE7 registered as Wave D. Next slice remains Wave D CE0                                     |

Do not add an entire `packages/creative-experience-engine` package by default. New package boundaries require demonstrated shared domain complexity and a review of existing code ownership.

---

# 21. Metrics for Product Success

These are tracking definitions and desired improvements, not claims about measured current performance.

**Creative output metrics**

- Percentage of first reveals passing all non-overridable checks.
- Percentage requiring operator-led visual repair.
- Client revision count and change reasons.
- Screenshot-defect rate by component and viewport.
- Candidate similarity distribution.
- Percentage of real approved client assets used appropriately.

**Operational metrics**

- Generation/asset completion costs per client and per successful reveal.
- Time from Vector Ready to approved preview and to live (preserve Vector 24 definitions).
- Image provider failure/fallback rate.
- Site delivery bundle size and measured performance.

**Commercial metrics**

- Qualified lead conversion and booking/purchase outcomes where tracked.
- Experiment lift with confidence intervals and valid sample sizes.
- Sales outcomes when grounded in reliable records.
- Client approval and retention signals with appropriate caveats.

Do not optimize blindly for a single score. A lower-cost restrained direction that converts and matches the brand is better than an extraordinary-looking but slow and misleading page.

---

# 22. Risks and Mitigations

| Risk                               | Mitigation                                                                        |
| ---------------------------------- | --------------------------------------------------------------------------------- |
| Generic AI-like sameness           | Brief-led concept, multi-variant grammar, privacy-safe fingerprints, visual tests |
| AI-generated untrue visuals        | Source classification, authenticity-first, rights/claims gates, human approval    |
| Costs explode                      | Low-cost manifests, winner-only assets, budgets, idempotency and fallbacks        |
| Pretty but poor-converting output  | Narrative architecture, clear CTAs, business outcome experiments                  |
| Desktop-only polish                | Mobile-specific hero treatments and mandatory viewport tests                      |
| Slow cinematic effects             | M0-M2 defaults, lazy media, lab/field performance checks, reduced motion          |
| New features break old pages       | Schema version compatibility, flag rollout and regression tests                   |
| Security/tenant leak               | Explicit context, scoped references, hostile negative tests, fail-closed serving  |
| Model visual review overconfidence | Evidence-based QA, uncertainty, deterministic blockers, operator escalation       |
| Too much implementation scope      | One bounded vertical slice per PR, no wholesale refactor                          |

---

# 23. Cursor Execution Protocol

Cursor must behave like a careful contributor to a mature, partially implemented codebase.

**Before each slice:**

1. Read relevant charters and current source.
2. State the specific client-facing improvement.
3. Identify existing code and contract constraints.
4. List proposed files, types, migrations and dependencies.
5. Call out compatibility, security, cost, preview and rollback implications.
6. Check whether the slice is already implemented or superseded.

**During each slice:**

1. Prefer a small, vertically complete change over many scaffolds.
2. Avoid modifying unrelated behavior.
3. Version persisted contracts and follow migration practices.
4. Add tests for normal, adverse and cross-tenant cases.
5. Treat any model output as untrusted input.
6. Keep plans and change records aligned with real implementation status.

**After each slice report:**

- Files inspected.
- Files changed.
- Behavior added and what demonstrably works.
- Tests run and results, without invented successes.
- Screenshots/review notes, if applicable.
- Schema and migrations.
- Multi-tenant/security impact.
- Performance and media cost impact.
- Remaining work and known limitations.
- Related docs updated.

Do not claim a visually impressive output without showing or inspecting the rendered result.

---

# 24. Master Cursor Prompt (Copy into Cursor Agent)

```text
You are implementing the VECTOR CREATIVE EXPERIENCE ENGINE in the existing
Vector Autonomous Growth OS repository.

OBJECTIVE
Upgrade client-generated sales funnel landing pages from conventional
section assemblies into distinctive, immersive, authentic, premium and
conversion-oriented experiences driven by submitted client materials.

READ FIRST
- AGENTS.md
- VECTOR_MASTER_IMPLEMENTATION_PLAN.md
- docs/plans/SHIP_REMAINING.md
- docs/plans/CROSS_CUTTING_TRACKS.md
- docs/plans/CREATIVE_TRACK.md
- docs/plans/FIRST_REVEAL_TRACK.md
- docs/09_FUNNEL_ENGINE_DESIGN_SYSTEM.md
- docs/17_CLIENT_ONBOARDING_OPERATIONS.md
- docs/18_QA_TEST_STRATEGY.md
- docs/20_COSTS_USAGE_LIMITS.md
- docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
- docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md
- docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md
- docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md
- docs/plans/CREATIVE_EXPERIENCE_ENGINE_TRACK.md (execution order; it wins over this blueprint)

CRITICAL RULES
- This is an additive cross-cutting track, NOT a new phase or numbered charter.
- Respect accepted ADRs and existing roadmap sequence.
- Do not create docs/31.
- Do not rebuild the existing funnel engine, Creative Engine, First Reveal,
  AI provider, ImageProvider, approval system, asset store, job system, or CRO.
- Preserve all tenant isolation, RBAC/capabilities, auditing, cost tracking,
  approval, SEO, compliance and publication invariants.
- Client Delivery uses the client's brand, not Vector Control colors.
- AI emits strictly validated structured configurations, not executable code.
- No invented proof, staff, facilities, testimonials, numbers or client logos.
- Authentic assets and immutable client marks must be respected.
- No three expensive full websites per client by default.
- Default to a few cheap manifests and one fully polished winner.
- Do not show raw first drafts to the client.
- Ensure accessible, responsive, performant, indexable HTML.
- Visual scoring must eventually rely on rendered screenshot evidence.
- Maintain backwards compatibility with existing page versions.

EXECUTION MODE
1. The next repository slice is Wave D CE0 unless the task names a later CE slice.
2. When a CE slice is authorized, start with CE0 only if it is not already done.
3. Do not rebuild thin FR6, C7, deterministic FR7, or thin FR8.
4. Present a file-level, bounded implementation plan.
5. Implement ONE coherent vertical slice with tests and docs.
6. Report concrete code behavior, QA, known limitations and next slice.
7. Continue only as subsequent bounded slices are explicitly requested
   or otherwise within my current authorized task scope.

CREATIVE BAR
The page must look intentionally designed for this specific company, not
like the same template with changed text, gradients and colors. Develop a
coherent visual concept based on its real offer, assets, audience and
brand. Prioritize strong typography, authentic compositions, meaningful
section rhythm, purposeful motion and conversion clarity.

MEASUREMENT
Preserve and use existing analytics and Phase 7 experiment mechanics.
Do not invent a performance uplift or ROI. Treat synthetic fixture pages
as QA demonstrations, not evidence of real customer conversion.

FIRST TASK
CE0 is the next repository slice. Do not start CE1 ahead of it.
When a CE slice is the authorized task, inspect current source and follow
docs/plans/CREATIVE_EXPERIENCE_ENGINE_TRACK.md. CE0 is an audit with no
production behavior change. Only edit code after that slice's boundaries
are clear.
```

---

# 25. Single-Page Definition of Success

A newly onboarded client should be able to say:

> “This looks and feels like our business, not a generic website. The images are genuinely ours, the design is impressive, the message is clearer than what we had, the phone version is excellent, and I would confidently send customers to this page.”

Vector operators should be able to say:

> “We know which source material informed the direction, why this composition was selected, which approved components were used, what the media cost, which quality checks passed, who approved it, and how to safely revise or roll back the result.”

A buyer should be able to say:

> “I understand the offer, trust what I see, can explore the product or service comfortably, and know exactly what to do next.”

**Final implementation principle:**

> Explore cheaply. Art-direct intentionally. Compose authentic media. Validate the rendered experience. Reveal only when credible. Measure what customers do. Learn without losing the client's identity.
