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
- Email webhook ingestion
- Weekly performance review
- Recommendation generation
- Social publication
- Experiment lifecycle
- Provider token health check
- Data retention/deletion jobs

## Idempotency

Every externally triggered workflow must tolerate duplicate delivery.
