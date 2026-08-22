# Vector UI migration status

**Last updated:** 22 August 2026

Identity migration applies to Control only. Delivery stays on client tokens and `docs/27`.

## Control

| Route     | tokens wired | shell migrated | shared controls | responsive reviewed | accessibility reviewed | visual QA      | legacy CSS removed |
| --------- | ------------ | -------------- | --------------- | ------------------- | ---------------------- | -------------- | ------------------ |
| Login     | [x]          | [x]            | [x] CSS-native  | [x]                 | [x] focus + labels     | [x] first pass | [x]                |
| Overview  | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Clients   | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Knowledge | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Funnel    | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Launch    | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |
| Members   | [x]          | [x]            | [x] CSS-native  | [x]                 | [x]                    | [x] first pass | [x]                |

Hard-coded Control hex (`#12161d`, `#3b6fd9`) was replaced by semantic tokens. Official mark, wordmark, and favicon pack live under `apps/control/static/brand/vector/`.

## Delivery

| Route                       | docs/27 Phase 1 gate | docs/28 identity         |
| --------------------------- | -------------------- | ------------------------ |
| Preview / production funnel | [x]                  | N/A — client tokens only |

## Future Control modules

| Module                          | Status                                    |
| ------------------------------- | ----------------------------------------- |
| Opportunities / recommendations | planned (Phase 4+)                        |
| Campaigns                       | planned                                   |
| Analytics / charts              | planned (Phase 2+ if Control charts ship) |
| Automation canvas               | planned (Phase 8)                         |
| Intelligence explainability     | planned (Phase 4)                         |
| Portfolio dashboard             | planned (Phase 9)                         |
| Vector marketing hero           | not in this repo                          |

## Remaining follow-up

- Drop official mark/wordmark PNGs or SVGs into a brand registry and swap `VectorMark`.
- Extract a shared `Button` only if Control grows incompatible variants.
- Add chart theme when the first Control chart ships.
