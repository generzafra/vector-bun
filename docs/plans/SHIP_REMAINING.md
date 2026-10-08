# Remaining work — ship sequence

**Status:** Execution index — 24 August 2026  
**Not a phase. Not `docs/31`.** Charters still stop at `docs/30` (ADR-0012, ADR-0013).  
**Prerequisite:** Phase 0–5 and 7–8 exits met. Phase 6 S0–S8 in. Phase 9 S0–S1 in. First-client bar thin-in (FR0–FR2, thin FR7, O1/O6/O7).

This file sequences everything still unimplemented. Charters in `/docs` still govern _what_. These plans govern _order_. Where a plan and a charter disagree on product law, the charter wins.

---

## 1. How to use this file

Do not implement the entire remaining catalog in one change. Pick the next **wave**, then the next **slice** inside that wave’s track plan. One bounded vertical slice, tests, docs.

Read before coding a remaining slice:

1. This index (wave + slice id)
2. The track plan named below
3. The standing-law charter named in [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md)

| Remaining work                                                    | Standing law                               | Slice plan                                                                                                                                                                                                      |
| ----------------------------------------------------------------- | ------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Client operating UX + Outcomes O3–O20                             | `docs/30`                                  | [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md)                                                                                                                                                                          |
| Creative C1–C9                                                    | `docs/29`                                  | [CREATIVE_TRACK.md](CREATIVE_TRACK.md)                                                                                                                                                                          |
| First Reveal FR3–FR9                                              | `docs/09`, `17`, `26`, `27`, `29`          | [FIRST_REVEAL_TRACK.md](FIRST_REVEAL_TRACK.md) (spec) — remaining table in §3                                                                                                                                   |
| Client Value V0–V5                                                | `docs/30`, `docs/20`                       | [CLIENT_VALUE_TRACK.md](CLIENT_VALUE_TRACK.md) (spec) — remaining table in §3                                                                                                                                   |
| Phase 9 S2–S4 + SRE / DR / retention                              | `docs/08`, `14`, `16`, `19`, `20`, `26`    | [PLATFORM_OPS_TRACK.md](PLATFORM_OPS_TRACK.md); S2–S4 rules stay in [09_PHASE_9_SCALE.md](09_PHASE_9_SCALE.md)                                                                                                  |
| Extra Delivery variants, Control chrome leftovers, extra networks | `docs/27`, `docs/28`, `docs/11`, `docs/17` | [SURFACE_COMPLETENESS_TRACK.md](SURFACE_COMPLETENESS_TRACK.md)                                                                                                                                                  |
| Creative Experience CE0–CE7                                       | `docs/27`, `docs/09`, `docs/29`            | [CREATIVE_EXPERIENCE_ENGINE_TRACK.md](CREATIVE_EXPERIENCE_ENGINE_TRACK.md). Blueprint: [VECTOR_CREATIVE_EXPERIENCE_ENGINE_CURSOR_IMPLEMENTATION.md](VECTOR_CREATIVE_EXPERIENCE_ENGINE_CURSOR_IMPLEMENTATION.md) |

Client UX is **not** a surface leftover. Default nav, Today, Approvals, and QuickStart live in [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md) § Client operating UX. Creative confirm is C1. First-site reveal is FR8. Do not dump Knowledge / Funnel / Autonomy on a client by default.

---

## 2. Already in — do not rebuild

| Item                                                                                               | Status                                                                                                                              |
| -------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------- |
| Phase 0–5 exits                                                                                    | Met (Phase 5 via ADR-0010)                                                                                                          |
| Phase 6 S0–S8                                                                                      | In. May exit after S1–S4 + Control backlog                                                                                          |
| Phase 7 S0–S4                                                                                      | In. Exit met                                                                                                                        |
| Phase 8 S0–S4                                                                                      | In. Exit met                                                                                                                        |
| Phase 9 S0–S1                                                                                      | In. S2–S4 later                                                                                                                     |
| Creative **C0**                                                                                    | `creative_assets` / versions / rights on existing `StorageProvider`                                                                 |
| Outcomes **O1** goals, **O2** Phase 2 `lead_status`, **O6** data health, **O7** notification prefs | Thin first-client bar                                                                                                               |
| First Reveal **FR0–FR2**, **thin FR7**                                                             | Additive Delivery quality + deterministic gate with operator override                                                               |
| Social LinkedIn / X / Facebook / Instagram                                                         | Official adapters. Company Page, TikTok, YouTube not started                                                                        |
| Control `docs/28` tokens on existing operator routes                                               | Operator cockpit, not client-simple nav                                                                                             |
| **CU0** capability-filtered Control nav                                                            | Default client shell is Overview / Leads / Approvals / Goals. `control.operator` keeps the cockpit                                  |
| **CU1** Outcomes QuickStart                                                                        | Control `/quickstart` maps seven answers into goals, high-intent prefs, and a recorded approver                                     |
| **O8** Approval Center                                                                             | Control `/approvals` groups existing `approval_requests`; decide does not publish or send                                           |
| **O3** `sales_outcomes`                                                                            | Optional integer `amount_minor` + currency on Control `/leads`; does not replace `lead_status`                                      |
| **V0** activity proof                                                                              | Control `/value`: known fee/package + observed monthly work. **No ROI**                                                             |
| Creative **C1**                                                                                    | Tenant-owned `brand_visual_profiles` + versions; Control `/brand` confirm/edit. Unconfirmed is not FR8                              |
| Creative **C2**                                                                                    | `ImageProvider` in `packages/images`; tenant-owned `image_generation_jobs`; draft-only C0 rows                                      |
| Creative **C3**                                                                                    | Deterministic SVG shells in `packages/compose`; tenant-owned `creative_compositions`; Control `/funnel` drafts                      |
| Creative **C5**                                                                                    | Tenant-owned `funnel_asset_manifests`; place C3 ids on a draft; publish copies to Delivery `/og-image`                              |
| First Reveal **thin FR3**                                                                          | Consume confirmed C1 on compose; `asset_sufficiency_snapshots`; typography-led fallback                                             |
| First Reveal **thin FR4–FR5**                                                                      | Cheap direction manifests, diversity, deterministic scoring, one winner draft. Not three sites                                      |
| Creative Experience **CE0**                                                                        | Five synthetic industry fixtures and baseline notes. No renderer change. See [CE0_BASELINE.md](CE0_BASELINE.md)                     |
| Creative Experience **CE1**                                                                        | Optional brief on `visual_directions.manifest`. Legacy pages still render. No new table                                             |
| Creative Experience **CE2**                                                                        | Width modes on the existing heroes, story sections, and conversion treatments. No cinematic variant                                 |
| Creative Experience **CE3**                                                                        | Winner asset gaps, focal points, planned derivative widths, and a typography-led fallback. `/hero-image` serves the approved source |
| Creative Experience **CE4**                                                                        | Allowlisted M0–M2 motion. Reduced motion keeps the page still and readable. M3 stays out                                            |
| Creative Experience **CE5**                                                                        | Structural geometry at 320, 390, 768, and 1440, fingerprint v1, and hard-blocker override. Pixel screenshots were not captured      |
| Creative Experience **CE6**                                                                        | Plain-language change categories on Control `/reveal`, linked to the prior direction. Approving does not publish                    |
| Creative Experience **CE7**                                                                        | Tenant-scoped design learning from an existing experiment result. Observed event counts only. It does not auto-apply or invent ROI  |
| Creative **C6**                                                                                    | Campaign family metadata on existing creative assets. Channels without an asset stay text-only. Saving a family does not publish    |

Not in code: `AdProvider`, `BillingProvider`, `VideoProvider`, value snapshots, Ask Vector, Campaigns, Insights, Creative QuickStart extraction, entitlements, pixel screenshots. M3, WebGL, resized derivative files, and social crops are not in.

---

## 3. Remaining slice status

### Client operating UX (do not overwhelm)

Law: `docs/30` §2, §5–7, §65, §81–85. One Control app; **nav differs by capability**.

| Slice   | Work                                                                        | Plan         | Gate                     |
| ------- | --------------------------------------------------------------------------- | ------------ | ------------------------ |
| **CU0** | Capability-filtered default nav + `docs/30` §85 copy checklist              | Outcomes     | **In**                   |
| **CU1** | Outcomes QuickStart (seven plain questions, not the 16-step Knowledge dump) | Outcomes     | **In**                   |
| **O8**  | Approval Center grouping in business language                               | Outcomes     | **In**                   |
| **O3**  | `sales_outcomes` on Control `/leads`                                        | Outcomes     | **In**                   |
| **O4**  | Client Overview outcome hierarchy                                           | Outcomes     | **In**                   |
| **O5**  | Today view (under one minute)                                               | Outcomes     | **In**                   |
| **C1**  | Brand visual profile + confirm/edit (Creative QuickStart confirm)           | Creative     | **In**                   |
| **FR8** | Client reveal: one direction, Approve / Request changes, no jargon          | First Reveal | After C7 + remaining FR7 |

The 16-step catalog in `docs/17` is the **readiness inventory**. It is not the client form. Vector gathers; the client confirms; Vector asks only missing blockers (`docs/29` §49). Full URL-extraction QuickStart may wait for Wave E (Phase 9 later). **CU0–CU1 + confirm-don’t-fill must not wait for Phase 9.**

### Creative C1–C9

| Slice  | Work                                      | Gate                                                    |
| ------ | ----------------------------------------- | ------------------------------------------------------- |
| C0     | Asset schema, versions, rights            | **In**                                                  |
| **C1** | Brand visual profile + onboarding confirm | **In**                                                  |
| **C2** | `ImageProvider` (not `AIProvider`)        | **In**                                                  |
| **C3** | Deterministic composition                 | **In**                                                  |
| **C4** | Derivatives                               | Wave D / CE3                                            |
| **C5** | Funnel asset manifests                    | **In** (thin; C3 ids until C4)                          |
| **C6** | Social families                           | **In**. Pixel crops stay out                            |
| **C7** | QA + client approval/revision             | **In**                                                  |
| **C8** | Creative analytics + learning objects     | **In** (CE7)                                            |
| **C9** | `VideoProvider`                           | **In**. Memory drafts only. No vendor. Does not publish |

### Outcomes O3–O20

| Slice             | Work                                           | Gate                   |
| ----------------- | ---------------------------------------------- | ---------------------- |
| O1 / O2 / O6 / O7 | Goals, lead_status, data health, notifications | **In** (thin)          |
| **O3**            | `sales_outcomes` (optional `amount_minor`)     | **In**                 |
| **O8**            | Approval Center                                | **In**                 |
| **O4 / O5**       | Overview / Today                               | **In**                 |
| **O9**            | Offer versions (extend `offers`)               | **In**                 |
| **O10**           | `CRMProvider` (memory first)                   | **In**                 |
| **O11**           | Revenue events                                 | **In**                 |
| **O12**           | Attribution confidence labels                  | **In**                 |
| **O13**           | Recommendation evidence + data-health gate     | **In**                 |
| **O14**           | Monthly Growth Review                          | **In**                 |
| **O15**           | Ask Vector                                     | **In**                 |
| **O16 / O17**     | Client health / entitlements                   | Wave E / Phase 9 later |
| **O18–O20**       | Ads read-only, billing, advanced revenue       | P2 / last              |

### First Reveal FR3–FR9

Spec remains [FIRST_REVEAL_TRACK.md](FIRST_REVEAL_TRACK.md). Do not generate three full sites.

| Slice             | Status                                     | Depends on                                                   |
| ----------------- | ------------------------------------------ | ------------------------------------------------------------ |
| FR0–FR2           | **In**                                     | —                                                            |
| Thin FR7          | **In** (no screenshots / AI visual review) | —                                                            |
| **FR3**           | **Thin in**                                | C1 consumed; C5 placement in                                 |
| **FR4**           | **Thin in**                                | Schema, diversity, deterministic grammar enumerator          |
| **FR5**           | **Thin in**                                | In-memory render + deterministic score; winner is the draft  |
| **FR6**           | **In**                                     | One ImageProvider job for the hybrid winner only             |
| **FR7 remainder** | **In** (deterministic)                     | Contrast, form, section weight, first-screen description     |
| **FR8**           | **In**                                     | Control `/reveal`: one direction, approve or request changes |
| **FR9**           | Open                                       | Phase 9 later                                                |

### Creative Experience CE0–CE7

Design blueprint: [VECTOR_CREATIVE_EXPERIENCE_ENGINE_CURSOR_IMPLEMENTATION.md](VECTOR_CREATIVE_EXPERIENCE_ENGINE_CURSOR_IMPLEMENTATION.md). Sequence and status: [CREATIVE_EXPERIENCE_ENGINE_TRACK.md](CREATIVE_EXPERIENCE_ENGINE_TRACK.md). Same funnel engine and Creative Engine. Wave D. CE0–CE7 are in. Wave C is complete through O15. V1, O4, O5, O9, O10, O11, O12, O13, and O14 are in.

| Slice   | Status | Depends on                                                                             |
| ------- | ------ | -------------------------------------------------------------------------------------- |
| **CE0** | **In** | Five synthetic industries and [CE0_BASELINE.md](CE0_BASELINE.md). No production change |
| **CE1** | **In** | Optional brief on the existing direction manifest. Legacy pages still render           |
| **CE2** | **In** | Width modes on the existing grammar. No cinematic variant                              |
| **CE3** | **In** | Winner media and planned widths. Thin FR6 stays. Separate resized files wait           |
| **CE4** | **In** | Allowlisted M0–M2 motion. M3 stays out                                                 |
| **CE5** | **In** | Structural geometry and fingerprint v1. Pixel screenshots were not captured            |
| **CE6** | **In** | Change categories on thin FR8. Approving still does not publish                        |
| **CE7** | **In** | C8 learning from an existing experiment result. No invented ROI                        |

### Client Value V0–V5

Spec remains [CLIENT_VALUE_TRACK.md](CLIENT_VALUE_TRACK.md). Trusted software calculates; AI explains.

| Slice        | Status | Depends on                                                                            |
| ------------ | ------ | ------------------------------------------------------------------------------------- |
| **V0**       | **In** | Known fee/package. **No ROI**                                                         |
| **V1**       | **In** | O1–O3. Qualified leads, source label, primary goal. No ROI                            |
| **V2 / O21** | **In** | Versioned client baseline on `/value`. Labeled estimated. No ROI                      |
| **V3 / O22** | **In** | Revenue-to-fee on `/value` when fee, revenue, and attribution coverage match. Not ROI |
| **V4**       | **In** | Experiment count difference on `/value` when data health is clear. Not revenue        |
| **V5**       | Open   | Phase 9 later                                                                         |

### Platform ops

| Slice         | Work                                                                                         | Gate                       |
| ------------- | -------------------------------------------------------------------------------------------- | -------------------------- |
| Phase 9 S0–S1 | Quotas + portfolio exceptions                                                                | **In**                     |
| **P9-S2**     | Infrastructure snapshots + scaling alerts                                                    | After several live clients |
| **P9-S3**     | Portfolio templates / queues                                                                 | After S2                   |
| **P9-S4**     | Cost dashboard; cost/qualified lead only when observed                                       | After S3                   |
| **OPS1–OPS6** | Retention jobs, OpenTelemetry, backups, deploy smoke, 20-client load test, Vector 24 metrics | Wave E                     |

### Surface completeness (on demand)

Extra `docs/27` section families, Control chart theme / `/campaigns` / automation canvas, extra social networks, MGE-as-tenant. **Not** the client-simple shell. See [SURFACE_COMPLETENESS_TRACK.md](SURFACE_COMPLETENESS_TRACK.md).

---

## 4. Ship waves

Do not finish Wave E before a supervised first client. First clients stay human-led. Vector 24 is a mature-state target.

### Wave A — last first-client gaps + client-simple shell

Goal: a non-technical owner is not dropped into the operator cockpit, and §78 leftovers close.

1. **CU0** capability-filtered nav — **In**
2. **CU1** Outcomes QuickStart — **In**
3. **O8** Approval Center — **In**
4. **O3** `sales_outcomes` — **In**
5. **V0** activity proof when fee/package is known (no ROI) — **In**

Wave A is complete. Wave B is complete. O4 Overview, O5 Today, O9 offer versions, O10 `CRMProvider`, O11 revenue events, O12 attribution confidence, O13 recommendation evidence, O14 monthly growth review, V1 lead and goal value join, and O15 Ask Vector are in. CE0–CE7 are in. V2–V4 and C9 are in. Wave D is complete. Next: Wave E **P9-S2** infrastructure snapshots, after several live clients.

### Wave B — first-site quality (still one engine)

1. **C1** brand visual profile + confirm — **In**
2. **FR3** asset wiring / sufficiency / typography-led fallback — **Thin in**
3. **FR4–FR5** cheap direction manifests + scoring (not three sites) — **Thin in** (screenshots / AI visual review later)
4. **C2** `ImageProvider` — **In**
5. **C3** deterministic composition — **In**
6. **C5** funnel manifests — **Thin in** (C3 composition ids until C4)
7. **FR6** winner-only expensive media — **In**
8. **C7** QA + client creative approval — **In**
9. **FR7 remainder** then **FR8** client reveal — **In** (deterministic first-screen checks; pixel screenshots stay out)

### Wave C — client operating system

1. **O4** Overview — **In**. **O5** Today — **In**
2. **O9** offer versions — **In**
3. **O10** `CRMProvider` — **In**
4. **O11** revenue events — **In**. **O12** attribution confidence — **In**. **O13** recommendation evidence — **In**. **O14** monthly review — **In**
5. **V1** lead/goal value join — **In**
6. **O15** Ask Vector — **In**

### Wave D — creative experience, creative maturity, and value

1. **CE0** baseline fixtures — **In**. **CE1** direction brief — **In**. **CE2** width modes — **In**. **CE3** winner media — **In**. **CE4** motion presets — **In**. **CE5** structural geometry — **In**. **CE6** reveal changes — **In**. **CE7** design learning — **In**. CE3 is the C4 winner remainder. CE7 is C8. Thin FR6 and thin FR8 stay. [CREATIVE_EXPERIENCE_ENGINE_TRACK.md](CREATIVE_EXPERIENCE_ENGINE_TRACK.md)
2. **C6** social families — **In**. Pixel crops stay out
3. **V2** client baseline — **In**. **V3** revenue-to-fee — **In**. **V4** incremental counts — **In**
4. **C9** `VideoProvider` — **In**. Memory drafts only. No vendor and no publish path

### Wave E — scale and platform

1. Phase 9 **S2–S4**
2. **O16–O20**, **V5**, **FR9**
3. Full Creative QuickStart extraction + asset gap analysis
4. **OPS1–OPS6**
5. Extra Delivery families and networks **only when an active client needs them**

---

## 5. Forbidden (same lock)

- `docs/31+` or Phase 10 / 11
- Reopening Phase 0–5 / 7 exits
- Replacing Phase 2 `lead_status` or Phase 1 `offers`
- `apps/client` fork
- `generateImage` on `AIProvider`
- Second object store, second funnel renderer, second sales/revenue ledger, or `packages/creative-experience-engine` by default
- Arbitrary tenant HTML, CSS, or JavaScript on Delivery
- Treating a manifest heuristic as a screenshot review
- Three full production websites by default
- Autonomous ad spend
- Inventing sales, revenue, hours saved, previous spend, or agency cost
- Painting tenant Delivery with `docs/28`
- Showing the client the raw first compose
- Putting Knowledge / Funnel / Autonomy / Portfolio in the **default client** nav

---

## 6. Tests required on every remaining tenant-owned slice

`bun:test`. Cross-tenant isolation. Explicit `TenantContext`. Fail closed. Capability auth, not role-string equality. Money as integer minor units plus currency. Evidence class labeled. Preview `noindex` where public.

---

## 7. Do not start until

The slice’s **Depends on** row in §3 is in, or the wave allows a documented operator path (example: typography-led FR without C2). Do not start Ask Vector, ads, billing, or video to “get them out of the way.”
