# Surface completeness track

**Status:** Implementation specification — on-demand leftovers  
**Track:** Delivery variants, Control chrome extras, extra networks (not a Vector phase)  
**Standing law:** [`docs/27`](../27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md), [`docs/28`](../28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md), [`docs/09`](../09_FUNNEL_ENGINE_DESIGN_SYSTEM.md), [`docs/11`](../11_SOCIAL_PROVIDER_INTEGRATIONS.md), [`docs/17`](../17_CLIENT_ONBOARDING_OPERATIONS.md), [`docs/19`](../19_DEPLOYMENT_ENVIRONMENTS.md)  
**Sequence:** [SHIP_REMAINING.md](SHIP_REMAINING.md) Wave E, or earlier **only when an active client needs the family**  
**Prerequisite:** Phase 1 MVP Frontend Release Gate met. FR0–FR2 additive variants in. Do not dump the `docs/27` catalog. Do not put client-simple nav here — that is [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md) CU0.

---

## 1. Goal

Add a public section family, Control chrome primitive, or social network when a real engagement needs it — on the existing Delivery engine and existing Control app.

Governing principle:

> Standardize capabilities, not cloned templates. Do not generate generic AI marketing pages. Implement one family at a time.

---

## 2. What this track is not

| Need | Correct plan |
| ---- | ------------ |
| Default client nav, Today, Approvals, Outcomes QuickStart | [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md) CU0–CU1, O4, O5, O8 |
| Brand confirm, ImageProvider, compose, funnel manifests | [CREATIVE_TRACK.md](CREATIVE_TRACK.md) |
| Direction candidates, First Reveal Gate remainder, client reveal | [FIRST_REVEAL_TRACK.md](FIRST_REVEAL_TRACK.md) |
| Activity proof / ROI | [CLIENT_VALUE_TRACK.md](CLIENT_VALUE_TRACK.md) |
| Quotas, tracing, backups, load test | [PLATFORM_OPS_TRACK.md](PLATFORM_OPS_TRACK.md) |

---

## 3. In scope

- Additional `docs/27` section families beyond FR2
- Control chart theme, `/campaigns`, automation canvas primitives, leftover visual QA
- Extra social networks or LinkedIn Company Page when a client requires them
- MGE marketing site as a Vector tenant (dogfood), not a second product in this repo
- Operator Knowledge wizard remaining fields as **operator** completeness — not client QuickStart

---

## 4. Out of scope

- Catalog dump of every hero/services/case-study variant in one PR
- Painting Delivery with Vector Black / Blue
- `apps/client`
- Creative QuickStart URL extraction (Creative C1 Wave E)
- Reopening Phase 1 for cinematic heroes

---

## 5. Delivery families (DQ*)

FR2 already added `hero-editorial`, `services-editorial`, `proof-featured`, `cta-minimal`. Existing: `hero-minimal`, `hero-split`, services, proof, offer, CTA, FAQ, lead form.

Add **one family when a client needs it**. Each must pass the Frontend Release Gate in `docs/27`. Compose must select through schemas, not arbitrary HTML.

| Slice | Family | Notes |
| ----- | ------ | ----- |
| **DQ1** | Case study section + optional inner page | Proof, not invented logos/press |
| **DQ2** | Booking / confirmation block | Conversion path; analytics taxonomy |
| **DQ3** | Sticky CTA header | Accessible; not obstructive on mobile |
| **DQ4** | `hero-cinematic` / product-demo | Real client media; not Vector chrome |
| **DQ5** | `hero-video` | After Creative C9 or authentic client video |
| **DQ6** | `services-bento` / tabs / sticky | Prefer 1–2, not all |
| **DQ7** | Interactive / calculator | Only with factual client inputs |

AI must not invent case-study results. JSON-LD stays factual and fail-closed.

---

## 6. Control chrome (CX*)

Identity migration status: `docs/frontend/VECTOR_UI_MIGRATION_STATUS.md`. Tokens are on existing routes.

| Slice | Work | Notes |
| ----- | ---- | ----- |
| **CX1** | Chart theme | When the first Control chart ships (`docs/28`) |
| **CX2** | `/campaigns` | Client-default nav item in `docs/30` §5. Orchestration list, not a second plane. Uses `docs/28` |
| **CX3** | Automation canvas | Phase 8 later. `/autonomy` table already exists. Do not invent a second node language |
| **CX4** | Visual QA leftovers | Privacy, Terms, Portfolio |
| **CX5** | Official SVG mark | Swap deprecated `VectorMark` when SVG exists |

Client-simple **filtering** of this chrome is CU0, not CX*.

---

## 7. Channels and dogfood (CH*)

`docs/11`: implement only platforms required by active clients.

| Slice | Work |
| ----- | ---- |
| **CH1** | LinkedIn Company Page (`w_organization_social`) if a client needs org posting |
| **CH2** | Additional networks (TikTok, YouTube, …) behind `SocialProvider` when required |
| **CH3** | MGE as a Vector tenant on Delivery (`docs/19`, ADR-0002). Separate from Control identity |

Do not build every network in advance. Official APIs only. No browser automation for production publish.

---

## 8. Operator onboarding catalog (not client UX)

Remaining Knowledge / readiness fields from `docs/17` (pricing, competitors, legal pages, etc.) may be completed by operators or Creative QuickStart extraction (Wave E). Do not require the client to fill the 16-step wizard. Blocking vs deferrable vs optional follows `docs/29` §50.

---

## 9. Tests

Each new section type: renderer switch, tenant tokens only, mobile, reduced motion, metadata, no Vector chrome on Delivery. Cross-tenant hostname still fail-closed. New social adapter: token never in JSON, tenant isolation, official API mock.

---

## 10. Do not start until

An active client or dogfood tenant needs the family, **or** Wave E is explicitly underway. Prefer Wave A CU0 and Wave B FR over cinematic heroes.

## Locked attachments

Frontend Release Gate still governs publication. First Reveal Gate remains pre-client. See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).
