# Vector Growth OS — Frontend UI, UX & Sales Funnel Reference Standard

**Document type:** Permanent implementation standard  
**Applies to:** All future frontend UI work, marketing websites, service websites, product websites, landing pages, sales funnels, lead-generation pages, conversion pages, onboarding pages, and public-facing product presentation surfaces  
**Primary implementation environment:** Cursor / Grok-assisted development  
**Status:** Standing reference and design governance document  
**Last updated:** 22 August 2026
**Vector implementation role:** Cross-cutting frontend, funnel, conversion, and public-experience governance standard  
**Recommended repository location:** `/docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md`  
**Required by:** `AGENTS.md`, frontend Cursor rules, funnel-engine work, Vector 24 launch workflows, CRO, and frontend Definition of Done  
**Companion Control identity standard:** `docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md`

---

## 1. Purpose

This document establishes the default frontend design, interaction, presentation, and conversion standard for all future projects built under Vector Growth OS.

It is not intended to make every website look the same.

It exists to ensure that every future frontend:

- looks modern, premium, professional, and intentional;
- avoids generic AI-generated website aesthetics;
- presents products and services in a persuasive way;
- combines visual sophistication with strong conversion architecture;
- remains fast, usable, responsive, accessible, and mobile-first;
- uses motion and interaction to improve communication rather than distract from it;
- can be generated and maintained consistently with AI-assisted development;
- uses reusable patterns rather than reinventing fundamentals for every client;
- gives Cursor/Grok explicit visual and behavioral references for implementation.

The core principle is:

> **Build the visual sophistication of Linear, Stripe, Framer, Vercel, and Raycast; the interaction quality of Framer, Cuberto, and Obys; the product storytelling discipline of Apple and Stripe; the conversion architecture of Clay and Superside; and the premium service presentation of Ramotion, Clay Global, and Instrument.**

These references are inspiration sources, not cloning targets.

The implementation must always adapt to the client, industry, offer, audience, brand, price point, and conversion objective.

---

# 2. Non-Negotiable Frontend Philosophy

Every frontend must satisfy all five objectives below.

## 2.1 Impressive

The user should immediately feel that the business is credible, modern, capable, and professionally positioned.

This should come from:

- typography;
- composition;
- spacing;
- art direction;
- motion;
- imagery;
- product presentation;
- visual hierarchy;
- quality of interactions;
- consistency.

It must **not** come from excessive decoration.

---

## 2.2 Clear

Within the first viewport, the visitor should understand:

1. what the company offers;
2. who it is for;
3. why it matters;
4. what action to take next.

Visual sophistication must never reduce comprehension.

---

## 2.3 Interactive

The interface should react appropriately to the user.

Examples:

- intelligent hover states;
- subtle cursor response;
- scroll-triggered reveals;
- animated diagrams;
- expandable service cards;
- interactive comparison tools;
- product demonstrations;
- calculators;
- selectable goals;
- dynamic recommendations;
- contextual CTA changes.

Interaction must communicate value.

---

## 2.4 Fast

The website must feel fast even when visually rich.

Target:

- fast first paint;
- responsive interaction;
- limited layout shift;
- optimized media;
- progressive loading;
- lazy-loaded heavy sections;
- animations that preserve frame rate;
- minimal blocking JavaScript;
- no unnecessary animation libraries.

Visual ambition is never an excuse for poor performance.

---

## 2.5 Persuasive

Every public-facing page must have a business objective.

A beautiful page without a conversion strategy is incomplete.

Possible conversion goals include:

- request a quote;
- schedule a consultation;
- book a demo;
- start a trial;
- purchase;
- submit a lead form;
- call;
- message;
- subscribe;
- claim an offer;
- download a resource;
- join a waitlist;
- create an account.

The visual system and funnel system must be designed together.

---

# 3. Primary Reference Websites

These websites should be treated as reference libraries for specific frontend problems.

Do not ask AI to "copy" an entire website.

Instead specify which reference should influence which design layer.

---

## 3.1 Linear

**Reference:** https://linear.app

### Use Linear for

- premium dark interfaces;
- restrained visual design;
- typography;
- spacing;
- subtle gradients;
- thin borders;
- sophisticated cards;
- product UI presentation;
- scroll pacing;
- product-led storytelling;
- minimal navigation;
- calm motion;
- visual hierarchy.

### Key lesson

Linear demonstrates that premium design does not require constant animation.

Its strength comes from restraint, precise typography, subtle motion, confident spacing, and well-integrated product visuals.

### Apply when

- SaaS;
- AI products;
- enterprise software;
- technology companies;
- dashboards;
- automation products;
- high-value B2B services.

---

## 3.2 Stripe

**Reference:** https://stripe.com

### Use Stripe for

- complex product presentation;
- ecosystem diagrams;
- gradients;
- modular marketing sections;
- animated data;
- bento layouts;
- service or feature grouping;
- developer/product trust;
- enterprise credibility;
- multi-product navigation;
- interactive visual explanations.

### Key lesson

Complex offerings can be made understandable through visual systems instead of long text.

### Apply when

- the client has multiple services;
- several products are connected;
- processes need visualization;
- integrations matter;
- a technical offer must feel accessible.

---

## 3.3 Clay

**Reference:** https://www.clay.com

### Use Clay for

- B2B growth funnels;
- outcome-oriented headlines;
- workflow presentation;
- interactive product demonstrations;
- use-case segmentation;
- social proof;
- templates/resources;
- case studies;
- repeated CTA architecture;
- lead generation.

### Key lesson

Strong conversion pages can still be visually premium.

### Apply when

- lead generation is the primary objective;
- selling to companies;
- demonstrating ROI;
- selling automation, growth, marketing, sales, or operational services.

---

## 3.4 Framer

**Reference:** https://www.framer.com

### Use Framer for

- motion language;
- responsive demonstrations;
- hover interactions;
- scroll reveals;
- layered UI;
- animated previews;
- polished transitions;
- component interaction;
- visual experimentation without chaos.

### Key lesson

Motion should make the interface feel alive while remaining intuitive.

### Apply when

- interactive storytelling matters;
- showcasing design, software, creative services, or digital products;
- the brand needs a more progressive or modern feel.

---

## 3.5 Apple

**Reference:** https://www.apple.com

### Use Apple for

- cinematic product presentation;
- full-screen storytelling;
- one-idea-per-viewport;
- sticky storytelling;
- progressive feature reveal;
- large typography;
- visual pacing;
- product isolation;
- comparison sections;
- dramatic final CTAs.

### Key lesson

Do not explain everything at once.

Control the visitor's attention and reveal information progressively.

### Apply when

- there is a flagship product;
- a service has high visual appeal;
- premium positioning matters;
- product demonstration can carry the story.

---

## 3.6 Superside

**Reference:** https://www.superside.com

### Use Superside for

- professional service funnels;
- lead qualification;
- consultation CTAs;
- enterprise proof;
- portfolio sections;
- service categories;
- business outcome copy;
- testimonials;
- long-form conversion architecture.

### Key lesson

A service business should sell outcomes, proof, process, and confidence rather than simply list capabilities.

### Apply when

- selling marketing;
- advertising;
- creative work;
- consulting;
- outsourcing;
- professional services;
- managed services.

---

## 3.7 Ramotion

**Reference:** https://www.ramotion.com

### Use Ramotion for

- premium service presentation;
- case studies;
- measurable outcomes;
- portfolio storytelling;
- strong typography;
- enterprise credibility;
- sophisticated service pages;
- project result presentation.

### Key lesson

Portfolio work becomes far more persuasive when paired with measurable business outcomes.

### Apply when

- selling expertise;
- the company has project work to show;
- case studies can validate high pricing.

---

## 3.8 Clay Global

**Reference:** https://clay.global

### Use Clay Global for

- luxury-level agency presentation;
- cinematic case studies;
- high perceived value;
- project imagery;
- premium typography;
- minimal navigation;
- elegant transitions;
- prestige positioning.

### Key lesson

High-ticket services require confidence, space, restraint, and strong art direction.

### Apply when

- the business wants to look premium;
- the buying decision is high-value;
- image and credibility matter more than aggressive direct-response tactics.

---

## 3.9 Instrument

**Reference:** https://www.instrument.com

### Use Instrument for

- editorial layouts;
- corporate sophistication;
- brand storytelling;
- creative consultancy presentation;
- typography;
- large imagery;
- unconventional grid composition;
- case studies.

### Key lesson

Professional does not have to mean conservative or generic.

### Apply when

- consulting;
- architecture;
- corporate services;
- luxury;
- real estate;
- branding;
- premium B2B.

---

## 3.10 Vercel

**Reference:** https://vercel.com

### Use Vercel for

- modern technology visual language;
- grids;
- monochrome systems;
- technical diagrams;
- developer-facing design;
- interactive product blocks;
- subtle glows;
- documentation-adjacent marketing;
- high-tech presentation.

### Apply when

- software;
- infrastructure;
- AI;
- automation;
- developer products;
- technical services.

---

## 3.11 Raycast

**Reference:** https://www.raycast.com

### Use Raycast for

- premium dark SaaS UI;
- translucent surfaces;
- compact product demonstrations;
- keyboard/UI visualization;
- subtle glow;
- refined microinteractions;
- polished feature cards.

### Apply when

- desktop tools;
- SaaS;
- productivity;
- AI;
- apps;
- technical products.

---

## 3.12 Cuberto

**Reference:** https://cuberto.com

### Use Cuberto for

- advanced motion;
- cursor effects;
- image transitions;
- magnetic buttons;
- kinetic typography;
- creative navigation;
- scroll effects.

### Important restriction

Do not use Cuberto as the default funnel structure.

Use only selected interaction ideas.

Recommended intensity:

**10% to 20% of Cuberto's interaction density for most commercial funnels.**

---

## 3.13 Obys

**Reference:** https://obys.agency

### Use Obys for

- expressive typography;
- experimental transitions;
- scroll choreography;
- image movement;
- unusual layout;
- creative agency presentation.

### Restriction

Use selectively.

The conversion objective must remain obvious.

---

## 3.14 Runway

**Reference:** https://runway.com

### Use Runway for

- cinematic technology presentation;
- AI product storytelling;
- video-led sections;
- dark visual systems;
- futuristic creative direction;
- product output as proof.

---

## 3.15 Webflow

**Reference:** https://webflow.com

### Use Webflow for

- large product ecosystems;
- mega navigation;
- use-case segmentation;
- feature organization;
- resource architecture;
- enterprise conversion;
- modular product marketing.

---

# 4. Reference Matrix for AI-Assisted Design

When instructing Cursor or Grok, reference websites by design responsibility.

| Design responsibility          | Primary references                |
| ------------------------------ | --------------------------------- |
| Visual system                  | Linear, Vercel, Raycast           |
| Typography                     | Linear, Instrument, Clay Global   |
| Premium dark UI                | Linear, Raycast, Vercel           |
| Premium light UI               | Stripe, Instrument, Apple         |
| Gradient use                   | Stripe, Linear, Vercel            |
| Card design                    | Linear, Stripe, Framer            |
| Bento layouts                  | Stripe, Vercel, Framer            |
| Motion                         | Framer, Cuberto, Obys             |
| Microinteractions              | Framer, Raycast, Linear           |
| Scroll storytelling            | Apple, Framer, Clay Global        |
| Product demo                   | Linear, Stripe, Clay              |
| Technical visualization        | Stripe, Vercel                    |
| SaaS funnel                    | Clay, Linear, Webflow             |
| Service funnel                 | Superside, Ramotion               |
| Luxury service presentation    | Clay Global, Instrument           |
| Case studies                   | Ramotion, Clay Global, Instrument |
| Social proof                   | Clay, Superside, Stripe           |
| Lead generation                | Clay, Superside                   |
| High-ticket positioning        | Clay Global, Ramotion, Instrument |
| Cinematic product presentation | Apple, Runway                     |
| Experimental interaction       | Cuberto, Obys                     |
| Complex product navigation     | Stripe, Webflow                   |
| Enterprise credibility         | Stripe, Superside, Ramotion       |
| Strong final CTA               | Apple, Clay, Superside            |

---

# 5. Mandatory Funnel Architecture

Every marketing or sales page does not need every section below.

However, Cursor/Grok must select from this architecture intentionally.

---

## 5.1 Hero

The first viewport must answer:

- What is this?
- Who is it for?
- Why should the visitor care?
- What should they do next?

### Recommended elements

- outcome-oriented headline;
- concise supporting statement;
- primary CTA;
- optional secondary CTA;
- compelling visual or interactive demonstration;
- optional trust indicator;
- optional availability, pricing, location, or market qualifier.

### Avoid

- vague corporate statements;
- "Welcome to...";
- unnecessary paragraphs;
- more than two competing primary actions;
- stock imagery without purpose;
- giant decorative gradients with no product/service context.

---

## 5.2 Instant Credibility Layer

Immediately reduce perceived risk.

Possible content:

- client logos;
- review scores;
- certifications;
- years of experience;
- customers served;
- revenue generated;
- locations covered;
- transactions completed;
- press mentions;
- partner logos;
- awards;
- performance statistics.

Do not fabricate social proof.

---

## 5.3 Transformation / Outcome Section

Do not lead with an internal service catalog.

Instead explain what changes for the customer.

Examples:

- more qualified leads;
- more bookings;
- faster operations;
- increased visibility;
- lower administrative workload;
- improved customer experience;
- better reporting;
- increased revenue;
- reduced risk.

Use visual before/after comparisons whenever useful.

---

## 5.4 Product or Service Presentation

Each major service should feel like a product.

Recommended structure:

**Outcome → Visual → Explanation → Proof → CTA**

Avoid generic icon grids containing twelve services with identical visual weight.

Use:

- larger feature modules;
- interactive cards;
- tabs;
- sticky sections;
- demonstrations;
- video;
- diagrams;
- examples;
- before/after views;
- configurable options.

---

## 5.5 Proof

Show evidence after making claims.

Possible proof:

- metrics;
- case studies;
- screenshots;
- videos;
- before/after results;
- testimonials;
- independent ratings;
- press;
- certifications;
- recognizable customers;
- usage data.

Never rely on unsupported marketing claims.

---

## 5.6 Case Studies

Preferred case study structure:

### Client / Context

Who was the customer?

### Problem

What was preventing progress?

### Intervention

What was implemented?

### Result

What changed?

### Metrics

What measurable outcome was achieved?

Case study cards should show results before the user opens the full case study.

Example:

> **+143% qualified leads**  
> Rebuilt acquisition funnel for [Client]

This is stronger than:

> View Project

---

## 5.7 Process

The process reduces uncertainty.

Preferred number of steps:

**3 to 5**

Examples:

- Discover
- Plan
- Build
- Launch
- Optimize

or

- Submit
- Review
- Confirm
- Deliver

Represent visually when possible.

Avoid long process explanations.

---

## 5.8 Interactive Qualification

For higher-value products and services, allow the user to identify themselves.

Examples:

> What are you trying to achieve?

Options:

- Get more leads
- Increase sales
- Launch a product
- Promote an event
- Improve operations

Then tailor:

- service recommendations;
- CTA;
- case studies;
- estimates;
- next steps.

This interaction can significantly improve both UX and lead quality.

---

## 5.9 Offer / Package Section

When appropriate, clearly explain what the visitor receives.

Possible format:

- package cards;
- comparison table;
- custom quote;
- recommended plan;
- base package plus add-ons;
- pricing calculator;
- "starting at" pricing;
- consultation-first flow.

Do not hide essential purchasing information unnecessarily if transparent pricing is possible.

---

## 5.10 Objection Handling

Address expected concerns before the visitor leaves.

Possible subjects:

- pricing;
- delivery time;
- geography;
- contract length;
- revisions;
- ownership;
- cancellation;
- support;
- security;
- data privacy;
- guarantees;
- eligibility;
- required materials.

FAQ sections should be based on actual buyer objections, not filler.

---

## 5.11 Final CTA

The final conversion section should feel intentional and decisive.

Use:

- large headline;
- simple value restatement;
- one primary action;
- optional supporting proof;
- strong visual closure.

Do not end a premium funnel with an ordinary generic footer immediately after the last content section.

---

# 6. Page Narrative Principle

Every landing page should tell a story.

Preferred sequence:

> **Attention → Understanding → Desire → Proof → Confidence → Action**

Alternative B2B sequence:

> **Problem → Outcome → Solution → Demonstration → Proof → Process → Offer → Objection Handling → Conversion**

Premium service sequence:

> **Positioning → Work → Outcomes → Expertise → Process → Proof → Contact**

Product sequence:

> **Outcome → Product → Feature Story → Demonstration → Comparison → Proof → CTA**

---

# 7. One Idea Per Viewport

For important pages, apply Apple's narrative discipline.

Avoid showing:

- headline;
- 8 cards;
- testimonials;
- pricing;
- navigation;
- 3 CTAs;
- statistics;

all in one visual block.

Instead progressively reveal the story.

A visitor should always know what deserves attention.

---

# 8. Visual Design Rules

---

## 8.1 Typography

Typography should carry a large portion of the design quality.

### Requirements

- use modern, professional typefaces;
- limit the primary UI to 1–2 type families;
- establish a clear type scale;
- use large display typography selectively;
- preserve readable body sizes;
- control line length;
- use weight contrast intentionally;
- avoid excessive bold text.

### Preferred style

Premium, clean, editorial, confident.

### Avoid

- oversized text everywhere;
- tiny body copy;
- random font changes;
- overly rounded "startup" fonts unless appropriate;
- fake futuristic fonts for technology companies;
- gradients inside every headline.

---

## 8.2 Spacing

Use generous spacing.

Premium interfaces generally feel less crowded.

Use a consistent spacing scale.

Recommended baseline:

- 4
- 8
- 12
- 16
- 24
- 32
- 48
- 64
- 96
- 128

Do not use arbitrary spacing values without reason.

---

## 8.3 Layout

Preferred systems:

- CSS Grid;
- Flexbox;
- responsive containers;
- modular sections;
- intentional asymmetry;
- bento layouts where appropriate;
- sticky columns;
- editorial grids.

Avoid excessive card grids.

Not everything should be inside a rounded rectangle.

---

## 8.4 Cards

Cards should exist because they group related information.

They should not be the default container for everything.

Preferred card characteristics:

- subtle border;
- careful internal spacing;
- restrained radius;
- strong hierarchy;
- meaningful hover state;
- purposeful visual content.

Avoid:

- every section consisting of 3 cards;
- oversized border radius;
- excessive drop shadows;
- glassmorphism everywhere.

---

## 8.5 Borders

Use borders for structure rather than decoration.

Preferred:

- subtle neutral borders;
- low contrast;
- 1px;
- consistent opacity;
- responsive to dark/light background.

---

## 8.6 Radius

Use a coherent radius system.

Example:

- small: 6px;
- medium: 10px;
- large: 16px;
- feature: 24px.

Do not make every container 30–40px rounded.

Excessive rounding is one of the most common generic AI-generated design signals.

---

## 8.7 Shadows

Use sparingly.

Prefer:

- depth through contrast;
- subtle shadow;
- layered surfaces;
- light;
- blur;
- scale.

Avoid giant soft shadows on every card.

---

## 8.8 Gradients

Gradients should support atmosphere or hierarchy.

Reference:

- Stripe;
- Linear;
- Vercel.

Avoid random blue-purple gradients simply because the project is "technology."

Brand color and context should determine gradient behavior.

---

## 8.9 Glassmorphism

Use selectively.

Appropriate for:

- overlays;
- floating navigation;
- small feature surfaces;
- premium dark UI;
- layered product demos.

Do not build the entire website from translucent glass cards.

---

# 9. Image & Media Direction

Media must look intentional.

Prioritize:

1. authentic photography;
2. product screenshots;
3. service output;
4. real customer work;
5. carefully directed generated imagery;
6. custom illustration;
7. 3D imagery when appropriate.

Avoid:

- generic stock office photos;
- fake smiling corporate teams;
- meaningless abstract AI blobs;
- random futuristic robots;
- unrelated city imagery;
- visuals that do not support the offer.

Every image should answer:

> Why is this visual here?

---

# 10. Motion System

Motion is part of the design system.

It must not be improvised independently for every component.

---

## 10.1 Motion Categories

### Microinteraction

Examples:

- button hover;
- icon movement;
- toggle;
- card elevation;
- underline;
- cursor response.

Typical duration:

**120–250ms**

---

### Component Transition

Examples:

- accordion;
- tabs;
- drawer;
- modal;
- expanding card.

Typical duration:

**180–350ms**

---

### Section Reveal

Examples:

- fade;
- upward reveal;
- image mask;
- stagger.

Typical duration:

**350–700ms**

---

### Narrative Animation

Examples:

- product demo;
- sticky visual;
- scroll-driven diagram;
- cinematic sequence.

Duration depends on scroll and context.

---

## 10.2 Motion Rules

Motion must:

- explain hierarchy;
- indicate state;
- guide attention;
- improve storytelling;
- reinforce quality.

Motion must not:

- delay navigation;
- prevent immediate reading;
- trap scroll;
- cause motion sickness;
- constantly move while user reads;
- reduce accessibility.

Respect `prefers-reduced-motion`.

---

# 11. Scroll Interaction Rules

Allowed:

- subtle parallax;
- progressive reveal;
- sticky storytelling;
- timeline progress;
- image mask animation;
- product animation;
- controlled horizontal sections;
- pinned demonstrations.

Avoid:

- excessive scroll hijacking;
- very long pinned sections;
- animation that makes scrolling feel broken;
- movement on every element;
- scroll effects that interfere with mobile use.

---

# 12. Cursor Effects

Cursor effects are optional.

Use only on desktop and only when relevant.

Possible effects:

- subtle magnetic CTA;
- thumbnail preview;
- project hover label;
- soft spotlight;
- interactive object tracking.

Never require a custom cursor for basic usability.

Touch users must receive equivalent functionality.

---

# 13. Microinteraction Standard

Every interactive control must visually acknowledge the user.

States required where applicable:

- default;
- hover;
- focus;
- active;
- selected;
- disabled;
- loading;
- success;
- error.

Buttons should feel responsive.

Forms should provide immediate validation where appropriate.

Navigation should clearly indicate state.

---

# 14. Mobile-First Requirement

All frontends are mobile-first unless explicitly exempted.

Do not design desktop first and collapse it later.

The mobile experience must retain:

- hierarchy;
- visual quality;
- narrative;
- conversion strength;
- functionality.

---

## 14.1 Mobile Hero

The mobile hero should generally include:

- clear headline;
- concise supporting copy;
- primary CTA;
- optional secondary CTA;
- product/service visual.

Avoid forcing the user to scroll through large decorative imagery before understanding the offer.

---

## 14.2 Mobile Motion

Reduce:

- parallax intensity;
- cursor-specific interactions;
- large pinned sections;
- complex 3D;
- long sequences.

Preserve:

- transitions;
- state changes;
- compact reveals;
- lightweight product demonstrations.

---

## 14.3 Mobile Navigation

Use:

- simple header;
- clear menu;
- large touch targets;
- persistent CTA when valuable;
- minimal hierarchy.

Do not replicate desktop mega-navigation directly on mobile.

---

# 15. Conversion System

Every marketing UI must have a documented conversion path.

Before implementation, define:

### Primary conversion

The most important action.

### Secondary conversion

An alternative for visitors not ready for the primary action.

### Micro-conversions

Examples:

- watch demo;
- view case study;
- select service;
- calculate estimate;
- download guide;
- open FAQ;
- subscribe.

---

# 16. CTA Rules

Use action-oriented CTA text.

Avoid weak CTAs such as:

- Submit
- Click Here
- Learn More

Prefer specific actions:

- Get My Quote
- Book a Consultation
- See Available Locations
- Build My Campaign
- Start My Project
- View Case Study
- See How It Works
- Compare Packages
- Check Availability
- Get a Recommendation

CTA copy should reflect the user's intent.

---

# 17. Lead Form Rules

Reduce friction.

Ask only what is required for the current stage.

### Low-intent lead

Possible fields:

- name;
- email;
- one qualifying question.

### High-intent lead

Possible fields:

- name;
- company;
- email;
- phone;
- service;
- budget;
- timeline;
- project details.

Use multi-step forms when qualification is extensive.

---

# 18. Multi-Step Funnel Pattern

Recommended for high-ticket services.

### Step 1

Goal

### Step 2

Service / interest

### Step 3

Budget or scope

### Step 4

Timeline

### Step 5

Contact information

### Step 6

Confirmation / booking

Show progress.

Do not overwhelm users with a large form immediately.

---

# 19. Interactive Selling Tools

Whenever appropriate, consider:

- ROI calculator;
- pricing estimator;
- package configurator;
- recommendation wizard;
- product comparison;
- availability selector;
- location selector;
- before/after slider;
- interactive map;
- timeline;
- quiz;
- assessment;
- campaign builder.

Interactive tools should move the visitor closer to a purchase decision.

---

# 20. Social Proof Standard

Social proof should appear throughout the funnel rather than in one isolated testimonial section.

Possible placements:

- hero;
- immediately below hero;
- beside service CTA;
- beside pricing;
- below forms;
- before final CTA.

Preferred forms:

- recognizable logos;
- quantified outcomes;
- verified reviews;
- customer quote;
- video testimonial;
- case study;
- usage statistics.

---

# 21. Navigation Standard

Navigation must reflect the sales journey.

For a service company, typical navigation:

- Services
- Work / Results
- Process
- About
- Insights
- Contact

For SaaS:

- Product
- Solutions
- Customers
- Resources
- Pricing
- Login
- Get Started

Do not expose internal organizational complexity to the customer.

---

# 22. Header Behavior

Possible patterns:

### Transparent-to-solid

Useful for cinematic heroes.

### Floating header

Useful for premium sites.

### Sticky standard header

Useful for conversion-heavy pages.

Header may include a persistent conversion CTA.

Do not allow navigation to dominate the page.

---

# 23. Footer Standard

Footer should include:

- brand;
- primary navigation;
- contact;
- legal;
- social;
- relevant business information;
- newsletter if valuable.

Do not overcrowd the footer with every route in the application.

---

# 24. Dark vs Light Theme Guidance

Choose theme based on brand and offer, not trend.

---

## Dark Theme Best For

- technology;
- AI;
- entertainment;
- creative services;
- premium digital products;
- luxury;
- cinematic storytelling.

References:

- Linear;
- Vercel;
- Raycast;
- Runway.

---

## Light Theme Best For

- healthcare;
- legal;
- finance;
- corporate;
- education;
- professional consulting;
- services requiring transparency.

References:

- Stripe;
- Instrument;
- Apple.

Hybrid themes are encouraged when storytelling benefits from contrast.

---

# 25. Anti-"AI Website" Rules

AI-assisted websites often become visually generic.

The following patterns must be actively avoided unless justified.

---

## 25.1 Do Not Automatically Use

- purple/blue gradient background;
- glowing orb;
- random grid texture;
- 3 identical feature cards;
- giant 32px rounded corners;
- excessive glassmorphism;
- generic "trusted by" logo row with fake logos;
- abstract AI brain imagery;
- robot imagery;
- fake dashboard mockups;
- overused gradient headline text;
- endless bento boxes;
- random floating shapes;
- unnecessary animated particles;
- enormous hero with meaningless headline;
- excessive pill-shaped labels.

---

## 25.2 Avoid Generic AI Copy

Examples to avoid:

> Elevate your business to the next level.

> Unlock the power of innovation.

> Transform your digital journey.

> Seamless solutions for modern businesses.

These phrases communicate almost nothing.

Copy must be specific to:

- customer;
- pain point;
- outcome;
- differentiator;
- evidence.

---

# 26. Brand Adaptation

Before generating UI, Cursor/Grok must identify:

- company name;
- industry;
- offer;
- audience;
- geographic market;
- price level;
- desired brand perception;
- primary conversion;
- available brand assets;
- existing colors;
- existing typography;
- photography;
- proof;
- competitor position.

The reference system must adapt to those inputs.

---

# 27. Brand Personality Mapping

### Premium / Luxury

References:

- Clay Global
- Instrument
- Apple

Use:

- space;
- restrained copy;
- strong imagery;
- editorial typography;
- cinematic transitions.

---

### Technology / AI

References:

- Linear
- Vercel
- Raycast
- Runway

Use:

- product UI;
- diagrams;
- data;
- subtle glow;
- dark surfaces;
- technical credibility.

---

### Growth / Sales

References:

- Clay
- Stripe
- Superside

Use:

- measurable outcomes;
- strong CTA;
- proof;
- tools;
- interactive demos;
- case studies.

---

### Creative / Agency

References:

- Framer
- Ramotion
- Cuberto
- Obys

Use:

- motion;
- portfolio;
- typography;
- visual storytelling.

---

### Corporate / Professional

References:

- Stripe
- Instrument
- Apple
- Superside

Use:

- clarity;
- proof;
- restrained visual language;
- trust;
- data;
- case studies.

---

# 28. Component Library Requirements

Build reusable components instead of one-off sections.

Recommended base component families:

## Navigation

- desktop nav;
- mobile nav;
- mega menu;
- floating nav;
- sticky CTA header.

## Hero

- text + visual;
- split hero;
- full-screen cinematic;
- product demo;
- video hero;
- interactive hero.

## Trust

- logo strip;
- metric strip;
- review block;
- award strip;
- certification block.

## Service

- feature row;
- service card;
- interactive service explorer;
- tabs;
- sticky service narrative.

## Product

- screenshot frame;
- device mockup;
- animated UI;
- product walkthrough;
- integration diagram.

## Proof

- testimonial;
- metric block;
- case study card;
- before/after;
- customer story.

## Conversion

- CTA banner;
- booking block;
- quote form;
- multi-step form;
- pricing;
- recommendation wizard.

## Content

- FAQ;
- comparison table;
- process timeline;
- article cards;
- resources;
- related content.

---

# 29. Section Variant Requirement

Do not create one generic component for all projects.

Each major section family should eventually support multiple variants.

Example:

### Hero

- `hero-minimal`
- `hero-split`
- `hero-cinematic`
- `hero-product-demo`
- `hero-video`
- `hero-interactive`

### Services

- `services-editorial`
- `services-bento`
- `services-tabs`
- `services-sticky`
- `services-carousel`

### Case Studies

- `cases-grid`
- `cases-featured`
- `cases-horizontal`
- `cases-editorial`

AI should select the variant based on context.

---

# 30. Visual Rhythm

Alternate section density.

Example:

- dramatic hero;
- compact trust bar;
- spacious outcome section;
- dense product demonstration;
- spacious case study;
- compact metrics;
- immersive CTA.

Do not make every section the same height and structure.

---

# 31. Content Density

Use progressive disclosure.

Short copy first.

Detail on demand.

Possible techniques:

- accordion;
- tabs;
- modal;
- expandable cards;
- "view details";
- separate case study page;
- tooltips.

Keep landing pages scannable.

---

# 32. Product Screenshots

Screenshots should be treated as designed assets.

Use:

- cropping;
- framing;
- depth;
- labels;
- motion;
- zoom;
- focus regions.

Do not simply place raw screenshots into browser frames repeatedly.

---

# 33. SaaS Demo Pattern

Preferred sequence:

1. outcome statement;
2. UI screenshot;
3. interaction;
4. explanation;
5. quantified benefit.

The visitor should see how the product works before being asked to read a long description.

---

# 34. Service Demo Pattern

Services can also be demonstrated.

Examples:

### Advertising

Show billboard placement before/after.

### Marketing

Show funnel structure and campaign results.

### Development

Show product workflow.

### Consulting

Show methodology and deliverables.

### Events

Show activation, attendance, and result.

A service should feel tangible.

---

# 35. Case Study Visual Standard

Each case study should have:

- strong thumbnail;
- client identity;
- category;
- one-line challenge;
- primary result;
- optional secondary metric.

Example:

**Times Square Campaign**  
Book launch visibility campaign  
**1.8M estimated impressions**

Then open full story.

---

# 36. Pricing UX

Pricing must be easy to understand.

Use:

- clear inclusions;
- comparison;
- recommended option;
- price anchoring;
- optional add-ons;
- FAQ;
- CTA.

Avoid hiding critical fees in small text.

For custom pricing, explain what determines price.

---

# 37. Conversion Persistence

For long pages, the visitor should not have to return to the top to convert.

Possible methods:

- sticky CTA;
- repeated CTA;
- floating contact;
- section CTA;
- inline booking;
- mobile action bar.

Do not overuse floating widgets.

---

# 38. SEO-Friendly Frontend Requirement

Visual experimentation must preserve semantic structure.

Use:

- correct heading hierarchy;
- semantic HTML;
- crawlable text;
- descriptive links;
- image alt text;
- structured data where appropriate;
- accessible navigation;
- server-rendered or indexable content where applicable.

Do not put essential content only inside canvas, video, or animation.

---

# 39. Accessibility Standard

Minimum expectations:

- keyboard navigation;
- visible focus;
- adequate contrast;
- semantic markup;
- alt text;
- proper labels;
- usable forms;
- reduced motion support;
- sufficient touch targets;
- no information conveyed solely by color.

Accessibility must be considered during component creation, not patched later.

---

# 40. Performance Standard

Visual design must be performance-aware.

Use:

- responsive images;
- WebP/AVIF where suitable;
- lazy loading;
- font optimization;
- code splitting;
- deferred noncritical scripts;
- compressed video;
- reduced JS;
- GPU-friendly transforms;
- optimized animations.

Avoid loading multiple heavy libraries to implement small effects.

---

# 41. Performance Budgets

As a standing target for public marketing pages:

- minimize first-load JavaScript;
- avoid autoplaying large uncompressed videos;
- keep hero assets highly optimized;
- lazy-load below-the-fold media;
- avoid excessive third-party scripts;
- target strong Core Web Vitals;
- monitor mobile performance first.

If visual effects materially degrade mobile performance, simplify the effects.

---

# 42. Responsive Breakpoints

Use content-driven breakpoints rather than device-specific assumptions.

Common starting points:

- 360–479
- 480–767
- 768–1023
- 1024–1279
- 1280–1535
- 1536+

Breakpoints may be adjusted based on layout.

---

# 43. Design Token System

Every project should define tokens.

Example categories:

```text
colors
backgrounds
surfaces
text
muted text
borders
brand
accent
success
warning
error

spacing
radius
shadow
font sizes
font weights
line heights
container widths
z-index
motion durations
motion easing
```

Avoid arbitrary values scattered through components.

---

# 44. Motion Tokens

Example:

```text
motion-fast: 150ms
motion-base: 220ms
motion-medium: 350ms
motion-slow: 600ms

ease-standard
ease-enter
ease-exit
ease-emphasized
```

All reusable components should follow the motion system.

---

# 45. UI Copy Rules

UI copy should be:

- concise;
- confident;
- specific;
- human;
- outcome-oriented.

Avoid buzzword-heavy text.

### Prefer

> Launch your campaign in Times Square.

over

> Unlock unparalleled global visibility.

Specificity sells.

---

# 46. Headline Rules

The headline should normally communicate one of:

- outcome;
- differentiation;
- category;
- problem solved.

Examples:

> Put Your Brand in Times Square.

> Build and Launch Client Funnels in 24 Hours.

> Manage Every Court, Booking, and Player From One Platform.

Avoid headlines that require interpretation.

---

# 47. CTA Hierarchy

Each section should not contain four equal CTAs.

Use:

### Primary

Most important action.

### Secondary

Alternative action.

### Tertiary

Text link where useful.

Visual hierarchy must clearly distinguish them.

---

# 48. Trust Near Conversion

Place reassurance beside high-friction conversion actions.

Examples:

Near booking:

- no obligation;
- 30-minute consultation;
- choose your schedule.

Near checkout:

- secure payment;
- cancellation terms;
- delivery estimate.

Near quote form:

- response time;
- privacy statement;
- what happens next.

---

# 49. Funnel Personalization

Where beneficial, personalize page content based on:

- selected service;
- location;
- industry;
- role;
- campaign objective;
- budget;
- referral source.

Do not personalize in a way that feels invasive.

---

# 50. Homepage vs Landing Page

Do not treat them as identical.

---

## Homepage

Purpose:

- explain company;
- route visitors;
- establish trust;
- serve multiple intents.

Can contain multiple conversion paths.

---

## Landing Page

Purpose:

- one campaign;
- one audience;
- one offer;
- one dominant conversion.

Minimize navigation if it distracts.

---

# 51. Service Page

Each major service should have its own persuasive page when SEO and conversion justify it.

Recommended structure:

1. service-specific hero;
2. outcome;
3. visual explanation;
4. capabilities;
5. proof;
6. process;
7. case studies;
8. FAQ;
9. conversion.

---

# 52. Product Page

Recommended structure:

1. product hero;
2. primary benefit;
3. demonstration;
4. feature story;
5. proof;
6. use cases;
7. comparison;
8. pricing;
9. FAQ;
10. CTA.

---

# 53. Industry Page

Use for segmentation.

Example:

- Marketing for Authors
- Marketing for Restaurants
- Marketing for Real Estate

Each industry page should change:

- headline;
- examples;
- case studies;
- proof;
- pain points;
- recommended services.

Avoid thin pages that merely replace one keyword.

---

# 54. Location Page

Location pages should contain actual local value.

Possible content:

- inventory;
- locations;
- availability;
- local examples;
- map;
- local case studies;
- local logistics;
- FAQs.

Avoid spammy location duplication.

---

# 55. Interactive Hero Patterns

Possible hero interactions:

### Product simulator

User interacts with a simplified product UI.

### Campaign preview

User selects an option and sees an example.

### Before/after

Drag or toggle.

### Location explorer

Select location to preview offering.

### Outcome selector

User chooses goal and hero changes.

Use interaction only if understandable within seconds.

---

# 56. Bento Use Rules

Bento layouts are permitted but should not become a default formula.

Use when:

- several features need visual separation;
- different content types coexist;
- card sizes communicate importance.

Avoid when a sequential narrative would be stronger.

---

# 57. Sticky Storytelling

Sticky sections are ideal for:

- process explanation;
- product walkthrough;
- service progression;
- before/after;
- data visualization.

Recommended format:

Left:

- changing copy.

Right:

- persistent visual that changes with scroll.

or vice versa.

Keep mobile fallback simple.

---

# 58. Video Usage

Video can dramatically improve presentation when:

- the product is visual;
- the service result is visual;
- customer story matters;
- physical environment matters.

Requirements:

- optimized;
- muted autoplay only when appropriate;
- user controls when necessary;
- poster image;
- no essential information exclusively in video.

---

# 59. 3D Usage

3D is optional.

Use when it materially strengthens:

- product presentation;
- architecture;
- physical product visualization;
- premium brand experience.

Avoid 3D merely to appear advanced.

Performance and mobile fallbacks are mandatory.

---

# 60. Forms

Forms must have:

- visible labels;
- useful validation;
- clear error messages;
- success state;
- keyboard support;
- loading state;
- privacy acknowledgement where necessary.

Avoid placeholder-only labels.

---

# 61. Loading States

Interactive applications and forms should use:

- skeletons;
- progressive loading;
- optimistic UI where safe;
- meaningful status text.

Do not use indefinite spinners when progress can be communicated.

---

# 62. Empty States

Empty states should help the user act.

Include:

- explanation;
- next step;
- CTA;
- optional example.

Do not leave blank panels.

---

# 63. Error States

Errors should explain:

- what happened;
- what the user can do;
- whether input was preserved;
- whether retry is possible.

Avoid technical error messages in the public UI.

---

# 64. Design Review Checklist

Before approving a page, verify:

## Positioning

- [ ] Can a visitor understand the offer in the first viewport?
- [ ] Is the target audience obvious?
- [ ] Is the value proposition specific?
- [ ] Is the primary CTA visible?

## Visual Quality

- [ ] Does the page feel intentionally art-directed?
- [ ] Is typography strong?
- [ ] Is spacing consistent?
- [ ] Are sections visually distinct?
- [ ] Does it avoid generic AI design patterns?

## Interaction

- [ ] Do interactive elements have clear states?
- [ ] Does motion improve the experience?
- [ ] Is reduced motion supported?
- [ ] Are mobile interactions usable?

## Conversion

- [ ] Is there one clear primary conversion?
- [ ] Is proof placed near important claims?
- [ ] Are objections addressed?
- [ ] Is conversion available throughout long pages?

## Content

- [ ] Are headlines specific?
- [ ] Is copy concise?
- [ ] Are claims supported?
- [ ] Are service outcomes clear?

## Mobile

- [ ] Is the hero strong on mobile?
- [ ] Is navigation simple?
- [ ] Are touch targets adequate?
- [ ] Has unnecessary animation been reduced?

## Performance

- [ ] Are images optimized?
- [ ] Are videos optimized?
- [ ] Are heavy sections lazy-loaded?
- [ ] Are third-party scripts justified?

## Accessibility

- [ ] Is keyboard navigation supported?
- [ ] Are focus states visible?
- [ ] Is contrast sufficient?
- [ ] Are images described appropriately?
- [ ] Are semantic elements used?

## SEO

- [ ] Is the H1 correct?
- [ ] Is heading structure logical?
- [ ] Is important text crawlable?
- [ ] Are links descriptive?
- [ ] Is metadata implemented?

---

# 65. AI Implementation Directive

Use the following as standing instructions for Cursor/Grok.

---

## FRONTEND DESIGN DIRECTIVE

When implementing any new public-facing frontend:

1. Do not begin by generating a generic template.
2. First determine the product, audience, offer, brand personality, and conversion objective.
3. Select appropriate references from this document.
4. Define a visual direction before implementing sections.
5. Build the narrative around the customer's desired outcome.
6. Use premium modern typography and disciplined spacing.
7. Avoid generic AI website patterns.
8. Use interaction to communicate, not decorate.
9. Use reusable components and design tokens.
10. Keep mobile quality equal to desktop quality.
11. Protect performance and accessibility.
12. Place social proof near important claims.
13. Ensure every page has a defined conversion objective.
14. Present services like tangible products whenever possible.
15. Use real proof, screenshots, work, and results whenever available.
16. Avoid excessive card grids.
17. Avoid unnecessary gradients, glow, glass, and rounded containers.
18. Preserve semantic HTML and SEO.
19. Make CTAs specific to the visitor's desired action.
20. Review against the checklist in this document before considering the page complete.

---

# 66. AI Reference Prompt

Use this instruction when starting a major frontend.

```text
Design and implement this frontend as a premium, conversion-oriented digital experience.

Do not generate a generic AI-style landing page.

Use the following reference hierarchy selectively:

Visual system:
Linear + Vercel + Raycast

Product/service storytelling:
Apple + Stripe

Interaction:
Framer, with restrained inspiration from Cuberto and Obys

B2B funnel architecture:
Clay + Superside

Professional service presentation:
Ramotion + Clay Global + Instrument

The design must feel modern, classy, professional, interactive, and highly polished.

Do not copy any reference site directly. Extract the design principles appropriate to this business.

Prioritize:
1. clarity of the offer,
2. premium visual presentation,
3. persuasive narrative,
4. credible proof,
5. useful interaction,
6. conversion,
7. mobile quality,
8. performance,
9. accessibility,
10. SEO.

Avoid:
- generic blue/purple AI gradients,
- excessive glassmorphism,
- excessive rounded cards,
- three-card feature grids used repeatedly,
- meaningless animations,
- fake dashboards,
- generic corporate stock visuals,
- buzzword-heavy copy,
- unnecessary visual clutter.

Every section must have a purpose in the visitor journey.

Before implementation, establish:
- audience,
- primary conversion,
- page narrative,
- reference sites being used,
- visual direction,
- required components,
- proof assets,
- motion strategy,
- mobile behavior.

Then implement using reusable components and design tokens.
```

---

# 67. AI Section-Level Reference Prompt

When a section is weak, do not simply ask AI to "make it better."

Use targeted direction.

Example:

```text
Redesign this service presentation.

Use:
- Superside for sales structure,
- Ramotion for premium service presentation,
- Stripe for modular visual clarity,
- Framer for subtle interaction.

Do not change the underlying content or business logic.

Improve:
- hierarchy,
- visual storytelling,
- service differentiation,
- proof,
- CTA clarity,
- mobile behavior.

Avoid turning it into a generic 3-card feature grid.
```

---

# 68. AI Hero-Level Reference Prompt

```text
Create a premium conversion-oriented hero.

Reference:
- Linear for restraint,
- Apple for visual focus,
- Clay for outcome-oriented messaging,
- Framer for subtle motion.

The first viewport must communicate:
- what the company offers,
- who it serves,
- the primary outcome,
- the next action.

Use one dominant visual concept.

Do not use a generic abstract gradient hero.
```

---

# 69. AI Case Study Prompt

```text
Create a premium case-study section.

Reference:
- Ramotion,
- Clay Global,
- Instrument.

Lead with measurable outcomes rather than project thumbnails.

Each case study should communicate:
- client,
- problem,
- solution,
- measurable result.

Use editorial composition, strong imagery, and restrained motion.
```

---

# 70. AI Motion Prompt

```text
Add motion using Framer and Linear as primary references.

Use Cuberto and Obys only for selective inspiration.

Motion must:
- reinforce hierarchy,
- explain state,
- guide attention,
- improve product storytelling.

Do not animate every element.

Respect prefers-reduced-motion.

Reduce complexity on mobile.
```

---

# 71. AI Conversion Review Prompt

```text
Review this page as a sales funnel, not only as a design.

Evaluate:
- first-screen clarity,
- audience relevance,
- CTA hierarchy,
- proof placement,
- service/product comprehension,
- objections,
- friction,
- lead form quality,
- conversion persistence,
- mobile conversion.

Use Clay and Superside as primary conversion references.

Propose improvements without unnecessarily changing the visual brand.
```

---

# 72. UI Quality Bar

A frontend should not be considered complete merely because:

- components render;
- responsive layout works;
- animations exist;
- content is present.

It should be considered complete only when:

> **The interface looks intentionally designed, communicates the offer clearly, demonstrates value, builds confidence, feels polished on mobile and desktop, and makes the desired conversion obvious.**

---

# 73. Recommended Default Combination

When no stronger industry-specific direction exists, use:

### Visual

Linear + Stripe

### Interaction

Framer

### Storytelling

Apple

### Conversion

Clay + Superside

### Services / Case Studies

Ramotion

### Premium Art Direction

Clay Global

This should be the default "Vector quality bar."

---

# 74. Reference Selection by Project Type

## Advertising / Marketing

Use:

- Superside
- Clay
- Stripe
- Apple
- Ramotion

Primary objectives:

- results;
- visual impact;
- proof;
- lead generation.

---

## SaaS / Software

Use:

- Linear
- Vercel
- Raycast
- Stripe
- Clay

Primary objectives:

- product understanding;
- demonstration;
- trust;
- signup/demo.

---

## AI Product

Use:

- Linear
- Vercel
- Runway
- Raycast

Avoid cliché AI imagery.

Show actual AI outputs, workflows, and business results.

---

## Professional Services

Use:

- Superside
- Ramotion
- Instrument
- Clay Global

Primary objectives:

- expertise;
- authority;
- proof;
- consultation.

---

## Luxury / Premium

Use:

- Apple
- Clay Global
- Instrument

Primary objectives:

- perceived value;
- restraint;
- visual quality;
- confidence.

---

## E-commerce / Product

Use:

- Apple
- Stripe
- Framer

Focus on:

- product;
- benefits;
- proof;
- comparison;
- purchase.

---

## Event / Experience

Use:

- Apple
- Runway
- Framer
- Clay Global

Focus on:

- atmosphere;
- visual storytelling;
- urgency;
- availability;
- booking.

---

# 75. Final Implementation Principle

The purpose of this document is not to force all sites into the same aesthetic.

It establishes a **shared standard of quality**.

The frontend must always be:

**Brand-specific.**

**Audience-specific.**

**Offer-specific.**

**Conversion-specific.**

But the quality bar remains constant:

> **Modern enough to impress.  
> Clear enough to understand immediately.  
> Interactive enough to explore.  
> Fast enough to feel effortless.  
> Credible enough to trust.  
> Persuasive enough to convert.**

---

# 76. Permanent Rule for Vector Growth OS

For every future frontend implementation, Cursor/Grok must treat this file as a standing design-governance reference.

When project-specific frontend documents conflict with this file:

1. project-specific business requirements take precedence;
2. project-specific branding takes precedence;
3. accessibility, performance, security, and legal requirements always take precedence;
4. the quality principles in this document remain in force unless explicitly overridden.

Do not clone reference sites.

Do not imitate trends blindly.

Use the best proven visual, interaction, storytelling, and conversion principles to create an original frontend appropriate to the business being built.
---

# 77. Integration With the Vector Cursor Implementation Plan

This document is a **cross-cutting implementation standard**. It is not a separate product roadmap and it does not replace the Vector master implementation plan.

Its role is to govern every Vector feature that creates, renders, reviews, publishes, tests, or optimizes a public-facing customer experience.

The intended relationship is:

```text
VECTOR_MASTER_IMPLEMENTATION_PLAN.md
        │
        ├── Product and business requirements
        ├── System architecture
        ├── Data and automation
        ├── Security and governance
        │
        └── Frontend, funnel, UX and conversion governance
                ↓
27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
```

This document is authoritative for:

- client marketing websites served by the Vector Delivery Plane;
- the MGE marketing website once it is operated through Vector;
- homepages;
- landing pages;
- sales funnels;
- service pages;
- product pages;
- industry pages;
- location pages;
- campaign pages;
- lead-generation pages;
- conversion forms;
- pricing and package presentation;
- case studies;
- interactive selling tools;
- public onboarding experiences;
- frontend CRO variants;
- major public UI refreshes;
- motion and interaction on public marketing surfaces.

It does not replace security, tenant isolation, legal, accessibility, data, analytics, or client-specific requirements.

---

# 78. Recommended Repository Placement

Place this file in the Vector repository as:

```text
/docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
```

The resulting documentation hierarchy should include:

```text
/docs
├── 01_PRODUCT_VISION_AND_POSITIONING.md
├── 02_SCOPE_AND_MVP.md
├── 03_TENANCY_AND_DOMAIN_MODEL.md
├── 04_SYSTEM_ARCHITECTURE.md
├── 05_DATA_MODEL.md
├── 06_EVENT_TAXONOMY_ATTRIBUTION.md
├── 07_AI_AGENT_ARCHITECTURE_GOVERNANCE.md
├── 08_AUTOMATION_WORKFLOWS.md
├── 09_FUNNEL_ENGINE_DESIGN_SYSTEM.md
├── 10_SEO_AEO_CONTENT_STANDARD.md
├── 11_SOCIAL_PROVIDER_INTEGRATIONS.md
├── 12_EMAIL_AND_DELIVERABILITY.md
├── 13_ANALYTICS_CRO_EXPERIMENTS.md
├── 14_SECURITY_PRIVACY_COMPLIANCE.md
├── 15_API_INTEGRATION_CONTRACTS.md
├── 16_OBSERVABILITY_SRE_DR.md
├── 17_CLIENT_ONBOARDING_OPERATIONS.md
├── 18_QA_TEST_STRATEGY.md
├── 19_DEPLOYMENT_ENVIRONMENTS.md
├── 20_COSTS_USAGE_LIMITS.md
├── 21_ROADMAP_ACCEPTANCE_GATES.md
├── 22_CURSOR_AGENT_INSTRUCTIONS.md
├── 23_DECISION_LOG.md
├── 24_RISK_REGISTER.md
├── 25_GLOSSARY.md
├── 26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md
└── 27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md
```

---

# 79. Document Precedence

When Cursor/Grok encounters conflicting frontend direction, resolve it in this order:

1. Security, privacy, legal, accessibility, and tenant-isolation requirements.
2. Explicit approved client business requirements.
3. Approved client brand rules and assets.
4. Product and funnel requirements.
5. This Vector frontend standard.
6. Individual reference websites, trends, and stylistic experimentation.

Rules:

- Client branding may override the visual style but not the quality bar.
- Conversion clarity overrides decorative experimentation.
- Accessibility and performance override motion or visual effects.
- Real client proof overrides decorative placeholder content.
- Project-specific requirements may override individual patterns in this document but should not silently lower the overall standard.

---

# 80. Mandatory Cursor Read Conditions

Cursor/Grok must read this file before materially creating or editing any task involving:

```text
frontend
homepage
marketing website
client website
landing page
sales funnel
service page
product page
campaign page
lead generation
public form
hero
CTA
case study
pricing UI
public onboarding
interactive selling tool
conversion flow
responsive redesign
motion
animation
UI polish
CRO variant
visual redesign
marketing experience
```

For purely backend, database, infrastructure, queue, provider, or internal administrative work with no public frontend impact, this file does not need to be loaded.

---

# 81. Mapping to Existing Vector Documents

## 81.1 `01_PRODUCT_VISION_AND_POSITIONING.md`

That document defines what Vector and each client offer mean commercially.

This frontend standard translates that positioning into:

```text
positioning
→ narrative
→ hierarchy
→ visual presentation
→ proof
→ conversion
```

The frontend must make strategic positioning immediately understandable.

## 81.2 `02_SCOPE_AND_MVP.md`

The MVP does not need every visual variant in this document.

The first production frontend foundation should include at minimum:

- design tokens;
- responsive layout primitives;
- accessible navigation;
- accessible forms;
- several hero variants;
- trust and proof components;
- product/service presentation components;
- CTA components;
- FAQ;
- case-study support;
- metadata support;
- analytics hooks;
- mobile-first behavior;
- frontend QA.

Advanced cinematic experiences should be added only when required by a real client or reusable product need.

## 81.3 `04_SYSTEM_ARCHITECTURE.md`

This standard primarily governs the **Delivery Plane**.

The architecture should support:

```text
Client Knowledge
      ↓
Brand Configuration
      ↓
Funnel / Page Schema
      ↓
Approved Component Variants
      ↓
SvelteKit Delivery Renderer
      ↓
Client Custom Domain
```

## 81.4 `09_FUNNEL_ENGINE_DESIGN_SYSTEM.md`

These two documents work together.

Use `09_FUNNEL_ENGINE_DESIGN_SYSTEM.md` for:

- page schemas;
- technical rendering;
- component contracts;
- publishing/versioning;
- theme configuration;
- safe component composition.

Use this document for:

- frontend quality;
- UX;
- visual direction;
- sales narrative;
- interaction;
- conversion;
- motion;
- design references;
- anti-generic rules;
- review criteria.

## 81.5 `10_SEO_AEO_CONTENT_STANDARD.md`

Visual experimentation must preserve:

- semantic HTML;
- heading structure;
- crawlable important copy;
- descriptive links;
- canonical strategy;
- factual structured data;
- accessible content equivalents.

Essential content must never exist only inside animation, canvas, image, or video.

## 81.6 `13_ANALYTICS_CRO_EXPERIMENTS.md`

Frontend conversion elements must use the central Vector event taxonomy.

Do not invent ad-hoc analytics names directly inside components.

Frontend variants created for optimization must support:

- experiment assignment;
- variant identification;
- exposure tracking;
- conversion measurement;
- rollback;
- immutable result recording.

## 81.7 `17_CLIENT_ONBOARDING_OPERATIONS.md`

Client onboarding must collect enough information to apply this standard intelligently:

- target audience;
- primary conversion;
- secondary conversion;
- desired brand perception;
- approved colors;
- typography;
- photography and media;
- products/services;
- pricing approach;
- proof;
- testimonials;
- case studies;
- competitors;
- approved claims;
- prohibited claims.

## 81.8 `18_QA_TEST_STRATEGY.md`

The Design Review Checklist in this document is part of frontend QA.

Release review must include:

- mobile;
- tablet;
- desktop;
- keyboard navigation;
- reduced motion;
- form states;
- loading/error/success states;
- accessibility;
- performance;
- conversion path;
- metadata;
- analytics instrumentation.

## 81.9 `21_ROADMAP_ACCEPTANCE_GATES.md`

Recommended roadmap additions:

### Phase 1 Exit

A client can publish a production-quality funnel that passes this frontend standard.

### Phase 2 Exit

Public conversion elements emit correct Vector analytics events.

### Phase 4 Exit

AI can create frontend recommendations and draft page structures while respecting brand, design, accessibility, conversion, and policy requirements.

### Phase 7 Exit

Frontend experiment variants can be created, reviewed, measured, and promoted through the CRO system.

### Phase 9 Exit

Multiple clients can launch from the same engine without appearing to use the same templated website.

## 81.10 `26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md`

This document is a direct dependency of **Vector 24**.

Vector 24 requires reusable frontend infrastructure without sacrificing originality.

The operating goal is:

> **Reusable engine, original client experience.**

---

# 82. Roadmap Phase Mapping

This standard remains active across the whole Vector roadmap.

| Vector Phase | Frontend responsibility                                                                   |
| ------------ | ----------------------------------------------------------------------------------------- |
| Phase 0      | Shared UI primitives, accessibility baseline, token conventions, frontend quality tooling |
| Phase 1      | Funnel renderer, theme system, page schemas, components, responsive design, forms         |
| Phase 2      | Analytics hooks, conversion measurement, lead-form UX                                     |
| Phase 3      | Email capture UX, consent presentation, nurture entry states                              |
| Phase 4      | AI-generated copy, structured page plans, frontend recommendations, AI design review      |
| Phase 5      | Social campaign landing experiences and shareable pages                                   |
| Phase 6      | SEO/AEO semantics and search-friendly content presentation                                |
| Phase 7      | CRO variants and experimentation UI support                                               |
| Phase 8      | Policy-bounded AI-assisted frontend optimization                                          |
| Phase 9      | Multi-client launch automation and portfolio-wide quality consistency                     |

This document is never considered finished after a single phase. It remains a standing product standard.

---

# 83. Required `AGENTS.md` Addition

Append the following to the Vector repository `AGENTS.md`:

```text
## Frontend and Funnel Governance

For any public-facing frontend, marketing site, sales funnel, landing page,
service page, product page, campaign page, conversion flow, public form,
interactive selling experience, or CRO variant, read:

docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md

before implementation.

Treat it as the standing visual, interaction, responsive, accessibility,
performance, funnel, and conversion quality standard.

Do not generate generic AI-style marketing sites.

All public frontend work must:
- define the audience;
- define the primary conversion;
- define the page narrative;
- use approved client brand inputs;
- use Vector design tokens and component capabilities;
- preserve semantic HTML, accessibility, performance, SEO and analytics;
- pass the frontend release gate before publication.
```

---

# 84. Recommended Cursor Rule

Create:

```text
/.cursor/rules/frontend-funnel-quality.mdc
```

with:

```text
---
description: Vector public frontend, UI, UX and funnel quality rules
alwaysApply: false
---

When creating or materially editing public-facing UI, first read:
docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md

Apply it to marketing sites, client websites, landing pages, sales funnels,
service/product pages, campaign pages, public forms and CRO variants.

Before implementation establish:
1. target audience
2. primary conversion
3. secondary conversion
4. page narrative
5. client brand direction
6. proof assets
7. selected reference principles
8. component strategy
9. mobile behavior
10. analytics plan

Do not create generic AI-style landing pages.

Use shared Vector components and tokens without making all client sites look the same.

Security, privacy, legal requirements, tenant isolation, accessibility,
performance and explicit client requirements override visual experimentation.
```

---

# 85. Frontend Work Item Template for Cursor

For every substantial public frontend implementation, include the following in the implementation task or plan:

```text
## Frontend Work Item

### Business objective
What business result should this experience produce?

### Audience
Who is the visitor?

### Primary conversion
What is the most important action?

### Secondary conversion
What should visitors do when they are not ready for the primary action?

### Page narrative
How will the page move the visitor from attention to action?

### Brand direction
What should the interface feel like?

### Reference principles
Which references from the Vector frontend standard apply and why?

### Proof
What evidence supports important claims?

### Existing components
Which Vector components or variants should be reused?

### New reusable capability
Is a new shared component genuinely required?

### Motion
What motion improves communication?

### Mobile
How does the experience adapt on narrow screens?

### Analytics
Which existing Vector events must fire?

### SEO/AEO
Which semantic and crawlability requirements apply?

### Accessibility
Which interaction and content requirements apply?

### Performance
What asset or interaction budgets apply?

### Acceptance criteria
What must be true before this work is complete?
```

---

# 86. Frontend Pre-Implementation Gate

Cursor/Grok must not immediately start coding a major public frontend from a vague instruction.

Before implementation establish:

- client;
- audience;
- offer;
- page type;
- primary conversion;
- secondary conversion;
- brand personality;
- page narrative;
- available proof;
- available media;
- section families;
- component variants;
- selected reference principles;
- analytics requirements;
- SEO/AEO requirements;
- mobile behavior;
- motion strategy.

The intended workflow is:

```text
business context
→ conversion strategy
→ visual direction
→ component selection
→ implementation
→ QA
→ measurement
```

not:

```text
prompt
→ generic template
→ launch
```

---

# 87. Component Reuse Decision Rule

Before creating a new public frontend component, Cursor should ask:

1. Does an existing component family already solve this?
2. Does an existing variant solve it?
3. Can the existing component be safely extended without becoming overly generic?
4. Is this need likely to recur across clients?
5. Is the requirement actually client-specific?

Prefer clear component variants over giant universal components with many conditional properties.

Examples:

```text
hero-minimal
hero-split
hero-cinematic
hero-product-demo
hero-video
hero-interactive
```

The shared library should encode reusable capabilities, not force identical composition.

---

# 88. Frontend Release Gate

A public page cannot be considered production-ready until it passes all applicable checks below.

## Business

- [ ] Audience is clear.
- [ ] Primary conversion is defined.
- [ ] Offer is understandable.
- [ ] Claims are approved.
- [ ] Proof supports important claims.

## Visual Quality

- [ ] Art direction is intentional.
- [ ] The page does not look like a generic AI template.
- [ ] Typography is coherent.
- [ ] Spacing and visual rhythm are coherent.
- [ ] Reference principles were adapted rather than copied.

## UX

- [ ] Navigation is understandable.
- [ ] Interactive elements work by click/touch.
- [ ] Forms communicate errors, loading and success.
- [ ] Long pages retain a usable conversion path.

## Mobile

- [ ] Mobile hero remains persuasive.
- [ ] No critical desktop-only interaction exists.
- [ ] Touch targets are usable.
- [ ] No page-level horizontal overflow exists.
- [ ] Motion is appropriately simplified.

## Accessibility

- [ ] Keyboard navigation works.
- [ ] Focus is visible.
- [ ] Inputs have labels.
- [ ] Contrast is adequate.
- [ ] Reduced motion is supported.

## Performance

- [ ] Hero assets are optimized.
- [ ] Heavy below-fold media is deferred.
- [ ] Third-party scripts are justified.
- [ ] No avoidable large frontend dependency was added.

## SEO / AEO

- [ ] H1 is correct.
- [ ] Heading hierarchy is logical.
- [ ] Important text is crawlable.
- [ ] Canonical and metadata are correct.
- [ ] Structured data is factual.

## Analytics

- [ ] Required events fire correctly.
- [ ] Primary conversion is measurable.
- [ ] Experiment assignment is tracked when applicable.

## Technical

- [ ] Tenant isolation remains intact.
- [ ] Errors are handled.
- [ ] Loading states are handled.
- [ ] Relevant automated tests pass.

---

# 89. Mapping This Standard to Vector 24

The frontend system must directly support the goal of launching a normal Vector-ready client within 24 hours.

Every repeated manual frontend launch task should eventually become one of:

- a reusable component;
- a component variant;
- a design token;
- a client configuration field;
- an onboarding field;
- an AI generation rule;
- a QA check;
- an automated test;
- a publishing action.

Examples:

```text
Manual:
developer changes CTA styling for every client

Vector approach:
approved client brand tokens control CTA styling
```

```text
Manual:
developer rebuilds service presentation for every client

Vector approach:
multiple high-quality service variants exist and are selected based on
brand, content, funnel and conversion context
```

```text
Manual:
developer manually adds analytics to every client website

Vector approach:
the funnel engine emits standardized events automatically
```

The objective is not to eliminate design judgment.

The objective is to eliminate repetitive implementation work while preserving original art direction.

---

# 90. AI-Generated Frontend Governance

When Vector Intelligence eventually creates or modifies frontend experiences, prefer structured configuration over arbitrary generated production code.

Preferred architecture:

```text
AI recommendation
        ↓
validated page/section schema
        ↓
approved component variant
        ↓
approved theme tokens
        ↓
Vector renderer
        ↓
preview
        ↓
QA / approval policy
        ↓
publication
```

Avoid:

```text
AI
 ↓
arbitrary HTML/CSS/JS
 ↓
production
```

This improves:

- security;
- consistency;
- accessibility;
- performance;
- rollback;
- experimentation;
- auditability;
- multi-client reliability.

AI may propose new component capabilities, but new shared components should enter the codebase through the normal engineering, review, and test process.

---

# 91. Frontend Learning Loop

Vector should record validated frontend and funnel outcomes as part of its growth memory.

Potential learning dimensions:

```text
client
industry
audience
offer
traffic source
page type
narrative
component variant
headline approach
CTA approach
proof type
experiment
conversion result
confidence
```

The learning loop is:

```text
experience
→ measured behavior
→ experiment
→ validated result
→ learning object
→ future recommendation evidence
```

Do not automatically convert one client's winning design into a global design rule.

Use performance history as evidence while continuing to respect each client's brand, audience, offer, and context.

---

# 92. Required Integration Actions

**Integration status (22 August 2026):** Folded into `AGENTS.md`, `.cursor/rules/frontend-funnel-quality.mdc`, `.cursor/rules/frontend.mdc`, `.cursor/rules/implementation.mdc`, `.cursor/rules/delivery.mdc`, and charters `01`, `02`, `04`, `07`, `09`, `10`, `13`, `17`, `18`, `21`, `22`, `23`, `25`, `26`, plus Phase 1/2/4/6/7/9 plans. This file remains the detailed public-experience standard. Vector product identity for Control is a separate charter: `docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md`. Do not treat this file as a license to restyle Control cinema, and do not treat `docs/28` as Delivery identity.

When this document is added to the Vector repository, perform the following once:

1. Place it at `/docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md`.
2. Add the Frontend and Funnel Governance section to `AGENTS.md`.
3. Create `.cursor/rules/frontend-funnel-quality.mdc`.
4. Cross-reference this document from `09_FUNNEL_ENGINE_DESIGN_SYSTEM.md`.
5. Add its release requirements to `18_QA_TEST_STRATEGY.md`.
6. Add the frontend phase exits to `21_ROADMAP_ACCEPTANCE_GATES.md`.
7. Cross-reference it from `26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md`.
8. Use the Frontend Work Item Template for major public UI work.
9. Require the Frontend Release Gate before production publication.
10. Keep this document as a standing standard throughout the lifetime of Vector.

The final operating relationship is:

```text
Vector architecture
        +
Vector business rules
        +
Client knowledge and brand
        +
Frontend UI/UX/Funnel Standard
        ↓
Original high-quality client experience
        ↓
Measured user behavior and conversions
        ↓
Vector Insights
        ↓
Controlled optimization
```

This is how this document becomes part of the implementation system rather than remaining only a visual-reference guide.
