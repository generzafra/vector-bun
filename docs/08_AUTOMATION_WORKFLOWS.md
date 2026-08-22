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
- Weekly performance review
- Recommendation generation
- Social publication
- Experiment lifecycle
- Provider token health check
- Data retention/deletion jobs

Phase 3 contracts live in `packages/automation` (`lead-captured`, `nurture-step`, `enroll-eligible`, `nurture-due-sweep`) and run in-process. Trigger.dev cloud registration is a later slice.

## Idempotency

Every externally triggered workflow must tolerate duplicate delivery.
