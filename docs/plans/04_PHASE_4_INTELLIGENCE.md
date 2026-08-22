# Phase 4 — Vector Intelligence

**Status:** Outline  
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
- Research, Copy, and Analytics agents (Funnel Strategist may draft only)
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

## Vector 24 hook

Agents may draft funnel/copy/research after VECTOR READY in later clients. Phase 4 must not skip human review on first launch. Knowledge retrieval stays client-scoped.

## Do not start until

Phase 3 email, consent, and suppression cannot be bypassed by a tool.
