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

| Remaining work                                                    | Standing law                               | Slice plan                                                                                                     |
| ----------------------------------------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------------------- |
| Client operating UX + Outcomes O3–O20                             | `docs/30`                                  | [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md)                                                                         |
| Creative C1–C9                                                    | `docs/29`                                  | [CREATIVE_TRACK.md](CREATIVE_TRACK.md)                                                                         |
| First Reveal FR3–FR9                                              | `docs/09`, `17`, `26`, `27`, `29`          | [FIRST_REVEAL_TRACK.md](FIRST_REVEAL_TRACK.md) (spec) — remaining table in §3                                  |
| Client Value V0–V5                                                | `docs/30`, `docs/20`                       | [CLIENT_VALUE_TRACK.md](CLIENT_VALUE_TRACK.md) (spec) — remaining table in §3                                  |
| Phase 9 S2–S4 + SRE / DR / retention                              | `docs/08`, `14`, `16`, `19`, `20`, `26`    | [PLATFORM_OPS_TRACK.md](PLATFORM_OPS_TRACK.md); S2–S4 rules stay in [09_PHASE_9_SCALE.md](09_PHASE_9_SCALE.md) |
| Extra Delivery variants, Control chrome leftovers, extra networks | `docs/27`, `docs/28`, `docs/11`, `docs/17` | [SURFACE_COMPLETENESS_TRACK.md](SURFACE_COMPLETENESS_TRACK.md)                                                 |

Client UX is **not** a surface leftover. Default nav, Today, Approvals, and QuickStart live in [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md) § Client operating UX. Creative confirm is C1. First-site reveal is FR8. Do not dump Knowledge / Funnel / Autonomy on a client by default.

---

## 2. Already in — do not rebuild

| Item                                                                                               | Status                                                                                             |
| -------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| Phase 0–5 exits                                                                                    | Met (Phase 5 via ADR-0010)                                                                         |
| Phase 6 S0–S8                                                                                      | In. May exit after S1–S4 + Control backlog                                                         |
| Phase 7 S0–S4                                                                                      | In. Exit met                                                                                       |
| Phase 8 S0–S4                                                                                      | In. Exit met                                                                                       |
| Phase 9 S0–S1                                                                                      | In. S2–S4 later                                                                                    |
| Creative **C0**                                                                                    | `creative_assets` / versions / rights on existing `StorageProvider`                                |
| Outcomes **O1** goals, **O2** Phase 2 `lead_status`, **O6** data health, **O7** notification prefs | Thin first-client bar                                                                              |
| First Reveal **FR0–FR2**, **thin FR7**                                                             | Additive Delivery quality + deterministic gate with operator override                              |
| Social LinkedIn / X / Facebook / Instagram                                                         | Official adapters. Company Page, TikTok, YouTube not started                                       |
| Control `docs/28` tokens on existing operator routes                                               | Operator cockpit, not client-simple nav                                                            |
| **CU0** capability-filtered Control nav                                                            | Default client shell is Overview / Leads / Approvals / Goals. `control.operator` keeps the cockpit |
| **CU1** Outcomes QuickStart                                                                        | Control `/quickstart` maps seven answers into goals, high-intent prefs, and a recorded approver    |
| **O8** Approval Center                                                                             | Control `/approvals` groups existing `approval_requests`; decide does not publish or send          |
| **O3** `sales_outcomes`                                                                            | Optional integer `amount_minor` + currency on Control `/leads`; does not replace `lead_status`     |

Not in code: `ImageProvider`, `CRMProvider`, `AdProvider`, `BillingProvider`, `VideoProvider`, `revenue_events`, visual-direction manifests, value snapshots, Ask Vector, Today, Campaigns, Insights, Creative QuickStart extraction, entitlements.

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
| **O4**  | Client Overview outcome hierarchy                                           | Outcomes     | After O3                 |
| **O5**  | Today view (under one minute)                                               | Outcomes     | After O4                 |
| **C1**  | Brand visual profile + confirm/edit (Creative QuickStart confirm)           | Creative     | Unlocks FR3              |
| **FR8** | Client reveal: one direction, Approve / Request changes, no jargon          | First Reveal | After C7 + remaining FR7 |

The 16-step catalog in `docs/17` is the **readiness inventory**. It is not the client form. Vector gathers; the client confirms; Vector asks only missing blockers (`docs/29` §49). Full URL-extraction QuickStart may wait for Wave E (Phase 9 later). **CU0–CU1 + confirm-don’t-fill must not wait for Phase 9.**

### Creative C1–C9

| Slice  | Work                                      | Gate                    |
| ------ | ----------------------------------------- | ----------------------- |
| C0     | Asset schema, versions, rights            | **In**                  |
| **C1** | Brand visual profile + onboarding confirm | Next Creative           |
| **C2** | `ImageProvider` (not `AIProvider`)        | After C1                |
| **C3** | Deterministic composition                 | After C1                |
| **C4** | Derivatives                               | After C3                |
| **C5** | Funnel asset manifests                    | After C3                |
| **C6** | Social families                           | After C4–C5             |
| **C7** | QA + client approval/revision             | Before FR8              |
| **C8** | Creative analytics + learning objects     | After Phase 7; Wave D   |
| **C9** | `VideoProvider`                           | Unattached until needed |

### Outcomes O3–O20

| Slice             | Work                                           | Gate                               |
| ----------------- | ---------------------------------------------- | ---------------------------------- |
| O1 / O2 / O6 / O7 | Goals, lead_status, data health, notifications | **In** (thin)                      |
| **O3**            | `sales_outcomes` (optional `amount_minor`)     | **In**                             |
| **O8**            | Approval Center                                | **In**                             |
| **O4 / O5**       | Overview / Today                               | After O3                           |
| **O9**            | Offer versions (extend `offers`)               | —                                  |
| **O10**           | `CRMProvider` (memory first)                   | After O3                           |
| **O11**           | Revenue events                                 | After O3                           |
| **O12**           | Attribution confidence labels                  | After O11                          |
| **O13**           | Recommendation evidence + data-health gate     | After O6 + O12                     |
| **O14**           | Monthly Growth Review                          | After O13                          |
| **O15**           | Ask Vector                                     | **Only after O1–O3 + data health** |
| **O16 / O17**     | Client health / entitlements                   | Wave E / Phase 9 later             |
| **O18–O20**       | Ads read-only, billing, advanced revenue       | P2 / last                          |

### First Reveal FR3–FR9

Spec remains [FIRST_REVEAL_TRACK.md](FIRST_REVEAL_TRACK.md). Do not generate three full sites.

| Slice             | Status                                     | Depends on                                                 |
| ----------------- | ------------------------------------------ | ---------------------------------------------------------- |
| FR0–FR2           | **In**                                     | —                                                          |
| Thin FR7          | **In** (no screenshots / AI visual review) | —                                                          |
| **FR3**           | Open                                       | C1 + C5                                                    |
| **FR4**           | Open                                       | Structured AI (Phase 4 exists)                             |
| **FR5**           | Open                                       | FR4; cheap candidates                                      |
| **FR6**           | Open                                       | C2–C5 winner-only media                                    |
| **FR7 remainder** | Open                                       | visual / a11y / perf / screenshots                         |
| **FR8**           | Open                                       | C7 + remaining FR7; Control `docs/28` + `docs/30` language |
| **FR9**           | Open                                       | Phase 9 later                                              |

### Client Value V0–V5

Spec remains [CLIENT_VALUE_TRACK.md](CLIENT_VALUE_TRACK.md). Trusted software calculates; AI explains.

| Slice        | Status | Depends on                                                 |
| ------------ | ------ | ---------------------------------------------------------- |
| **V0**       | Open   | Known fee/package. **No ROI**                              |
| **V1**       | Open   | O1–O3                                                      |
| **V2 / O21** | Open   | Versioned benchmarks or client baseline. Labeled estimated |
| **V3 / O22** | Open   | O11–O12 / O14 coverage. Replacement cost ≠ ROI             |
| **V4**       | Open   | Phase 7 + data health                                      |
| **V5**       | Open   | Phase 9 later                                              |

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
5. **V0** activity proof when fee/package is known (no ROI)

### Wave B — first-site quality (still one engine)

1. **C1** brand visual profile + confirm
2. **FR3** asset wiring / sufficiency / typography-led fallback
3. **FR4–FR5** cheap direction manifests + scoring (not three sites)
4. **C2** `ImageProvider`
5. **C3–C5** compose + funnel manifests
6. **FR6** winner-only expensive media
7. **C7** QA + client creative approval
8. **FR7 remainder** then **FR8** client reveal

### Wave C — client operating system

1. **O4 / O5** Overview + Today
2. **O9** offer versions
3. **O10** `CRMProvider`
4. **O11–O14** revenue, confidence, evidence, monthly review
5. **V1** lead/goal value join
6. **O15** Ask Vector only then

### Wave D — creative + value maturity

1. **C4** remainder / **C6** social families / **C8** creative learning
2. **V2–V4** when coverage exists
3. **C9** video last

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
- Second object store, second funnel renderer, second sales/revenue ledger
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
