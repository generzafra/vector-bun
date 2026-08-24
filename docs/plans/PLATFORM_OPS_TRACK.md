# Platform ops track — Phase 9 remainder + SRE

**Status:** Implementation specification — Phase 9 S0–S1 in; S2–S4 and OPS1–OPS6 open  
**Track:** Platform operations (not a new Vector phase)  
**Standing law:** [`docs/08`](../08_AUTOMATION_WORKFLOWS.md), [`docs/14`](../14_SECURITY_PRIVACY_COMPLIANCE.md), [`docs/16`](../16_OBSERVABILITY_SRE_DR.md), [`docs/19`](../19_DEPLOYMENT_ENVIRONMENTS.md), [`docs/20`](../20_COSTS_USAGE_LIMITS.md), [`docs/26`](../26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md)  
**Phase 9 S2–S4 rules:** [09_PHASE_9_SCALE.md](09_PHASE_9_SCALE.md) §10–11 remain authoritative. This file sequences them with retention, telemetry, DR, and load test.  
**Sequence:** [SHIP_REMAINING.md](SHIP_REMAINING.md) Wave E  
**Prerequisite:** Phase 9 S0–S1. Do not claim 20-client capacity. Do not start Kubernetes or a database per client without an ADR.

---

## 1. Goal

Operators oversee many clients by exception. The platform can leave one host without changing client domains. A single tenant cannot exhaust shared resources. Client-facing value and Delivery UX are **not** this track.

```text
S0–S1 quotas (in)
→ S2 infrastructure snapshots + alerts
→ S3 portfolio templates / queues
→ S4 internal cost dashboard
→ retention jobs
→ tracing / backups / deploy smoke
→ load test before a 20-client claim
```

Governing principle:

> Operate by exception. Measure Vector 24 from Vector Ready to live. Client count is not the scaling metric.

---

## 2. Exit, must-take, and additive

Phase 9 **may already exit after S1** plus S0 portfolio clocks. S2–S4 and OPS* do not reopen that exit.

Creative QuickStart, entitlements, client health, FR9, and V5 stay on their tracks. They are listed as Phase 9 _calendar_ attachments in [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md), not as this file’s slices.

---

## 3. In scope

- `infrastructure_usage_snapshots` and scaling alerts
- Portfolio templates and operational queues (same shape every client)
- Internal cost dashboard from existing ledgers; cost per qualified lead only when observed
- Data-class retention and deletion jobs
- OpenTelemetry across request, service, DB, model, provider, workflow
- Encrypted backups, restore test, documented RPO/RTO
- Production deploy pipeline smoke
- Load test before claiming ~20 ordinary clients
- Vector 24 metric productization after supervised clients

---

## 4. Out of scope

- Kubernetes without measured need + ADR
- One database per client as the default
- Inventing revenue, margin, or cost per lead
- Promising Vector 24 from contract signing or to Class D
- Client Overview / Today / QuickStart (those are Outcomes CU*)
- Delivery visual variants (`docs/27`)

---

## 5. Packages and tables

- P9-S2: `infrastructure_usage_snapshots`. Platform operational measurements. One-tenant imbalance may name `client_id` when attributable and must not leak another tenant’s payload.
- Retention: `data_retention_policies` per data class + jurisdiction; deletion jobs on existing `WorkflowRuntime`
- Tracing: existing `packages/observability` — extend, do not add a second telemetry product
- Cost dashboard: read `ai_cost_events`, email volume, usage events — do not invent a parallel cost ledger

Capabilities stay `scale.read` / `scale.manage` for portfolio/quota. Retention jobs are privileged ops.

---

## 6. Implementation order

| Slice     | Work                                                                                           | Gate               |
| --------- | ---------------------------------------------------------------------------------------------- | ------------------ |
| **P9-S0** | Usage limits evaluate-only, events, Control `/portfolio`                                       | **In**             |
| **P9-S1** | Enforce deny on API / AI / email / upload / analytics                                          | **In**             |
| **P9-S2** | Infrastructure snapshots + alerts (queue delay, origin p95, one-tenant share)                  | Wave E             |
| **P9-S3** | Client templates and operational queues on the portfolio surface                               | After S2           |
| **P9-S4** | Cost dashboard; cost/qualified lead only when observed                                         | After S3           |
| **OPS1**  | Retention / deletion by data class (`docs/14`)                                                 | Wave E             |
| **OPS2**  | OpenTelemetry (`docs/16`)                                                                      | Wave E             |
| **OPS3**  | Backups, restore test, RPO/RTO                                                                 | Wave E             |
| **OPS4**  | Deploy pipeline + smoke (`docs/19`)                                                            | When hosting       |
| **OPS5**  | 20-client load test before the capacity claim                                                  | Before claim       |
| **OPS6**  | Vector 24 metric productization (median ready-to-live, % under 24h/12h among promised classes) | After live clients |

---

## 7. P9-S2–S4 rules

Remain in [09_PHASE_9_SCALE.md](09_PHASE_9_SCALE.md):

- Snapshots are not tenant content. Alerts are exception rows, not a second monitoring product.
- Templates and queues must be the same shape for every client.
- Cost per qualified lead uses observed tenant cost and observed qualified leads only. Unknown stays unlabeled.
- Control `/portfolio` uses `docs/28` operational density. It does not paint Delivery.

---

## 8. OPS1–OPS6 rules

- **OPS1:** Retention is per data class and client jurisdiction. Do not keep all data forever. Do not `ON DELETE CASCADE` leads, consents, analytics, or audit. GEO: do not keep full generated answers when a structured observation is enough. Sales/revenue are commercially sensitive.
- **OPS2:** Structured logs already required. Tracing must not include secrets, provider tokens, or prompt contents beyond bounded metadata.
- **OPS3:** Automated PostgreSQL backup, encrypted off-server copy, scheduled restore test. Design so the platform can leave one physical host without changing client domains.
- **OPS4:** GitHub Actions already typechecks and tests. Production smoke is hostname-fail-closed, Control login, Delivery unknown-host deny.
- **OPS5:** Load-test cached homepages, uncached landing pages, simultaneous lead submissions, analytics ingestion, webhook bursts, DB concurrency, Control under public traffic, deploy-while-serving. Do not treat tenant count alone as the metric.
- **OPS6:** KPI is `vector_ready_at → live_at` minus documented pauses. Class D unpromised. Commercial wording stays qualified. First five clients remain SLA-exempt per existing Vector 24 law.

---

## 9. Tests

Quota isolation already exists. S2: named-tenant share must not include another tenant’s payload. Retention jobs tenant-scoped. Load tests are evidence, not a product feature.

---

## 10. Do not start until

Several clients can launch without a code fork (Phase 1 readiness/launch already exist). Prefer Wave A–C product work before OPS5 capacity theater.

## Locked attachments

Phase 9 exit stays S1. See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).
