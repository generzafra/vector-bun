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

`brands` is one row per client: audience, offer, conversions, personality, and design tokens. `brand_assets` stores Phase 1 identity-file metadata only (logo, mark, og, favicon, other); bytes live behind `StorageProvider` under `clients/{client_id}/brand/...`. Raw storage keys are not authorization. Claims store approved and prohibited statements. Money on offers is integer minor units plus currency. Campaign-offer versions (`docs/30`) extend this `offers` domain; do not create a colliding second `offers` table.

Creative Engine entities (`docs/29`) are later tenant-owned tables: `assets` and versions/derivatives, `brand_visual_profiles`, `creative_briefs`, `creative_concepts`, generation jobs, templates, rights, approvals, usage, and creative learning objects. Do not treat `brand_assets` as that library. Do not add a second object-store adapter.

Phase 5 Creative C0 (tenant-owned, `client_id` required; not `brand_assets`):

```text
creative_assets
creative_asset_versions
creative_asset_rights
```

Versions are immutable. Bytes live behind `StorageProvider` under `clients/{client_id}/creative/...`. Raw storage keys are not authorization. Posts may attach an approved asset version or stay text-only. Rights must be confirmed before approval.

Phase 5 social (tenant-owned, `client_id` required):

```text
social_connections
social_accounts
social_posts
social_publications
social_metrics
social_provider_events
```

OAuth tokens are encrypted at rest on `social_connections` and are never returned to the browser or model. `token_expires_at` drives refresh-before-publish. Required `social_accounts` make `social.access` blocking. `social_platform` is `linkedin` | `x` | `facebook` | `instagram`. Post lifecycle is idea → draft → reviewed → approved → scheduled → publishing → published | failed → archived. Publications record the exact content version and asset version sent. `social_metrics` are snapshots, not the business source of truth. Social → lead uses existing `lead_sources.utm_content` = `post:{social_post_id}`.

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

`leads.status` is `new | working | qualified | won | lost | spam`. Do not replace that enum. Later `sales_outcomes`, `client_goals`, `revenue_events`, `data_health_checks`, notification preferences, entitlements, and client-health snapshots are tenant-owned (`docs/30`). Status `won` / `lost` is not a revenue row. Revenue amounts are optional.

Phase 3 email (tenant-owned, `client_id` required except global suppressions):

```text
email_connections
email_domains
email_contacts
email_topics
email_sequences
email_sequence_steps
email_sequence_enrollments
email_messages
email_events
email_suppressions
consent_events
email_inbound_messages
```

`email_suppressions.scope = global` is platform-owned and has a null `client_id`. Client suppressions never merge across tenants. Sending-domain readiness stores SPF, DKIM, DMARC, and approved From as machine-checked fields. Published welcome sequences are approved versions (`welcome_v1`). Preview/`is_test` messages are not production sends. Engagement counts are derived from tenant-scoped `email_messages` and `email_events`. `email_contacts` sync from leads even when a send is skipped. Inbound replies live on `email_inbound_messages` as drafts; they are not a send queue. Workflow runs are not a second source of truth; Trigger.dev is the optional durable host for the same tenant-scoped handlers.

Phase 4 intelligence: platform catalog has no `client_id` (`ai_agents`, `ai_agent_versions`, `prompt_templates`, `prompt_versions`). Tenant-owned rows require `client_id`:

```text
ai_client_settings
ai_runs
ai_messages
ai_tool_calls
ai_decisions
ai_feedback
ai_cost_events
approval_requests
approval_decisions
```

Prompt and agent versions are immutable. Runs record provider, model, schema name/version, and prompt version. Cost is integer USD micros plus currency. Approvals are required in Phase 4. Approving funnel or copy may attach an unpublished `page_versions` draft on `ai_runs.artifact_page_version_id`; deciding never publishes, sends, or activates a domain. `ai_feedback` records accept/reject. `ai_tool_calls` records proposed tools with `authorized` false in Phase 4; they are not execution. Knowledge used as model input is a tenant snapshot, never another client’s embeddings or claims.

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
