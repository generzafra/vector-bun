# Phase 9 — Multi-Client Scale

**Status:** Outline  
**Prerequisite:** Phase 8 exit met, or several live clients plus Phase 0–3 foundations. Do not start until per-client identity, audit, and quotas can be enforced.

---

## Goal

Operators oversee many clients by exception. A single tenant cannot exhaust shared resources. Infrastructure splits without changing client domains.

## Exit gate

Portfolio operations work by exception, including Vector 24 clocks. Noisy-neighbor controls are enforced.

## In scope

- Per-client API, workflow, AI, email, upload, and analytics limits
- Usage and cost dashboards; cost per qualified lead where possible
- Scaling alerts (CPU, memory, queue delay, origin p95, one-tenant imbalance)
- Portfolio launch dashboard (status, SLA clock, blocker, owner, class, readiness)
- Client templates and operational queues
- Optional dedicated delivery / DB as premium — not the default
- Load tests before claiming support for 20 ordinary clients

## Out of scope

- Kubernetes without a measured requirement and ADR
- One database per client as the default
- Scaling from tenant count alone
- Promising Vector 24 from contract signing or to Class D clients

## New packages and tables

- `infrastructure_usage_snapshots`, `tenant_usage_limits`, `tenant_usage_events`
- Portfolio / SLA reporting views or tables as needed

## Vector 24 hook

KPI is `vector_ready_at → live_at` excluding client-caused pauses. Track median ready-to-live, percent under 24h and 12h, manual interventions per launch versus launch defects. Commercial wording stays qualified.

## Do not start until

Multiple clients can launch without a code fork, and Phase 1 readiness / launch states exist.
