# Phase 9 — Multi-Client Scale

**Status:** Implementation specification — S0 in  
**Phase:** 9  
**Prerequisite:** Phase 8 exit met. Per-client identity, audit, and launch states already exist. Do not start Kubernetes, a database per client, or a 20-client capacity claim.

---

## 1. Goal

Operators oversee many clients by exception. A single tenant cannot exhaust shared resources. Infrastructure can split later without changing client domains.

```text
platform default limits
→ tenant-owned limits + usage events
→ evaluate remaining / warning / would-deny
→ S0 records only; S1 refuses when enforce
→ portfolio exceptions (usage + Vector 24 clocks)
```

Governing principle:

> Same engine, same limit families, original client experience. Operate by exception. Do not measure Vector 24 from contract signing.

---

## 2. Exit, must-take, and additive

Phase exits in [`docs/21`](../21_ROADMAP_ACCEPTANCE_GATES.md) and [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md) still govern.

**Exit (unchanged):** operators oversee many clients by exception, including Vector 24 clocks, and a single tenant cannot exhaust shared resources. Multiple clients launch from the same engine without appearing to share one templated website.

**Must take now:** per-client API, workflow, AI, email, upload, and analytics limits; portfolio launch clocks.

**Later on this calendar, not the exit:**

- Creative QuickStart and automated asset gap analysis (`docs/29`);
- Outcomes entitlements and client-success health (`docs/30`);
- Cost per qualified lead dashboards;
- Dedicated delivery / DB as premium;
- Load tests before claiming 20 ordinary clients.

---

## 3. In scope

- Per-client API, workflow, AI, email, upload, and analytics limits
- Usage events and evaluate-then-enforce quota gate
- Portfolio launch dashboard (status, SLA clock, blocker, class, readiness)
- Scaling alerts from infrastructure snapshots
- Usage and cost dashboards; cost per qualified lead where observed data exists

---

## 4. Out of scope

- Kubernetes without a measured requirement and ADR
- One database per client as the default
- Scaling from tenant count alone
- Promising Vector 24 from contract signing or to Class D clients
- Inventing revenue, margin, or cost per lead

---

## 5. New packages and tables

No new package. Policy math lives in `packages/contracts`. Persistence is `packages/db`. Orchestration is `packages/domain`.

- S0: `tenant_usage_limits`, `tenant_usage_events` (tenant-owned)
- S2: `infrastructure_usage_snapshots`

Capabilities are `scale.read` and `scale.manage`. Authorize by capability.

Platform defaults live in code. Every client gets the same six families. Window per family is fixed.

---

## 6. Vector 24 hook

KPI is `vector_ready_at → live_at` excluding documented client-caused pauses. Track median ready-to-live, percent under 24h and 12h among promised classes. Class D is unpromised. Commercial wording stays qualified.

---

## 7. Implementation order

| Slice  | Work                                                                                          | Gate  |
| ------ | --------------------------------------------------------------------------------------------- | ----- |
| **S0** | Usage limit defaults, evaluate-only quota gate, tenant usage events, Control `/portfolio`     | In    |
| **S1** | Enforce hard deny for exceeded limits on API, AI, email, upload, and analytics write paths    | Later |
| **S2** | Infrastructure usage snapshots and scaling alerts (queue delay, origin p95, one-tenant share) | Later |
| **S3** | Client templates and operational queues on the portfolio surface                              | Later |
| **S4** | Cost dashboard from existing ledgers; cost per qualified lead only when observed              | Later |

Phase 9 may exit after **S1** plus the S0 portfolio clocks. S2–S4 and Creative / Outcomes attachments do not reopen that exit. S0 does not refuse callers. S1 refuses when the tenant limit mode is `enforce`.

---

## 8. S0 rules

- Tenant-owned `tenant_usage_limits` and `tenant_usage_events` require `client_id` and explicit `TenantContext`. Unique `(client_id, resource_family)` and `(client_id, request_id, resource_family)`.
- Every client gets the same six families: `api`, `workflow`, `ai`, `email`, `upload`, `analytics`. Windows are fixed (`minute` or `hour`). Operators cannot change the window.
- S0 mode is always `evaluate_only`. `wouldDeny` is recorded. Trusted software does not throw `RateLimitError` or refuse the caller.
- Operators with `scale.manage` may override `hard_limit` with a written reason. Enforce mode cannot be set in S0. Confidence cannot authorize a higher limit.
- Portfolio lists only clients the actor can access. Alpha-scoped actors cannot see Beta launch clocks, limits, or events. Route client id cannot leak the other tenant. Missing TenantContext fails closed.
- Vector 24 elapsed time is `vector_ready_at` → `live_at` or now, minus `paused_seconds` and the current pause. Class D is not a miss. KPI copy is observed, not a commercial promise.
- Control `/portfolio` uses `docs/28` operational density. It shows exceptions first. It does not paint Delivery or invent owners, revenue, or a 20-client capacity claim.
- S0 does not add infrastructure snapshots, dedicated databases, Kubernetes, Creative QuickStart, or load tests.

---

## 9. S1 rules

- Trusted software refuses a consume when the tenant row is `enforce` and `wouldDeny` is true. Evaluate-only rows still record and return.
- Kill switch and consent rules still apply on the underlying action. A quota deny is not a license to skip suppression.
- Alpha cannot consume against Beta limits. Missing TenantContext fails closed.

---

## 10. S2 rules

- `infrastructure_usage_snapshots` are platform operational measurements, not tenant content. One-tenant imbalance still names a `client_id` when the share is attributable and must not leak another tenant's payload.
- Alerts are exception rows, not a second monitoring product.

---

## 11. S3–S4 rules

- Templates and queues must be the same shape for every client.
- Cost per qualified lead uses observed tenant cost and observed qualified leads only. Unknown stays unlabeled.

---

## 12. Do not start until

Multiple clients can launch without a code fork, and Phase 1 readiness / launch states exist.

## Locked attachments

Portfolio-by-exception is the exit. Additive: Creative QuickStart, Outcomes entitlements, client-success health, operator exception queues (`docs/29`, `docs/30`). No `docs/31`. See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).
