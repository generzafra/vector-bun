# Automation Workflows

## Runtime

Trigger.dev is the durable job engine.

## Every workflow defines

Trigger, input schema, tenant, idempotency, retry, timeout, concurrency, approval policy, audit event, failure path, escalation.

Phase 8 S0 catalogs per-action policies (`ai_action_policies`) used by the auto-execute gate. Phase 8 S1 auto-executes `internal_weekly_report` only: an internal observed snapshot, not a send, publish, or provider call. Phase 8 S2 records tenant-scoped launch automation policies for generate drafts, wire tracking, and queue QA. Phase 8 S3 auto-executes opted-in queue QA and wire tracking on unpublished drafts only: a pending internal QA checklist and core conversion events on draft page versions. Generate drafts, publish, send, and go live stay blocked. Phase 8 S4 auto-executes experiment promote when Phase 7 policy is ready and can roll back that promote or wired draft tracking. Kill switch and existing approval policies remain authoritative.

## Initial workflows

- New client onboarding
- Readiness recalculation
- Launch pipeline after Vector Ready
- Lead captured
- Lead score changed
- Nurture sequence
- Enroll eligible leads after sending-domain readiness
- Nurture due-step sweep
- Email webhook ingestion
- Inbound email draft (never auto-reply)
- Weekly performance review
- Recommendation generation
- Social publication
- Experiment lifecycle
- Provider token health check
- Data retention/deletion jobs

Phase 3 contracts live in `packages/automation` (`lead-captured`, `nurture-step`, `enroll-eligible`, `nurture-due-sweep`, `inbound-email`, `nurture-due-sweep-platform`). A Vector-owned `WorkflowRuntime` runs them. Tests and local default to in-process. `TRIGGER_SECRET_KEY` selects the Trigger.dev adapter. Task definitions live in `apps/jobs` and only call domain handlers. Inbound work records a draft only. The platform due-sweep returns tenant IDs, then each tenant job uses explicit `TenantContext`.

Later Creative Engine workflows (`docs/29`) — ingest, generation, derivatives, QA, approval, channel-ready, archive, performance feedback — use the same `WorkflowRuntime`. They must not become a second job host.

Later Outcomes workflows (`docs/30`) — lead-stage alerts, sales-outcome reconciliation, revenue import, attribution reconciliation, goal reviews, data-health checks, client digests, approval reminders — also use `WorkflowRuntime`.

Phase 6 search workflows (same `WorkflowRuntime`): technical SEO audit on publish, search-property sync, AEO opportunity cycle, GEO baseline after public launch, scheduled high-priority GEO measurement through a compliant method only, stale-measurement warning, search/GEO digest. S2 exposes validate, sync, sitemap submit, and technical audit as tenant-scoped Control / API actions. S3 exposes answer-readiness refresh. S4 exposes GEO query-set refresh. S5 persists observations through `SearchProvider.measureGenerativeVisibility` for manual / operator-assisted methods only. S6 refreshes a tenant-scoped visibility snapshot and fact-accuracy rows after recorded observations. S7 records a search/GEO referral only when a captured lead already carries observable search or generative UTMs. S8 persists tenant-scoped cadence and monthly GEO budget, a due queue, and `search-due-sweep` / `search-due-sweep-platform` on the same `WorkflowRuntime`. The tenant job may run technical audit, official property sync, answer-readiness refresh, and snapshot refresh. It never records a GEO observation or calls a consumer AI URL. Official generative-engine APIs stay unsupported. Do not scrape restricted consumer AI interfaces. Do not measure thousands of low-value prompts daily.

## Idempotency

Every externally triggered workflow must tolerate duplicate delivery.
