# VECTOR First Reveal & Premium Site Composition System

## First-Impression Website Generation, Adaptive Design Directions, Visual QA, Cost Control, and Framer-Class Client Preview Standard

**Project:** Vector — Autonomous Growth OS  
**Document type:** Cross-cutting **track specification** (not a numbered `/docs` charter)  
**Repository location:** `/docs/plans/FIRST_REVEAL_TRACK.md`  
**Status:** Accepted as FR0–FR9 via ADR-0012. Standing law folds into `docs/09`, `docs/17`, `docs/26`, `docs/27`, and `docs/29`. Control reveal chrome is `docs/28`.  
**Version:** 1.1  
**Date:** 24 August 2026  
**Applies to:** Client onboarding, Vector Ready, Creative QuickStart, funnel composition, website generation, private previews, brand interpretation, component selection, visual direction, first client reveal, image generation, frontend QA, automated design review, Vector 24, CRO readiness, cost controls, and portfolio-scale launch automation

**Not `docs/31`.** Numbered charters stop at `docs/30`. This file is the slice spec. It does not reopen Phase 1. Publication still uses the `docs/27` Frontend Release Gate. The First Reveal Gate is an additional pre-client gate. `docs/28` is Control identity, not the Creative Engine. `docs/29` owns ingest, generation, composition, rights, and approval.

**Remaining execution (24 August 2026):** FR0–FR2, thin FR3, thin FR4–FR5, and thin FR7 are in. FR6 and FR8–FR9 are open; FR7 remainder (screenshots / visual review) stays later. Sequence in [SHIP_REMAINING.md](SHIP_REMAINING.md) Wave B. Creative dependencies: [CREATIVE_TRACK.md](CREATIVE_TRACK.md). Client reveal (FR8) uses `docs/30` business language; do not overwhelm with schema names, model names, or CSS tokens. Do not generate three full sites.

| Slice         | Status                                                                      | Depends on                         |
| ------------- | --------------------------------------------------------------------------- | ---------------------------------- |
| FR0–FR2       | In                                                                          | —                                  |
| Thin FR7      | In (deterministic checks + operator override; preview publish not blocked)  | —                                  |
| FR3           | Thin in (C1 consume, sufficiency, typography-led fallback; C5 later)        | C1 in; C5 later                    |
| FR4–FR5       | Thin in (cheap manifests, diversity, deterministic score, one winner draft) | Existing compose engine            |
| FR6           | Open                                                                        | C3–C5 winner-only media (C2 in)    |
| FR7 remainder | Open                                                                        | visual / a11y / perf / screenshots |
| FR8           | Open                                                                        | C7 + remaining FR7                 |
| FR9           | Open                                                                        | Phase 9 later                      |

---

# 1. Purpose

This document establishes the **Vector First Reveal System**: the product and implementation standard that governs the first high-quality website or funnel experience shown to a newly onboarded client.

The first website preview is not merely a technical artifact.

It is one of Vector's earliest and most important demonstrations of competence.

A client may not initially understand or directly observe:

- tenant isolation;
- AI orchestration;
- cost ledgers;
- workflow durability;
- analytics architecture;
- attribution;
- SEO/AEO implementation;
- social automation;
- email automation;
- experiment infrastructure;
- governance;
- model routing;
- provider abstractions.

The client **can immediately see the website**.

Therefore the first preview must communicate, within seconds:

> Vector understands my company, my audience, my offer, and my brand — and it can turn that understanding into a professional growth experience.

The governing objective is:

> **A normal Vector Ready client should receive a first website direction that looks intentionally designed, professionally composed, clearly on-brand, conversion-aware, mobile-ready, and credible enough to resemble a strong several-thousand-dollar Framer/Webflow implementation — without requiring manual custom frontend development for every client.**

This document does not promise that every client receives a completely bespoke agency masterpiece.

It defines a scalable system that productizes the visual craft, composition rules, asset intelligence, and quality controls required to make the first client-facing result consistently impressive.

---

# 2. Strategic Product Principle

The first client-visible website is part of the sale.

Vector should assume the client is unconsciously asking:

```text
Does this company understand us?
Does this look like us?
Is this better than what we have now?
Does this feel professionally designed?
Would I be comfortable showing this to my customers?
If this is what Vector produced immediately, what else can it do for us?
```

The wrong first impression is:

```text
This looks like an AI template.
This looks unfinished.
Why is our logo barely visible?
Why do the images we uploaded not appear?
Why does this look like every SaaS landing page?
This is technically correct, but not impressive.
```

The desired first impression is:

```text
This already feels like our company.
This looks professionally designed.
The messaging is clearer than our current site.
The mobile version looks deliberate.
The design appears expensive.
Vector seems to understand what we are trying to sell.
```

The First Reveal System therefore becomes a **conversion surface for Vector itself**.

---

# 3. Core Decision: Do Not Generate Three Full Websites by Default

Vector must **not** generate three complete, media-heavy, production-quality websites for every newly onboarded client by default.

That would create unnecessary:

- AI token spend;
- image-generation spend;
- workflow latency;
- storage;
- render work;
- QA work;
- duplicate assets;
- client decision fatigue;
- operational complexity.

Instead, Vector uses **Adaptive Candidate Generation**.

The default process is:

```text
Vector Ready client
        ↓
One intelligence pass
        ↓
2–3 lightweight direction manifests
        ↓
Deterministic preview composition
        ↓
Rule-based + optional AI scoring
        ↓
Select strongest candidate
        ↓
Generate expensive missing media only for winner
        ↓
Full visual QA
        ↓
First Reveal
```

The important distinction is:

> **Vector generates multiple design decisions, not multiple expensive websites.**

A design direction is primarily structured configuration.

Example:

```json
{
	"direction": "editorial_premium",
	"hero_variant": "hero-editorial-split",
	"services_variant": "services-numbered-editorial",
	"proof_variant": "proof-immersive-media",
	"cta_variant": "cta-minimal-consultation",
	"density": "sparse",
	"headline_scale": "display_xl",
	"media_strategy": "authentic_first",
	"motion_character": "restrained",
	"radius_character": "low",
	"section_rhythm": ["dramatic", "compact", "spacious", "immersive", "compact"]
}
```

Generating three objects like this can occur in **one structured AI call**.

Rendering those manifests with existing Vector components is primarily application compute, not another model call.

Expensive image generation should normally occur only after the winning direction has been selected.

---

# 4. Efficiency Model

The First Reveal System must optimize for **quality per unit cost**, not maximum generation volume.

Use the following generation classes.

## 4.1 Class R0 — Deterministic

No external model required.

Examples:

- validating brand tokens;
- calculating contrast;
- checking available assets;
- determining image aspect ratios;
- mapping industry to eligible section families;
- enumerating compatible component combinations;
- validating page schema;
- responsive rendering;
- accessibility checks;
- screenshot generation;
- visual regression checks;
- component reuse;
- scoring objective layout constraints.

Cost characteristic:

```text
Very low / internal compute
```

---

## 4.2 Class R1 — Lightweight Intelligence

Use a short structured model call.

Examples:

- brand personality inference;
- page narrative;
- section ordering;
- direction proposals;
- component variant selection;
- headline strategy;
- offer framing;
- media strategy;
- design rationale.

Prefer one response containing multiple candidate manifests rather than one model call per candidate.

Cost characteristic:

```text
Low
```

---

## 4.3 Class R2 — Preview Composition

Vector locally renders candidate manifests using:

- existing components;
- existing brand tokens;
- approved client images;
- approved graphics;
- placeholders only inside private internal scoring states where necessary.

Do not generate unique media for every candidate.

Cost characteristic:

```text
Low / internal compute
```

---

## 4.4 Class R3 — Assisted Visual Scoring

Use deterministic checks first.

Optional model-based visual review may evaluate candidate screenshots if:

- deterministic scores are close;
- visual confidence is low;
- an industry has unusually high visual dependence;
- the hero is complex;
- the system has no strong historical evidence.

If an AI visual reviewer is used, prefer one request containing all candidate screenshots where supported.

Cost characteristic:

```text
Low to moderate, conditional
```

---

## 4.5 Class R4 — Premium Asset Generation

Use image generation only for the selected direction unless an alternate is specifically needed.

Examples:

- hero atmosphere;
- editorial supporting image;
- abstract campaign plate;
- illustration;
- service concept imagery;
- decorative background.

Do not generate:

- fake client teams;
- fabricated facilities presented as real;
- fabricated customer proof;
- false before/after evidence;
- fake partner logos;
- synthetic metrics;
- client logos.

Cost characteristic:

```text
Moderate to high; budget-controlled
```

---

## 4.6 Class R5 — Recovery / Alternate Direction

Generate a second fully polished direction only when:

- winning candidate fails the First Reveal Gate;
- client explicitly requests another direction;
- design confidence remains below threshold;
- brand signals are materially ambiguous;
- the selected direction conflicts with important client feedback;
- creative asset generation fails to produce usable output.

Cost characteristic:

```text
Conditional; not default
```

---

# 5. Recommended Default Candidate Policy

The default policy should be:

```text
Candidate manifests:        3
Full expensive renders:     1
AI-generated hero sets:     1 selected direction only
Client-visible directions:  1 by default
Fallback polished option:   only if required
```

This preserves the quality benefit of comparing alternatives without multiplying expensive generation by three.

Recommended adaptive policy:

| Situation                                  | Candidate manifests |                Full polish |
| ------------------------------------------ | ------------------: | -------------------------: |
| Strong brand + strong assets + clear offer |                   2 |                          1 |
| Normal Vector Ready client                 |                   3 |                          1 |
| Ambiguous brand or unusual industry        |                 3–4 |                          1 |
| Low confidence after scoring               |                 3–4 |                          2 |
| Client explicitly requests options         |                   3 | 2–3 as entitlement permits |
| CRO experiment after launch                |                  2+ |        Experiment-specific |

The number of candidates should be a policy value, not hard-coded business logic.

---

# 6. Why This Is Still Efficient

The system remains efficient because the expensive parts are not repeated unnecessarily.

A candidate direction consists mainly of:

```text
structured JSON
+
component selection
+
brand tokens
+
existing client media
+
local renderer
```

The following should be reused across all candidate directions:

- researched business facts;
- approved claims;
- audience definition;
- offer model;
- lead conversion goal;
- client logo;
- brand profile;
- authentic client assets;
- existing generated asset library;
- SEO facts;
- service definitions;
- legal constraints;
- analytics plan.

Do not independently research or regenerate these for each direction.

The high-cost activities occur only after selection:

```text
high-resolution generation
premium image edits
video
complex animation assets
final derivatives
full QA
publication packaging
```

This creates a funnel-shaped cost model:

```text
Many cheap possibilities
        ↓
Few scored candidates
        ↓
One expensive winner
```

This is the same economic principle used in many optimization systems: search broadly with inexpensive representations, then spend heavily only on the strongest candidate.

---

# 7. First Reveal Target Quality

The target is not:

```text
maximum visual novelty
```

The target is:

```text
professionally designed
+
clearly on-brand
+
conversion-aware
+
credible
+
responsive
+
fast
+
original enough not to look templated
+
repeatable at Vector scale
```

A successful output should reasonably resemble the visual quality of a strong commercial Framer/Webflow implementation in the several-thousand-dollar range.

This means the page should usually demonstrate:

- strong first-screen hierarchy;
- confident typography;
- intentional spacing;
- one distinctive hero composition;
- coherent navigation;
- appropriate media placement;
- section rhythm;
- conversion clarity;
- polished forms;
- restrained motion;
- strong mobile composition;
- professional micro-interactions;
- correct brand application;
- visually credible proof presentation;
- no obvious generic AI styling.

It does **not** require:

- custom WebGL scenes;
- scroll-jacking;
- excessive 3D;
- unique frontend code per tenant;
- cinematic production for every client;
- dozens of bespoke component families;
- one-off experimental interactions that cannot be maintained.

---

# 8. The First Reveal Is a Distinct Product State

Do not treat the first preview as merely:

```text
first successfully rendered page_version
```

Introduce a distinct state.

Recommended lifecycle:

```text
DRAFT
    ↓
COMPOSED
    ↓
INTERNAL_PREVIEW
    ↓
FIRST_REVEAL_CANDIDATE
    ↓
FIRST_REVEAL_READY
    ↓
CLIENT_REVEALED
    ↓
CLIENT_APPROVED / REVISION_REQUESTED
    ↓
PUBLICATION_READY
    ↓
PUBLISHED
```

A page must not become `FIRST_REVEAL_READY` merely because it renders without errors.

It must pass the First Reveal Gate defined later in this document.

---

# 9. Relationship to Vector Ready

The First Reveal System begins only when the client satisfies the applicable **Vector Ready** requirements.

Minimum commercial/business readiness should include:

```text
primary audience
primary offer
primary conversion
at least one service/product
approved or confirmed business facts
approved claims or claim policy
```

Minimum visual readiness should include:

```text
logo
brand colors supplied or confirmed
font direction supplied or Vector-selected
visual personality
media strategy
rights status
```

Media readiness may be satisfied through one of three paths.

## 9.1 Ready With Authentic Assets

Best case.

Client has sufficient quality:

- photos;
- screenshots;
- projects;
- products;
- venue/facility media;
- team media;
- case-study media.

---

## 9.2 Ready With AI Assistance

Client has approved generation for non-evidentiary supporting visuals.

Vector may fill aesthetic gaps without fabricating business evidence.

---

## 9.3 Ready With Minimal Visual System

The business can be presented effectively through:

- typography;
- diagrams;
- icons;
- UI mockups;
- charts;
- branded shapes;
- editorial composition;
- whitespace;
- subtle motion.

This can work especially well for:

- technology;
- software;
- consulting;
- legal;
- professional services;
- finance;
- B2B services;
- institutional organizations.

---

# 10. Asset Sufficiency Score

Create a first-class **Asset Sufficiency Score**.

The purpose is not to punish clients for having few images.

It determines the appropriate visual strategy.

Suggested dimensions:

```text
brand_identity
hero_media
service_media
proof_media
team_or_location_media
product_media
case_study_media
rights_confidence
technical_quality
visual_consistency
```

Example:

```text
Brand Identity       95
Hero Media           30
Service Media        45
Proof Media          10
Team/Location        0
Rights Confidence   100

Asset Sufficiency    47/100
```

Possible interpretation:

```text
80–100  authentic-media-led
60–79   authentic + composed graphics
40–59   hybrid + selective generated supporting media
0–39    minimal visual system / asset request required
```

Do not expose internal complexity to the client by default.

Client-facing wording may be:

```text
Your brand is ready.
We can create the first direction now.
Adding 3–5 real project photos later would make the final site even stronger.
```

---

# 11. Industry Visual Dependency

Different industries require different evidence and media intensity.

Introduce `industry_visual_dependency`.

Suggested classes:

```text
LOW
MEDIUM
HIGH
VERY_HIGH
```

Examples:

## LOW

- software;
- consulting;
- legal;
- financial services;
- technical services.

A typography-led or diagram-led website can still appear premium.

## MEDIUM

- education;
- B2B services;
- agencies;
- logistics;
- professional organizations.

## HIGH

- dental;
- medical clinics;
- fitness;
- beauty;
- construction;
- events;
- physical retail.

## VERY HIGH

- hotels;
- resorts;
- restaurants;
- real estate;
- tourism;
- architecture portfolios;
- luxury physical products.

For high-dependency industries, Vector should be more conservative about claiming visual readiness when authentic media is absent.

---

# 12. Visual Direction Model

A `visual_direction` should be structured and machine-readable.

Suggested schema:

```text
id
client_id
page_id
candidate_index
name
status
source
confidence
brand_personality
industry_visual_dependency
layout_character
density
headline_character
typography_pairing_id
color_strategy
surface_strategy
radius_character
shadow_character
motion_character
media_strategy
hero_variant
navigation_variant
section_manifest
cta_strategy
form_strategy
mobile_strategy
rationale
score_total
score_brand
score_conversion
score_visual
score_media
score_accessibility
score_performance
score_originality
cost_estimate_micros
created_at
selected_at
```

`source` may include:

```text
ai_proposed
deterministic
operator_selected
client_requested
historical_winner
experiment
```

---

# 13. The Design Grammar, Not a Template Catalog

Vector should not be conceptualized primarily as a library of complete website templates.

A template-only architecture eventually produces visible sameness.

The preferred model is a **design grammar**.

A design grammar contains:

```text
tokens
+
component families
+
component variants
+
composition rules
+
compatibility rules
+
media strategies
+
section rhythm
+
motion grammar
+
typography grammar
+
conversion rules
```

The AI selects from the grammar.

The renderer guarantees execution quality.

---

# 14. Component Family Expansion

Document 27 already defines reusable component families and multiple variants.

This First Reveal track strengthens the requirement for first-impression quality.

Recommended initial premium launch library:

## 14.1 Navigation

- `nav-minimal`
- `nav-editorial`
- `nav-floating`
- `nav-transparent-to-solid`
- `nav-product`

## 14.2 Hero

- `hero-minimal-typographic`
- `hero-editorial-split`
- `hero-cinematic-media`
- `hero-product-demo`
- `hero-asymmetric`
- `hero-centered-prestige`
- `hero-ui-showcase`
- `hero-mosaic`

## 14.3 Trust / Proof

- `trust-metric-strip`
- `trust-logo-strip`
- `proof-editorial`
- `proof-photo-feature`
- `proof-case-featured`
- `proof-quote-minimal`
- `proof-stats-narrative`

Only render real logos/metrics/testimonials when supported by approved evidence.

## 14.4 Services / Products

- `services-editorial`
- `services-numbered`
- `services-bento`
- `services-sticky`
- `services-tabs`
- `services-media-row`
- `product-showcase`
- `product-feature-walkthrough`

## 14.5 Process

- `process-timeline`
- `process-numbered`
- `process-sticky-narrative`
- `process-diagram`

## 14.6 Case Studies

- `cases-editorial`
- `cases-featured`
- `cases-grid`
- `cases-horizontal`
- `cases-before-after`

## 14.7 Conversion

- `cta-editorial`
- `cta-immersive`
- `cta-split`
- `form-card-premium`
- `form-inline`
- `booking-focused`
- `lead-multistep`

## 14.8 FAQ / Objection Handling

- `faq-minimal`
- `faq-split`
- `faq-categorized`
- `objection-editorial`

The first objective is not to build every possible variant.

The objective is to build a **small number of excellent variants** that already look expensive.

---

# 15. Variant Quality Over Variant Quantity

Do not build twenty mediocre hero variants to increase combinatorics.

Prefer:

```text
4–8 exceptional hero variants
```

before:

```text
20 inconsistent hero variants
```

Every variant should have:

- intentional desktop composition;
- intentional mobile composition;
- content constraints;
- media constraints;
- accessibility behavior;
- motion behavior;
- performance expectations;
- supported brand personalities;
- supported density modes;
- supported asset strategies;
- visual regression references.

---

# 16. Component Compatibility Rules

Not every variant should be freely combined.

Create compatibility metadata.

Example:

```text
hero-editorial-split
supports:
  brand_personality:
    - premium
    - editorial
    - professional
  media_strategy:
    - authentic
    - generated_supporting
  density:
    - sparse
    - balanced
  incompatible_with:
    - services-bento-dense when page density is already high
```

This prevents random composition from producing visually incoherent pages.

---

# 17. Page Narrative Before Visual Selection

Vector should not begin with visual decoration.

Preferred sequence:

```text
business truth
→ audience
→ offer
→ primary conversion
→ objections
→ available proof
→ page narrative
→ visual direction
→ component selection
```

Example narrative:

```text
1. Establish problem and value.
2. Show service outcome.
3. Demonstrate credibility.
4. Explain process.
5. Reduce risk.
6. Convert to consultation.
```

The visual system should support the sales narrative.

It must not replace it.

---

# 18. First-Screen Standard

The first viewport receives disproportionate attention because it strongly influences perceived quality.

Before First Reveal, the first screen should satisfy:

```text
Logo visible and correct
Primary message understandable
Offer direction clear
Primary CTA clear
Strong visual anchor exists
Typography appears intentional
No accidental empty zones
No placeholder content
No generic template composition
Navigation feels finished
Mobile hero remains persuasive
```

The first screen should not require scrolling before the client can understand why the composition is strong.

---

# 19. Logo-Only and Low-Asset Strategy

A low-asset client must not receive a boring page merely because they supplied only a logo and limited media.

When authentic media is limited, Vector should use one or more of:

- strong typography;
- editorial layout;
- large branded numerals;
- process diagrams;
- data visuals;
- icons;
- service index systems;
- subtle patterns;
- geometry derived from brand shapes;
- controlled gradients when appropriate;
- linework;
- product UI mockups where factual;
- screenshots;
- abstract supporting media;
- carefully restrained motion;
- asymmetric spacing;
- texture;
- typographic rhythm;
- intentional whitespace.

Do not fill empty space with irrelevant stock-like imagery.

---

# 20. Brand Extraction and Creative QuickStart

The First Reveal System depends on Creative QuickStart.

Preferred onboarding pattern:

```text
Client supplies minimal inputs
        ↓
Vector extracts what it can
        ↓
Vector proposes brand visual profile
        ↓
Client confirms or edits
        ↓
Vector Ready
        ↓
First Reveal composition
```

The client should normally confirm:

- logo;
- color direction;
- typography direction;
- visual personality;
- media strategy;
- prohibited style cues.

Avoid forcing clients through a technical design questionnaire.

---

# 21. Brand Personality Must Affect Real Composition

Do not treat `brand_personality` as a decorative label.

Examples:

## Premium / Luxury

May influence:

- lower content density;
- larger typography;
- longer spacing intervals;
- fewer borders;
- restrained animation;
- selective media;
- lower radius;
- subdued color use;
- editorial composition.

## Technology

May influence:

- diagrams;
- interface frames;
- denser information hierarchy;
- modular layouts;
- technical microcopy;
- structured motion;
- product proof.

## Energetic / Consumer

May influence:

- stronger contrast;
- larger color fields;
- more dynamic section transitions;
- expressive photography;
- bolder CTA treatment.

## Institutional / Professional

May influence:

- strong structure;
- credibility-first hierarchy;
- restrained interactions;
- proof prominence;
- clear typography;
- conservative decorative treatment.

---

# 22. Candidate Generation Prompt Contract

The AI responsible for visual strategy must not return arbitrary HTML/CSS/JS.

It returns structured design direction objects.

Required inputs:

```text
client brand profile
business summary
primary offer
target audience
conversion goal
available assets
asset sufficiency
industry visual dependency
approved claims
proof inventory
component capability manifest
variant compatibility rules
page narrative
performance policy
accessibility policy
```

Required output:

```text
candidate directions
selection rationale
asset requirements
risk flags
confidence
```

A model should not propose components that do not exist in the capability manifest unless explicitly requesting a new reusable capability for engineering review.

---

# 23. Candidate Diversity Rules

Three candidates are useful only when they are meaningfully different.

Avoid:

```text
Candidate A: same layout, blue
Candidate B: same layout, green
Candidate C: same layout, dark
```

Preferred diversity dimensions:

- composition;
- hero structure;
- density;
- media treatment;
- typography character;
- section rhythm;
- proof emphasis;
- CTA presentation;
- visual storytelling.

Example:

```text
A — Editorial Premium
B — Visual Product-Led
C — Structured Conversion-Led
```

Each candidate must still respect the same approved brand boundaries.

---

# 24. Candidate Scoring

Create a normalized candidate scoring model.

Suggested weighted dimensions:

```text
Brand Fit              20%
Conversion Clarity     20%
Visual Quality         20%
Content Fit            10%
Media Fit              10%
Originality            5%
Mobile Quality          5%
Accessibility           5%
Performance             5%
```

Weights may vary by page type.

Example:

A pure lead-generation page may weight conversion more heavily.

A luxury portfolio may weight brand/media more heavily.

---

# 25. Deterministic Score Components

Do not ask AI to judge everything.

Deterministic checks may score:

- contrast;
- CTA visibility;
- heading count;
- hero text length;
- line length;
- content overflow;
- responsive breakpoints;
- image aspect compatibility;
- unused approved assets;
- missing logo;
- accessibility;
- page weight;
- image byte size;
- number of fonts;
- layout shift risk;
- heading hierarchy;
- form usability;
- invalid component combinations;
- repeated identical section structures.

---

# 26. Optional AI Visual Review

AI visual review is supplemental, not authoritative.

It may inspect screenshots and answer structured questions such as:

```text
Does the hero appear intentionally composed?
Is there an obvious generic AI-template aesthetic?
Does the page visually match the declared brand personality?
Is the visual hierarchy clear?
Are sections too repetitive?
Does the layout appear sparse due to missing assets?
Does the mobile version retain the intended emphasis?
```

The output should be structured and auditable.

Do not let a visual reviewer directly publish or rewrite production code.

---

# 27. The First Reveal Gate

A page cannot become `FIRST_REVEAL_READY` until it passes all applicable sections below.

## 27.1 Brand

- [ ] Approved logo renders correctly.
- [ ] Logo sizing and clear space are appropriate.
- [ ] Colors match the approved visual profile.
- [ ] Typography is approved or Vector-confirmed.
- [ ] No Vector corporate visual language leaks into client branding unless explicitly intended.
- [ ] Brand personality materially affects composition.

## 27.2 First Screen

- [ ] Value proposition is understandable.
- [ ] Primary CTA is obvious.
- [ ] Visual anchor exists.
- [ ] Hero does not appear empty.
- [ ] Hero copy fits naturally.
- [ ] Navigation feels complete.
- [ ] No placeholders are visible.

## 27.3 Visual Quality

- [ ] Art direction is intentional.
- [ ] Typography hierarchy is coherent.
- [ ] Spacing rhythm is coherent.
- [ ] Section density varies intentionally.
- [ ] The page does not look like a generic AI template.
- [ ] Component repetition is controlled.
- [ ] Media cropping is deliberate.
- [ ] No obvious low-quality generated media is present.

## 27.4 Content and Conversion

- [ ] Audience is clear.
- [ ] Offer is understandable.
- [ ] Primary conversion is defined.
- [ ] CTA hierarchy is coherent.
- [ ] Proof supports important claims.
- [ ] Important objections are addressed.
- [ ] Forms appear polished and trustworthy.

## 27.5 Trust

- [ ] No fake partner logos.
- [ ] No fabricated testimonials.
- [ ] No fabricated metrics.
- [ ] No generated person is presented as a real client employee unless explicitly and truthfully disclosed for an appropriate use.
- [ ] No generated facility is represented as the actual facility.
- [ ] Generated supporting media does not create factual misrepresentation.

## 27.6 Mobile

- [ ] Mobile hero remains persuasive.
- [ ] CTA remains visible and usable.
- [ ] Typography scales intentionally.
- [ ] Media crop is appropriate.
- [ ] No horizontal overflow.
- [ ] Tap targets are usable.
- [ ] Section order remains logical.

## 27.7 Accessibility

- [ ] Contrast meets applicable standard.
- [ ] Keyboard navigation works.
- [ ] Focus states are visible.
- [ ] Inputs are labeled.
- [ ] Reduced motion is respected.
- [ ] Essential information is not image-only.

## 27.8 Performance

- [ ] Hero media is optimized.
- [ ] LCP risk is acceptable.
- [ ] CLS is controlled.
- [ ] Below-fold media is deferred where appropriate.
- [ ] Heavy motion does not block interaction.
- [ ] No unnecessary frontend dependency was introduced.

## 27.9 SEO / Semantics

- [ ] Correct H1.
- [ ] Logical heading hierarchy.
- [ ] Important text is crawlable.
- [ ] Image alt strategy is correct.
- [ ] Metadata and canonical behavior are correct for preview/public state.

## 27.10 Analytics

- [ ] Primary CTA interaction is measurable.
- [ ] Primary conversion is measurable.
- [ ] Preview traffic is not mixed with production analytics.

---

# 28. Automatic Recomposition

If a candidate fails the First Reveal Gate, Vector should not immediately require a human designer.

Preferred recovery sequence:

```text
failure detected
    ↓
classify failure
    ↓
try deterministic correction
    ↓
re-render
    ↓
re-score
    ↓
if still failing:
select next candidate or request narrow AI revision
    ↓
re-render
```

Examples:

### Hero too sparse

Possible automatic response:

- switch hero variant;
- increase typographic emphasis;
- use approved logo motif;
- move authentic image into hero;
- introduce branded shape system.

### Copy overflow

Possible response:

- select short copy variant;
- reduce supporting paragraph;
- change content width;
- use alternative hero composition.

### Repetitive layout

Possible response:

- switch one section to editorial variant;
- alter section density;
- move proof block;
- use asymmetric media treatment.

---

# 29. Confidence-Based Escalation

Every first reveal should have a `design_confidence`.

Suggested interpretation:

```text
90–100  reveal automatically after non-content approvals
75–89   reveal normally; keep alternate candidate available
60–74   run enhanced visual review / second polish
<60     require operator review before client reveal
```

Thresholds are configurable.

Do not make low-confidence art direction look falsely certain to the client.

---

# 30. Client Reveal UX

The first reveal should feel like a product moment.

Suggested client flow:

```text
Your first Vector direction is ready.

[Full website preview]

Desktop | Tablet | Mobile

Why Vector designed it this way
- Built around your primary offer
- Uses your approved brand direction
- Prioritizes consultation conversion
- Uses your authentic project imagery

[Approve Direction]
[Request Changes]
```

Do not overwhelm the client with:

- section schema names;
- component IDs;
- prompt output;
- model names;
- CSS tokens;
- asset-generation settings;
- score internals.

The experience should remain outcome-first and business-friendly.

---

# 31. Whether the Client Should See Multiple Directions

Default:

> Show the strongest direction only.

Reasons:

- faster decision;
- less cognitive load;
- stronger recommendation posture;
- lower generation cost;
- fewer revisions caused by mixing unrelated directions.

Offer multiple polished directions only when:

- package entitlement includes creative options;
- the client explicitly asks;
- Vector has low design confidence;
- stakeholder preferences conflict;
- the engagement is intentionally design-led.

Possible premium entitlement:

```text
Standard
1 recommended direction
1 revision cycle

Premium
2 polished directions
2 revision cycles

Enterprise / Creative
3 polished directions
custom review workflow
```

Do not make this entitlement structure mandatory unless commercial packaging chooses to use it.

---

# 32. Revision UX

Avoid forcing clients to write technical design feedback.

Preferred revision interface:

```text
What would you like to change?

○ Make it feel more premium
○ Make it more energetic
○ Use more of our real photos
○ Make the message simpler
○ Make the CTA stronger
○ Use less animation
○ Change colors / typography
○ Something else
```

Then permit optional free text.

Vector maps the feedback back into structured design controls.

---

# 33. Learning From Client Preference

Store approved preference signals.

Examples:

```text
preferred_density
preferred_motion
preferred_media_mix
preferred_hero_character
preferred_typography_character
preferred_section_style
rejected_visual_patterns
```

Do not treat one client's preference as a universal design rule.

Use it to improve future pages for the same client.

---

# 34. Learning From Business Outcomes

The most visually impressive candidate is not always the highest-converting candidate.

After launch, connect design variants to:

- conversion rate;
- qualified lead rate;
- appointment rate;
- sales outcome;
- revenue where attributable;
- engagement;
- scroll depth;
- form completion;
- CTA interaction.

Document 31 governs **first-impression quality**.

Document 13 / CRO should govern statistical promotion of performance winners.

The two systems must cooperate.

---

# 35. Do Not Optimize Only for Client Taste

A client may prefer a visually striking design that weakens conversion.

Vector should preserve both:

```text
brand confidence
+
conversion clarity
```

If client feedback would materially reduce performance or accessibility, explain the tradeoff in simple language.

Do not silently block explicit approved client choices unless they violate law, security, accessibility obligations, or platform policy.

---

# 36. Media Source Hierarchy

For the First Reveal, use the same Creative Engine hierarchy.

Preferred order:

```text
1. Authentic client assets
2. Improved client-owned assets
3. Approved generated supporting media
4. Deterministic graphic composition
5. Minimal visual presentation
```

This preserves trust and reduces unnecessary AI generation spend.

---

# 37. Media Generation Policy for Candidate Directions

Do not generate three independent hero images for three preliminary candidates by default.

Preferred candidate stage:

- reuse the strongest existing approved media;
- use crops or focal-point variants;
- use a neutral internal preview plate where needed;
- use deterministic branded compositions;
- defer expensive generation until selection.

After winner selection:

```text
selected direction
    ↓
asset gap manifest
    ↓
Creative Engine
    ↓
only necessary final media generated
```

---

# 38. Image Generation Retry Policy

Generated media can become a cost sink if retries are uncontrolled.

Set:

```text
max_generation_attempts_per_slot
max_generation_cost_per_page
max_generation_cost_per_first_reveal
max_concurrent_generation_jobs
fallback_strategy
```

If generation repeatedly fails quality thresholds:

```text
fallback to authentic media
or
minimal visual system
or
operator review
```

Do not endlessly regenerate.

---

# 39. Asset Reuse

Reuse existing approved assets when appropriate.

Example:

A previously generated abstract brand plate may be reused or adapted across:

- homepage hero;
- service page;
- social derivative;
- email banner;
- OG image.

Reuse should respect:

- channel fit;
- campaign context;
- visual fatigue;
- rights;
- crop requirements;
- current brand rules.

---

# 40. Cost Ledger Integration

Every costly First Reveal event must be attributable.

Track:

```text
client_id
page_id
candidate_id
run_id
provider
model
operation_type
input_tokens
output_tokens
image_generations
image_edits
visual_review_calls
workflow_runtime
storage_bytes
cost_micros
created_at
```

Cost should roll into existing client AI/creative usage controls.

---

# 41. First Reveal Budget Policy

Create a configurable budget profile.

Example conceptual classes:

```text
ECONOMY
STANDARD
PREMIUM
ENTERPRISE
```

Policy may control:

- candidate count;
- visual-review usage;
- generated asset count;
- generation quality;
- number of polished alternates;
- revision allowance;
- video eligibility;
- operator review requirement.

The architecture must not assume a single fixed commercial package.

---

# 42. Cache Strategy

Cache reusable intelligence outputs.

Examples:

```text
brand profile
business summary
audience summary
offer summary
page narrative
proof inventory
asset inventory
visual compatibility map
```

Invalidate only when the underlying approved data changes.

Do not repeatedly pay to rediscover unchanged client knowledge for each page render.

---

# 43. Design Direction Fingerprinting

Store a normalized signature for each direction.

Potential dimensions:

```text
hero_variant
services_variant
proof_variant
cta_variant
density
typography_pairing
color_strategy
media_strategy
motion_character
section_order
```

Use this to:

- detect near-duplicate candidates;
- avoid generating three almost identical directions;
- measure portfolio diversity;
- prevent repetitive client sites.

---

# 44. Portfolio Similarity Guard

Phase 9 requires multiple clients to launch from one engine without looking like one cloned website.

Add a portfolio similarity check.

The system should detect excessive repetition across recent client launches.

Potential signals:

- identical hero variant frequency;
- identical section order;
- identical typography pairing;
- identical card family;
- identical decorative treatment;
- repeated generated visual motifs.

Do not force artificial difference when the same pattern is genuinely appropriate.

Use the signal as a guardrail, not a randomizer.

---

# 45. No Random Design

Do not solve sameness by randomizing components.

Random design produces inconsistency.

Every selection should be explainable by:

- client brand;
- audience;
- offer;
- page type;
- proof availability;
- asset sufficiency;
- conversion objective;
- validated performance history;
- documented visual direction.

---

# 46. Typography as a First-Class System

Typography contributes heavily to perceived design quality.

Create typography pairing families by character, not only by font name.

Examples:

```text
editorial_serif + neutral_sans
geometric_sans + utility_sans
humanist_sans + compact_sans
prestige_display + restrained_sans
technical_grotesk + mono_accent
```

The system should encode:

- display scale;
- heading scale;
- body scale;
- line height;
- maximum line length;
- letter spacing;
- font weight range;
- mobile adjustments.

Avoid adding many fonts to one page.

---

# 47. Spacing and Density Grammar

Introduce explicit density modes:

```text
sparse
balanced
dense
```

And section roles:

```text
dramatic
spacious
balanced
compact
immersive
```

A page should have intentional rhythm.

Example:

```text
hero          dramatic
trust         compact
services      spacious
proof         immersive
process       balanced
faq           compact
cta           dramatic
```

Avoid pages where every section is the same vertical size and card structure.

---

# 48. Motion Grammar

Motion should reinforce perceived craft without harming performance or usability.

Suggested motion characters:

```text
none
restrained
editorial
product
energetic
```

Allowed patterns may include:

- fade/rise;
- staggered reveal;
- subtle parallax where safe;
- sticky storytelling;
- hover emphasis;
- image mask reveal;
- product UI state transitions.

Avoid by default:

- scroll hijacking;
- cursor traps;
- excessive magnetic effects;
- persistent decorative motion;
- motion that hides content;
- motion that breaks reduced-motion preferences.

---

# 49. Mobile Is Not a Shrunk Desktop

Each major component variant must define an intentional mobile strategy.

Examples:

```text
hero-editorial-split desktop:
copy left / media right

mobile:
copy first / focal media second / CTA retained above fold where practical
```

Or:

```text
services-sticky desktop:
sticky narrative + scroll panels

mobile:
stacked editorial service chapters
```

A visually expensive desktop page with a generic mobile collapse fails the First Reveal standard.

---

# 50. Forms Must Look Designed

Lead forms are high-value conversion surfaces.

They must not resemble generic browser forms.

Require:

- coherent typography;
- clear labels;
- strong focus states;
- appropriate input height;
- clear errors;
- loading states;
- success state;
- mobile keyboard considerations;
- reduced friction;
- brand-appropriate CTA;
- consent text where applicable.

The form should visually belong to the page.

---

# 51. Generated UI Screenshots and Product Mockups

When a client has a software product or digital dashboard, authentic screenshots should be prioritized.

Vector may compose them into:

- browser frames;
- cropped feature panels;
- annotated callouts;
- device frames;
- animated walkthroughs.

Do not invent fake product capabilities in screenshots.

---

# 52. Proof Integrity

The First Reveal must never sacrifice truth for visual polish.

Rules:

- no fake customer logos;
- no fake testimonials;
- no fake awards;
- no fake review counts;
- no fake case studies;
- no invented statistics;
- no fabricated locations;
- no synthetic employee portraits presented as real;
- no fake before/after evidence.

When proof is weak, design the section honestly around:

- process;
- credentials;
- service clarity;
- guarantees only when approved;
- methodology;
- founder story;
- factual operating history;
- authentic project media.

---

# 53. First Reveal Explanation

Vector may provide a short explanation of the chosen direction.

Example:

```text
Why this direction

We used a more editorial layout because your brand is positioned as a premium professional service. Your primary conversion is consultation, so the first screen prioritizes clarity and trust instead of dense feature cards. We used your real project imagery as proof and kept animation restrained.
```

This increases perceived intelligence without exposing technical internals.

---

# 54. Operator Experience

Internal operator view should show:

```text
Client: ABC Dental
Vector Ready: Yes
Asset Sufficiency: 68
Visual Dependency: High

Candidates
A Editorial Clinical      88 selected
B Conversion Modern      82
C Image-Led Premium      79

First Reveal Gate
Brand             Pass
Hero              Pass
Trust              Pass
Mobile             Pass
Accessibility      Pass
Performance        Pass

AI/Creative Cost
Within budget

[Preview]
[Reveal to Client]
[Generate Alternate]
```

Operators should be able to understand why a candidate was selected.

---

# 55. Client Experience Principle

The client should experience:

```text
Vector understands me
→ Vector created something valuable
→ I can approve or guide it quickly
```

The client should not experience:

```text
I need to become a designer
→ choose from dozens of technical options
→ configure a website builder
→ manually arrange sections
```

Vector is not primarily selling a page builder.

It is selling an intelligent growth system that can produce and operate high-quality marketing experiences.

---

# 56. Recommended New Entities

Consider adding:

```text
visual_directions
visual_direction_sections
page_candidate_scores
first_reveal_reviews
first_reveal_gate_results
asset_sufficiency_snapshots
design_confidence_events
client_visual_preferences
portfolio_design_signatures
```

---

# 57. Suggested `visual_directions`

Fields:

```text
id
client_id
page_id
version
name
status
source
candidate_index
brand_personality
layout_character
density
typography_pairing_id
color_strategy
media_strategy
motion_character
hero_variant
navigation_variant
section_manifest_json
mobile_strategy_json
rationale
confidence
estimated_cost_micros
actual_cost_micros
selected_at
created_by
created_at
updated_at
```

---

# 58. Suggested `page_candidate_scores`

Fields:

```text
id
client_id
page_id
visual_direction_id
score_total
score_brand
score_conversion
score_visual
score_content
score_media
score_originality
score_mobile
score_accessibility
score_performance
scoring_version
ai_review_run_id
created_at
```

---

# 59. Suggested `first_reveal_gate_results`

Fields:

```text
id
client_id
page_version_id
visual_direction_id
gate_version
status
brand_status
hero_status
visual_status
conversion_status
trust_status
mobile_status
accessibility_status
performance_status
seo_status
analytics_status
failures_json
warnings_json
reviewed_by_type
reviewed_by_id
created_at
```

---

# 60. Suggested `client_visual_preferences`

Fields:

```text
id
client_id
preference_type
value_json
source
confidence
approved_by
created_at
updated_at
```

Examples:

```text
motion_preference
image_preference
density_preference
hero_preference
typography_preference
rejected_style
```

---

# 61. Suggested Services

Potential domain services:

```text
BrandReadinessService
AssetSufficiencyService
VisualDirectionService
PageCompositionService
CandidateScoringService
FirstRevealGateService
VisualReviewService
DesignSimilarityService
FirstRevealCostPolicyService
```

Keep provider-specific AI behavior behind existing provider abstractions.

---

# 62. Suggested API Surface

Illustrative only; adapt to actual repository conventions.

```text
POST /v1/clients/:clientId/pages/:pageId/directions/generate
GET  /v1/clients/:clientId/pages/:pageId/directions
POST /v1/clients/:clientId/pages/:pageId/directions/:directionId/select
POST /v1/clients/:clientId/pages/:pageId/compose
POST /v1/clients/:clientId/pages/:pageId/first-reveal/review
GET  /v1/clients/:clientId/pages/:pageId/first-reveal/status
POST /v1/clients/:clientId/pages/:pageId/first-reveal/reveal
POST /v1/clients/:clientId/pages/:pageId/revisions
```

Every endpoint must preserve tenant isolation and authorization.

---

# 63. Background Jobs

Potential jobs:

```text
brand-readiness-evaluate
asset-sufficiency-evaluate
visual-directions-generate
candidate-preview-render
candidate-score
candidate-visual-review
winner-assets-generate
winner-compose
first-reveal-gate-run
first-reveal-screenshot-generate
portfolio-similarity-check
```

Jobs must be idempotent where applicable.

---

# 64. Event Taxonomy Additions

Suggested events:

```text
first_reveal.candidate_generated
first_reveal.candidate_rendered
first_reveal.candidate_scored
first_reveal.candidate_selected
first_reveal.asset_generation_started
first_reveal.asset_generation_completed
first_reveal.gate_passed
first_reveal.gate_failed
first_reveal.client_revealed
first_reveal.client_approved
first_reveal.revision_requested
first_reveal.alternate_generated
first_reveal.cost_threshold_warning
```

Client-visible analytics and internal product analytics must remain distinct.

---

# 65. Observability

Track:

```text
median_candidate_generation_time
median_candidate_render_time
median_ready_to_first_reveal
first_reveal_gate_pass_rate
first_candidate_win_rate
alternate_generation_rate
client_first_direction_approval_rate
revision_rate
manual_operator_intervention_rate
average_first_reveal_ai_cost
average_first_reveal_creative_cost
average_first_reveal_total_cost
asset_generation_retry_rate
portfolio_similarity_alert_rate
```

These metrics reveal whether the system is both impressive and economically scalable.

---

# 66. Commercial Success Metrics

Potential business metrics:

```text
preview_to_client_approval_rate
preview_to_launch_rate
onboarding_completion_rate
first_reveal_to_launch_time
first_reveal_revision_cycles
first_reveal_satisfaction
client_retention_after_30_60_90_days
sales_close_rate when first reveal is part of pre-sale/demo workflow
```

Do not infer causality without appropriate evidence.

---

# 67. Vector 24 Integration

The First Reveal System is mandatory for the long-term Vector 24 goal.

A 24-hour launch promise is not impressive if the output is visually generic.

Vector 24 should therefore mean:

```text
fast
+
complete
+
professionally composed
+
operationally correct
```

Recommended Vector 24 launch path:

```text
client intake
→ business extraction
→ Creative QuickStart
→ Vector Ready
→ direction generation
→ candidate scoring
→ winner selection
→ media completion
→ First Reveal Gate
→ client approval
→ domain / launch checks
→ production
```

---

# 68. Pre-Sale Use

The First Reveal engine may eventually support sales demonstrations.

However, avoid implying a full production client site has been created when only public data has been analyzed.

Possible future mode:

```text
Prospect Preview
```

Requirements:

- clear internal distinction from approved client work;
- no invented claims;
- no misuse of copyrighted client materials;
- no accidental publication;
- no assumption of brand approval.

This mode is outside the minimum implementation scope unless separately approved.

---

# 69. Relationship to Document 09 — Funnel Engine Design System

Document 09 remains authoritative for the core funnel engine and page schema.

This First Reveal track adds:

- visual-direction candidates;
- first-reveal lifecycle;
- candidate scoring;
- adaptive composition;
- first-impression QA;
- design confidence;
- portfolio diversity.

The funnel engine should not be forked.

This First Reveal track extends it.

---

# 70. Relationship to Document 17 — Client Onboarding Operations

Document 17 should be updated so onboarding does not end at data collection.

Add:

```text
Vector Ready
→ First Reveal preparation
→ First Reveal
→ Direction approval
→ launch preparation
```

Client onboarding should gather only what is needed to make the first direction credible.

Use progressive disclosure for missing inputs.

---

# 71. Relationship to Document 18 — QA Test Strategy

Add First Reveal-specific tests.

Required categories:

- schema validation;
- component compatibility;
- screenshot generation;
- responsive visual regression;
- accessibility;
- asset fallback;
- missing-logo prevention;
- placeholder prevention;
- generated-media provenance;
- cost ceiling enforcement;
- candidate selection determinism where expected;
- tenant isolation;
- preview noindex;
- analytics test-mode separation.

---

# 72. Relationship to Document 20 — Costs and Usage Limits

Document 20 remains authoritative for platform cost policy.

Add First Reveal usage dimensions:

```text
candidate intelligence
visual review
image generation
image editing
render workflow
asset storage
alternate direction generation
```

Add hard-stop behavior when client or platform cost policy is exceeded.

Fallback should preserve a usable preview where possible using deterministic or existing assets.

---

# 73. Relationship to Document 21 — Roadmap Acceptance Gates

These are **forward track attachments**. They do not reopen an exited phase. Phase mapping is locked in `CROSS_CUTTING_TRACKS.md`.

## Phase 1 calendar, not the exit — FR0–FR2

Phase 1 already exited on the `docs/27` MVP Frontend Release Gate.

Additive: first-reveal page state, logo and approved asset placement, premium hero baseline, typography scale, spacing/density tokens, polished forms, responsive composition.

**Forward attachment:** a Vector Ready client can receive a professional first reveal using authentic or typography-led assets before the first paying-client launch. Not a Phase 1 reopen.

## Phase 4 calendar, not the exit — FR4–FR5

Additive: structured visual-direction generation, candidate scoring rationale, design confidence, structured design review.

**Forward attachment:** AI can propose multiple valid design directions without producing arbitrary frontend code.

## Creative C5–C7 / Phase 5 calendar — FR3, FR6, FR7

Additive: winner asset generation, funnel asset manifest integration, First Reveal Gate creative checks, approval workflow.

**Forward attachment:** the selected direction can receive supporting media and pass visual QA. Not the Phase 5 social-publish exit.

## Phase 7 calendar — FR9 learning

Additive: connect component variants to experiment metrics; preserve winning design learning.

## Phase 9 calendar — FR9 scale

Additive: portfolio similarity guard, adaptive candidate count, low-confidence escalation, first-reveal automation at portfolio scale.

---

# 74. Relationship to Document 22 — Cursor Agent Instructions

Cursor/Grok builds and maintains the reusable frontend capabilities.

Production AI does **not** create arbitrary tenant code.

Required separation:

```text
Cursor/Grok engineering agent
→ creates tested reusable component capabilities

Vector production intelligence
→ chooses approved capabilities through structured schemas

Vector renderer
→ creates tenant page versions
```

New component families must enter through normal engineering review.

---

# 75. Relationship to Document 26 — Vector 24

Document 26 defines the fast-launch operating model.

This First Reveal track adds a critical clarification:

> A client is not meaningfully ready for launch if the website is technically complete but fails the First Reveal visual quality standard.

Add to launch metrics:

```text
median_vector_ready_to_first_reveal
first_reveal_gate_pass_rate
first_direction_approval_rate
manual_design_interventions_per_launch
```

---

# 76. Relationship to Document 27 — Frontend UI/UX & Sales Funnel Standard

Document 27 remains the primary **visual and frontend quality standard**.

This First Reveal track operationalizes its quality bar for the first client-facing preview.

Relationship:

```text
Doc 27
Defines what excellent frontend quality means.

This First Reveal track
Defines how Vector reliably reaches that quality before the client first sees the site.
```

This First Reveal track does not weaken any Doc 27 accessibility, performance, conversion, mobile, or frontend release requirement.

The First Reveal Gate is an additional pre-client gate, not a replacement for the production Frontend Release Gate.

---

# 77. Relationship to Document 28 and Document 29

`docs/28` is Control / Vector **product identity**. The authenticated First Reveal UI (preview, approve, request changes) uses those tokens. Do not paint tenant Delivery pages with Vector Black / Blue.

`docs/29` is the **Creative Engine**. It remains authoritative for:

- asset ingestion;
- generated media;
- deterministic composition;
- derivatives;
- provenance;
- rights;
- creative approval;
- creative cost controls.

This track consumes those capabilities. It does not replace them.

```text
This track determines:
What visual direction and asset slots are needed?

docs/29 determines:
How are those assets sourced, generated, composed, stored, approved, and delivered?

docs/28 determines:
How the operator/client Control reveal screen looks.
```

Do not create a second image-generation subsystem inside this track. Do not call `docs/28` the Creative Engine.

---

# 78. Relationship to Document 30 — Client Experience & Revenue Outcomes

Document 30 establishes:

> Clients should operate growth outcomes, not marketing infrastructure.

This First Reveal track applies the same rule to website creation.

Client should see:

```text
Here is your recommended direction.
Here is why it supports your goal.
Approve or request a simple change.
```

Client should not see:

```text
hero schema
component registry
model prompt
variant score internals
provider settings
```

The reveal experience itself must be simple, understandable, and decision-oriented.

---

# 79. Precedence

When requirements conflict, use this order:

1. Security, privacy, law, tenant isolation.
2. Accessibility and factual integrity.
3. Explicit approved client requirements.
4. Approved client brand rules and rights.
5. Conversion/business objective.
6. Documents 09, 27, 29 (media), 28 (Control chrome), and other applicable domain standards.
7. This First Reveal standard.
8. Individual stylistic preferences, trends, references.

Visual ambition must not override truth or safety.

---

# 80. Required `AGENTS.md` Addition

Append:

```text
## First Reveal and Premium Site Composition

For work involving a newly onboarded client's first website preview,
visual direction generation, candidate website composition, first-impression
quality, automated frontend art direction, page candidate scoring, design
confidence, first-reveal QA, or client website reveal UX, read:

- docs/plans/FIRST_REVEAL_TRACK.md
- docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
- docs/09_FUNNEL_ENGINE_DESIGN_SYSTEM.md
- docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md

Also read the applicable funnel, onboarding, cost, QA, and client UX documents.

Rules:
- Do not show the first successfully rendered draft to a client automatically.
- Do not generate three complete expensive websites by default.
- Generate lightweight structured visual-direction candidates first.
- Prefer one intelligence pass returning multiple candidate manifests.
- Reuse approved knowledge and media across candidates.
- Fully polish and generate expensive missing media for the selected winner only unless policy requires an alternate.
- AI must select validated components through schemas, not write arbitrary production HTML/CSS/JS.
- First Reveal must pass the First Reveal Gate.
- Preserve factual proof integrity.
- Prefer authentic client assets.
- Keep first-reveal cost tenant-attributable and budget-controlled.
- Client reveal UX must use business language, not implementation jargon.
```

---

# 81. Recommended Cursor Rule

Create:

```text
/.cursor/rules/first-reveal-premium-site.mdc
```

Suggested contents:

```text
---
description: Vector first client website reveal, premium composition, design direction, and first-impression quality rules
alwaysApply: false
---

When implementing or changing first client preview generation, visual direction
selection, premium public page composition, first reveal review, page candidate
scoring, visual confidence, asset sufficiency, or client reveal UX, read:

- docs/plans/FIRST_REVEAL_TRACK.md
- docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
- docs/09_FUNNEL_ENGINE_DESIGN_SYSTEM.md
- docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md

Do not create a parallel funnel engine or creative engine.

Use:
business truth
→ page narrative
→ visual-direction manifests
→ validated component variants
→ deterministic render
→ candidate score
→ selected winner
→ winner-only premium media generation
→ First Reveal Gate
→ client reveal

Never default to three fully generated websites.

Do not reveal a page merely because it renders successfully.

Treat the client's first visible website as a product-quality gate.
```

---

# 82. Recommended Documentation Cross-References

Standing law is folded into the charters named in ADR-0012. Keep this track spec as the FR0–FR9 slice file. Do not create `docs/31`.

```text
09_FUNNEL_ENGINE_DESIGN_SYSTEM.md
17_CLIENT_ONBOARDING_OPERATIONS.md
18_QA_TEST_STRATEGY.md
20_COSTS_USAGE_LIMITS.md
21_ROADMAP_ACCEPTANCE_GATES.md
22_CURSOR_AGENT_INSTRUCTIONS.md
26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md
27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md
29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md
30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md
AGENTS.md
CROSS_CUTTING_TRACKS.md
```

---

# 83. Recommended Funnel Engine Additions

To Document 09, add concepts for:

```text
visual_direction_id
candidate_status
first_reveal_status
asset_manifest_version
composition_version
design_confidence
```

Do not duplicate page content versioning.

Attach direction metadata to page versions or composition records according to the actual domain model.

---

# 84. Recommended Onboarding Additions

To Document 17, add:

```text
Creative QuickStart complete
        ↓
Vector Ready
        ↓
Asset Sufficiency evaluated
        ↓
First Reveal generation
        ↓
Client direction approval
```

Do not require the client to select component families.

---

# 85. Recommended QA Additions

To Document 18, add test suites for:

```text
first-reveal gate
candidate schema
candidate diversity
candidate compatibility
asset fallback
low-asset clients
high visual dependency clients
mobile first screen
logo presence
placeholder absence
cost limits
visual regression
preview noindex
client reveal permissions
```

---

# 86. Recommended Cost-Control Additions

To Document 20, add:

```text
first_reveal_candidate_limit
first_reveal_ai_budget
first_reveal_image_budget
first_reveal_visual_review_budget
first_reveal_alternate_budget
first_reveal_retry_limit
```

Cost policy should be configurable by plan/client.

---

# 87. Recommended Roadmap Additions

To Document 21, explicitly treat the following as launch-critical quality work:

```text
premium typography system
premium hero baseline
brand-aware composition
approved media placement
low-asset visual strategy
candidate direction manifests
candidate scoring
First Reveal Gate
client reveal UX
```

Do not defer all frontend craft until after backend automation is complete.

The first reveal materially affects commercial trust.

---

# 88. Recommended Client UX Addition

To Document 30, add a First Reveal card/state.

Example:

```text
YOUR FIRST VECTOR SITE

Ready for review

Vector created a recommended direction based on:
✓ your brand
✓ your primary offer
✓ your target customer
✓ your available media

[Preview Site]
```

After preview:

```text
[Approve Direction]
[Request Changes]
```

---

# 89. Implementation Order

Recommended implementation order:

## FR0 — Audit Existing Delivery

Thin first-client bar (24 Aug 2026): renderer, tokens, components, preview, and logo/media wiring are mapped. Delivery still has no ImageProvider or candidate renderer.

- map current page renderer;
- map current components;
- map tokens;
- map current preview state;
- identify missing logo/media wiring;
- identify generic section patterns.

## FR1 — Premium Foundation

In for the first-client bar: type scale, spacing, radius/shadow, form polish, logo-capable nav via hostname-scoped `/brand-logo`, and mobile hero stacking. Client tokens only; no `docs/28` paint on Delivery.

- typography scale;
- spacing system;
- radius/shadow/motion tokens;
- polished buttons/forms;
- logo-capable navigation;
- responsive hero baseline.

## FR2 — High-Quality Component Variants

In, additive on the Phase 1 engine: `hero-editorial`, `services-editorial`, `proof-featured`, `cta-minimal`. Premium/creative compose uses these. Technology/growth stay `hero-minimal`. Do not reopen the Phase 1 exit.

- 2–4 premium hero variants;
- 2 service variants;
- 2 proof variants;
- 2 CTA variants;
- 1 premium form treatment;
- intentional mobile behavior.

## FR3 — Brand and Asset Wiring

Thin slice in: compose consumes a confirmed C1 profile, persists tenant-scoped `asset_sufficiency_snapshots`, picks authentic / hybrid / typography-led, merges confirmed color and font into page tokens, prefers the confirmed logo for Delivery `/brand-logo`, and forces a typography-led hero when media is thin. Industry visual dependency defaults to medium; do not invent HIGH from a trade name. Operators see strategy + summary on Control `/funnel`, not a numeric score. C5 funnel manifests and approved-derivative slot placement remain later.

- brand visual profile consumption;
- approved asset placement (C5 remainder);
- asset sufficiency;
- media strategy;
- low-asset fallback system.

## FR4 — Visual Direction Manifests

Thin slice in: schema-validated cheap manifests using existing funnel-engine section types only. Compose enumerates three diverse directions from brand personality and FR3 media strategy (Class R0). Split heroes are incompatible with typography-led / no-logo constraints. `visualDirectionProposalSchema` is ready for a later one-shot AI proposal; invalid or cloned AI output falls back to the enumerator. Do not invent `hero-mosaic` or other unrenderable types. AI structured generation of manifests, screenshots, and visual review remain later.

- schema;
- compatibility metadata;
- AI structured generation (remainder: one `generateStructured` call);
- candidate diversity rules.

## FR5 — Candidate Rendering and Scoring

Thin slice in: each cheap manifest is composed in memory on the shared funnel engine. Deterministic integer scores persist on tenant-scoped `page_candidate_scores`. One winner is written as the page draft. Operators see names, rationale, and Strong / Ready / Needs work on Control `/funnel` — not a numeric score and not a client reveal. Screenshots, AI visual review, and FR8 stay later.

- local preview rendering;
- deterministic scoring;
- screenshot generation (later);
- optional AI visual review (later);
- winner selection.

## FR6 — Winner Asset Completion

- selected direction asset manifest;
- Doc 28 integration;
- winner-only expensive generation;
- generation budget enforcement.

## FR7 — First Reveal Gate

Thin first-client bar: deterministic checks (headline, placeholder copy, preview noindex, primary CTA, logo or typography-led hero, known hero). Results persist on `first_reveal_gate_results`. Operators can override with a written reason. Preview publish is not blocked. Screenshots, AI visual review, and client reveal UX are later.

- brand checks;
- first-screen checks;
- visual checks;
- trust checks;
- mobile;
- accessibility;
- performance;
- SEO;
- analytics.

## FR8 — Client Reveal UX

- preview state;
- device switching;
- rationale;
- approval;
- revision request;
- simple feedback controls.

## FR9 — Scale and Learning

- design preference learning;
- outcome learning;
- portfolio similarity guard;
- adaptive candidate count;
- confidence escalation;
- first-reveal metrics.

---

# 90. P0 Before First Paying Client

Minimum P0 target:

- [ ] Logo appears correctly in public preview.
- [ ] Approved client media can render in hero/service/proof slots.
- [ ] Real type scale exists.
- [ ] Spacing rhythm exists.
- [ ] At least two strong hero variants exist.
- [ ] At least one asset-light premium hero exists.
- [ ] At least one editorial services layout exists.
- [ ] At least one professional proof layout exists.
- [ ] Forms are visually polished.
- [ ] Mobile hero is intentional.
- [ ] First Reveal Gate exists.
- [ ] Client does not automatically see the raw first compose result.

This already materially improves onboarding confidence.

---

# 91. P1 After Initial Production Stability

- [ ] Three structured candidate directions.
- [ ] Automated candidate scoring.
- [ ] Design confidence.
- [ ] Asset Sufficiency Score.
- [ ] Industry visual dependency.
- [ ] Winner-only image generation.
- [ ] Client revision presets.
- [ ] First-reveal analytics.

---

# 92. P2 Scale Improvements

- [ ] AI screenshot review.
- [ ] Portfolio similarity guard.
- [ ] Cross-client component performance learning.
- [ ] Adaptive candidate count.
- [ ] Plan-based creative entitlements.
- [ ] Second polished direction for low-confidence cases.
- [ ] richer animation variants.

---

# 93. P3 Advanced Creative Studio Capabilities

Optional later:

- cinematic video heroes;
- sophisticated product storytelling;
- advanced interactive demos;
- 3D where commercially justified;
- complex editorial motion;
- richer adaptive art direction;
- industry-specific high-end component packs.

Do not block core Vector launch on these.

---

# 94. Acceptance Criteria — Architecture

- [ ] AI cannot write arbitrary client production frontend code.
- [ ] Visual directions are schema-validated.
- [ ] Component capability manifest exists.
- [ ] Candidate rendering reuses the shared funnel renderer.
- [ ] Creative media comes from Doc 28 systems.
- [ ] Cost events enter the existing cost ledger.
- [ ] Tenant scope exists on all client-owned records.
- [ ] Preview/publication remain separate.

---

# 95. Acceptance Criteria — Efficiency

- [ ] Normal client does not require three full expensive website generations.
- [ ] Multiple candidate manifests can be produced in one AI call where appropriate.
- [ ] Candidate previews reuse approved media.
- [ ] Premium media generation occurs after winner selection by default.
- [ ] Expensive retries are capped.
- [ ] Caching prevents repeated intelligence work.
- [ ] Reusable approved assets are reused.
- [ ] Alternate polished directions are conditional.

---

# 96. Acceptance Criteria — Visual Quality

- [ ] First screen looks intentionally designed.
- [ ] Typography appears professional.
- [ ] Page does not look like a generic AI template.
- [ ] Brand personality visibly affects design.
- [ ] Section rhythm is intentional.
- [ ] Approved images are actually used where beneficial.
- [ ] Low-asset clients still receive intentional visual treatment.
- [ ] Mobile design is not a simple collapse.
- [ ] Forms are polished.
- [ ] Motion is restrained and purposeful.

---

# 97. Acceptance Criteria — Trust

- [ ] No fabricated proof.
- [ ] No regenerated official logo.
- [ ] Rights/provenance respected.
- [ ] Generated imagery is supporting, not deceptive.
- [ ] Client can understand the design rationale.
- [ ] Client can request changes without technical knowledge.

---

# 98. Acceptance Criteria — First Reveal Product Experience

- [ ] Client sees only a gated high-quality direction by default.
- [ ] Client can preview desktop/mobile.
- [ ] Client can approve quickly.
- [ ] Client can request changes quickly.
- [ ] Internal technical details are hidden.
- [ ] Client-facing language is outcome-oriented.

---

# 99. Definition of Done

The First Reveal feature is not done because Vector can compose a page.

It is done when:

- Vector Ready requirements are enforced;
- asset sufficiency is understood;
- visual direction is structured;
- multiple cheap candidate directions can be evaluated;
- expensive generation is concentrated on the winner;
- the selected page passes the First Reveal Gate;
- client sees a polished preview;
- client can approve or revise simply;
- cost is tenant-attributable;
- low-confidence cases escalate safely;
- mobile, accessibility, performance, analytics, and trust rules remain intact;
- output does not visibly collapse into one repeated template across clients.

---

# 100. Cursor Work Item Template

Use for First Reveal implementation tasks.

```text
## First Reveal Work Item

### Goal

### Client-facing impact

### Existing repository paths inspected

### Related documents
- Doc 09
- Doc 17
- Doc 18
- Doc 20
- Doc 21
- Doc 26
- Doc 27
- Doc 28 (Control chrome)
- Doc 29 (Creative Engine)
- Doc 30
- FIRST_REVEAL_TRACK.md

### Existing components reused

### New reusable capability required

### Visual-direction schema impact

### Candidate cost impact

### Asset requirements

### Mobile behavior

### Accessibility

### Performance

### First Reveal Gate impact

### Tests

### Acceptance criteria

### Documentation updated
```

---

# 101. Master Cursor Implementation Prompt

```text
Implement the VECTOR First Reveal & Premium Site Composition System.

READ FIRST:
- docs/09_FUNNEL_ENGINE_DESIGN_SYSTEM.md
- docs/17_CLIENT_ONBOARDING_OPERATIONS.md
- docs/18_QA_TEST_STRATEGY.md
- docs/20_COSTS_USAGE_LIMITS.md
- docs/21_ROADMAP_ACCEPTANCE_GATES.md
- docs/22_CURSOR_AGENT_INSTRUCTIONS.md
- docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md
- docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
- docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md
- docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md
- docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md
- docs/plans/FIRST_REVEAL_TRACK.md
- docs/plans/CROSS_CUTTING_TRACKS.md

BEFORE CODING:
1. Inspect the actual page renderer.
2. Inspect page schemas and page_versions.
3. Inspect current component families and variants.
4. Inspect brand/theme tokens.
5. Inspect asset storage and asset manifests.
6. Inspect onboarding readiness logic.
7. Inspect AIProvider and cost ledger.
8. Inspect preview/publication states.
9. Inspect frontend QA and visual test infrastructure.
10. Map actual repository paths before proposing changes.

ARCHITECTURAL RULE:
Do not create a second funnel engine, creative engine, cost ledger, or AI layer.
Extend the existing systems.

TARGET FLOW:
Vector Ready
→ asset sufficiency
→ page narrative
→ 2–3 structured visual-direction candidates
→ deterministic preview render
→ candidate scoring
→ winner selection
→ winner-only expensive missing-media generation
→ final compose
→ First Reveal Gate
→ client reveal
→ approval/revision

COST RULE:
Do not generate three full websites by default.
The normal path generates multiple cheap manifests and only one fully polished winner.

AI RULE:
Production AI may select approved component capabilities through validated schemas.
It may not write arbitrary tenant production HTML/CSS/JS.

QUALITY RULE:
The first successfully rendered page is not automatically client-ready.
A first reveal must pass the First Reveal Gate.

TRUST RULE:
Do not fabricate proof, clients, team members, metrics, facilities, results, partner logos, or testimonials.

IMPLEMENT IN STAGES:
FR0 audit
FR1 premium foundation
FR2 premium component variants
FR3 brand/asset wiring
FR4 visual-direction manifests
FR5 candidate rendering/scoring
FR6 winner asset completion
FR7 First Reveal Gate
FR8 client reveal UX
FR9 scale/learning

FOR EVERY BATCH REPORT:
- files inspected;
- files changed;
- domain changes;
- migrations;
- components reused;
- new components;
- candidate cost behavior;
- tenant isolation impact;
- mobile behavior;
- accessibility;
- performance;
- tests;
- remaining work;
- docs updated.
```

---

# 102. Recommended Decision Log Entry

Add to `23_DECISION_LOG.md`:

```text
Decision:
Vector will not generate multiple complete expensive website directions for every client by default.

Rationale:
Multiple complete generations create unnecessary AI, image, workflow, storage, and QA cost.

Chosen approach:
Adaptive Candidate Generation.
Vector produces 2–3 lightweight structured visual-direction manifests, renders them using existing components and approved media, scores them, and fully polishes the strongest candidate. Expensive missing-media generation occurs only after winner selection unless low confidence or client entitlement requires additional polished directions.

Consequences:
- lower per-client cost;
- faster first reveal;
- maintained design diversity;
- cleaner auditability;
- easier cost attribution;
- less client decision fatigue;
- preserves ability to offer premium multiple-direction packages later.
```

---

# 103. Recommended Risk Register Additions

Add to `24_RISK_REGISTER.md`.

## Risk: Generic AI Website Appearance

**Impact:** High  
**Mitigation:** premium component grammar, First Reveal Gate, portfolio similarity guard, brand-aware direction generation.

## Risk: First Preview Damages Client Confidence

**Impact:** High  
**Mitigation:** do not expose raw first compose; first-reveal lifecycle; visual QA; low-confidence escalation.

## Risk: Creative Generation Cost Explosion

**Impact:** Medium–High  
**Mitigation:** winner-only expensive media generation, candidate limits, retries, budget policy, caching, reuse.

## Risk: Portfolio Template Sameness

**Impact:** Medium–High  
**Mitigation:** component variants, direction fingerprinting, compatibility rules, portfolio similarity check.

## Risk: Fake or Misleading Generated Proof

**Impact:** High  
**Mitigation:** proof integrity rules, provenance, human approval where appropriate, generation restrictions.

## Risk: Visually Rich but Poor-Converting Pages

**Impact:** Medium  
**Mitigation:** conversion score, page narrative, CRO loop, outcome learning.

## Risk: Strong Desktop / Weak Mobile

**Impact:** High  
**Mitigation:** component-level mobile strategy and First Reveal mobile gate.

---

# 104. Recommended Glossary Additions

Add to `25_GLOSSARY.md`:

### First Reveal

The first client-facing website/funnel preview that has passed Vector's dedicated first-impression quality gate.

### Visual Direction

A structured configuration describing the art direction, component variants, typography, density, media strategy, motion, and page composition for a client page.

### Candidate Manifest

A lightweight machine-readable visual direction used for comparison before expensive final asset generation.

### Asset Sufficiency Score

A measure of whether the client has enough appropriate visual material for the desired presentation strategy.

### Design Confidence

Vector's confidence that the selected visual direction is appropriate and ready for client review.

### First Reveal Gate

The mandatory pre-client visual, conversion, trust, mobile, accessibility, performance, SEO, analytics, and brand quality check.

### Adaptive Candidate Generation

Vector's cost-efficient process of generating multiple cheap design-direction candidates and fully polishing only the strongest candidate unless additional directions are justified.

---

# 105. Final Operating Model

The intended end-state is:

```text
CLIENT BUSINESS TRUTH
        +
CLIENT BRAND
        +
CLIENT ASSETS
        +
VECTOR KNOWLEDGE
        ↓
PAGE NARRATIVE
        ↓
VISUAL-DIRECTION INTELLIGENCE
        ↓
2–3 LIGHTWEIGHT CANDIDATES
        ↓
VECTOR DESIGN GRAMMAR
        ↓
DETERMINISTIC PREVIEW RENDER
        ↓
QUALITY + CONVERSION SCORING
        ↓
SELECT WINNER
        ↓
WINNER-ONLY PREMIUM MEDIA COMPLETION
        ↓
FIRST REVEAL GATE
        ↓
CLIENT REVEAL
        ↓
APPROVAL / FAST REVISION
        ↓
PRODUCTION RELEASE GATE
        ↓
PUBLISH
        ↓
MEASURE
        ↓
LEARN
```

This architecture is deliberately different from:

```text
prompt
→ generate one random AI website
→ show client
```

and from:

```text
generate three complete expensive websites
→ ask client to choose
```

The Vector model is:

> **Explore cheaply. Choose intelligently. Polish selectively. Reveal only when excellent enough. Measure what happens afterward.**

---

# 106. Final Strategic Principle

Vector's intelligence, analytics, automation, and revenue systems create the long-term value.

But the client's first visible website may be the moment that determines whether they trust the rest of the system.

Therefore:

> **First impression is not decoration. It is part of product activation, client confidence, and commercial conversion.**

Vector should be engineered so that a Vector Ready client does not merely receive a functioning page.

They should receive a first direction that feels:

```text
intentional
professional
on-brand
modern
credible
conversion-aware
mobile-ready
and worth paying for
```

The sustainable way to achieve this is not unlimited generative design.

It is:

```text
excellent reusable frontend craft
+
structured design intelligence
+
authentic or carefully governed media
+
adaptive candidate selection
+
deterministic rendering
+
strict first-reveal QA
+
measured learning
```

That is the standard This First Reveal track establishes.
