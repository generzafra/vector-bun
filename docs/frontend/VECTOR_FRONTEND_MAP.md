# Vector frontend map

Living map of **actual** frontend paths. Update this file when canonical paths change. Do not copy the recommended `src/lib/vector/` tree from `docs/28` as if it already exists.

**Last inspected:** 22 August 2026

## Planes

| Plane    | App             | Identity                  | Quality bar                |
| -------- | --------------- | ------------------------- | -------------------------- |
| Control  | `apps/control`  | `docs/28` Vector identity | Operational, not cinematic |
| Delivery | `apps/delivery` | Client brand tokens       | `docs/27`                  |

## Global styles

| Surface             | Path                                                                           |
| ------------------- | ------------------------------------------------------------------------------ |
| Control stylesheet  | `apps/control/src/app.css`                                                     |
| Delivery stylesheet | `apps/delivery/src/app.css`                                                    |
| Control HTML theme  | `apps/control/src/app.html` (`data-brand="vector"` `data-theme="vector-dark"`) |

## Token root

| Item                    | Path                                     |
| ----------------------- | ---------------------------------------- |
| Control identity tokens | `packages/ui/src/tokens/vector.css`      |
| Token constants         | `packages/ui/src/tokens.ts`              |
| Package export          | `@vector/ui` and `@vector/ui/tokens.css` |

Delivery does not import `@vector/ui/tokens.css`. Client tokens remain `--bg`, `--surface`, `--text`, `--accent` on the Delivery root.

## Shells

| Shell                  | Path                                                                                          |
| ---------------------- | --------------------------------------------------------------------------------------------- |
| Control app shell      | `apps/control/src/lib/vector/AppShell.svelte`                                                 |
| Control root layout    | `apps/control/src/routes/+layout.svelte`                                                      |
| Control auth           | `apps/control/src/routes/login/+page.svelte` (quiet canvas inside `AppShell` when signed out) |
| Delivery layout        | `apps/delivery/src/routes/+layout.svelte`                                                     |
| Delivery page renderer | `apps/delivery/src/lib/sections/PageRenderer.svelte`                                          |

## Shared Control primitives

| Component           | Path                                                    |
| ------------------- | ------------------------------------------------------- |
| Vector mark         | `apps/control/src/lib/vector/VectorMark.svelte`         |
| Page header         | `apps/control/src/lib/vector/PageHeader.svelte`         |
| Alert               | `apps/control/src/lib/vector/Alert.svelte`              |
| Empty state         | `apps/control/src/lib/vector/EmptyState.svelte`         |
| Status chip         | `apps/control/src/lib/vector/StatusChip.svelte`         |
| Recommendation card | `apps/control/src/lib/vector/RecommendationCard.svelte` |

There is not yet a shared `Button.svelte` or form-control package. Control native `button` / `input` / `select` / `textarea` inherit token styles from `apps/control/src/app.css`.

## Charts and motion

| Item            | Path                                                          |
| --------------- | ------------------------------------------------------------- |
| Chart theme     | not implemented                                               |
| Motion registry | not implemented                                               |
| Reduced motion  | Control `app.css` and `AppShell.svelte`; Delivery section CSS |

## Brand assets

| Item                      | Path                                                         |
| ------------------------- | ------------------------------------------------------------ |
| Official PNG/SVG registry | `apps/control/static/brand/vector/`                          |
| Mark                      | `apps/control/static/brand/vector/logo/vector-mark.png`      |
| Wordmark                  | `apps/control/static/brand/vector/logo/vector-wordmark.png`  |
| Favicon pack              | `apps/control/static/brand/vector/favicons/`                 |
| Browser `/favicon.ico`    | `apps/control/static/favicon.ico` (copy of the registry ico) |

## Heroes

| Item                  | Path                                                |
| --------------------- | --------------------------------------------------- |
| Vector marketing hero | not implemented (no Vector marketing route)         |
| Client `hero-minimal` | `apps/delivery/src/lib/sections/HeroMinimal.svelte` |
| Client `hero-split`   | `apps/delivery/src/lib/sections/HeroSplit.svelte`   |

## Current Control routes

| Route        | Path                                                |
| ------------ | --------------------------------------------------- |
| Overview     | `apps/control/src/routes/+page.svelte`              |
| Clients      | `apps/control/src/routes/clients/+page.svelte`      |
| Knowledge    | `apps/control/src/routes/knowledge/+page.svelte`    |
| Funnel       | `apps/control/src/routes/funnel/+page.svelte`       |
| Leads        | `apps/control/src/routes/leads/+page.svelte`        |
| Email        | `apps/control/src/routes/email/+page.svelte`        |
| Intelligence | `apps/control/src/routes/intelligence/+page.svelte` |
| Analytics    | `apps/control/src/routes/analytics/+page.svelte`    |
| Launch       | `apps/control/src/routes/launch/+page.svelte`       |
| Members      | `apps/control/src/routes/members/+page.svelte`      |
| Login        | `apps/control/src/routes/login/+page.svelte`        |

`/intelligence` is the Phase 4 Control surface for drafts, recommendation cards, approvals, unpublished page artifacts, activity, tool-call audit, and the tenant cost ledger. Approved funnel/copy drafts are reviewed on `/funnel`; publication stays a Funnel action. Opportunities as a separate queue, Campaigns, Automation, and chart themes are still later. Analytics remains tables only.

## Delivery public routes

Hostname-selected `apps/delivery/src/routes/+page.svelte`. Known-host `apps/delivery/src/routes/unsubscribe/+page.svelte` for marketing preference changes. Unknown hosts fail closed. Control `/email` reports Postgres engagement, inbound drafts, the workflow runner, and operator enroll / due-step / review actions; it is not a tenant theme. Inbound bodies render as text, never as HTML.
