# VECTOR Creative Asset Generation & Media Pipeline

## AI Image, Video, Brand Asset, Funnel, Social, and Email Creative System

**Project:** Vector — Autonomous Growth OS  
**Document type:** Cross-cutting implementation architecture and operating standard  
**Recommended repository location:** `/docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md`  
**Status:** Accepted architecture standard (ADR-0008). Implementation follows the C0–C9 track. First Reveal consumes C1, C3, C5, and C7 (`docs/plans/FIRST_REVEAL_TRACK.md`, ADR-0012). Art-directed page experience is `docs/plans/CREATIVE_EXPERIENCE_ENGINE_TRACK.md` (ADR-0014) and does not add a second media pipeline. This does not reopen Phase 1 or Phase 4 exits.  
**Version:** 1.1  
**Date:** 22 August 2026  
**Applies to:** Client onboarding, brand ingestion, funnels, social media, email marketing, campaign generation, SEO/AEO/GEO presentation, CRO experiments, Vector 24, asset storage, AI governance, approvals, and client operations  
**Does not replace:** `docs/27` public art direction, `docs/28` Control / Vector product identity, or `packages/storage` `StorageProvider`

---

# 1. Purpose

This document defines the **Vector Creative Engine**, a dedicated subsystem responsible for creating, editing, composing, validating, storing, versioning, approving, resizing, distributing, and learning from visual and media assets used across every Vector-managed client growth system.

The Vector Creative Engine exists because a modern growth system cannot rely only on:

- text copy;
- brand colors;
- logo placement;
- layout;
- typography;
- generic gradients;
- stock placeholders.

A high-performing funnel, social campaign, email program, case study, product page, or launch campaign frequently requires strong supporting media.

The Creative Engine turns the following inputs:

```text
client brand
+ products/services
+ client-owned media
+ campaign objective
+ audience
+ offer
+ creative strategy
+ AI generation
+ deterministic composition
```

into:

```text
production-ready branded assets
```

for:

- funnel websites;
- landing pages;
- social platforms;
- email marketing;
- campaign pages;
- Open Graph previews;
- case studies;
- lead magnets;
- ads;
- content thumbnails;
- product/service visuals;
- short-form video;
- future paid media systems.

---

# 2. Core Principle

The governing principle is:

> **Generative AI creates visual possibilities. Vector creates the final marketing asset.**

Vector should not rely on an image model to correctly produce final production graphics containing exact:

- logos;
- prices;
- legal disclaimers;
- phone numbers;
- URLs;
- CTA copy;
- typography;
- brand spacing;
- campaign labels.

Instead:

```text
AI-generated or client-supplied visual
                +
Vector-controlled typography
                +
Vector-controlled logo
                +
Vector brand tokens
                +
Vector layout template
                +
Vector QA
                ↓
Final production asset
```

This creates much more reliable, professional, brand-consistent output.

---

# 3. Relationship to Existing Vector Documents

This document must be wired directly into the existing Vector documentation pack.

## 3.1 `01_PRODUCT_VISION_AND_POSITIONING.md`

The Creative Engine supports the promise that Vector is a complete autonomous growth operating system rather than only a copywriting and funnel automation tool.

It allows Vector to deliver:

- visually complete funnels;
- brand-consistent campaigns;
- social creative;
- email creative;
- campaign identity;
- creative optimization.

---

## 3.2 `02_SCOPE_AND_MVP.md`

The MVP does **not** need advanced cinematic video generation, 3D rendering, or a complete creative studio.

Creative MVP should include:

- client asset ingestion;
- brand visual profile;
- image asset library;
- AI image provider abstraction;
- deterministic social graphic composition;
- funnel hero image generation/editing;
- email banner generation;
- automatic resizing/derivatives;
- asset approval/versioning;
- R2 storage;
- creative QA;
- usage tracking.

Advanced video generation can follow after the core image pipeline is stable.

---

## 3.3 `04_SYSTEM_ARCHITECTURE.md`

The Creative Engine spans both planes.

### Control Plane

Manages:

- asset library;
- creative briefs;
- brand rules;
- creative approvals;
- generation jobs;
- templates;
- asset status;
- usage rights;
- performance reporting.

### Delivery Plane

Uses:

- approved assets;
- optimized derivatives;
- responsive images;
- email-compatible images;
- social publishing assets;
- Open Graph images;
- campaign assets.

---

## 3.4 `05_DATA_MODEL.md`

Add the Creative Engine entities defined in this specification.

---

## 3.5 `07_AI_AGENT_ARCHITECTURE_GOVERNANCE.md`

Creative generation must follow the same rule:

> AI proposes. Policy decides. Trusted software executes.

AI models may:

- create concepts;
- generate images;
- edit source media;
- propose layouts;
- classify assets;
- generate alt text;
- visually review drafts.

AI models must not:

- directly overwrite approved brand assets;
- publish unapproved assets;
- bypass usage-right checks;
- invent protected claims;
- alter logos without explicit authorization;
- place generated content into production without validation.

---

## 3.6 `08_AUTOMATION_WORKFLOWS.md`

Add workflows for:

- asset ingestion;
- creative generation;
- campaign asset family generation;
- image derivative generation;
- creative QA;
- approval;
- social asset publication readiness;
- funnel asset readiness;
- email asset readiness;
- asset archival;
- creative performance feedback.

---

## 3.7 `09_FUNNEL_ENGINE_DESIGN_SYSTEM.md`

The funnel engine consumes approved assets from the Creative Engine.

The funnel engine should not separately invent or permanently own client media.

Preferred relationship:

```text
Funnel schema
    ↓
asset requirements
    ↓
Creative Engine
    ↓
approved asset references
    ↓
Funnel renderer
```

---

## 3.8 `10_SEO_AEO_CONTENT_STANDARD.md`

Creative assets must support:

- descriptive alt text;
- meaningful filenames where applicable;
- crawlable surrounding text;
- responsive dimensions;
- image performance;
- accurate captions;
- factual visual claims;
- transcripts and media metadata where they help search or generative discovery.

Essential content must not exist only inside images. Phase 6 consumes approved assets. It does not build a second media engine. OG composition remains additive Creative work.

---

## 3.9 `11_SOCIAL_PROVIDER_INTEGRATIONS.md`

The Social subsystem should receive already approved, channel-ready creative derivatives from the Creative Engine.

Social should not become its own independent image-generation system.

---

## 3.10 `12_EMAIL_AND_DELIVERABILITY.md`

The Email subsystem should use lightweight supporting visuals produced by the Creative Engine.

Do not render entire marketing emails as images.

Important campaign copy should remain HTML text.

---

## 3.11 `13_ANALYTICS_CRO_EXPERIMENTS.md`

Creative variants must be measurable.

Vector should be able to compare:

- image A versus image B;
- photo versus illustration;
- product image versus lifestyle image;
- static versus short video;
- different creative concepts;
- different overlay copy;
- different aspect ratios or compositions.

Validated creative outcomes should become Vector learning objects.

---

## 3.12 `14_SECURITY_PRIVACY_COMPLIANCE.md`

Creative assets may contain:

- people;
- customer photos;
- private business documents;
- logos;
- copyrighted media;
- regulated claims;
- personally identifiable information.

The system must preserve provenance, rights, access control, and tenant isolation.

---

## 3.13 `15_API_INTEGRATION_CONTRACTS.md`

Create provider interfaces for:

```text
ImageProvider
VideoProvider
ImageTransformProvider
```

Do not invent a second `AssetStorageProvider`. Object bytes use the existing `StorageProvider` in `packages/storage`. Metadata and authorization stay in PostgreSQL.

Provider-specific functionality must not leak throughout the domain. Do not add `generateImage` to `AIProvider`.

---

## 3.14 `17_CLIENT_ONBOARDING_OPERATIONS.md`

Client onboarding must capture or infer the visual brand profile and asset inventory.

The onboarding process should be optimized so the client usually **confirms extracted information** instead of manually describing every visual preference.

This document introduces the **Vector Creative QuickStart** workflow described later.

---

## 3.15 `18_QA_TEST_STRATEGY.md`

Creative QA becomes part of automated and visual QA.

---

## 3.16 `20_COSTS_USAGE_LIMITS.md`

Track:

- generation cost;
- editing cost;
- video generation cost;
- transformation cost;
- storage;
- bandwidth;
- number of generated variants.

Costs must be attributable to a client and campaign.

---

## 3.17 `21_ROADMAP_ACCEPTANCE_GATES.md`

Add Creative Engine milestones to the implementation roadmap.

---

## 3.18 `26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md`

The Creative Engine is mandatory for Vector 24.

Rapid onboarding is not truly automated if operators still need to manually design all social graphics, funnel imagery, email headers, and campaign creative after the client is marked Vector Ready.

---

## 3.19 `27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md`

Document 27 defines the **visual quality philosophy**.

This document defines the **production machinery** that supplies the imagery and media required to achieve that quality.

Document 27 governs art direction for public Delivery experiences.

This document (29) governs generation, storage, composition, transformation, approval, and distribution.

## 3.20 `28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md`

Document 28 is Control / Vector product identity. It is not the Creative Engine and is not a tenant theme.

Client campaign media, funnel imagery, social graphics, email banners, and Open Graph assets follow this document and `docs/27`. Do not paint tenant domains with Vector Black / Blue.

## 3.21 `30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md`

Creative → campaign → lead → sale → revenue is Creative C8 plus the Outcomes charter. Do not treat click-through as business success. Authenticated creative review for clients uses `docs/28` chrome and `docs/30` copy.

---

# 4. Product Naming

Recommended user-facing and internal terminology:

**Vector Creative**  
The overall creative capability.

**Vector Creative Engine**  
The technical subsystem.

**Creative Brief**  
Structured description of one campaign or asset objective.

**Creative Concept**  
A proposed visual direction derived from a brief.

**Asset Family**  
A related set of assets created from one campaign concept.

**Master Asset**  
Highest-quality source used to create channel derivatives.

**Derivative**  
Resized, cropped, compressed, or reformatted output.

**Creative Variant**  
A materially different visual or composition intended for testing.

---

# 5. Why This System Is Necessary

Without a dedicated creative pipeline, the system can generate:

- strong copy;
- typography;
- layouts;
- gradients;
- design tokens;
- forms;
- interactive UI.

However, when a client supplies only a logo and little or no photography, product imagery, screenshots, or case-study media, a funnel can become **asset-light**.

It may still be visually polished through:

- typography;
- layout;
- diagrams;
- icons;
- motion;
- abstract branded treatments;
- UI mockups.

But for many industries it will not reach the quality bar defined in Document 27 without relevant visual media.

Therefore Vector must be able to fill visual gaps safely and intentionally.

---

# 6. Creative Source Hierarchy

Vector must not automatically generate imagery when better source material already exists.

Use this priority order.

## Priority 1 — Authentic Client Assets

Examples:

- product photos;
- service photography;
- venue/location photos;
- customer-approved photos;
- real event images;
- real team photos;
- screenshots;
- project outputs;
- before/after evidence;
- client-created videos.

Prefer these whenever quality is sufficient.

## Priority 2 — Client-Owned Assets That Can Be Improved

Use AI or deterministic editing for:

- background removal;
- cleanup;
- extension;
- reframing;
- lighting correction;
- cropping;
- visual consistency;
- resolution improvement;
- format conversion.

Do not materially misrepresent the underlying product, service, customer, or result.

## Priority 3 — Generated Supporting Media

Appropriate for:

- conceptual campaign imagery;
- backgrounds;
- illustrations;
- visual metaphors;
- editorial imagery;
- non-evidentiary lifestyle scenes;
- abstract compositions;
- supporting hero imagery.

## Priority 4 — Template/Graphic Composition

Use for:

- social quote cards;
- promotional cards;
- offer graphics;
- case-study summaries;
- email banners;
- OG images;
- campaign announcement assets.

## Priority 5 — Minimal Visual Presentation

When generation is inappropriate or unavailable, use strong:

- typography;
- layout;
- icons;
- diagrams;
- shapes;
- whitespace;
- motion.

Never insert irrelevant visual filler merely because a section appears visually empty.

---

# 7. Brand Visual Profile

Every client should have a machine-readable `brand_visual_profile`.

Recommended fields:

```text
primary_logo_asset_id
secondary_logo_asset_id
symbol_asset_id

primary_colors
secondary_colors
accent_colors
neutral_colors

primary_font
secondary_font
fallback_fonts

photography_style
illustration_style
graphic_style
video_style

preferred_composition
preferred_lighting
preferred_subjects
preferred_locations

prohibited_subjects
prohibited_styles
prohibited_colors

logo_clear_space
logo_background_rules
logo_minimum_size

headline_style
cta_visual_style
border_style
radius_character
shadow_character
motion_character

brand_personality
price_positioning
visual_keywords
negative_visual_keywords
```

Examples of visual keywords:

```text
premium
architectural
clean
editorial
natural
technical
warm
minimal
energetic
institutional
playful
luxury
```

Examples of negative keywords:

```text
cartoon
neon
robot
generic corporate office
purple AI gradient
futuristic hologram
stock photo look
excessive glow
```

---

# 8. Creative QuickStart During Client Onboarding

The client should not have to complete a long technical design questionnaire unless necessary.

Preferred onboarding begins with:

```text
1. Business URL
2. Logo
3. Existing social pages
4. Existing brand or sales files
5. Primary offer
6. Desired business outcome
```

Vector then analyzes available sources and drafts:

- brand colors;
- fonts;
- visual personality;
- likely audience;
- imagery style;
- current asset inventory;
- missing assets;
- creative recommendations.

The client sees:

```text
We found the following brand direction:

Primary color: #123456
Accent: #...
Visual style: Premium / clean / professional
Photography: Real people, natural lighting
Primary logo: [preview]

Is this correct?

[Confirm]
[Edit]
```

This is preferable to requiring the client to manually enter every field.

Confirmed brand direction feeds First Reveal (`docs/plans/FIRST_REVEAL_TRACK.md`). QuickStart is C1-adjacent. It is not a license to show the client the raw first compose.

---

# 9. Vector Creative Readiness

Add Creative readiness to the overall Vector Readiness Gate.

Example:

```text
Logo                    ✓
Brand colors            ✓
Visual direction        ✓
Primary offer           ✓
Product/service visuals ⚠
Photography             Optional
Campaign objective      ✓
Usage rights            ✓
```

Creative readiness may be satisfied in one of three ways:

### Ready With Authentic Assets

Client already has sufficient production-quality media.

### Ready With AI Assistance

Client approves generation of missing supporting media.

### Ready With Minimal Visual System

The specific business can launch effectively using typography, diagrams, icons, and controlled graphic design without heavy imagery.

---

# 10. Creative Brief

Every generated campaign asset family begins with a structured Creative Brief.

Recommended schema:

```text
client_id
campaign_id
objective
primary_conversion
audience
market
offer
message
proof
channel_targets
brand_profile_version
required_assets
available_source_assets
required_text
required_logos
legal_text
prohibited_content
visual_direction
tone
deadline
approval_policy
```

Example:

```text
Client:
ABC Dental

Campaign:
Implant Consultation

Objective:
Generate consultation bookings

Audience:
Adults 35–65 in Cebu

Offer:
Free initial implant consultation

Visual tone:
Premium, reassuring, clean, clinical

Avoid:
Graphic dental imagery
Fear-based messaging
Fake before-and-after images

Channels:
Website
Facebook
Instagram
Email
```

---

# 11. Creative Concept Generation

Vector Intelligence may generate multiple concepts from one Creative Brief.

Example:

### Concept A — Confidence

Portrait-led visual showing a mature adult with a natural confident smile.

### Concept B — Premium Clinical

Modern clinic environment emphasizing professionalism and safety.

### Concept C — Lifestyle Outcome

Person confidently participating in a social setting.

Each concept must state:

- visual rationale;
- intended emotion;
- target audience fit;
- proof relationship;
- brand alignment;
- generation requirements;
- risk notes.

A concept is not an asset.

It is a design direction.

---

# 12. Image Provider Abstraction

Create:

```ts
interface ImageProvider {
	generate(request: GenerateImageRequest): Promise<ImageGenerationResult>;
	edit(request: EditImageRequest): Promise<ImageGenerationResult>;
	generateVariants(request: VariantRequest): Promise<ImageGenerationResult[]>;
}
```

Initial provider may be:

```text
GrokImagineProvider
```

Future providers may include other approved image models.

The domain must remain provider-independent.

---

# 13. Video Provider Abstraction

Create separately:

```ts
interface VideoProvider {
	generate(request: GenerateVideoRequest): Promise<VideoGenerationResult>;
	imageToVideo(request: ImageToVideoRequest): Promise<VideoGenerationResult>;
	edit?(request: EditVideoRequest): Promise<VideoGenerationResult>;
}
```

Video generation is not required for the first Creative MVP.

---

# 14. Deterministic Composition Engine

The final asset compositor should use controlled rendering rather than model-generated typography.

Possible implementation tools:

- SVG rendering;
- Sharp;
- HTML/CSS server rendering;
- Canvas only where server-side reliability is verified.

Use deterministic composition for:

- text overlays;
- client logos;
- campaign labels;
- prices;
- CTAs;
- disclaimers;
- contact information;
- date/time;
- location;
- brand marks.

---

# 15. Template Families

Create reusable template **families**, not one rigid design.

## Social

- `social-editorial`
- `social-offer`
- `social-case-study`
- `social-quote`
- `social-stat`
- `social-announcement`
- `social-product`
- `social-event`
- `social-carousel`

## Email

- `email-hero`
- `email-offer-banner`
- `email-product`
- `email-case-study`
- `email-testimonial`

## Funnel

- `funnel-hero`
- `funnel-service-visual`
- `funnel-product-visual`
- `funnel-case-study-cover`
- `funnel-before-after`
- `funnel-background`

## Sharing

- `og-default`
- `og-campaign`
- `og-case-study`
- `og-product`
- `og-service`

Templates must consume client brand tokens.

---

# 16. Channel Asset Specifications

Store channel specifications as configuration, not hardcoded assumptions scattered through code.

Each target should define:

```text
channel
placement
width
height
aspect_ratio
max_size
preferred_format
safe_zone
text_density_guidance
```

Vector can then generate derivatives automatically.

Do not require operators to manually resize every asset.

---

# 17. Master Asset and Derivatives

Recommended pipeline:

```text
Master Asset
    ↓
Crop strategy
    ↓
Channel derivative
    ↓
Compression
    ↓
QA
    ↓
Publishable asset
```

One campaign master may create:

- desktop hero;
- mobile hero;
- social square;
- social portrait;
- story/reel cover;
- email banner;
- blog thumbnail;
- Open Graph image.

---

# 18. Smart Cropping

Cropping should preserve:

- face;
- product;
- focal point;
- important composition;
- safe text zone.

Store focal metadata:

```text
focal_x
focal_y
subject_box
safe_text_region
```

When automated cropping has low confidence, require manual adjustment.

---

# 19. Asset Storage

Use R2 through the existing Vector `StorageProvider`. Local disk remains the default when R2 credentials are absent.

Recommended key structure:

```text
clients/{client_id}/creative/
    source/
    master/
    derivatives/
    social/
    email/
    funnels/
    campaigns/
    archive/
```

PostgreSQL stores metadata and authorization.

---

# 20. Asset Data Model

Add:

```text
creative_briefs
creative_concepts

brand_visual_profiles
brand_visual_profile_versions

assets
asset_versions
asset_derivatives
asset_relations

asset_generation_jobs
asset_generation_inputs
asset_generation_outputs

creative_templates
creative_template_versions

creative_approvals
creative_review_notes

asset_usage
asset_rights

creative_performance
creative_learning_objects
```

---

# 21. Suggested `assets` Fields

```text
id
client_id
campaign_id
parent_asset_id
asset_type
source_type
title
description
storage_key
mime_type
width
height
duration_ms
file_size
checksum
status
is_ai_generated
provider
model
generation_job_id
rights_status
rights_notes
focal_x
focal_y
alt_text
created_by
created_at
updated_at
```

---

# 22. Source Types

Recommended values:

```text
client_upload
client_url_import
client_social_import
client_existing_site
ai_generated
ai_edited
vector_composed
vector_transformed
licensed_external
operator_upload
```

---

# 23. Asset Rights

Every asset should have a rights state.

Example:

```text
unknown
client_owned
client_approved
licensed
generated
restricted
expired
prohibited
```

Do not publish assets with unresolved rights when the system requires rights confirmation.

---

# 24. Asset Lifecycle

Recommended state machine:

```text
requested
→ briefed
→ generating
→ draft
→ qa
→ awaiting_approval
→ approved
→ ready
→ published
→ archived
```

Alternate exits:

```text
rejected
superseded
failed
blocked
```

Approved assets should not be overwritten.

New changes create new versions.

---

# 25. Creative Approval

Approval policies should be configurable.

Examples:

### Client A

All generated customer-facing creative requires approval.

### Client B

Evergreen social templates may publish automatically.

### Client C

AI-generated human imagery always requires approval.

### Client D

Only campaign master requires approval; resized derivatives auto-approve.

---

# 26. Creative QA

Creative QA should combine deterministic checks and AI-assisted visual review.

## Deterministic

Check:

- dimensions;
- format;
- file size;
- required logo present;
- required text present;
- spelling source;
- text overflow;
- safe zones;
- minimum contrast;
- missing asset references;
- correct campaign/client;
- version;
- duplicate hash;
- approved rights status.

## AI-assisted

Review:

- brand alignment;
- obvious visual artifacts;
- distorted products;
- malformed people;
- misleading representation;
- inappropriate subjects;
- inconsistent style;
- composition quality;
- relevance to campaign;
- generic AI appearance.

AI review does not replace deterministic validation.

---

# 27. Logo Protection

Original logos must be treated as protected source assets.

By default:

- do not redraw;
- do not regenerate;
- do not distort;
- do not change text;
- do not alter proportions;
- do not add effects unless brand rules explicitly allow them.

AI-generated imagery should normally be created **without asking the image model to reproduce the client's logo**.

Vector should place the real logo afterward.

---

# 28. Text Protection

Important marketing text should be composed by Vector.

Examples:

```text
price
offer
phone
email
website
event date
CTA
legal disclaimer
service name
campaign name
```

Do not trust an image-generation model to render these correctly.

---

# 29. Product and Service Truthfulness

AI-generated visuals must not falsely imply:

- a product feature that does not exist;
- a physical product appearance that differs materially from reality;
- a client location that does not exist;
- a customer result that did not happen;
- a certification;
- a team member;
- a before/after outcome;
- a medical, financial, or legal result.

Generated media must be treated as marketing illustration unless grounded in authentic source material.

---

# 30. Human Representation

Generated people should be used carefully.

Prefer authentic people when:

- team identity matters;
- customer evidence matters;
- testimonials are being presented;
- professional credentials matter.

Never present a generated person as a real employee, client, doctor, lawyer, customer, executive, or testimonial source.

---

# 31. Funnel Asset Manifest

When a funnel is planned, the Funnel Strategist should create an asset manifest.

Example:

```text
Hero
- 1 desktop primary image
- 1 mobile crop

Proof
- 4 client logos
- 2 testimonial portraits

Services
- 3 service visuals

Case Study
- 1 cover image
- 3 result screenshots

Final CTA
- 1 closing visual
```

Creative Engine resolves the manifest using:

1. existing approved assets;
2. edited client assets;
3. generated assets;
4. controlled graphic alternatives.

---

# 32. Social Campaign Asset Family

One approved campaign concept should generate a coordinated family.

Example:

```text
Campaign Master
    ├── Instagram portrait
    ├── Instagram story
    ├── Facebook feed
    ├── Facebook story
    ├── LinkedIn image
    ├── carousel panels
    ├── reel cover
    └── optional short video
```

The assets should feel related but not necessarily identical.

---

# 33. Email Creative Rules

Email graphics should be:

- lightweight;
- responsive;
- supportive;
- brand-consistent.

Do not place all important email text inside graphics.

Use HTML for:

- headlines;
- body copy;
- CTA;
- pricing details where feasible;
- legal content;
- unsubscribe.

---

# 34. Open Graph Generation

Every major published page should support an automatically generated Open Graph asset.

Inputs:

```text
client brand
page title
page category
campaign
approved visual
```

Output should use exact typography and logo through deterministic composition.

---

# 35. Case Study Assets

Case-study visuals should prioritize real evidence.

Use:

- actual screenshots;
- customer-approved photography;
- measurable result graphics;
- charts;
- before/after comparisons where legitimate.

Avoid inventing decorative fake proof.

---

# 36. Screenshot Presentation System

Product screenshots should be treated as creative assets.

Vector may:

- crop;
- frame;
- annotate;
- zoom;
- highlight;
- place within device frames;
- create layered compositions.

The underlying screenshot must remain authentic.

---

# 37. Asset Generation Workflow

Recommended workflow:

```text
Creative Brief
    ↓
Source Asset Search
    ↓
Asset Gap Analysis
    ↓
Creative Concept
    ↓
Generate / Edit / Compose
    ↓
Create Master
    ↓
Generate Derivatives
    ↓
Creative QA
    ↓
Approval
    ↓
Ready
```

---

# 38. Asset Gap Analysis

Before generating anything, Vector should answer:

```text
What visual assets are required?
What approved assets already exist?
Which assets can be edited?
Which genuinely need generation?
Which can be replaced with diagrams or typography?
```

This prevents wasteful and generic asset generation.

---

# 39. Client Revision Workflow

Clients should not need to write image prompts.

Preferred UX:

```text
Request Revision
```

Then select:

- More premium
- More minimal
- More human
- More energetic
- More corporate
- More playful
- Different subject
- Different composition
- Different background
- Use another real client image
- Add written feedback

Vector translates the request into a new concept/generation job.

---

# 40. Creative Performance Tracking

Track creative IDs with publication and outcome data.

Possible metrics:

- impressions;
- click-through rate;
- landing-page conversion;
- lead conversion;
- social engagement;
- email click rate;
- assisted conversion;
- revenue where attributable.

---

# 41. Creative Learning Objects

Validated learnings should contain:

```text
client_id
industry
audience
channel
campaign_objective
creative_type
visual_style
source_type
template
variant
message
result
sample_size
confidence
date_range
```

Example:

```text
Audience:
Home service owners

Channel:
Facebook

Finding:
Real project photography outperformed generated abstract graphics

Result:
+31% CTR

Confidence:
High
```

Do not turn one client's result into a universal rule automatically.

---

# 42. AI Cost Controls

Creative generation can become expensive.

Implement:

- generation budget per client;
- generation budget per campaign;
- maximum variants;
- maximum video duration;
- low-cost draft generation;
- higher-quality final generation only after concept approval where appropriate;
- caching;
- re-use of approved source assets.

---

# 43. Duplicate Prevention

Do not repeatedly generate near-identical visuals.

Use:

- asset hash;
- perceptual hash;
- prompt similarity;
- concept history;
- campaign history.

Flag visually repetitive client social feeds.

---

# 44. Asset Search

Operators and agents should be able to search by:

- client;
- campaign;
- service;
- product;
- person;
- location;
- asset type;
- source;
- status;
- date;
- usage;
- visual tags.

Semantic image search may be added later.

---

# 45. Creative Dashboard

Operator view:

```text
Vector Creative

Needs Approval      8
Generating          5
Failed              1
Ready              24

Campaigns
ABC Dental          12/14 assets ready
XYZ Plumbing         8/8 assets ready
```

---

# 46. Client Creative View

Client-facing view should be simple:

```text
Campaign: Implant Consultation

Website      Ready
Facebook     Ready
Instagram    Ready
Email        Ready

[Preview Campaign]

Creatives
[image] [image] [image] [image]

[Approve All]
[Request Changes]
```

Do not expose:

- raw prompts;
- generation APIs;
- model parameters;
- storage keys;
- provider errors.

---

# 47. Creative Engine Roles

Suggested capabilities:

```text
creative.read
creative.create
creative.generate
creative.edit
creative.approve
creative.publish
creative.manage_templates
creative.manage_brand_rules
creative.manage_rights
```

Clients may receive limited:

```text
creative.read
creative.approve
creative.request_revision
```

---

# 48. Vector 24 Creative Automation

To meet the 24-hour launch target, the following should become automatic:

```text
client onboarding
    ↓
brand extraction
    ↓
visual profile draft
    ↓
asset inventory
    ↓
asset gap analysis
    ↓
required funnel asset manifest
    ↓
generation/editing
    ↓
channel derivatives
    ↓
QA
    ↓
approval queue
```

Human work should focus on:

- reviewing unusual imagery;
- confirming business truth;
- validating brand direction;
- approving flagship campaign concepts.

---

# 49. Vector QuickStart Onboarding

This document recommends changing the client onboarding philosophy from:

```text
Client manually fills everything
```

to:

```text
Vector gathers everything it safely can
        ↓
Client confirms
        ↓
Vector asks only for missing blockers
```

## Step 1 — Minimal Intake

Ask only:

- business name;
- current website URL if available;
- primary business goal;
- primary product/service;
- logo upload if not discoverable;
- primary contact;
- permission to analyze supplied public materials.

Target: approximately five minutes for a normal client.

## Step 2 — Automated Discovery

Vector prepares drafts from:

- existing website;
- uploaded company profile;
- product catalog;
- supplied social pages;
- uploaded brand guide;
- uploaded marketing materials.

Possible extracted fields:

- services;
- products;
- brand colors;
- fonts;
- location;
- contact information;
- FAQ;
- business description;
- existing claims;
- visual style;
- existing content assets.

## Step 3 — Confirmation

Client sees:

```text
We found:

6 services
2 locations
Primary brand color
Logo
Facebook page
Instagram page
Primary phone
Business email

Please confirm or edit.
```

## Step 4 — Missing Blockers Only

Ask only what cannot be safely inferred.

Examples:

- current pricing;
- campaign offer;
- approval contact;
- prohibited claims;
- domain access;
- email domain access.

## Step 5 — Recommended Strategy

Vector drafts:

- audience;
- funnel;
- SEO/AEO/GEO;
- email;
- social;
- creative direction.

Client approves at a business level.

They should not be expected to understand technical implementation.

---

# 50. Progressive Onboarding

Do not require every future integration before first launch.

Classify onboarding items:

### Blocking for launch

Must be complete.

### Important but deferrable

Can be completed after initial launch.

### Optional optimization

Can be added later.

Example:

```text
Logo                    Blocking
Primary service         Blocking
Domain                  Blocking
Primary CTA             Blocking
Social account          Deferrable
Historical analytics    Optional
CRM integration         Optional
Advanced personas       Optional
```

This reduces onboarding friction.

---

# 51. Confidence-Based Extraction

Whenever Vector extracts business information automatically, store:

```text
value
source
confidence
requires_confirmation
```

Example:

```text
Business phone:
+63...

Source:
client website

Confidence:
High

Requires confirmation:
Yes
```

Do not silently convert inferred information into authoritative business facts.

---

# 52. Client Experience Principle

The client should experience Vector onboarding as:

> "Vector already did most of the work. I only need to verify it."

Not:

> "I need to complete a technical implementation worksheet."

The client should not be asked about:

- schema markup;
- CDN;
- database;
- event taxonomy;
- webhooks;
- model providers;
- structured outputs;
- image-generation models;
- DNS architecture beyond required connection instructions.

---

# 53. Operator Experience Principle

MGE operators should see technical detail only when needed.

Normal client launch view:

```text
Readiness 94%

Blocking:
- Domain DNS access
- Final pricing approval

Vector has already prepared:
✓ Brand profile
✓ Funnel draft
✓ 11 creative assets
✓ Email nurture
✓ SEO baseline
✓ Social launch calendar
```

---

# 54. Automated Brand Extraction

Vector should automatically attempt to identify:

- dominant colors;
- logo variants;
- typography;
- image style;
- repeated visual motifs;
- tone;
- current page design characteristics.

These are recommendations until approved.

---

# 55. Automated Asset Inventory

On onboarding:

```text
Vector scans approved inputs
    ↓
finds logos
finds photography
finds screenshots
finds product images
finds social media graphics
finds PDFs
finds videos
    ↓
classifies assets
```

Client can then approve:

```text
Use
Do not use
Archive
Unknown
```

---

# 56. Do Not Recreate Assets That Already Exist

Before every generation request:

```text
Search approved asset library
```

If a suitable asset exists:

```text
reuse or derive
```

instead of generating another.

This lowers:

- cost;
- inconsistency;
- AI appearance;
- client review burden.

---

# 57. Creative Generation and Funnel Generation Should Run in Parallel

Once core strategy is approved:

```text
            Growth Strategy
                  ↓
      ┌───────────┼───────────┐
      ↓           ↓           ↓
   Funnel      Creative     Email
      ↓           ↓           ↓
   Structure   Assets       Sequence
      └───────────┼───────────┘
                  ↓
                 QA
```

This is necessary for Vector 24.

---

# 58. Failure Handling

Creative job failures must not block all client launch work.

Example:

```text
Hero image generation failed
```

Fallback:

1. approved client media;
2. alternative generated concept;
3. typography/diagram-based hero;
4. flag for operator review.

The page should never render broken image placeholders.

---

# 59. Accessibility

Creative outputs require:

- alt text;
- sufficient contrast when text overlays exist;
- no essential information only inside the image;
- captions where needed;
- reduced-motion alternative for video/animated content.

---

# 60. Performance

Every derivative should be channel optimized.

For web:

- AVIF/WebP where appropriate;
- responsive dimensions;
- lazy loading;
- correct width/height;
- optimized hero priority.

For email:

- conservative file sizes;
- widely compatible formats;
- dimensions appropriate to template.

For social:

- platform-compatible dimensions and formats.

---

# 61. Cache and CDN

Public web derivatives should be CDN-delivered.

Use immutable asset version URLs where practical.

When a new approved version is published, reference a new asset URL rather than overwriting a cached asset silently.

---

# 62. Creative Experimentation

Creative variants should be first-class experiment inputs.

Example:

```text
Campaign
    ↓
Creative A — Real photography
Creative B — Generated lifestyle visual
Creative C — Typography-led
```

Vector can compare downstream business outcomes.

The winning style can influence later recommendations.

---

# 63. Initial Creative MVP

Phase mapping is locked in `docs/plans/CROSS_CUTTING_TRACKS.md`. These nine items are the Creative track (C0–C9), not a new Vector phase. C0 is in. Remaining slices: [`docs/plans/CREATIVE_TRACK.md`](plans/CREATIVE_TRACK.md). Ship order: [`docs/plans/SHIP_REMAINING.md`](plans/SHIP_REMAINING.md) Wave B then D.

Build in this order.

## Phase C0 — Foundation

- asset schema;
- R2 storage adapter;
- uploads;
- asset versions;
- rights metadata;
- basic asset library.

## Phase C1 — Brand Visual Profile

In. Tenant-owned `brand_visual_profiles` plus immutable confirm versions. Control `/brand` drafts from uploaded logo and existing `brands` / `brand_assets`, then Confirm / Edit in business language. Prohibited styles are stored. Unconfirmed is not a First Reveal license. Thin FR3 consumes a confirmed profile on compose (colors, font, preferred logo) and falls back to a typography-led hero when media is thin. Full public-URL extraction remains later.

- logos;
- colors;
- visual direction;
- prohibited styles;
- onboarding integration.

## Phase C2 — Image Provider

In. `ImageProvider` in `packages/images` (memory default; Grok Imagine when `XAI_API_KEY` is present). Tenant-owned `image_generation_jobs` with prompt/schema versions and integer `cost_micros`. Draft bytes go through existing `StorageProvider` under `clients/{client_id}/generated/...` as unpublished C0 rows. Kill switch, per-client budget, logo overwrite, invented proof, and prohibited styles fail closed. Do not add `generateImage` to `AIProvider`. Edit/variants stay on the adapter; C2 domain drafts supporting photos only. C4 derivatives and FR6 winner media remain later.

- `ImageProvider`;
- Grok image provider;
- generation job tracking;
- cost tracking;
- prompt/version tracking.

## Phase C3 — Composition

In. Trusted software in `packages/compose` writes editorial/minimal SVG shells (OG 1200×630, social 1080×1080, email 600×200) from confirmed C1 tokens when present, otherwise brand tokens, plus approved Knowledge copy and existing logo bytes. Tenant-owned `creative_compositions` are versioned drafts. Bytes go through existing `StorageProvider` under `clients/{client_id}/creative/...`. Control `/funnel` previews through an authenticated route; Delivery does not serve unpublished shells until thin C5 place + publish. Models do not compose logos or marketing text. Sharp and C4 crop/compression wait.

## Phase C4 — Derivatives

In for the winner hero (CE3). Tenant-owned `creative_derivatives` record planned widths 640, 960, and 1440 plus integer focal points. Delivery `/hero-image` serves the approved source bytes for the hostname's tenant. The page stores an asset id, not a storage key. Separate resized files, compression, and social crops wait. Unapproved, blocked, or cross-tenant media stays off the page.

- resizing;
- cropping;
- focal points;
- compression;
- responsive formats.

## Phase C5 — Funnel Integration

Thin slice in. Tenant-owned `funnel_asset_manifests` attach composition ids to immutable page versions. Operators place latest C3 OG / social / email shells onto a draft (`pages.manage`); publish copies the manifest to the new published version. Delivery hostname-scoped `/og-image` serves the published OG slot for that host's tenant only. Raw object-store keys are not authorization and do not appear in HTML. CE3 places an approved hero asset id and serves it at `/hero-image`. Service and case-study slots stay out. JSON-LD and `llms.txt` stay approved knowledge only.

- asset manifests;
- Delivery Open Graph placement;
- hero assets (later);
- service assets (later);
- case study assets (later);
- frontend renderer integration (later).

## Phase C6 — Social Integration

In. A campaign family stores channel metadata on existing `creative_assets` rows. An approved asset can be assigned to LinkedIn, X, Facebook, or Instagram. Channels without an asset stay text-only. Control `/social` shows that preview. Saving a family does not publish, and it does not create cropped bytes.

- campaign asset families;
- scheduling readiness;
- social previews.

## Phase C7 — QA and Approval

In. `creative_qa_reviews` records rights, size, alt text, prohibited style, and invented-proof checks for the current draft. Unknown rights fail closed. A passing check is what Control `/reveal` can approve or send back. Approving does not publish. Pixel visual review is CE5, later.

- automated checks;
- client approval;
- revision note.

## Phase C8 — Creative Analytics

- publication usage;
- performance;
- experiment integration;
- creative learning objects. CE7 stores one tenant-scoped row joined to an existing Phase 7 learning object. It cites observed experiment event counts, leaves qualified leads and sales uncompared when they are not attributed to the variants, and does not auto-apply or invent ROI.

## Phase C9 — Video

**In.** `packages/video` is a `VideoProvider` with a memory adapter and a paused adapter. There is no vendor video API. `draftShortVideo` stores an unapproved `video/mp4` creative asset for the active tenant, capped at 15 seconds. Image-to-video accepts only that tenant's image. Logo, invented proof, and prohibited styles are denied. Replaying an idempotency key does not generate again. Approving and publishing stay on the existing creative and social paths. `AIProvider` has no video method. The memory file is a draft placeholder, not a rendered campaign film.

- short-form video provider;
- image-to-video;
- short campaign variants.

---

# 64. Roadmap mapping — do not reopen exited gates

Phase 1 already exited with `brand_assets` and `StorageProvider`. That is a thin identity-file library (Creative C0 partial), not the Creative Engine. Do not change the Phase 1 exit.

Phase 4 already exited with typed, versioned, auditable, tenant-scoped, cost-attributed text drafts. `AIProvider` is text, structured output, and tools only. Do not change the Phase 4 exit to require generated visuals.

Map Creative Engine work **forward**. The C0–C9 order in §63 is a cross-cutting track. It is not a new numbered Vector phase and must not replace the Phase 5 social-publish exit. First Reveal (`docs/plans/FIRST_REVEAL_TRACK.md`) consumes C1 (profile), C3 (composition), C5 (funnel manifests), and C7 (QA/approval). It does not start C2 before C0. C7 attaches to Phase 5’s later calendar and to first-paying-client readiness; it is not the Phase 5 social exit.

## Phase 5 — additive

- C0 general asset library so Social does not invent a second media store. Slice 1 implements `creative_assets` / versions / rights on the existing `StorageProvider` (`clients/{client_id}/creative/...`). Slice 3 adds Facebook and Instagram `SocialProvider` adapters on the same C0 store. Slice 4 publishes approved C0 images through official upload APIs and a short-lived signed fetch grant for Instagram. That does not start C2–C4. Slice 2–4 do not add Creative C1–C9.
- Later Phase 5 slices may add C1 brand visual profile, C2 `ImageProvider`, C3 composition, C4 derivatives, C6 social families, and C7 QA/approval.
- Phase 5 exit remains: approved content publishes to at least two priority platforms, and required social connections are readiness-gated.
- Social-ready generated families are a later Creative slice, not the Phase 5 exit.

## Phase 7 — additive

- Creative A/B testing.
- Performance learning objects.

**Forward exit:** Vector can compare creative variants against a business metric.

## Phase 9 — additive

- Creative QuickStart.
- Portfolio creative queues.
- Automated asset gap analysis.

**Forward exit:** a normal client launch does not require manual design of every required asset. Vector 24 remains a mature-state target.

---

# 65. Required Addition to `AGENTS.md`

Append:

```text
## Creative Asset Governance

For any task involving client images, social graphics, email graphics,
funnel visuals, campaign media, Open Graph images, generated imagery,
video, image editing, resizing, or creative assets, read:

docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md

Also read:
docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md

Do not ask an image model to create final exact brand typography or logos
when Vector can compose them deterministically.

Prefer authentic client media when suitable.

All generated client creative must be tenant-scoped, versioned, rights-aware,
auditable, and subject to the configured approval policy.
```

---

# 66. Recommended Cursor Rule

Create:

```text
/.cursor/rules/creative-assets.mdc
```

with:

```text
---
description: Vector creative asset generation and media pipeline
alwaysApply: false
---

When implementing or modifying image, video, social creative, email creative,
funnel media, Open Graph media, campaign assets, brand assets, or generated
visuals, read:

docs/29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md
docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md

Rules:
- Prefer authentic approved client media.
- Never regenerate the client's official logo by default.
- Keep exact text and brand marks in deterministic composition.
- Keep providers behind Vector-owned interfaces.
- Track client, campaign, version, provenance, rights, cost, and approval.
- Do not publish generated assets before applicable QA and approval.
- Reuse approved assets before generating new ones.
```

---

# 67. Cursor Work Item Template

Use this for Creative Engine tasks.

```text
## Creative Work Item

### Goal

### Client or platform scope

### Required asset type

### Channel targets

### Source assets available

### Asset gaps

### Brand visual rules

### Generation required?

### Deterministic composition required?

### Required derivatives

### Approval policy

### Rights considerations

### Analytics / performance tracking

### Storage behavior

### Failure fallback

### Tests

### Acceptance criteria
```

---

# 68. Definition of Done

A creative feature is not done because an image can be generated.

It is done when:

- tenant isolation works;
- source assets are searchable;
- rights state is recorded;
- generation is versioned;
- provider/model is recorded;
- cost is recorded;
- exact brand text/logo is deterministic where applicable;
- derivatives can be generated;
- QA works;
- approvals work;
- approved assets cannot be silently overwritten;
- asset usage is traceable;
- public delivery is optimized;
- failed generation has a fallback;
- relevant analytics can reference the asset version.

---

# 69. Final Architecture

The intended architecture is:

```text
Client Inputs
    │
    ├── Website
    ├── Logo
    ├── Photography
    ├── Product assets
    ├── Social pages
    └── Documents
         │
         ▼
   Vector Ingestion
         │
         ▼
 Brand Visual Profile
         │
         ▼
    Asset Inventory
         │
         ▼
   Asset Gap Analysis
         │
         ▼
   Creative Brief
         │
         ▼
  Creative Concepts
         │
    ┌────┴─────┐
    ▼          ▼
Generate     Edit/Reuse
    │          │
    └────┬─────┘
         ▼
 Deterministic Composition
         │
         ▼
      Master
         │
         ▼
    Derivatives
         │
         ▼
    Creative QA
         │
         ▼
      Approval
         │
 ┌───────┼─────────┬──────────┐
 ▼       ▼         ▼          ▼
Funnel  Social    Email      Sharing
         │
         ▼
 Performance Data
         │
         ▼
 Vector Insights
         │
         ▼
 Creative Learning
```

---

# 70. Final Operating Principle

Vector should never force a client to become a designer, developer, SEO specialist, social media manager, prompt engineer, or technical marketer.

The client should provide:

- business truth;
- access;
- priorities;
- approvals.

Vector should perform the technical and production work.

The ideal client experience is:

```text
Provide the minimum
        ↓
Vector discovers and prepares
        ↓
Client confirms
        ↓
Vector builds
        ↓
Client reviews
        ↓
Vector launches
        ↓
Vector learns and improves
```

That is the operating standard this Creative Engine must support.
