# Vector UI migration status

**Last updated:** 24 August 2026

Identity migration applies to Control only. Delivery stays on client tokens and `docs/27`.

## Control

| Route        | tokens wired | shell migrated | shared controls | responsive reviewed | accessibility reviewed | visual QA      | legacy CSS removed |
| ------------ | ------------ | -------------- | --------------- | ------------------- | ---------------------- | -------------- | ------------------ |
| Login        | [x]          | [x]            | [x] CSS-native  | [x]                 | [x] focus + labels     | [x] first pass | [x]                |
| Privacy      | [x]          | [x]            | [x] CSS-native  | [x]                 | [x] headings + toc     | [ ]            | [x]                |
| Terms        | [x]          | [x]            | [x] CSS-native  | [x]                 | [x] headings + toc     | [ ]            | [x]                |
| Overview     | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Clients      | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Knowledge    | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Funnel       | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Launch       | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Leads        | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Analytics    | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Email        | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Social       | [x]          | [x]            | [x] CSS-native  | [x]                 | [x] labels + tables    | [x] first pass | [x]                |
| Intelligence | [x]          | [x]            | [x] CSS-native  | [x]                 | [x] labels + cards     | [x] first pass | [x]                |
| Autonomy     | [x]          | [x]            | [x] CSS-native  | [x]                 | [x] labels + tables    | [x] first pass | [x]                |
| Portfolio    | [x]          | [x]            | [x] CSS-native  | [x]                 | [x] labels + tables    | [ ]            | [x]                |
| Members      | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |

Hard-coded Control hex (`#12161d`, `#3b6fd9`) was replaced by semantic tokens. Official mark, wordmark, and favicon pack live under `apps/control/static/brand/vector/`.

## Delivery

| Route                       | docs/27 Phase 1 gate | docs/28 identity         |
| --------------------------- | -------------------- | ------------------------ |
| Preview / production funnel | [x]                  | N/A — client tokens only |

## Future Control modules

| Module                          | Status                                                                                                                                    |
| ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------- |
| Opportunities / recommendations | `/intelligence` recommendation cards shipped                                                                                              |
| Campaigns                       | planned                                                                                                                                   |
| Analytics / charts              | tables shipped; chart theme still planned                                                                                                 |
| Automation canvas               | planned (later Phase 8); `/autonomy` policy table, S1 Run now, S2 launch plan, S3 unpublished launch execute, S4 promote/rollback shipped |
| Intelligence explainability     | `/intelligence` cards, activity, draft artifacts                                                                                          |
| Portfolio dashboard             | `/portfolio` S0–S1 shipped: exceptions, Vector 24 clocks, enforce / evaluate-only usage overrides                                         |
| Vector marketing hero           | not in this repo                                                                                                                          |

## Remaining follow-up

- Capability-filtered **client** nav is in (CU0): Overview / Leads / Approvals (`/approvals`) / Goals. Outcomes QuickStart is in (CU1) at `/quickstart`. Approval Center grouping is in (O8). `sales_outcomes` capture is in (O3) on `/leads`. V0 activity proof is in on `/value` (not default nav). Today, Campaigns, and Insights wait. See `docs/plans/OUTCOMES_TRACK.md`.
- Drop official mark/wordmark PNGs or SVGs into a brand registry and swap `VectorMark` (`docs/plans/SURFACE_COMPLETENESS_TRACK.md` CX5).
- Extract a shared `Button` only if Control grows incompatible variants.
- Add chart theme when the first Control chart ships (CX1).
