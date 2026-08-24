# Phase 4 — Vector Intelligence

**Status:** Slice 4 done — Phase 4 exit met for typed, versioned, auditable, tenant-scoped, cost-attributed drafts. Tool calls are audited and denied. Intelligence still does not publish, send, or go live.  
**Prerequisite:** Phase 3 exit met. Do not start until nurture can complete safely.

---

## Goal

Production Vector Intelligence can research, draft copy, and recommend — never execute — through typed contracts, tenant scope, approvals, and a cost ledger.

## Exit gate

Every AI action is typed, versioned, auditable, tenant-scoped, and cost-attributable.

## In scope

- `AIProvider` with `GrokProvider` as the first adapter (xAI Grok API, **not** Cursor Grok)
- Cursor Grok remains the software development agent only
- Zod / JSON Schema structured outputs; natural language is not the execution contract
- Prompt and agent version registry
- Research, Copy, and Analytics agents (Funnel Strategist may draft only; page drafts use approved schemas and `docs/27` variants, never arbitrary HTML)
- Control recommendation / approval / activity UI, when added, follows `docs/28` and master plan §28.3
- Approval queue; default autonomy levels 0–2
- `ai_runs`, `ai_decisions`, `ai_cost_events`, tool-call audit
- No unrestricted SQL, shell, filesystem, HTTP, or secrets

## Out of scope

- Level 3+ auto-execute except explicitly listed low-risk internals
- Social publish, SEO execution, experiment promotion
- Letting model confidence authorize a sensitive action
- Hard-coding xAI throughout the domain

## New packages and tables

- `packages/ai`
- `ai_agents`, `ai_agent_versions`, `prompt_templates`, `prompt_versions`
- `ai_runs`, `ai_messages`, `ai_tool_calls`, `ai_decisions`, `ai_feedback`, `ai_cost_events`
- `approval_requests`, `approval_decisions`
- `ai_client_settings` (per-tenant pause and cost ceiling)

## Vector 24 hook

Agents may draft funnel/copy/research after VECTOR READY in later clients. Phase 4 must not skip human review on first launch. Knowledge retrieval stays client-scoped.

## Do not start until

Phase 3 email, consent, and suppression cannot be bypassed by a tool.

## Slice 1 — Adapter, registry, structured drafts, cost, kill switch, approval queue (done)

An operator can run Research, Copy, Analytics, or Funnel Strategist through `AIProvider`. The run is tenant-scoped, versioned (agent + prompt + schema), Zod-validated, and cost-attributed in integer USD micros. Outputs create a proposed decision and a pending approval. Approval records a human decision and does not publish, send, or execute. Client pause and `AI_EXECUTION_PAUSED` fail closed; confidence cannot override. Alpha cannot read Beta runs, costs, or approvals. Knowledge and analytics facts are loaded only for the active tenant. Copy cannot include HTML. Funnel plans accept only approved section types. Production agents do not call tools.

- Package: `packages/ai` (`MemoryAIProvider` default, `GrokProvider` when `XAI_API_KEY` is set, `DisabledAIProvider` when paused)
- Capabilities: `ai.read`, `ai.manage`
- Control: `/intelligence` with `docs/28` recommendation cards
- API: `GET /v1/intelligence`, `POST /v1/intelligence/runs`, `POST /v1/intelligence/approvals/:id/decide`, `POST /v1/intelligence/pause`
- Isolation: missing TenantContext fails closed; route client id cannot leak the other tenant

## Slice 2 — Approved drafts become unpublished artifacts (done)

Approving a Funnel Strategist or Copy recommendation writes a new `page_versions` row with `status: 'draft'`. The document is composed from tenant knowledge through the existing funnel composer, then filtered/overlaid with the approved plan or copy variant. Preview `seo.noindex` stays true. Published version id, preview/production domain status, and email sends do not change. Research and Analytics approvals record feedback only. Reject records negative feedback and creates no draft. Alpha cannot create or read a Beta draft. `/intelligence` lists unpublished drafts and a short activity feed (detected → recommended → approved/rejected → draft created / not executed).

- Apply helpers: `packages/funnel-engine/src/apply-recommendation.ts`
- Artifact link: `ai_runs.artifact_kind`, `ai_runs.artifact_page_version_id` (migration `0010_phase4_artifacts`)
- Feedback: `ai_feedback` on every decide (`+1` approve, `-1` reject)
- Control: unpublished drafts + activity on `/intelligence`

## Slice 3 — Review intelligence drafts on Funnel (done)

The current Funnel draft is attributed when it was created by an approved Intelligence run. `/intelligence` links that artifact to `/funnel`. `/funnel` links back to `/intelligence`. Compose from knowledge creates a new unattributed draft. Publication stays `publishFunnel` / `pages.manage`. Intelligence decide still does not publish, send, or activate a domain. Alpha cannot see a Beta intelligence draft on Funnel.

- `getFunnel` returns `intelligenceDraft` only when the latest draft id matches a tenant-scoped `ai_runs.artifact_page_version_id`
- Overview artifacts include `isCurrentFunnelDraft`
- Control: Funnel status banner; Intelligence “Review on Funnel”

## Slice 4 — Tool-call audit, deny by default (done)

Any attempted tool invocation is written to tenant-scoped `ai_tool_calls` with `authorized: false` and then fails closed (`AI_TOOLS_DISABLED`). The provider `useTools` path is not called. SQL, shell, filesystem, HTTP, and secrets do not run. A successful Research/Copy/Analytics/Funnel run records no tool calls. Alpha cannot read or invoke a tool against a Beta run. Missing TenantContext cannot list tool calls. `/intelligence` shows the audit. There is no Control or API action that executes a tool.

- Domain: `requestIntelligenceTool`
- Repos: `insertAiToolCallForTenant`, `listAiToolCallsForTenant`
- Control: Tool-call audit table

Trigger.dev AI jobs and pgvector remain later. Do not start Phase 5 until this exit is accepted. Phase 8 owns Level 3+ execute.

`ImageProvider` and generated visuals are `docs/29`, not this phase. `AIProvider` stays text, structured output, and tools. This exit does not require AI-generated images.

Ask Vector, data-health gates, and goal-linked provenance are Outcomes O13–O15 (`docs/30`), not this exit. Recommendation cards already carry finding, evidence, impact, risk, and confidence. First Reveal FR4–FR5 (structured direction manifests) may attach later on this calendar; they are not this exit. See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).
