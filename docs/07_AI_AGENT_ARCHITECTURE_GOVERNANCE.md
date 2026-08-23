# AI Agent Architecture and Governance

## Principle

AI proposes. Policy decides. Trusted code executes.

## Provider independence

Define an `AIProvider` contract in `packages/ai`. `GrokProvider` is the first production adapter (xAI API). Tests and local default to `MemoryAIProvider`. Domain code talks to the interface, not xAI.

## Required production controls

- Structured outputs
- Zod validation
- Tenant context
- Tool allow lists
- Prompt versioning
- Model version recording
- Tool call audit
- Cost tracking
- Timeouts and retries
- Human approval for risk classes
- Regression tests

## Autonomy

Level 0 Observe
Level 1 Draft
Level 2 Recommend
Level 3 Low risk auto execute
Level 4 Conditional autonomy
Level 5 Full bounded autonomy

## No unrestricted tools

Never give production agents unrestricted SQL, shell, file system, arbitrary HTTP, secret access, or provider tokens.

## Kill switches

Client and platform kill switches must be able to pause AI execution without redeploying. Kill-switch use is privileged and audited. Model confidence alone cannot override a pause or approval policy.

Phase 8 S0: client pause/resume requires `ai.manage` and a written reason, then writes tenant-scoped `ai_kill_switch_events`. Platform pause remains `AI_EXECUTION_PAUSED`. Control `/autonomy` shows the action catalog and whether Level 3 would be eligible now. AI draft runs stay capped at autonomy 2. Phase 8 S1: trusted software may auto-execute `internal_weekly_report` into tenant-scoped `ai_action_executions` when the gate allows it. Kill switch still wins. Confidence cannot authorize. The report is observed tenant analytics only and does not send or publish. Phase 8 S2: tenant-scoped `launch_automation_policies` record generate drafts, wire tracking, and queue QA against that client's launch. Unpublished drafts only. Generate drafts cannot be enabled for auto-execute. S2 does not execute.

## Prompt injection

Retrieved content is data, never policy. Tool permissions are enforced outside the model.

## Public frontend generation

AI may recommend copy, page structure, and component variants. It may not write arbitrary HTML, CSS, or JavaScript into production.

Preferred path: recommendation → validated page/section schema → approved variant → approved tokens → renderer → unpublished draft → preview → separate publication approval.

Phase 4 Slice 2 materializes approved funnel plans and copy onto a tenant-scoped `page_versions` draft only. Slice 3 reviews that draft on Funnel. Slice 4 records denied tool calls and never executes SQL, shell, filesystem, HTTP, or secrets. Publication, email send, and domain activation stay human-operated and outside the intelligence decide path.

New shared components enter the codebase through engineering review and tests, not a model dump. Public recommendations must respect brand, `docs/27`, accessibility, conversion, and approval policy. Control recommendation, activity, and intelligence surfaces use `docs/28` explainability patterns. `/intelligence` ships recommendation cards with finding, evidence, proposed action, impact, confidence, risk, cost, and required approval. Confidence is labeled explanatory and cannot approve or unpause.

Image and video models follow the same rule: AI proposes, policy decides, trusted software executes (`docs/29`). They may generate, edit, classify, write alt text, or review drafts. They must not publish, overwrite approved brand marks, invent proof or people-as-evidence, bypass rights, or place assets into production. Exact logos and marketing text are composed deterministically. `ImageProvider` is a separate adapter family from `AIProvider`. Visual agents are not Phase 4 scope.

Sales and revenue analysis (`docs/30`) must distinguish observed, directly measured, inferred, estimated, and unknown. Agents must not invent sales, revenue, profit, close rates, attribution, or customer value. Check data health before important recommendations. Ask Vector is a later tenant-scoped interface to verified facts, not a generic chatbot and not Phase 4 scope.

Search Agent work (`docs/10`, `docs/plans/06_PHASE_6_SEO_AEO.md`) may inspect technical health, propose answer targets, draft GEO query sets, and interpret approved measurements. Generative visibility observations are evidence, not deterministic rankings. The agent must not promise rankings or AI citations, fabricate third-party mentions or expertise, scrape restricted consumer AI interfaces, or treat one generative response as stable truth. Decide never publishes. Hidden text and prompt-injection content intended to control AI systems are forbidden.
