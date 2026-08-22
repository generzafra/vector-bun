# Vector Growth OS — Hero and Product Visual Language

**Document type:** Permanent implementation standard  
**Applies to:** Vector Control Plane product UI; Vector-native intelligence, opportunity, automation, and activity visuals; a future Vector software-marketing surface if that surface is built  
**Does not apply as identity to:** Delivery Plane client sites, preview hosts, or the MGE marketing site  
**Brand:** VECTOR  
**Product descriptor:** Growth OS / Growth Operating System  
**Primary stack:** Bun.js, Svelte 5, TypeScript  
**Status:** Standing Control / Vector-identity standard  
**Last updated:** 22 August 2026  
**Required by:** `AGENTS.md`, Control Cursor rules, Control Definition of Done  
**Recommended repository location:** `/docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md`  
**Companion quality standard:** `docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md`  
**Companion creative production standard:** `docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md` — client campaign media, not Control identity. Do not paint tenant domains with Vector Black / Blue.  
**Companion client outcomes standard:** `docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md` — authenticated client IA and copy. Those screens use this document’s tokens.  
**Living implementation artifacts:** `docs/frontend/VECTOR_FRONTEND_MAP.md`, `VECTOR_COMPONENT_INVENTORY.md`, `VECTOR_UI_MIGRATION_STATUS.md`  
**Primary design reference:** Approved VECTOR brand identity mockup with dark interface, electric blue vector geometry, signal-to-growth visualization, and premium enterprise AI aesthetic.

---

# A. Binding repository scope

This document is the VECTOR **product identity** contract. It is not a second public-site identity.

| Surface                                       | Identity                        | Quality / conversion                |
| --------------------------------------------- | ------------------------------- | ----------------------------------- |
| Control Plane (`apps/control`)                | This document                   | Operational, not cinematic          |
| Delivery Plane client sites (`apps/delivery`) | Client brand tokens (`docs/09`) | `docs/27`                           |
| MGE marketing site                            | MGE brand                       | `docs/27` when operated as a tenant |
| Future Vector software marketing              | This document                   | `docs/27`                           |

Two token layers:

1. **Capability tokens** — spacing, radius, motion, section variants, accessibility. Shared engine. This is what “Vector design tokens” means for Delivery.
2. **Identity tokens** — Vector Black, Blue, Cyan, Mint grammar. Control only. Never the default on `theircompany.com`.

Do not replace Delivery `hero-minimal` / `hero-split` with the Vector signal-to-growth hero.

Official PNG or SVG artwork may replace the interim Vector mark later. Until then, Control uses the SVG mark. Do not block implementation on raster assets.

---

# B. This repository's code mapping

The visual contract below recommends `src/lib/vector/`. This monorepo maps those responsibilities to:

```text
packages/ui/src/tokens/      canonical Control identity tokens
apps/control/src/lib/vector  Control primitives and shell
apps/delivery                client renderer — not this identity
```

Current Control routes are Overview, Clients, Knowledge, Funnel, Launch, Members, and Login. Future information architecture follows master plan §28, not a fictional `/app` tree.

---

# C. Precedence

When requirements conflict, use this order:

1. Security, privacy, legal, accessibility, data integrity, and tenant isolation.
2. Explicit feature/business requirements.
3. Functional usability.
4. This document for Control / Vector identity.
5. `docs/27` for public experience quality.
6. Local implementation preference.

---

# D. Phasing

The existing Control shell may adopt this language now. Do not invent Opportunities, Automation, Intelligence, charts, or a Vector marketing homepage in the first Control visual-language slice. Phase 1 Delivery exit is unchanged. A Control restyle does not reopen Phase 0 or Phase 1 gates.

---

# E. How to read sections 0–114

Sections 0–114 remain the detailed token, hero, motion, and component contract.

- Where they say “PUBLIC Homepage / Product / Pricing,” read that as a **future Vector marketing surface**, not current Delivery.
- Where they say `src/lib/vector/`, use the mapping in §B.
- Where they require the signature hero SVG, that is not a Delivery section variant.

---

# VECTOR Growth OS

## Website Hero + In-Product Visual Language Implementation Standard

**Document type:** Frontend implementation standard  
**Brand:** VECTOR  
**Product descriptor:** Growth OS / Growth Operating System  
**Primary stack:** Bun.js, Svelte 5, TypeScript  
**Status:** Repo-wide implementation and integration standard  
**Primary design reference:** Approved VECTOR brand identity mockup with dark interface, electric blue vector geometry, signal-to-growth visualization, and premium enterprise AI aesthetic.

---

# 0. Repo-Wide Authority and Wiring

This file is a **repo-wide frontend implementation contract** for VECTOR, not only a hero or visual-reference document.

It must be used together with:

```text
VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
```

The two standards have separate responsibilities:

| Standard                                                    | Primary responsibility                                                                                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md`            | General frontend quality, UX, conversion architecture, page storytelling, mobile-first behavior, accessibility, performance, and anti-generic-AI design rules   |
| `VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE_IMPLEMENTATION.md` | VECTOR-specific brand semantics, design tokens, signal-to-growth grammar, product shell, charts, motion, branded components, and repo-wide visual-system wiring |
| Feature/project specifications                              | Business logic, data, permissions, API behavior, workflows, and feature acceptance criteria                                                                     |

## 0.1 Precedence

When requirements conflict, use this order:

1. Security, privacy, legal, accessibility, and data integrity.
2. Explicit feature/business requirements.
3. Functional usability.
4. This VECTOR visual-language standard.
5. The general frontend/funnel standard.
6. Local implementation preference.

## 0.2 Repo-Wide Rule

No feature or route may independently invent recurring:

- brand colors;
- semantic status colors;
- typography scales;
- spacing;
- radius;
- shadows;
- chart colors;
- motion timing;
- motion easing;
- loading behavior;
- focus behavior;
- VECTOR signal geometry;
- CTA treatment;
- dashboard shell styling.

Those belong in shared source-of-truth modules.

## 0.3 Scope

This standard governs:

```text
PUBLIC
├── Homepage
├── Product
├── Solutions
├── Industries
├── Pricing
├── Case Studies
├── Demo / Contact
├── Campaign Landing Pages
└── Public Product Demonstrations

AUTHENTICATED PRODUCT
├── Overview
├── Opportunities
├── Campaigns
├── Analytics
├── Content
├── Automation
├── CRM
├── Intelligence / Agents
├── Integrations
├── Reports
├── Settings
└── Onboarding

SHARED UI
├── Navigation
├── Buttons
├── Forms
├── Tables
├── Dialogs
├── Drawers
├── Tooltips
├── Cards
├── Charts
├── Loading
├── Empty States
├── Error States
└── Responsive Behavior
```

## 0.4 Architectural Goal

The codebase must mirror the visual discipline:

```text
TOKENS
  ↓
PRIMITIVES
  ↓
SHARED CONTROLS / DATA DISPLAY / MOTION
  ↓
VECTOR BRAND + MARKETING + PRODUCT COMPONENTS
  ↓
FEATURE COMPONENTS
  ↓
ROUTES
```

Feature routes consume the design system. They do not become alternative design systems.

---

# 1. Purpose

This document defines how to implement the approved VECTOR visual direction across:

1. The public marketing website hero.
2. The core in-product/dashboard visual language.
3. Shared motion, data visualization, iconography, typography, spacing, surfaces, and interaction behaviors.
4. The reusable visual primitives that make VECTOR look like one coherent operating system rather than a collection of generic SaaS screens.
5. Responsive behavior for desktop, tablet, and mobile.
6. Engineering constraints and acceptance criteria so that future frontend work stays faithful to the brand.

The intended result is a premium, dark, precise, technical, enterprise-grade interface that communicates:

> VECTOR takes fragmented business signals, applies intelligence and orchestration, directs execution, and produces measurable growth.

The visual system must feel like **infrastructure controlling AI**, not like a novelty AI tool.

---

# 2. Brand Positioning to Express Through UI

Every page and product screen should visually reinforce the following ideas:

- **Direction** — VECTOR determines where effort should go.
- **Precision** — UI is orderly, aligned, quantitative, and intentional.
- **Signal intelligence** — disconnected inputs are collected and understood.
- **Orchestration** — multiple channels move through one coordinated system.
- **Acceleration** — outcomes improve through guided execution.
- **Observability** — the operator can see what the system is doing.
- **Control** — automation is powerful but never visually chaotic.
- **Trust** — interfaces resemble serious business infrastructure rather than speculative AI.

The product should not depend on decorative visuals to communicate sophistication. The design should be impressive because of proportion, composition, data clarity, motion quality, and restraint.

---

# 3. Core Visual Thesis

The entire VECTOR visual system is built around one repeated transformation:

```text
SIGNALS -> CONNECTION -> INTELLIGENCE -> DIRECTION -> GROWTH
```

This transformation should appear in different forms throughout the product:

- Website hero visualization.
- Loading and processing states.
- Campaign orchestration diagrams.
- Analytics flows.
- Automation builders.
- AI reasoning summaries.
- Opportunity recommendations.
- CRM-to-campaign relationships.
- System activity feeds.
- Empty states.
- Product onboarding.

Do not repeat the exact same diagram everywhere. Reuse the underlying grammar:

- dots = signals / entities / events
- lines = relationships / movement
- convergence = VECTOR intelligence
- arrow / V = chosen direction
- green result = successful outcome

---

# 4. Color System

## 4.1 Primary Brand Palette

| Token               |       Hex | Purpose                    |
| ------------------- | --------: | -------------------------- |
| `--vector-black`    | `#070A0F` | Primary background         |
| `--vector-graphite` | `#111720` | Elevated panels and cards  |
| `--vector-blue`     | `#1677FF` | Core brand action color    |
| `--vector-cyan`     | `#35D9FF` | Signal/intelligence accent |
| `--vector-mint`     | `#32E6A1` | Positive outcome / growth  |
| `--vector-white`    | `#F4F7FA` | Primary text               |
| `--vector-steel`    | `#8995A5` | Secondary text             |

## 4.2 Extended Functional Tokens

Recommended implementation values:

```css
:root {
	--bg-0: #070a0f;
	--bg-1: #0a0f16;
	--bg-2: #0d131c;
	--surface-1: #111720;
	--surface-2: #151d28;
	--surface-3: #1a2430;

	--text-primary: #f4f7fa;
	--text-secondary: #a9b3c0;
	--text-tertiary: #748091;
	--text-disabled: #566171;

	--border-subtle: rgba(164, 184, 207, 0.1);
	--border-default: rgba(164, 184, 207, 0.16);
	--border-strong: rgba(164, 184, 207, 0.26);

	--blue-500: #1677ff;
	--blue-400: #3e8eff;
	--cyan-400: #35d9ff;
	--mint-400: #32e6a1;
	--amber-400: #f4b860;
	--red-400: #ff6b6b;

	--blue-glow: rgba(22, 119, 255, 0.32);
	--cyan-glow: rgba(53, 217, 255, 0.24);
	--mint-glow: rgba(50, 230, 161, 0.22);
}
```

## 4.3 Color Semantics

Never use accent colors only for decoration.

- **Blue** = primary control, active selection, VECTOR-directed action.
- **Cyan** = signal detection, AI processing, connection, informational intelligence.
- **Mint** = successful output, revenue growth, positive deltas, completed execution.
- **Amber** = attention / moderate risk / needs review.
- **Red** = failure / destructive / serious risk.
- **White** = important information.
- **Steel** = supporting context.

Do not make growth mint a dominant branding color. It is reserved for positive outcomes so it retains meaning.

---

# 5. Gradient Rules

VECTOR may use gradients, but they must be controlled and rare.

Approved brand gradient:

```css
background: linear-gradient(135deg, #1677ff 0%, #35d9ff 100%);
```

Optional prestige gradient for selected hero/launch surfaces:

```css
background: linear-gradient(135deg, #1677ff 0%, #635bff 50%, #35d9ff 100%);
```

Rules:

- Never gradient-fill body text.
- Never gradient-fill every button.
- Never use large rainbow or aurora backgrounds.
- Avoid purple-dominant AI clichés.
- Use gradient mainly for the Vector mark, a key line, selected focal glow, or rare hero emphasis.

---

# 6. Typography

## 6.1 Recommended Type System

Preferred practical implementation:

- **Primary UI / body:** Inter or Geist.
- **Display / hero:** Geist, Inter Tight, or another modern neo-grotesk.
- **Data / technical metadata:** IBM Plex Mono or Geist Mono.

The custom VECTOR wordmark should not be recreated as live text once final artwork exists. Use the official SVG logo.

## 6.2 Type Scale

Desktop guidance:

```text
Hero display        64–76px / 0.95–1.02 line-height / 650–750 weight
H1                  48–60px / 1.05
H2                  36–44px / 1.10
H3                  28–32px / 1.15
Card title           15–18px / 1.35 / 550–650
Body                 15–17px / 1.55
Small                13–14px / 1.45
Meta                 11–12px / 1.35
Metric               26–44px / 1.00 / 600–700
Mono status          11–13px / 1.35
```

Mobile guidance:

```text
Hero display         42–52px
H1                   36–44px
H2                   30–36px
Body                 15–16px
Metric               24–34px
```

## 6.3 Typography Behavior

Use tight display typography and generous body line-height.

Do not:

- set entire UI in monospace,
- use excessive letter spacing on paragraphs,
- use thin font weights on dark backgrounds,
- use all caps for long labels.

Use uppercase or tracked text only for small system labels such as:

```text
SYSTEM ACTIVITY
SIGNAL DETECTED
CAMPAIGN HEALTH
LAST SYNC 08:42:17
```

---

# 7. Spacing and Layout System

Use an 8px baseline.

Recommended spacing tokens:

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 64, 80, 96, 128
```

Desktop page container:

```css
max-width: 1440px;
padding-inline: clamp(24px, 4vw, 72px);
margin-inline: auto;
```

Marketing content readable width:

```css
max-width: 1240px;
```

Dashboard content should be fluid and use available screen width intelligently rather than forcing a narrow marketing container.

---

# 8. Border Radius

VECTOR should not look overly soft.

Recommended:

```text
Small controls:     8px
Buttons:           10px
Cards:             12px
Large panels:      14–16px
Pills:             999px only when semantically appropriate
```

Avoid the generic “everything 24px rounded” SaaS aesthetic.

---

# 9. Borders, Depth and Elevation

Cards should be distinguished mostly with:

- one-pixel low-contrast borders,
- small luminance differences,
- restrained inner highlights,
- minimal shadow.

Recommended card shell:

```css
background:
	linear-gradient(180deg, rgba(255, 255, 255, 0.028) 0%, rgba(255, 255, 255, 0.012) 100%), #111720;

border: 1px solid rgba(164, 184, 207, 0.12);
box-shadow:
	0 10px 30px rgba(0, 0, 0, 0.2),
	inset 0 1px 0 rgba(255, 255, 255, 0.025);
```

Avoid visible glass blur on every card. Use backdrop blur only for floating overlays, menus, sticky headers, or transient layers.

---

# 10. VECTOR Grid and Background Texture

The hero and selected data surfaces can use a subtle technical grid.

Example:

```css
.vector-grid {
	background-image:
		linear-gradient(rgba(93, 123, 154, 0.06) 1px, transparent 1px),
		linear-gradient(90deg, rgba(93, 123, 154, 0.06) 1px, transparent 1px);
	background-size: 40px 40px;
}
```

Grid rules:

- 3–8% effective opacity.
- Never interfere with text legibility.
- Fade out with a mask toward panel edges.
- Use it in hero visualizations, orchestration canvases, and empty-state technical diagrams.

---

# 11. Shared Visual Primitives

Build the following as reusable primitives.

## 11.1 Signal Node

Represents a lead, event, source, account, campaign, channel, metric, or external signal.

Visual properties:

- 6–10px core dot.
- Cyan or blue.
- Optional glow.
- Optional outer pulse for newly detected signals.

States:

- idle
- detected
- active
- processing
- selected
- muted
- error

## 11.2 Vector Line

Represents relationship or movement.

Properties:

- 1px default.
- 1.5px active.
- muted steel at rest.
- blue/cyan when active.
- optional moving dash / traveling light for execution state.

## 11.3 Direction Arrow

Represents the chosen path or next action.

Use a custom SVG language consistent with the V mark rather than generic icon library arrows for major branded moments.

## 11.4 Outcome Node

Represents business result.

Examples:

- revenue
- conversion
- booked call
- qualified lead
- SEO gain
- retention

Positive outcome uses mint.

## 11.5 Vector Field

A set of multiple fine lines converging into a single focal point.

Use for:

- hero visual,
- AI analysis state,
- opportunity discovery,
- system processing transition,
- campaign orchestration.

Keep line count controlled: usually 5–12 visible lines.

---

# 12. WEBSITE HERO — Composition

The approved hero should be implemented as a two-column layout on wide screens.

## 12.1 Desktop Composition

Approximate ratio:

```text
Left copy:          42–46%
Right visualization:54–58%
```

Vertical alignment should be centered within the initial viewport, but the hero should not be artificially forced to exactly 100vh on small laptops.

Recommended desktop hero height:

```css
min-height: min(860px, calc(100svh - 72px));
```

## 12.2 Left Column

Recommended content hierarchy:

1. Small eyebrow or status label.
2. Primary hero headline.
3. Short product explanation.
4. Primary CTA.
5. Secondary CTA.
6. Optional proof / trust row below.

Suggested approved headline structure:

```text
One System.
From Signal
To Growth.
```

“Growth.” may use Vector Blue or a blue-cyan treatment while the rest remains white.

Supporting statement:

```text
VECTOR is the Growth Operating System that connects your data,
automates execution, and drives measurable results.
```

Keep paragraph width around 460–520px.

## 12.3 CTA Styling

Primary CTA:

- Vector Blue background.
- White label.
- 44–48px height.
- 10px radius.
- Small directional arrow icon on hover if desired.
- Glow should be almost invisible at rest and increase subtly on hover.

Secondary CTA:

- transparent / dark surface.
- thin border.
- white or light gray text.

Hover should feel responsive within 120–180ms.

---

# 13. WEBSITE HERO — Right-Side Signal-to-Growth Visualization

This is the signature feature of the hero and should not be replaced with a generic screenshot.

## 13.1 Structure

Left side of visualization:

```text
TRAFFIC
SEO
ADS
CONTENT
CRM
ANALYTICS
```

Each source has:

- source label,
- signal node,
- curved or angled connecting line.

Those paths converge toward a Vector intelligence point or the VECTOR mark.

Then a directional arrow leads into an outcome card such as:

```text
REVENUE
+31.42%
```

An optional mini line chart can sit beneath the result.

## 13.2 SVG First

Implement this primarily with SVG rather than canvas for:

- responsive scaling,
- crisp geometry,
- accessibility,
- easier line animation,
- easier theme control,
- lower complexity.

Canvas/WebGL is unnecessary for v1 unless performance measurements prove otherwise.

## 13.3 Animation Sequence

Recommended initial animation on first viewport entry:

### Phase 1 — Signals

Duration: 350–500ms.

Source nodes appear in slight stagger.

### Phase 2 — Connections

Duration: 550–800ms.

Paths draw from source nodes toward convergence point using SVG stroke-dashoffset.

### Phase 3 — Intelligence

Duration: 300–450ms.

Convergence point intensifies and VECTOR mark becomes visible.

### Phase 4 — Direction

Duration: 350–500ms.

Forward arrow/path draws toward outcome.

### Phase 5 — Growth

Duration: 450–700ms.

Outcome value counts or fades in and the mini growth line completes.

Total target animation duration:

```text
~2.0–2.8 seconds
```

Do not make users wait for completion before interacting.

## 13.4 Ambient Motion

After the entrance animation:

- occasional subtle traveling pulses may move through source lines,
- one or two signal nodes may breathe gently,
- outcome number remains stable,
- no continuous exaggerated movement.

The hero should feel alive, not busy.

---

# 14. Hero Responsive Behavior

## 14.1 Tablet

Below approximately 1024px:

- reduce headline width,
- scale visualization down,
- preserve two columns until content feels crowded,
- allow source labels to shorten if necessary.

## 14.2 Mobile

Below approximately 768px:

Stack:

```text
Navigation
Hero text
CTA row
Signal-to-growth visual
Proof/trust content
```

Mobile hero visualization should not reproduce all desktop labels at tiny scale.

Recommended mobile sources:

```text
TRAFFIC
CONTENT
CRM
ADS
```

or use compact icon/label chips.

The visual should remain understandable without pinch zoom.

Animation durations should be shortened by ~20–30% on mobile.

## 14.3 Reduced Motion

Respect:

```css
@media (prefers-reduced-motion: reduce);
```

In reduced-motion mode:

- show all nodes and lines immediately,
- remove traveling pulses,
- use opacity transitions only,
- do not animate counting numbers aggressively.

---

# 15. Hero Svelte 5 Component Architecture

Recommended structure:

```text
src/lib/components/vector/
  HeroVector.svelte
  VectorMark.svelte
  VectorSignalGraph.svelte
  SignalNode.svelte
  VectorPath.svelte
  OutcomeMetric.svelte
  MetricSparkline.svelte
  VectorGrid.svelte
```

Hero composition:

```text
HeroVector
├── HeroCopy
│   ├── Eyebrow
│   ├── Heading
│   ├── SupportingCopy
│   └── CTAGroup
└── VectorSignalGraph
    ├── SourceNodes[]
    ├── VectorPaths[]
    ├── ConvergenceMark
    ├── DirectionPath
    └── OutcomeMetric
```

Prefer semantic HTML for copy and SVG for the graph.

---

# 16. In-Product Visual Language — Overall Dashboard

The product interface should feel like an operational command environment.

Primary areas:

1. Global navigation / workspace identity.
2. Sidebar or adaptive product navigation.
3. Page header.
4. KPI scorecard row.
5. Primary insight or performance chart.
6. System activity / execution feed.
7. Secondary modules.

The visual hierarchy should make the user feel they can answer three questions immediately:

1. What is happening?
2. What matters most?
3. What is VECTOR doing about it?

---

# 17. Dashboard Shell

## 17.1 Desktop

Recommended shell:

```text
┌──────────────────────────────────────────────────────────┐
│ top bar / workspace actions                              │
├─────────────┬────────────────────────────────────────────┤
│ sidebar     │ page content                               │
│             │                                            │
│             │                                            │
└─────────────┴────────────────────────────────────────────┘
```

Sidebar width:

```text
220–248px expanded
72–80px compact
```

Main content minimum padding:

```text
24px desktop
16px small desktop/tablet
```

## 17.2 Mobile

Use bottom navigation or drawer navigation depending on number of top-level sections.

Do not compress the desktop sidebar into an unusable narrow strip.

---

# 18. Dashboard Navigation Styling

Active item:

- blue-tinted background.
- thin blue edge or subtle inner highlight.
- primary text white.
- icon blue/cyan.

Inactive:

- transparent.
- tertiary/secondary text.
- icon slightly muted.

Avoid large glowing selected states.

Navigation groups may include:

```text
Overview
Opportunities
Campaigns
Analytics
Content
Automation
CRM
Agents / Intelligence
Settings
```

Final information architecture may evolve, but all sections should use the same navigation behavior.

---

# 19. KPI Cards

The mockup uses compact KPI cards such as:

```text
Revenue
$1.42M
+31.42%
```

Recommended anatomy:

1. Label.
2. Primary metric.
3. Delta.
4. Optional context or comparison period.
5. Optional miniature sparkline.

Do not overload KPI cards with icons, illustrations, gradients, or large badges.

### Example visual hierarchy

```text
Revenue                  12px secondary
$1.42M                   30px primary
+31.42% vs prior period  12px mint
```

Positive/negative status should not rely only on color. Include arrow, sign, or text.

---

# 20. Analytics Charts

VECTOR charts should be clear first, branded second.

## 20.1 Line Charts

- primary series: Vector Blue.
- secondary series: steel/cyan.
- positive goal line: mint if useful.
- thin gridlines.
- minimal axis labels.
- no giant legends unless multiple series require them.
- selected data point can use cyan glow.

## 20.2 Bar Charts

- neutral bars by default.
- selected/primary bar in blue.
- positive benchmark may use mint.

## 20.3 Tooltips

Dark elevated tooltip:

```text
MAY 14
Revenue       $42,310
Conversion      3.84%
ROAS            4.32x
```

Technical meta may use mono font.

## 20.4 No 3D Charts

Never use 3D pie charts, fake depth, or decorative data distortion.

---

# 21. System Activity Feed

This is one of the most important visual-language components because it makes VECTOR feel alive.

Example activity states:

```text
Signal Detected
New high-intent traffic cluster identified.

VECTOR AI Processing
Evaluating campaign and CRM relationships.

Action Executed
Budget reallocated to higher-converting channel.

Result
Revenue increased +31.42%.
```

Color semantics:

- detected = cyan
- processing = blue
- executed = blue/cyan
- positive result = mint
- warning = amber
- failed = red

Each feed item should have:

- small state marker,
- concise state title,
- short explanation,
- optional timestamp,
- optional “View” action.

Avoid chat-bubble styling. This is an operations log, not a conversational AI interface.

---

# 22. VECTOR AI / Intelligence States

When the system is analyzing, use branded visual signals rather than generic spinning sparkles.

Recommended processing state:

- several nodes appear,
- paths converge,
- focal V or central node glows softly,
- status text explains the current phase.

Example:

```text
Connecting campaign and CRM signals…
Evaluating 14,822 recent events…
Ranking 23 growth opportunities…
Preparing recommended actions…
```

Do not imply hidden certainty. If intelligence is probabilistic, show confidence/quality where relevant.

---

# 23. Opportunity Cards

Opportunity cards should feel like machine-assisted strategic recommendations.

Recommended fields:

```text
Opportunity title
Potential impact
Confidence
Affected channels
Reason detected
Recommended action
Expected metric movement
CTA: Review / Approve / Execute
```

Example:

```text
Shift paid budget toward high-intent organic traffic

Projected impact     +8–12% qualified leads
Confidence           87%
Signals              SEO · CRM · Paid Search

VECTOR detected rising conversion from 3 landing-page clusters
while paid CPC increased 14%.
```

Use blue for recommendation/control and mint only for realized or projected positive impact.

---

# 24. Automation / Orchestration Visuals

Automation interfaces should reuse Vector nodes and paths.

Concept:

```text
Trigger -> Evaluate -> Decide -> Execute -> Measure
```

Use thin connection paths with clear directional flow.

Avoid copying generic no-code automation products verbatim. VECTOR nodes should feel more analytical and less like colorful Lego blocks.

Recommended node appearance:

- dark card body,
- 12px radius,
- 1px border,
- compact icon,
- clear title,
- tiny metadata line,
- connector node in cyan/blue.

---

# 25. Buttons and Controls

## 25.1 Primary Button

```text
Background: Vector Blue
Text: White
Height: 40–48px
Radius: 8–10px
```

## 25.2 Secondary

```text
Dark surface
Thin border
White/secondary text
```

## 25.3 Tertiary

No surface until hover.

## 25.4 Destructive

Red only for genuine destructive action.

## 25.5 Button Motion

- hover: 120–180ms.
- press: 80–120ms.
- optional translateY(-1px) on hover only for marketing CTAs, not dense dashboard controls.

---

# 26. Inputs

Inputs should use:

- graphite/dark fill,
- subtle border,
- white primary value,
- steel placeholder,
- blue focus ring.

Focus:

```css
box-shadow: 0 0 0 3px rgba(22, 119, 255, 0.18);
border-color: rgba(22, 119, 255, 0.75);
```

Never rely on glow alone for focus accessibility.

---

# 27. Tables

VECTOR tables should prioritize operational scanability.

Recommended:

- 44–52px row height.
- sticky header on long datasets.
- subtle row separators.
- hover surface.
- mono for IDs/timestamps if useful.
- align numeric values right.
- status indicators compact and semantic.

Do not create giant rounded cards around every row.

---

# 28. Status Chips

Use compact pills only for discrete status values.

Examples:

```text
ACTIVE
PAUSED
PROCESSING
NEEDS REVIEW
COMPLETE
```

Avoid pill badges for arbitrary labels that would be more readable as text.

---

# 29. Motion Design System

Motion is a core part of VECTOR branding but must remain functional.

## 29.1 Motion Principles

- movement has direction,
- movement reveals relationships,
- movement communicates system state,
- no decorative bouncing,
- no endless large-scale background movement.

## 29.2 Durations

```text
Micro interaction       90–160ms
Control hover          120–180ms
Panel enter            180–260ms
Chart transition       250–450ms
Vector path drawing    450–800ms
Hero sequence          2.0–2.8s total
```

## 29.3 Easing

Recommended:

```css
--ease-standard: cubic-bezier(0.2, 0.8, 0.2, 1);
--ease-enter: cubic-bezier(0.16, 1, 0.3, 1);
--ease-exit: cubic-bezier(0.4, 0, 1, 1);
```

Avoid elastic/bouncy easing for core enterprise UI.

---

# 30. Pictorial Brand Animation Inside Product

The pictorial sequence can become a branded loader or system-intelligence animation.

## Frame 1 — Signals

Scattered cyan points.

## Frame 2 — Connection

Thin lines form between relevant nodes.

## Frame 3 — Intelligence

Lines converge toward one directional field.

## Frame 4 — Direction

A clear trajectory emerges and points forward/upward.

## Frame 5 — Growth

Outcome point highlights in mint, with optional result metric.

This must be abstract enough to work in:

- onboarding,
- loading screens,
- AI analysis modules,
- empty states,
- promotional motion graphics.

---

# 31. Iconography

Primary interface icons should use one consistent library style, ideally simple 1.5–2px stroke icons.

Rules:

- do not mix filled, duotone, 3D, and outline icon families.
- branded icons such as VECTOR V, signal, trajectory, and convergence should be custom SVGs.
- avoid overusing sparkles for AI.

---

# 32. Logo Usage Inside Product

Use the Vector symbol or combination logo carefully.

Recommended:

- sidebar header: symbol + VECTOR wordmark.
- collapsed sidebar: symbol only.
- favicon/app icon: symbol only.
- loading state: symbol or pictorial sequence.
- report export cover: combination mark.

Do not place the full logo inside every card or panel.

---

# 33. Accessibility

All production UI must meet WCAG AA target unless a stricter product standard is adopted.

Requirements:

- text contrast must pass.
- do not use blue vs cyan alone to distinguish meaning.
- support keyboard navigation.
- visible focus states.
- semantic headings.
- reduced motion support.
- meaningful SVG titles/ARIA labels when SVG carries information.
- decorative SVGs marked appropriately.
- charts need textual summaries or accessible tabular equivalents where necessary.

---

# 34. Performance Requirements

The hero must feel premium without becoming heavy.

Target:

- SVG-based hero animation rather than video.
- no autoplay background video required.
- lazy-load noncritical dashboard visualizations.
- avoid large WebGL frameworks for the hero.
- minimize filter blur/glow use.
- animate transform/opacity/stroke properties when possible.
- avoid layout thrashing.

The initial hero visualization should remain smooth on mid-range mobile devices.

---

# 35. Svelte 5 Implementation Guidance

Use Svelte 5 runes consistently.

Recommended principles:

- derive visual state rather than duplicating it,
- isolate animation timeline state from business state,
- use components for repeated primitives,
- keep SVG geometry declarative,
- avoid giant monolithic dashboard components.

Potential structure:

```text
src/lib/vector/
  brand/
    VectorLogo.svelte
    VectorMark.svelte
    VectorGrid.svelte
    SignalNode.svelte
    VectorPath.svelte
    VectorField.svelte

  marketing/
    VectorHero.svelte
    HeroSignalGraph.svelte
    HeroOutcomeMetric.svelte

  dashboard/
    DashboardShell.svelte
    Sidebar.svelte
    Topbar.svelte
    MetricCard.svelte
    ActivityFeed.svelte
    ActivityItem.svelte
    GrowthChart.svelte
    OpportunityCard.svelte
    StatusChip.svelte

  motion/
    vectorMotion.ts
    reducedMotion.ts

  tokens/
    vector.css
```

---

# 36. Design Tokens

Centralize all visual values.

Example:

```css
:root {
	--vector-radius-sm: 8px;
	--vector-radius-md: 12px;
	--vector-radius-lg: 16px;

	--vector-space-1: 4px;
	--vector-space-2: 8px;
	--vector-space-3: 12px;
	--vector-space-4: 16px;
	--vector-space-5: 20px;
	--vector-space-6: 24px;
	--vector-space-8: 32px;
	--vector-space-10: 40px;
	--vector-space-12: 48px;
	--vector-space-16: 64px;

	--vector-border: rgba(164, 184, 207, 0.12);
	--vector-border-strong: rgba(164, 184, 207, 0.24);

	--vector-shadow-card: 0 12px 34px rgba(0, 0, 0, 0.24);
}
```

Do not hard-code random blue, gray, and spacing values inside individual components.

---

# 37. Hero Implementation Milestones

## Phase 1 — Static Fidelity

- implement layout.
- implement typography.
- implement CTA group.
- implement static SVG signal graph.
- implement outcome card.
- match spacing and proportions.

## Phase 2 — Motion

- entrance sequence.
- path drawing.
- node pulse.
- metric reveal.
- reduced-motion fallback.

## Phase 3 — Responsive

- tablet layout.
- mobile simplified graph.
- content wrapping tests.
- 360px minimum-width validation.

## Phase 4 — Polish

- hover states.
- glow restraint.
- final typography tuning.
- LCP optimization.

---

# 38. Product Visual Language Milestones

## Phase 1 — Shell

- dashboard shell.
- navigation.
- top bar.
- base tokens.

## Phase 2 — Core Cards

- KPI cards.
- status chips.
- activity feed.
- basic charts.

## Phase 3 — VECTOR-native Modules

- opportunity cards.
- intelligence/process visualization.
- orchestration paths.
- signal nodes.

## Phase 4 — Motion and Empty States

- activity state animations.
- loading sequence.
- onboarding sequence.
- branded empty states.

---

# 39. Exact Hero Acceptance Criteria

The hero is considered visually compliant when:

- dark Vector Black dominates.
- headline is the strongest element.
- primary accent is Vector Blue, not purple.
- right-hand visualization clearly communicates multiple signals converging into VECTOR and producing growth.
- no generic AI robot, brain, sparkle cloud, or stock illustration is present.
- hero remains clear at 1440px, 1024px, 768px, 430px, 390px, and 360px widths.
- motion does not block interaction.
- reduced-motion mode is supported.
- initial load is performant.
- SVG paths remain crisp at retina resolution.

---

# 40. Product UI Acceptance Criteria

The product is visually compliant when:

- major surfaces use Vector Black / Graphite values.
- active state and system action use Vector Blue.
- intelligence/signal states use cyan.
- positive result uses mint.
- charts remain readable without excessive glow.
- cards use restrained borders and depth.
- no excessive glassmorphism.
- no multicolor SaaS icon grid appearance.
- system activity appears operational, not conversational.
- visual primitives repeat coherently across modules.
- custom VECTOR motif is visible in branded states without becoming decoration overload.

---

# 41. Anti-Patterns — Do Not Implement

Reject frontend implementations that drift into any of the following:

- purple/pink AI gradients everywhere.
- generic star/sparkle AI icon as primary AI indicator.
- large glowing blobs behind every section.
- cartoon robot branding.
- excessive glass cards.
- 24px+ rounded corners on everything.
- gradients on all buttons.
- blue glow around every interactive element.
- fake terminal code as decoration.
- meaningless network meshes.
- overanimated dashboards.
- huge dashboard cards with too little information.
- inconsistent icon styles.
- green used as a general accent rather than positive outcome.
- default chart-library styling with no Vector token integration.
- literal arrow-up chart logo as a substitute for brand geometry.

---

# 42. Design QA Checklist

Before accepting a page, verify:

- [ ] Does the page still look like VECTOR if the logo is temporarily hidden?
- [ ] Is there a clear visual hierarchy?
- [ ] Is blue being used for control/direction rather than decoration?
- [ ] Is mint reserved for success or expected positive outcome?
- [ ] Are surfaces dark but distinct from one another?
- [ ] Are borders subtle rather than bright?
- [ ] Is motion purposeful?
- [ ] Does the UI remain usable with reduced motion?
- [ ] Do charts communicate the data before the branding?
- [ ] Are signal/vector motifs used only where they reinforce meaning?
- [ ] Does mobile retain the same identity without shrinking desktop complexity?
- [ ] Are spacing and typography tokens used consistently?
- [ ] Does the page avoid generic AI visual clichés?

---

# 43. Engineering QA Checklist

- [ ] Svelte 5 runes are used consistently.
- [ ] No unnecessary client-side dependency for simple SVG animation.
- [ ] SVG graphics scale correctly.
- [ ] No hard-coded arbitrary brand colors outside tokens.
- [ ] Keyboard navigation works.
- [ ] Visible focus states exist.
- [ ] `prefers-reduced-motion` is respected.
- [ ] Charts have accessible labels/summary.
- [ ] Hero visual does not cause CLS.
- [ ] Fonts do not block first meaningful paint excessively.
- [ ] Mobile animation performance is acceptable.
- [ ] Layout tested at common widths.
- [ ] Loading and error states are styled in the same Vector language.

---

# 44. Suggested Website Hero Copy Structure

Use this as the content hierarchy, not necessarily permanent final marketing copy:

```text
EYEBROW
AI-NATIVE GROWTH INFRASTRUCTURE

HEADLINE
One System.
From Signal
To Growth.

SUPPORTING COPY
VECTOR connects your growth data, identifies opportunities,
orchestrates execution, and turns every channel into one measurable system.

PRIMARY CTA
Book a Demo

SECONDARY CTA
Explore Platform
```

The message must remain short enough that the visual system can carry part of the explanation.

---

# 45. Suggested Dashboard Overview Composition

```text
Overview

[ Revenue ] [ Conversions ] [ Opportunities ] [ ROAS ]

[ Growth Performance — wide chart           ] [ System Activity ]

[ Top Opportunities                         ] [ Channel Health   ]

[ Campaign Performance / Execution History                       ]
```

On narrower screens, stack System Activity beneath the main chart rather than compressing it into an unreadable narrow column.

---

# 46. Product-Level Visual Narrative

The public site says:

> VECTOR turns signals into growth.

The dashboard should prove it:

```text
SIGNALS
Traffic, ads, content, CRM, SEO, behavior, market data

INTELLIGENCE
Detection, correlation, scoring, forecasting, prioritization

DIRECTION
Recommended next action and expected impact

EXECUTION
Automation or approved operator action

GROWTH
Measured business outcome
```

Every major module should sit somewhere in this narrative.

This is how VECTOR becomes a branded operating system rather than simply a collection of marketing tools.

---

# 47. Final Creative Standard

The visual target is:

**Premium enterprise infrastructure with AI-native intelligence and growth-oriented motion.**

The interface should look powerful at first glance, understandable within seconds, and trustworthy during daily use.

The most important implementation rule is:

> Do not imitate the surface-level appearance of AI products. Build a coherent visual language in which signals, connections, direction, execution, and measurable outcomes are represented consistently throughout the website and the product.

That recurring system is what makes VECTOR visually defensible.

---

# 48. Canonical Frontend Architecture

The preferred repository organization is below. If the existing project uses different paths, preserve these **responsibility boundaries** rather than forcing a destructive rename.

```text
src/
├── lib/
│   └── vector/
│       ├── tokens/
│       │   ├── colors.css
│       │   ├── typography.css
│       │   ├── spacing.css
│       │   ├── radius.css
│       │   ├── elevation.css
│       │   ├── motion.css
│       │   ├── charts.css
│       │   ├── themes.css
│       │   └── vector.css
│       │
│       ├── brand/
│       │   ├── VectorLogo.svelte
│       │   ├── VectorMark.svelte
│       │   ├── VectorGrid.svelte
│       │   ├── SignalNode.svelte
│       │   ├── VectorPath.svelte
│       │   ├── VectorField.svelte
│       │   ├── DirectionGlyph.svelte
│       │   └── OutcomeNode.svelte
│       │
│       ├── primitives/
│       │   ├── Surface.svelte
│       │   ├── Container.svelte
│       │   ├── Stack.svelte
│       │   ├── Cluster.svelte
│       │   ├── Divider.svelte
│       │   ├── Metric.svelte
│       │   └── SectionLabel.svelte
│       │
│       ├── controls/
│       │   ├── Button.svelte
│       │   ├── IconButton.svelte
│       │   ├── Input.svelte
│       │   ├── Select.svelte
│       │   ├── Textarea.svelte
│       │   ├── Checkbox.svelte
│       │   ├── Toggle.svelte
│       │   └── StatusChip.svelte
│       │
│       ├── feedback/
│       │   ├── Alert.svelte
│       │   ├── Toast.svelte
│       │   ├── Skeleton.svelte
│       │   ├── VectorLoader.svelte
│       │   ├── EmptyState.svelte
│       │   └── ErrorState.svelte
│       │
│       ├── overlays/
│       │   ├── Dialog.svelte
│       │   ├── Drawer.svelte
│       │   ├── Popover.svelte
│       │   └── Tooltip.svelte
│       │
│       ├── data-display/
│       │   ├── MetricCard.svelte
│       │   ├── DataTable.svelte
│       │   ├── ActivityFeed.svelte
│       │   ├── ActivityItem.svelte
│       │   ├── OpportunityCard.svelte
│       │   └── TrendIndicator.svelte
│       │
│       ├── charts/
│       │   ├── chartTheme.ts
│       │   ├── LineChart.svelte
│       │   ├── BarChart.svelte
│       │   ├── AreaChart.svelte
│       │   ├── FunnelChart.svelte
│       │   ├── Sparkline.svelte
│       │   └── ChartTooltip.svelte
│       │
│       ├── motion/
│       │   ├── vectorMotion.ts
│       │   ├── reducedMotion.ts
│       │   ├── transitions.ts
│       │   └── intersection.ts
│       │
│       ├── marketing/
│       │   ├── MarketingShell.svelte
│       │   ├── VectorHero.svelte
│       │   ├── HeroSignalGraph.svelte
│       │   ├── TrustStrip.svelte
│       │   ├── OutcomeSection.svelte
│       │   ├── PlatformStory.svelte
│       │   ├── CaseStudyCard.svelte
│       │   └── ConversionCTA.svelte
│       │
│       ├── product/
│       │   ├── DashboardShell.svelte
│       │   ├── Sidebar.svelte
│       │   ├── Topbar.svelte
│       │   ├── PageHeader.svelte
│       │   ├── IntelligenceState.svelte
│       │   ├── OrchestrationGraph.svelte
│       │   └── SignalSummary.svelte
│       │
│       ├── layouts/
│       │   ├── MarketingLayout.svelte
│       │   ├── AuthLayout.svelte
│       │   ├── AppLayout.svelte
│       │   └── FocusLayout.svelte
│       │
│       └── index.ts
│
├── routes/
│   ├── (marketing)/
│   ├── (auth)/
│   └── (app)/
│
└── app.css
```

---

# 49. Global Style Wiring

Use one global stylesheet entry.

Recommended:

```css
@import './lib/vector/tokens/colors.css';
@import './lib/vector/tokens/typography.css';
@import './lib/vector/tokens/spacing.css';
@import './lib/vector/tokens/radius.css';
@import './lib/vector/tokens/elevation.css';
@import './lib/vector/tokens/motion.css';
@import './lib/vector/tokens/charts.css';
@import './lib/vector/tokens/themes.css';
@import './lib/vector/tokens/vector.css';
```

The application root should expose an explicit theme identity:

```html
<html data-brand="vector" data-theme="vector-dark"></html>
```

or equivalent on the top-level application container.

Do not import brand token files independently inside arbitrary feature routes.

---

# 50. Token Ownership

Recurring values belong to tokens.

Prefer semantic tokens:

```text
--vector-action-primary
--vector-action-primary-hover
--vector-signal
--vector-intelligence
--vector-outcome-positive
--vector-risk-warning
--vector-risk-danger
--vector-surface-canvas
--vector-surface-panel
--vector-surface-raised
--vector-text-primary
--vector-text-secondary
```

Feature components should not repeatedly hard-code:

```text
#1677FF
#35D9FF
#32E6A1
12px radius
180ms timing
custom card shadows
```

Raw palette tokens can exist underneath semantic tokens.

---

# 51. Generic UI vs VECTOR-Native UI

Not every component needs visible brand geometry.

## Generic shared UI

Examples:

- buttons;
- inputs;
- selects;
- dialogs;
- tables;
- tabs;
- tooltips.

These feel like VECTOR through tokens, typography, state semantics, borders, spacing, and motion.

## VECTOR-native UI

Examples:

- hero signal graph;
- intelligence processing;
- opportunity visualizations;
- orchestration;
- system activity;
- branded loading;
- growth outcome visualization.

These may use:

```text
signals → connections → intelligence → direction → execution → outcome
```

Do not use the signal motif as decorative filler.

---

# 52. Route Groups

Recommended conceptual groups:

```text
(marketing)
(auth)
(app)
```

## Marketing

```text
/
/product
/solutions/*
/industries/*
/pricing
/case-studies
/resources
/demo
/contact
```

Consume the marketing shell, public components, shared controls, tokens, and motion.

## Auth

```text
/login
/signup
/verify
/forgot-password
/reset-password
```

Use the same brand system but with quieter composition.

## App

```text
/app
/app/opportunities
/app/campaigns
/app/analytics
/app/content
/app/automation
/app/crm
/app/intelligence
/app/integrations
/app/settings
```

Consume the canonical authenticated shell.

---

# 53. Route-to-Visual Mapping

| Area          | Primary language            | Brand motif intensity |
| ------------- | --------------------------- | --------------------: |
| Homepage      | Cinematic platform story    |                  High |
| Product page  | Product demonstration       |                  High |
| Solutions     | Outcome/use case            |                Medium |
| Pricing       | Clarity/comparison          |                   Low |
| Case studies  | Editorial evidence          |                   Low |
| Demo/contact  | Trust and conversion        |                   Low |
| Auth          | Calm infrastructure         |              Very low |
| Dashboard     | Operational command         |                Medium |
| Opportunities | Intelligence/recommendation |                  High |
| Campaigns     | Execution/observability     |                Medium |
| Analytics     | Data-first                  |                   Low |
| Automation    | Orchestration               |                  High |
| CRM           | Dense operational data      |                   Low |
| Intelligence  | Analysis/explainability     |                  High |
| Settings      | Utility                     |              Very low |

This prevents both over-branding and under-branding.

---

# 54. Canonical Application Shell

Use one authenticated shell:

```text
AppLayout
└── DashboardShell
    ├── Sidebar
    ├── Topbar
    └── Main
        ├── PageHeader
        └── Route Content
```

The shell owns:

- global navigation;
- workspace identity;
- account actions;
- notifications;
- global background;
- page spacing;
- responsive navigation;
- app-level overlays.

Feature routes own only feature-specific content and actions.

Do not recreate the sidebar/topbar per module.

---

# 55. Canonical Marketing Shell

Use:

```text
MarketingLayout
└── MarketingShell
    ├── MarketingHeader
    ├── Page Content
    └── MarketingFooter
```

The shell owns:

- public navigation;
- persistent marketing CTA;
- public container behavior;
- global page background;
- footer;
- motion preference handling.

Campaign landing pages may use a reduced-navigation variant without abandoning shared primitives.

---

# 56. Dependency Direction

Required direction:

```text
routes
↓
feature components
↓
VECTOR domain components
↓
shared controls / data display
↓
primitives
↓
tokens / motion / utilities
```

Never reverse this.

Examples:

- `Button.svelte` does not import campaign logic.
- `MetricCard.svelte` does not fetch revenue.
- `GrowthChart.svelte` renders supplied data.
- route loaders/services retrieve data and pass it down.

---

# 57. Brand Asset Registry

Centralize official assets.

Recommended:

```text
static/brand/vector/
├── logo/
│   ├── vector-mark.svg
│   ├── vector-wordmark.svg
│   ├── vector-combination.svg
│   └── vector-mark-mono.svg
├── favicons/
├── social/
└── motion/
```

Rules:

- no duplicated logos in feature folders;
- no manually redrawn marks after official SVGs exist;
- no AI recreation of approved assets;
- use official monochrome variants.

---

# 58. Icon Registry

Use one primary interface icon family.

VECTOR-branded concepts may use custom SVGs:

```text
Signal
Direction
Intelligence
Growth
Convergence
```

Do not mix several unrelated outline, filled, duotone, and 3D icon libraries.

---

# 59. Chart Theme Registry

Create one canonical chart theme:

```text
src/lib/vector/charts/chartTheme.ts
```

It should own:

- primary series;
- secondary series;
- benchmark;
- positive/negative semantics;
- axes;
- grid;
- tooltip;
- selection;
- fonts;
- stroke widths.

Feature charts define data meaning, not their own color system.

---

# 60. Status Registry

Create one shared semantic status mapping:

```text
signal
info
processing
active
paused
success
warning
danger
complete
needs_review
muted
```

Each maps to shared color, label treatment, marker/icon, and accessible meaning.

Do not assign colors independently in feature files.

---

# 61. Motion Registry

Centralize:

```text
micro
control
panel
reveal
pathDraw
heroStage
```

and shared easings in:

```text
src/lib/vector/motion/vectorMotion.ts
```

All animated components must use shared reduced-motion detection.

---

# 62. Responsive Architecture

Responsive behavior belongs primarily to reusable components.

Shared system owns:

- container widths;
- typography scaling;
- spacing scaling;
- touch targets;
- breakpoint guidance.

Each reusable component owns its mobile behavior.

Routes should not repeatedly patch shared component media queries.

---

# 63. Container Modes

Use a small number of container concepts:

```text
marketing-readable
marketing-wide
app-fluid
app-constrained
focus
```

Avoid arbitrary max-width values per page.

---

# 64. Surface Hierarchy

Standardize:

```text
canvas
panel
raised
interactive
overlay
```

Use semantic surface tokens rather than creating many nearly identical graphite shades locally.

---

# 65. Shared Page Header

Authenticated routes should use one page-header system with:

```text
eyebrow/breadcrumb if required
title
description/state summary
primary action
secondary actions
optional local filters
```

Do not invent spacing and action placement on each module.

---

# 66. Data and Presentation Separation

Prefer:

```text
route/loader
→ retrieves data

feature model
→ transforms data

shared visual component
→ renders display-ready data
```

Do not bind reusable visual components directly to arbitrary API response shapes.

---

# 67. Loading, Empty, Error and Permission States

Every product module must account for:

```text
populated
loading
empty
error
partial data
permission restricted
integration missing
plan restricted
```

Use context-appropriate behavior.

### Loading

- dashboard: skeletons;
- small mutation: inline loading;
- real AI analysis: VECTOR intelligence state;
- hero: never block the page.

### Empty

Explain why content is empty and provide the next action.

### Error

Explain what failed, whether previous data remains valid, and what the user can do.

### Permission / plan

Distinguish user permission from subscription restriction and missing integration.

---

# 68. VECTOR Signal Grammar Registry

The canonical semantic vocabulary is:

```text
Signal
Connection
Cluster
Convergence
Intelligence
Direction
Execution
Outcome
Risk
Feedback
```

Any branded diagram should identify which real product concepts these visuals represent.

Do not create meaningless network meshes.

---

# 69. Product Module Mapping

## Overview

```text
signals + outcomes + activity
```

## Opportunities

```text
signals → intelligence → direction
```

## Campaigns

```text
direction → execution → outcome
```

## Analytics

```text
signals → measured outcome
```

## Content

```text
direction → execution → performance
```

## Automation

```text
trigger → evaluation → decision → execution → measurement
```

## CRM

```text
entities + relationships + lifecycle signals
```

## Intelligence

```text
signals → analysis → confidence → recommendation
```

## Integrations

```text
external source → connected signal infrastructure
```

---

# 70. General Sales-Funnel Standard Integration

All public pages must also obey:

```text
VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
```

Example:

```text
General standard:
Use outcome-oriented hero messaging.

VECTOR standard:
Express that outcome through restrained signal-to-growth geometry.
```

Another:

```text
General standard:
Place proof near important claims.

VECTOR standard:
Use real product screens, operational metrics, case-study evidence, and restrained mint outcome semantics.
```

Both standards are mandatory.

---

# 71. Cursor Frontend Map

Create and maintain:

```text
docs/frontend/VECTOR_FRONTEND_MAP.md
```

Cursor must inspect the **actual repository** and record:

```text
Global stylesheet:
Actual path

Token root:
Actual path

Marketing shell:
Actual path

App shell:
Actual path

Auth shell:
Actual path

Shared button:
Actual path

Shared form controls:
Actual paths

Shared surface/card:
Actual path

Chart theme:
Actual path

Motion registry:
Actual path

Reduced-motion helper:
Actual path

Brand assets:
Actual path

Hero:
Actual path

Dashboard:
Actual path

Opportunities:
Actual path

Automation:
Actual path
```

This document must map real code, not merely repeat this recommended architecture.

---

# 72. Cursor Component Inventory

Create:

```text
docs/frontend/VECTOR_COMPONENT_INVENTORY.md
```

Track:

```text
Component
Path
Category
Variants
Consumers
Status
Replacement if deprecated
Notes
```

This prevents duplicate primitives.

---

# 73. UI Migration Tracker

Create:

```text
docs/frontend/VECTOR_UI_MIGRATION_STATUS.md
```

Recommended route checklist:

```text
[ ] Homepage
[ ] Product
[ ] Solutions
[ ] Pricing
[ ] Case Studies
[ ] Demo / Contact
[ ] Login / Auth
[ ] Dashboard
[ ] Opportunities
[ ] Campaigns
[ ] Analytics
[ ] Content
[ ] Automation
[ ] CRM
[ ] Intelligence
[ ] Integrations
[ ] Settings
```

For each route track:

```text
tokens wired
shell migrated
shared controls migrated
responsive reviewed
accessibility reviewed
visual QA complete
legacy CSS removed
```

---

# 74. Cursor Discovery Pass

Before mass frontend changes, Cursor must inspect:

1. route structure;
2. root layouts;
3. global CSS;
4. existing tokens;
5. current UI library;
6. duplicate buttons/inputs/cards;
7. hard-coded brand colors;
8. chart library and chart styles;
9. icon libraries;
10. motion dependencies;
11. marketing shell;
12. app shell;
13. auth shell;
14. mobile navigation;
15. loading/empty/error patterns.

Then update the frontend map and component inventory.

Do not begin with a blind visual rewrite.

---

# 75. Implementation Order

Use this order:

```text
1. DISCOVERY
2. TOKENS
3. GLOBAL THEME
4. PRIMITIVES
5. CONTROLS
6. SHELLS
7. VECTOR BRAND PRIMITIVES
8. MOTION + REDUCED MOTION
9. CHART THEME
10. MARKETING SHELL
11. HERO
12. APP SHELL
13. DASHBOARD SHARED MODULES
14. FEATURE ROUTES
15. LOADING / EMPTY / ERROR / PERMISSION STATES
16. RESPONSIVE QA
17. ACCESSIBILITY QA
18. PERFORMANCE QA
19. LEGACY CLEANUP
20. DOCUMENTATION UPDATE
```

Do not prioritize decorative animation before shared foundations are coherent.

---

# 76. Existing-Repo Migration Strategy

Use progressive migration.

## Phase A — Foundation

- tokens;
- global theme;
- primitives;
- controls;
- motion registry;
- chart theme.

## Phase B — Shells

- marketing header/footer;
- app shell;
- navigation;
- page header;
- global spacing.

## Phase C — Flagship Surfaces

- homepage;
- product page;
- dashboard;
- opportunities;
- automation.

## Phase D — Remaining Product

- campaigns;
- analytics;
- content;
- CRM;
- intelligence;
- integrations;
- settings.

## Phase E — Cleanup

Remove deprecated components, dead CSS, duplicate icons, old token files, and obsolete overrides only after migration.

Keep business logic functional throughout.

---

# 77. No Big-Bang Rewrite

Prefer:

- incremental component replacement;
- compatibility wrappers;
- route-by-route migration;
- adapter props;
- progressive token adoption.

Do not rewrite stable business logic just to implement visual consistency.

---

# 78. Duplicate Component Audit

Search for concepts such as:

```text
PrimaryButton
BlueButton
CTAButton
SubmitButton
ActionButton
```

Determine whether these belong to one shared `Button` with legitimate variants.

Repeat for:

- inputs;
- cards;
- modals;
- chips;
- metrics;
- tables;
- empty states;
- loaders.

Do not consolidate semantically different components only because they look similar.

---

# 79. Variant Governance

Good:

```text
Button
├── primary
├── secondary
├── tertiary
├── destructive
└── marketing
```

Bad:

```text
primaryBlueLargeGlow
heroButtonSpecial2
dashboardRoundedButton
ctaGradientNew
```

If shared components require dozens of visual flags, reconsider the abstraction.

---

# 80. CSS Ownership

Preferred hierarchy:

```text
tokens
→ global/base
→ shared component
→ feature composition
→ rare route-specific exception
```

Avoid:

- normal use of `!important`;
- deep global selectors;
- page CSS overriding shared-control internals;
- repeated hard-coded brand values;
- fragile DOM-position selectors.

---

# 81. Utility Framework Compatibility

If Tailwind or another utility system already exists, map it to the VECTOR tokens.

Do not maintain two disconnected color/spacing systems.

If no utility framework exists, do not add one merely to satisfy this document.

---

# 82. Marketing/Product Continuity

The public site and product share:

- typography;
- brand blue;
- cyan signal semantics;
- mint outcome semantics;
- border language;
- iconography;
- motion easing;
- signal grammar.

Their density differs.

```text
MARKETING
larger type
more whitespace
more narrative
more visual storytelling

PRODUCT
denser information
persistent controls
tighter spacing
more restrained motion
```

Do not place cinematic marketing effects into routine product workflows.

---

# 83. Homepage Contract

Recommended structure:

```text
MarketingHeader
VectorHero
Trust / proof
Fragmentation problem
Signal-to-growth platform story
Core capabilities
Product demonstration
Use cases
Outcome metrics
Case studies
Integration/ecosystem proof
FAQ / objections
ConversionCTA
MarketingFooter
```

Every section must support the funnel standard.

---

# 84. Dashboard Contract

Recommended:

```text
PageHeader

KPI Row
├── Revenue
├── Conversions
├── Opportunities
└── Efficiency / ROAS

Main Row
├── Growth Performance
└── System Activity

Secondary Row
├── Top Opportunities
└── Channel Health

Execution History
```

The dashboard should answer:

```text
What changed?
What matters?
What did VECTOR detect?
What is VECTOR doing?
What needs my attention?
```

---

# 85. Opportunity Contract

Priority:

```text
Impact
Evidence
Confidence
Recommended action
Operator control
```

Suggested hierarchy:

```text
Opportunity title
Projected impact
Confidence
Status

What VECTOR detected
Supporting signals
Why it matters

Recommended action
Expected result
Risks / caveats

Approve / Execute / Dismiss / Inspect
```

---

# 86. Campaign Contract

Campaign UI emphasizes execution and observability.

States:

```text
draft
scheduled
active
paused
completed
failed
```

Show:

- objective;
- channels;
- resources/budget;
- performance;
- system actions;
- recent changes;
- upcoming execution;
- issues needing review.

---

# 87. Analytics Contract

Analytics is data-first.

Order:

```text
Question
Metric
Trend
Comparison
Segment
Explanation
Action
```

VECTOR identity should be restrained: chart theme, typography, spacing, selection, and intelligence annotations.

---

# 88. Automation Contract

Use the strongest signal grammar here:

```text
Trigger
→ Evaluation
→ Decision
→ Execution
→ Measurement
```

Clearly separate:

- workflow configuration;
- current execution;
- historical result.

---

# 89. CRM Contract

CRM should remain dense and operational.

Use brand geometry only where relationship/signal meaning exists.

Do not put decorative network diagrams into ordinary contact tables.

---

# 90. Intelligence Contract

Recommended structure:

```text
Current analyses
Detected patterns
Evidence / signals
Confidence
Recommendations
Approved actions
Outcomes
History
```

This is the primary surface for explainable signal-to-direction behavior.

---

# 91. Settings Contract

Settings should be intentionally quiet.

Use:

- clear forms;
- precise labels;
- shared controls;
- safe destructive actions;
- saved-state feedback.

Do not add dramatic gradients, convergence graphics, or unnecessary branded motion.

---

# 92. Human Control Standard

Automation and AI actions must distinguish:

```text
recommended
approved
scheduled
executing
executed
reverted
failed
```

The operator should understand:

- what VECTOR detected;
- what VECTOR recommended;
- what required approval;
- what executed;
- what result followed.

This is fundamental to the brand promise of controlled intelligence.

---

# 93. AI Explainability Pattern

Recommendations should make room for:

```text
What VECTOR detected
Why it matters
Evidence / source signals
Confidence
Recommended action
Expected impact
Operator controls
Observed result after execution
```

Avoid unexplained:

```text
AI Suggestion: Increase budget
```

Trust comes from observability.

---

# 94. Shared System Activity Primitive

System activity should be reusable across:

- dashboard;
- campaigns;
- automation;
- intelligence;
- integrations;
- opportunity detail.

Domain events may differ, but visual semantics should remain consistent.

---

# 95. Shared Opportunity Primitive

Opportunity presentation should share recognizable fields:

```text
title
source signals
impact
confidence
reason
recommended action
status
result
```

Different opportunity types may supply different data without inventing different visual languages.

---

# 96. Shared Orchestration Primitive

Standard logical node roles:

```text
trigger
condition
analysis
decision
action
measurement
```

Use semantic differences without turning workflows into multicolor no-code blocks.

---

# 97. Mobile Product Mapping

On mobile prioritize:

```text
Topbar
Page title / critical action
Critical KPI/state
Primary task
Secondary data
Navigation
```

Use:

- drawers for secondary context;
- collapsed filters;
- simplified charts;
- fewer simultaneous columns;
- large touch targets;
- reachable primary actions.

Do not shrink desktop composition until it becomes unreadable.

---

# 98. Mobile Marketing Mapping

Preserve the sales argument:

```text
Value proposition
CTA
Visual proof
Trust
Outcome
Product/service story
Evidence
Objection handling
Final CTA
```

Decorative media must not push the first meaningful action far below the fold.

---

# 99. Accessibility Contract for Data

Essential charts need a nonvisual equivalent through one or more of:

- summary text;
- key metrics;
- accessible chart labels;
- table;
- export.

The chart enhances the information. It must not be the only way to obtain it.

---

# 100. Product Copy Alignment

Preferred operational verbs:

```text
detect
connect
evaluate
rank
direct
execute
measure
improve
```

Avoid magical AI language.

Preferred:

```text
VECTOR detected a rising conversion pattern across organic traffic and CRM activity.
```

Avoid:

```text
VECTOR magically unlocks hidden growth.
```

---

# 101. Testing Strategy

Recommended coverage:

## Components

- variants;
- disabled;
- loading;
- keyboard behavior;
- semantic labels.

## Visual regression

Key candidates:

```text
homepage hero desktop
homepage hero mobile
dashboard desktop
dashboard mobile
opportunity default
opportunity processing
automation canvas
data table
dialog
empty state
```

## Responsive

Validate at minimum:

```text
360
390
430
768
1024
1280
1440
1536+
```

## Accessibility

- keyboard;
- focus;
- contrast;
- semantic markup;
- reduced motion.

## Performance

- hero;
- charts;
- route JS;
- mobile animation;
- media loading.

---

# 102. Static Enforcement

Where practical, add checks for:

- hard-coded recurring hex colors;
- deprecated component imports;
- obsolete tokens;
- multiple icon libraries;
- prohibited legacy components.

Exceptions should remain possible for legitimate one-off illustrations or data-specific needs.

Do not blindly replace all colors with brand blue.

---

# 103. Recommended Documentation Set

Place stable frontend documentation together:

```text
docs/frontend/
├── VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
├── VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE_IMPLEMENTATION.md
├── VECTOR_FRONTEND_MAP.md
├── VECTOR_COMPONENT_INVENTORY.md
└── VECTOR_UI_MIGRATION_STATUS.md
```

Optional:

```text
VECTOR_ACCESSIBILITY_CHECKLIST.md
VECTOR_PERFORMANCE_BUDGET.md
VECTOR_CONTENT_STYLE_GUIDE.md
```

---

# 104. Cursor Project Rule

Add a persistent Cursor project rule equivalent to:

```text
Before modifying any public or authenticated frontend:

1. Read VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md.
2. Read VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE_IMPLEMENTATION.md.
3. Read VECTOR_FRONTEND_MAP.md.
4. Reuse existing VECTOR tokens and components first.
5. Do not hard-code recurring brand values.
6. Update VECTOR_COMPONENT_INVENTORY.md when adding/changing reusable components.
7. Update VECTOR_FRONTEND_MAP.md when canonical paths or architecture change.
8. Preserve accessibility, mobile behavior, and reduced motion.
9. Do not redesign unrelated routes during scoped work.
10. Run relevant frontend QA before marking the task complete.
```

Use the Cursor rule-file format supported by the installed project/version rather than inventing a conflicting convention.

---

# 105. Mandatory Cursor Pre-Change Questions

Before frontend implementation, determine:

```text
What route/module is changing?
Which shell owns it?
Which shared components already exist?
Which tokens apply?
Is this generic UI or VECTOR-native UI?
Which signal/intelligence/direction/outcome concepts are real here?
What is the mobile behavior?
What is the loading state?
What is the empty state?
What is the error state?
What is the permission/plan state?
What is the reduced-motion behavior?
Does this affect conversion?
Does this affect accessibility?
```

---

# 106. Mandatory Cursor Post-Change Questions

After implementation:

```text
Did I reuse shared components?
Did I create a duplicate primitive?
Did I hard-code recurring visual values?
Does it work at 360px?
Does keyboard navigation work?
Does reduced motion work?
Are loading/empty/error states covered?
Did global styling change unintentionally?
Are semantic status colors correct?
Did architecture change?
Did I update the frontend map?
Did I update the component inventory?
Can legacy code now be removed safely?
```

---

# 107. Feature Implementation Template

Use this structure for major frontend features:

```text
FEATURE
Name

ROUTES
Affected paths

BUSINESS PURPOSE
What the user must accomplish

PRIMARY STATE
What should be understood immediately

VECTOR NARRATIVE
Signal / Intelligence / Direction / Execution / Outcome

SHARED COMPONENTS
Existing components to reuse

NEW REUSABLE COMPONENTS
Only if required

DATA STATES
Loading / empty / error / partial / permission

RESPONSIVE
Desktop / tablet / mobile

MOTION
Normal / reduced-motion

ACCESSIBILITY
Keyboard / focus / semantics

ACCEPTANCE
Functional + visual criteria
```

---

# 108. Definition of Done — Shared Component

- [ ] Uses shared tokens.
- [ ] Has legitimate documented variants.
- [ ] Exposes semantic props.
- [ ] Keyboard behavior is correct.
- [ ] Focus is visible.
- [ ] Loading/disabled states exist where relevant.
- [ ] Mobile behavior is verified.
- [ ] Reduced motion is handled if animated.
- [ ] Export path is deliberate.
- [ ] Component inventory is updated.
- [ ] Unnecessary duplicate legacy components are removed or marked deprecated.

---

# 109. Definition of Done — Marketing Page

- [ ] Offer is understandable quickly.
- [ ] Primary conversion is clear.
- [ ] Sales-funnel standard is followed.
- [ ] VECTOR visual language is appropriate.
- [ ] Proof supports claims.
- [ ] CTA hierarchy is clear.
- [ ] Mobile narrative remains persuasive.
- [ ] SEO structure is semantic.
- [ ] Accessibility is reviewed.
- [ ] Performance is reviewed.
- [ ] Generic AI styling is avoided.
- [ ] Canonical marketing shell is used.

---

# 110. Definition of Done — Product Page

- [ ] Primary task is obvious.
- [ ] Canonical app shell is used.
- [ ] Shared controls are reused.
- [ ] Business states map to shared semantics.
- [ ] Loading state exists.
- [ ] Empty state exists.
- [ ] Error state exists.
- [ ] Permission/plan states are handled where relevant.
- [ ] Mobile behavior is intentional.
- [ ] Essential data remains accessible.
- [ ] Motion is restrained and functional.
- [ ] VECTOR motifs have real semantic meaning.
- [ ] No local duplicate design system was introduced.

---

# 111. Repo-Wide Acceptance Criteria

The project is fully wired when:

- [ ] One canonical token system exists.
- [ ] One global theme entry exists.
- [ ] Marketing, auth, and app shells are canonical.
- [ ] Core controls are shared.
- [ ] Brand assets are centralized.
- [ ] Chart styling is centralized.
- [ ] Motion timing/easing is centralized.
- [ ] Reduced-motion logic is shared.
- [ ] Route groups are mapped.
- [ ] Duplicate legacy components have been migrated or tracked.
- [ ] Recurring hard-coded brand values are substantially removed.
- [ ] Hero uses the approved signal-to-growth language.
- [ ] Dashboard proves the same narrative operationally.
- [ ] Opportunities and automation reuse shared VECTOR grammar.
- [ ] Dense data screens remain calm and readable.
- [ ] Mobile quality is intentional.
- [ ] Accessibility is integrated, not patched later.
- [ ] `VECTOR_FRONTEND_MAP.md` reflects real paths.
- [ ] `VECTOR_COMPONENT_INVENTORY.md` reflects reusable components.
- [ ] `VECTOR_UI_MIGRATION_STATUS.md` reflects migration status.
- [ ] Cursor project rules point agents to these standards.

---

# 112. Master Cursor Prompt — Wire the Entire Project

```text
Wire the VECTOR frontend visual system across this repository.

BEFORE CHANGING CODE

1. Inspect the actual repository.
2. Read:
   - VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
   - VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE_IMPLEMENTATION.md
3. Identify:
   - routes,
   - layouts,
   - global CSS,
   - tokens/themes,
   - UI primitives,
   - controls,
   - charts,
   - icons,
   - motion,
   - marketing shell,
   - auth shell,
   - app shell.
4. Create/update:
   - docs/frontend/VECTOR_FRONTEND_MAP.md
   - docs/frontend/VECTOR_COMPONENT_INVENTORY.md
   - docs/frontend/VECTOR_UI_MIGRATION_STATUS.md

ARCHITECTURE

tokens
→ primitives
→ controls/data-display/motion
→ VECTOR marketing/product components
→ feature components
→ routes

RULES

- Do not perform a blind full rewrite.
- Preserve working business logic.
- Reuse sound existing architecture.
- Consolidate duplicate primitives deliberately.
- Do not hard-code recurring brand values.
- Do not add generic AI gradients or decorative network meshes.
- Do not create route-specific button systems.
- Do not use mint as a generic brand accent.
- Use VECTOR signal geometry only where it communicates real meaning.
- Keep marketing cinematic and product UI operational.
- Preserve mobile, accessibility, reduced motion, and performance.

VECTOR NARRATIVE

signals
→ connections
→ intelligence
→ direction
→ execution
→ measurable outcome

IMPLEMENTATION PHASES

PHASE 1 — DISCOVERY
Map the repo and identify conflicts/duplicates.

PHASE 2 — FOUNDATION
Tokens, global theme, primitives, controls, icons, motion, reduced motion, chart theme.

PHASE 3 — SHELLS
Marketing shell, auth shell, app shell, navigation, page headers.

PHASE 4 — BRAND SYSTEM
VECTOR mark, signal nodes, paths, fields, outcome nodes, intelligence/loading states.

PHASE 5 — MARKETING
Homepage hero and public funnel surfaces.

PHASE 6 — PRODUCT
Dashboard, opportunities, campaigns, analytics, content, automation, CRM, intelligence, integrations, settings.

PHASE 7 — STATES
Loading, empty, error, partial data, permissions, plan restrictions, missing integrations.

PHASE 8 — QA
Responsive, accessibility, reduced motion, performance, visual regression.

PHASE 9 — CLEANUP
Remove deprecated components/styles only after consumers migrate.

PHASE 10 — DOCUMENTATION
Update the frontend map, inventory, and migration tracker.

FOR EVERY IMPLEMENTATION BATCH REPORT

- files inspected;
- files changed;
- shared components reused;
- new shared components created;
- deprecated components identified;
- routes affected;
- responsive behavior;
- accessibility considerations;
- remaining migration work.

Do not consider a batch complete until it satisfies the relevant acceptance criteria in both VECTOR frontend standards.
```

---

# 113. Recommended Repository Placement

Preferred:

```text
repo-root/
├── docs/
│   └── frontend/
│       ├── VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
│       ├── VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE_IMPLEMENTATION.md
│       ├── VECTOR_FRONTEND_MAP.md
│       ├── VECTOR_COMPONENT_INVENTORY.md
│       └── VECTOR_UI_MIGRATION_STATUS.md
├── src/
│   └── lib/
│       └── vector/
└── ...
```

If the repo already has a documentation convention, follow it instead of creating a competing structure.

---

# 114. Final Repo-Wide Rule

This document is not satisfied merely by reproducing the approved hero.

The website should communicate:

```text
VECTOR turns fragmented signals into directed growth.
```

The product should prove:

```text
what signals exist
→ how they connect
→ what VECTOR detected
→ what direction it recommends
→ what execution occurred
→ what measurable outcome followed
```

The codebase should mirror that discipline:

```text
central tokens
→ reusable primitives
→ coherent components
→ controlled feature composition
→ consistent routes
```

The design system, product narrative, conversion system, and code architecture must reinforce one another.

That is the implementation target for the entire Cursor project.
