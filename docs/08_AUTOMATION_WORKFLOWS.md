# Automation Workflows

## Runtime

Trigger.dev is the durable job engine.

## Every workflow defines

Trigger, input schema, tenant, idempotency, retry, timeout, concurrency, approval policy, audit event, failure path, escalation.

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

## Idempotency

Every externally triggered workflow must tolerate duplicate delivery.
