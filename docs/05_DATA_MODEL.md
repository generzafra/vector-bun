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
services
offers
claims
```

`brands` is one row per client: audience, offer, conversions, personality, and design tokens. Claims store approved and prohibited statements. Money on offers is integer minor units plus currency.

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
