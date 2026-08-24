# Vector frontend map

Living map of **actual** frontend paths. Update this file when canonical paths change. Do not copy the recommended `src/lib/vector/` tree from `docs/28` as if it already exists.

**Last inspected:** 24 August 2026

## Planes

| Plane    | App             | Identity                  | Quality bar                                          | Media                                     |
| -------- | --------------- | ------------------------- | ---------------------------------------------------- | ----------------------------------------- |
| Control  | `apps/control`  | `docs/28` Vector identity | Operational, not cinematic; client IA/copy `docs/30` | Operator library when Creative C0 exists  |
| Delivery | `apps/delivery` | Client brand tokens       | `docs/27`                                            | Approved Creative derivatives (`docs/29`) |

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

| Shell                  | Path                                                                                                             |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------- |
| Control app shell      | `apps/control/src/lib/vector/AppShell.svelte`                                                                    |
| Control root layout    | `apps/control/src/routes/+layout.svelte`                                                                         |
| Control auth           | `apps/control/src/routes/login/+page.svelte` (quiet canvas inside `AppShell` when signed out)                    |
| Control legal          | `apps/control/src/routes/privacy/+page.svelte`, `apps/control/src/routes/terms/+page.svelte` (public, `docs/28`) |
| Delivery layout        | `apps/delivery/src/routes/+layout.svelte`                                                                        |
| Delivery page renderer | `apps/delivery/src/lib/sections/PageRenderer.svelte`                                                             |

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

| Item                    | Path                                                  |
| ----------------------- | ----------------------------------------------------- |
| Vector marketing hero   | not implemented (no Vector marketing route)           |
| Client `hero-minimal`   | `apps/delivery/src/lib/sections/HeroMinimal.svelte`   |
| Client `hero-split`     | `apps/delivery/src/lib/sections/HeroSplit.svelte`     |
| Client `hero-editorial` | `apps/delivery/src/lib/sections/HeroEditorial.svelte` |

## Current Control routes

| Route        | Path                                                       |
| ------------ | ---------------------------------------------------------- |
| Overview     | `apps/control/src/routes/+page.svelte`                     |
| Clients      | `apps/control/src/routes/clients/+page.svelte`             |
| Knowledge    | `apps/control/src/routes/knowledge/+page.svelte`           |
| Funnel       | `apps/control/src/routes/funnel/+page.svelte`              |
| Goals        | `apps/control/src/routes/goals/+page.svelte`               |
| QuickStart   | `apps/control/src/routes/quickstart/+page.svelte`          |
| Brand look   | `apps/control/src/routes/brand/+page.svelte`               |
| Value        | `apps/control/src/routes/value/+page.svelte`               |
| Approvals    | `apps/control/src/routes/approvals/+page.svelte`           |
| Leads        | `apps/control/src/routes/leads/+page.svelte`               |
| Email        | `apps/control/src/routes/email/+page.svelte`               |
| Social       | `apps/control/src/routes/social/+page.svelte`              |
| Social OAuth | `apps/control/src/routes/social/oauth/callback/+server.ts` |
| Search       | `apps/control/src/routes/search/+page.svelte`              |
| Intelligence | `apps/control/src/routes/intelligence/+page.svelte`        |
| Autonomy     | `apps/control/src/routes/autonomy/+page.svelte`            |
| Analytics    | `apps/control/src/routes/analytics/+page.svelte`           |
| Experiments  | `apps/control/src/routes/experiments/+page.svelte`         |
| Launch       | `apps/control/src/routes/launch/+page.svelte`              |
| Portfolio    | `apps/control/src/routes/portfolio/+page.svelte`           |
| Members      | `apps/control/src/routes/members/+page.svelte`             |
| Login        | `apps/control/src/routes/login/+page.svelte`               |
| Privacy      | `apps/control/src/routes/privacy/+page.svelte`             |
| Terms        | `apps/control/src/routes/terms/+page.svelte`               |

`/portfolio` is the Phase 9 Control surface for operator exceptions: Vector 24 clocks, launch blockers, and usage warnings for clients the actor can access. Enforce refuses over-limit API, AI, email, upload, and analytics consumes. It does not claim a commercial 24-hour promise or 20-client capacity. Class D is unpromised. Limit overrides require `scale.manage`, CSRF, a mode, and a written reason. `/intelligence` is the Phase 4 Control surface for drafts, recommendation cards, approvals, unpublished page artifacts, activity, tool-call audit, and the tenant cost ledger. Approved funnel/copy drafts are reviewed on `/funnel`; publication stays a Funnel action. `/autonomy` is the Phase 8 Control surface for the action-policy catalog, Level 3 and Level 4 eligibility, autonomy ceiling 0–4, privileged client kill-switch events, S1 Run now for an internal weekly report, S2 launch automation policy records, S3 Run now for opted-in unpublished queue QA and wire tracking, S4 Run now for a Phase 7 policy-ready experiment promote, and Rollback for selected succeeded executions. Confidence cannot authorize. The weekly report does not send or publish. Launch execute does not publish, send, create drafts, or go live. Generate drafts stays human-led. Experiment promote changes only that tenant's published pointer. Other preapproved classes stay evaluate-only. `/social` is the Phase 5 Control surface for LinkedIn, X, Facebook, and Instagram connections, official OAuth start, Facebook / Instagram Page picker, token refresh, Creative C0 uploads, post lifecycle, the scheduled list, publications, metrics, and attributed lead counts. `/social/oauth/callback` completes official OAuth or stores an encrypted Page-pick cookie and never renders tokens. Tokens and media grants are never rendered. `/search` is the Phase 6 Control surface for official Search Console / Bing properties, technical issues, official queries, schema entities, answer targets, source-backed FAQ gaps, a capped commercial GEO query set, recorded observations, and the SEO/AEO/GEO backlog. Credentials stay on the server. Refreshing answer readiness does not create a page. Recorded observations are labeled and can be stale; they are not a GEO score. Manual and operator-assisted measurement is available. Official generative-engine APIs stay unsupported. `/search` also shows a client-safe visibility snapshot, a Business impact panel, cadence/budget controls, this client's due queue, and portfolio exceptions for clients the actor can access. One observation is not a pattern, a stale snapshot is not current, and a mention is not a referred lead. Revenue stays unlabeled until a later revenue row exists. `/experiments` is the Phase 7 Control surface for tenant-scoped CRO proposals. Operators can approve, pause, resume, or start a recorded proposal. Fields lock after it is recorded. Start begins sticky Delivery assignment on published page versions. Preview stays test traffic. Measurement shows predetermined metric counts, horizon, sample, bot contamination, and source imbalance. Operators can record a policy-gated decision and a tenant-scoped learning object. A higher percentage is not a win. Early stop stays blocked. Campaigns, an automation canvas, and chart themes are still later. Analytics remains tables only.

`/goals` is the first-client Outcomes surface: a primary business goal, data-health flags for a broken tracking source, and notification defaults. It uses `docs/28` Control chrome and `docs/30` business language. CU0 filters Control nav by capability: default client links are Overview, Leads, Approvals (`/approvals`), and Goals. `/approvals` is O8: existing `approval_requests` grouped into campaigns, content, site direction, and connections. Approving still does not publish or send. `/leads` records tenant-owned `sales_outcomes` (O3) with Contacted / Qualified / Appointment / Won / Lost and optional integer money on won. Appointment does not change `lead_status`. `/quickstart` is CU1 Outcomes QuickStart: seven plain questions that write `client_outcome_quickstarts`, optional `client_goals`, and the high-intent notification preference. It is not in the default nav; Overview and Goals link to it. Knowledge is not required. `/brand` is Creative C1: confirm or edit the tenant-owned brand visual profile (logo, colors, visual style, photography, prohibited styles) drafted from existing `brands` / `brand_assets`. It is not in the default client nav; Overview links to it. Unconfirmed is not a First Reveal license. `/value` is V0 activity proof: a known package fee and observed monthly work counts. It is not ROI, not in the default client nav, and Overview links to it. Vector will not invent a fee, hours saved, or return on investment. `/funnel` shows the deterministic First Reveal Gate on the current draft; a failed gate can be overridden with a written reason and does not block preview publish.

`/privacy` and `/terms` are public Vector product legal pages. They render `VECTOR_PRIVACY_POLICY.md` and `VECTOR_TERMS_OF_USE.md` without authoring notes, do not require a session, and must not be copied onto Delivery tenant hosts. Remaining contact placeholders stay visible until counsel replaces them. Client funnels keep tenant privacy acknowledgements; they do not use these Vector pages as the client privacy policy.

## Delivery public routes

Hostname-selected `apps/delivery/src/routes/+page.svelte`. Known-host `apps/delivery/src/routes/unsubscribe/+page.svelte` for marketing preference changes. Known-host `apps/delivery/src/routes/brand-logo/+server.ts` streams the tenant logo from `StorageProvider` without putting a storage key in the URL. Unknown hosts fail closed. Control `/email` reports Postgres engagement, inbound drafts, the workflow runner, and operator enroll / due-step / review actions; it is not a tenant theme. Inbound bodies render as text, never as HTML.
