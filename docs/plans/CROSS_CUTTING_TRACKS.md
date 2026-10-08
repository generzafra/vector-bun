# Cross-cutting tracks — locked mapping

Charters in `/docs` stop at **30** (ADR-0009, ADR-0011, ADR-0012, ADR-0013). Further product law is an ADR or a fold into an existing document, not a new numbered charter. Do not add `docs/31` or `docs/32`. Remaining execution lives in this folder: [SHIP_REMAINING.md](SHIP_REMAINING.md).

First Reveal and Client Value are **tracks** with slice specs in this folder. Standing law lives in the charters named below.

Phase exits in `../21_ROADMAP_ACCEPTANCE_GATES.md` still govern what a phase must ship. Tracks add work **inside or after** a phase. They never reopen an exited phase and never replace a phase exit.

| Track                       | Standing law                      | Slice spec                                                                 | What it is                                                                                          |
| --------------------------- | --------------------------------- | -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- |
| Vector 24                   | `docs/26`                         | [PLATFORM_OPS_TRACK.md](PLATFORM_OPS_TRACK.md) OPS6                        | Ready → live operating standard                                                                     |
| Delivery quality            | `docs/27`                         | [SURFACE_COMPLETENESS_TRACK.md](SURFACE_COMPLETENESS_TRACK.md)             | Public visitor UX; publication Frontend Release Gate                                                |
| Control identity            | `docs/28`                         | [SURFACE_COMPLETENESS_TRACK.md](SURFACE_COMPLETENESS_TRACK.md)             | Operator chrome. Client-simple nav is Outcomes CU0, not this row                                    |
| Creative C0–C9              | `docs/29` §63                     | [CREATIVE_TRACK.md](CREATIVE_TRACK.md)                                     | Media ingest → generate → compose → approve → learn                                                 |
| Creative Experience CE0–CE7 | `docs/27`, `docs/09`, `docs/29`   | [CREATIVE_EXPERIENCE_ENGINE_TRACK.md](CREATIVE_EXPERIENCE_ENGINE_TRACK.md) | Art-directed pages on the same engines. Wave D. Blueprint: the 8 October 2026 implementation file   |
| Outcomes O1–O20             | `docs/30` §88                     | [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md)                                     | Client UX CU0–CU1 + goals → pipeline → revenue → entitlements                                       |
| First Reveal FR0–FR9        | `docs/09`, `17`, `26`, `27`, `29` | [FIRST_REVEAL_TRACK.md](FIRST_REVEAL_TRACK.md)                             | Cheap direction candidates → winner-only media → pre-client gate. Control reveal chrome: `docs/28`  |
| Client Value V0–V5          | `docs/30`, `docs/20`              | [CLIENT_VALUE_TRACK.md](CLIENT_VALUE_TRACK.md)                             | Activity proof → replacement cost / time → revenue-linked value. Extends Outcomes; not a second SoT |

Remaining unimplemented slices and ship waves: [SHIP_REMAINING.md](SHIP_REMAINING.md) (ADR-0013). Do not bury client operating UX under Delivery leftovers. Default client nav, Today, Approvals, and Outcomes QuickStart are [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md).

`docs/28` is Control identity. `docs/29` is the Creative Engine. Do not swap those numbers.

## Locked phase attachments

| Phase | Exit (unchanged)               | Must take now                                    | Later on this phase’s calendar, not the exit                                                                |
| ----- | ------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------- |
| 0     | Isolation + CI                 | Tenancy, auth, audit                             | —                                                                                                           |
| 1     | Preview funnel + `docs/27` MVP | `brand_assets`, `offers`, `StorageProvider`      | Creative C0 remainder; campaign-offer versions; FR0–FR2 premium foundation (not a Phase 1 reopen)           |
| 2     | Source → lead + taxonomy       | `lead_status` including won/lost; attribution v1 | O1–O3 goals / `sales_outcomes`; confidence labels; V1 lead-value join is in                                 |
| 3     | Safe nurture                   | Consent/suppression                              | Email → stage → sale join (O later); nurture work units for V0                                              |
| 4     | Typed, costed drafts           | Recommendation cards; tools denied               | Ask Vector; data-health gate (O13–O15); FR4–FR5 direction manifests (structured AI, no arbitrary HTML)      |
| 5     | Two-platform publish           | Creative **C0**; optional social → lead          | C1–C7; O4+ client Today; FR3 asset wiring; FR6 winner media; FR7 First Reveal Gate                          |
| 6     | Search backlog                 | Technical SEO + GEO-readiness baseline           | Search → qualified lead; OG from Creative; live GEO measurement when compliant; no citation-to-revenue      |
| 7     | One experiment + learning      | `docs/27` variants                               | C8 creative tests; O offer/revenue metrics if coverage; FR9 outcome learning; V4 incrementality if coverage |
| 8     | Low-risk auto-execute          | Existing approval + kill switch                  | Autonomy × data health × goal relevance; value-informed priority, never invented ROI                        |
| 9     | Portfolio by exception         | Quotas, launch clocks                            | Creative QuickStart; entitlements; client health; FR9 similarity guard; V5 portfolio / renewal value        |

C9 video stays unattached until a later Creative slice. C7 (QA + client approval) is required before a client First Reveal, not before the Phase 5 social exit.

## Creative C0–C9 (do not start C2 before C0)

0. Asset schema, versions, rights, `StorageProvider` keys under `clients/{id}/creative/…`
1. Brand visual profile + onboarding confirm
2. `ImageProvider` (not `AIProvider`)
3. Deterministic composition
4. Derivatives / crop / compression
5. Funnel asset manifests
6. Social families
7. QA + client approval/revision
8. Creative analytics + learning objects
9. Video

Phase 5 **must** take C0. C2–C9 are not the Phase 5 exit.

## Outcomes O1–O20 (do not start Ask Vector before O1–O3)

1. Client goals
2. Keep Phase 2 lead stages (`new \| working \| qualified \| won \| lost \| spam`)
3. `sales_outcomes` (optional `amount_minor`)
4. Client Overview hierarchy
5. Today view
6. Data health foundation
7. Notification preferences
8. Approval Center grouping
9. Offer domain versions (extend Phase 1 `offers`)
10. `CRMProvider` interface
11. Revenue events
12. Attribution confidence
13. Recommendation evidence
14. Monthly Growth Review
15. Ask Vector
16. Client health
17. Package entitlements
18. Paid acquisition read-only
19. Billing architecture
20. Advanced revenue optimization

Phase 5 **may** persist social → lead. O1–O20 are not the Phase 5 exit. Revenue amounts stay optional. One Control app; **nav differs by capability**. Client default nav is Overview / Today / Leads / Campaigns / Approvals / Insights (`docs/30` §5). Knowledge, Funnel, Autonomy, and Portfolio stay operator unless the actor has those capabilities. Execution: [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md) CU0–CU1 before more operator screens.

## First Reveal FR0–FR9 (do not show the client the raw first compose)

0. Audit existing Delivery renderer, tokens, components, preview state
1. Premium foundation: type, spacing, logo-capable nav, polished forms, intentional mobile hero
2. High-quality component variants (few strong heroes / services / proof / CTA, not a catalog dump)
3. Brand and asset wiring, asset sufficiency, typography-led fallback (`docs/29` C1 + C5)
4. Visual-direction manifests (structured config, one intelligence pass)
5. Cheap candidate render + deterministic scoring; optional AI visual review
6. Winner-only expensive media (`docs/29` C2–C5)
7. First Reveal Gate (pre-client). Publication still uses the `docs/27` Frontend Release Gate
8. Client reveal UX on Control (`docs/28` chrome, `docs/30` business language)
9. Learning, portfolio similarity guard, adaptive candidate count

Do **not** generate three complete expensive websites by default. Generate lightweight direction manifests; spend on the winner. AI selects validated components through schemas. Exact logos and marketing text stay deterministic (`docs/29`).

Phase 1 **must not** be reopened for FR. FR0–FR2 may run as additive Delivery quality before the first paying client. FR7 is launch-readiness, not a Phase 1 exit.

## Client Value V0–V5 (do not start ROI claims before V0–V1)

0. Activity proof: fee/package known, work units, monthly activity summary. **No ROI claim**
1. Lead / goal value from Outcomes O1–O3. Do not invent a second lead or revenue store
2. Replacement-cost and time-savings ranges from versioned benchmarks or client baseline (O21)
3. Revenue-linked value from Outcomes O11–O12 / O14 when coverage exists (O22)
4. Incrementality from Phase 7 experiments when sample and data health allow
5. Portfolio, renewal, and value-maturity for operators (Phase 9 later)

`docs/30` remains authoritative for goals, sales, revenue, attribution, and data health. `docs/20` remains authoritative for MGE operating cost. Client-facing value views must not expose MGE margin, wholesale provider cost, or internal labor cost. Trusted software calculates; AI explains. Replacement cost is not ROI. Attributed revenue is not sole causation. Do not double-count overlapping components.

## First paying client (launch readiness, not Phase 0)

From `docs/30` §78, after supervised launch tooling exists:

- primary goal configured
- conversion defined
- pipeline can record won/lost (already true)
- notification defaults
- client-understandable approvals
- data health can flag a broken source
- First Reveal Gate pass **or** documented operator override (logo or typography-led fallback; approved media in slots; client does not automatically see the raw first compose)
- V0 activity proof when package/fee is known. No replacement-cost or ROI claim required

**In (this bar):** FR0–FR2 Delivery quality on the existing engine, hostname-scoped `/brand-logo`, a deterministic First Reveal Gate with operator override (thin FR7 plus contrast, form, section weight, and first-screen text), Control `/goals` for a primary goal (O1), data-health flags (O6), notification defaults (O7), capability-filtered Control nav (CU0), Outcomes QuickStart (CU1), Approval Center grouping (O8), `sales_outcomes` (O3), V0 activity proof on Control `/value` (known fee/package + observed monthly work, no ROI) and V1 lead and goal join on that same page, C1 brand confirm, C2 `ImageProvider`, C3 composition, thin C5 placement, thin FR3–FR6, C7 creative QA, and thin FR8 on Control `/reveal`. Preview publish is not blocked by a failed gate. Approving a reveal does not publish.

**Not in:** FR9, pixel screenshots, AI visual review, Creative Experience CE0–CE7, C4 derivatives, Ask Vector, CRM sync, ads, billing, entitlements, three full sites.

Not required: Ask Vector, CRM sync, ads, billing, entitlements, full Today polish, three design directions, winner image generation, mature ROI, DIY/agency calculator.

## Forbidden

- New numbered charter (`docs/31+`)
- Treating First Reveal or Client Value as Phase 10 / Phase 11
- Reopening an exited phase so FR or Value become that phase’s exit
- Replacing Phase 2 `lead_status` or Phase 1 `offers`
- `apps/client` fork
- `generateImage` on `AIProvider`
- Second object-store adapter
- Second Creative engine, second funnel renderer, or `packages/creative-experience-engine` by default
- Arbitrary tenant HTML, CSS, or JavaScript on Delivery
- Treating a manifest score as a screenshot review
- Second sales/revenue source of truth inside the Client Value spec
- Generating three full production websites by default
- Autonomous ad spend
- Presenting estimated attribution, replacement cost, or time savings as fact
- Inventing sales, revenue, hours saved, previous spend, or agency cost
- Painting tenant Delivery sites with `docs/28` Vector identity
- Calling Control identity (`docs/28`) the Creative Engine (`docs/29`)
- Putting Knowledge / Funnel / Autonomy / Portfolio in the **default client** navigation
- Requiring the client to complete the `docs/17` 16-step catalog instead of confirm-and-blockers QuickStart
