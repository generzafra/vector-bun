# Data Model

## Data modeling rules

- UUID or sortable unique identifiers consistently.
- `client_id` on all tenant owned entities.
- `created_at`, `updated_at` on mutable entities.
- Actor and reason for important state transitions.
- Immutable published versions for funnels, content, prompts, and experiments.
- Provider payloads stored only as references or bounded JSON snapshots where needed.
- Monetary values stored in integer minor units plus currency.
- Time stored in UTC; client timezone stored separately.

## Major domains

Tenancy, identity, brand knowledge, funnel, CRM, campaigns, social, email, SEO/AEO, analytics, attribution, experiments, AI, automation, compliance, audit, launch, usage.

Phase 1 knowledge (tenant-owned, `client_id` required):

```text
brands
brand_assets
services
offers
claims
```

`brands` is one row per client: audience, offer, conversions, personality, and design tokens. `brand_assets` stores metadata only; bytes live behind `StorageProvider` under `clients/{client_id}/brand/...`. Raw storage keys are not authorization. Claims store approved and prohibited statements. Money on offers is integer minor units plus currency.

Phase 1 funnel (tenant-owned, `client_id` required):

```text
sites
funnels
pages
page_versions
client_domains
```

`page_versions` are immutable after `published`. Compose inserts a new draft; publish copies that draft into a new published row and points `pages.published_version_id` at it. Live `client_domains.hostname` values are globally unique (`status <> disabled`). Hostname lookup is bootstrap only; page reads after that require TenantContext. Preview hostnames use `preview-{client-slug}.{DELIVERY_PREVIEW_PARENT_HOST}` and stay `noindex`. Production hostnames are submitted, verified via `/.well-known/vector-domain`, then activated. Redirect hostnames 308 to the active canonical production host.

Phase 1 launch (tenant-owned, `client_id` required): the same readiness catalog and launch state machine for every client. Clock fields are stored. A 24-hour SLA is not computed or displayed. `vector_ready` requires blocking items only (knowledge + published preview). `launching` and `live` stay fail-closed until a production domain is active.

Phase 2 CRM, consent, and analytics (tenant-owned, `client_id` required):

```text
contacts
contact_identities
leads
lead_sources
lead_scores
lead_score_events
lead_status_history
consent_records
visitors
analytics_sessions
analytics_events
attribution_touchpoints
attribution_results
```

Email identity is unique per tenant. The same email on two clients is two contacts. Preview submits set `is_test`. Consent is a purpose ledger at form submit (`lead_follow_up` required, `marketing` granted or denied). Analytics sessions are not auth `sessions`. Postgres is the source of truth for leads and outcomes. Attribution v1 stores first touch and last non-direct; it is not presented as multi-touch truth.

## Launch and readiness

Required for Vector 24 and operator launch tracking:

```text
client_readiness
client_readiness_items
client_launches
client_launch_events
client_launch_blocks
client_launch_approvals
```

`client_launches` must support:

```text
id
client_id
launch_class
status
vector_ready_at
generation_started_at
qa_started_at
approval_requested_at
approval_received_at
domain_ready_at
launch_started_at
live_at
paused_at
paused_seconds
failure_reason
created_at
updated_at
```

Also store commercial and operational timestamps needed to split delays: `signed_at`, `onboarding_started_at`.

Launch states: `draft`, `onboarding`, `blocked`, `vector_ready`, `generating`, `qa`, `awaiting_client_approval`, `awaiting_domain`, `launching`, `live`, `launch_failed`, `paused`. Every transition is auditable.

## Usage and infrastructure

Required for noisy-neighbor control and scale decisions:

```text
infrastructure_usage_snapshots
tenant_usage_limits
tenant_usage_events
```

## Migration discipline

Drizzle migrations must be committed. Never mutate production schema manually without a migration and decision record.
