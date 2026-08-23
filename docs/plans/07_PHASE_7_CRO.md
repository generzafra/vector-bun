# Phase 7 — CRO Experiments

**Status:** Implementation specification  
**Phase:** 7  
**Prerequisite:** Phase 6 exit met, or Phase 2+ analytics plus Phase 1 variants if an ADR allows a thinner path. Do not start without event taxonomy and immutable page versions.

---

## 1. Goal

Run one governed experiment from hypothesis through a recorded learning object. Promote a winner only under policy — never because a percentage looks better on a tiny sample.

```text
problem + evidence → hypothesis → published page-version variants
→ assignment / exposure → predetermined metrics + guardrails
→ decision record → durable learning object
```

Governing principle:

> Policy decides. A higher conversion rate on a small sample is not a win.

---

## 2. Exit, must-take, and additive

Phase exits in [`docs/21`](../21_ROADMAP_ACCEPTANCE_GATES.md) and [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md) still govern.

**Exit (unchanged):** one full experiment completes with a durable learning object. Frontend variants can be created, reviewed, measured, and promoted without lowering the `docs/27` quality bar.

**Must take now:** `docs/27` variants on immutable published page versions. Proposal fields, tenant isolation, metric lock after propose, and no early-stop promotion.

**Later on this calendar, not the exit:**

- Creative variants (`docs/29` C8);
- qualified-lead or revenue primary metrics (`docs/30`) only when sample size and data health support them;
- PostHog flag assignment as an adapter, not the source of truth.

---

## 3. In scope

- Experiment proposal fields: problem, evidence, hypothesis, audience, primary metric, guardrails, min duration, sample, decision rule, rollback
- PostHog flags / experiments for assignment (S2+)
- Variant lifecycle on immutable page versions; variants still pass `docs/27` quality, not generic AI restyles or Vector Control identity copied onto tenants
- Guardrails: no early stop, no metric swap after launch, bot and source imbalance checks
- Learning objects from validated outcomes only
- Creative variants (`docs/29` C8) may be experiment inputs when that track exists. One client's winning style is not a universal rule.

---

## 4. Out of scope

- Automatic production rewrite without approval (unless Phase 8 policy later allows)
- Concurrent conflicting experiments on the same primary metric without rules
- Using unvalidated AI taste as the decision
- Revenue or qualified-lead as the primary metric while coverage is weak
- Caching experiment-sensitive Delivery responses without an explicit cache key

---

## 5. New packages and tables

- `packages/experiments`
- S0: `experiments`, `experiment_hypotheses`, `experiment_variants`
- Later: `experiment_decisions`

Capabilities: `experiments.read`, `experiments.manage`. Authorize by capability.

Primary metrics in S0 are taxonomy conversion events only: `cta_clicked`, `form_started`, `form_submitted`, `lead_created`. `page_viewed` may be a guardrail. Qualified-lead and revenue stay deferred.

---

## 6. Vector 24 hook

First launch ships one control variant. Experiments start after live. Do not block Vector 24 on having an A/B test running.

---

## 7. Implementation order

| Slice  | Work                                                                                             | Gate     |
| ------ | ------------------------------------------------------------------------------------------------ | -------- |
| **S0** | `packages/experiments`, proposal schema, published page-version variants, Control `/experiments` | In       |
| **S1** | Approve / pause; lock fields after propose; conflict on same page + primary metric               | In       |
| **S2** | Sticky assignment (`experiment_assignments`); Delivery exposure; PostHog adapter optional        | In       |
| **S3** | Predetermined metrics, bot / source-imbalance checks, no early stop                              | In       |
| **S4** | Decision record + durable learning object; promote only under policy                             | Exit     |
| **S5** | Creative C8 / outcome metrics when coverage exists                                               | Additive |

Phase 7 may exit after **S4**. S5 does not reopen that exit.

---

## 8. S0 rules

- Every experiment row requires `client_id` and explicit `TenantContext`.
- Variants bind only to **published** page versions of the **same tenant page**. Draft versions are not variants.
- Control and challenger must be different versions.
- A second open experiment on the same page and primary metric is rejected.
- Primary metric cannot be `qualified_lead` or `revenue` in S0.
- Creating a complete proposal stores status `proposed`. Assignment, exposure, and winner promotion are not S0.
- Preview traffic stays `is_test` and is not a production experiment result.
- One client's winning variant is evidence for that tenant, not a global visual rule.

---

## 9. Do not start until

Phase 2 events and Phase 1 immutable page versions exist.

## Locked attachments

One experiment + learning object is the exit. Variants still pass `docs/27`. Creative C8 and Outcomes offer/revenue metrics are additive and require coverage. See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).

## 10. S1 rules

- Approve moves `proposed` → `approved`. It does not set `launchedAt` or start assignment.
- Pause moves `approved` or `running` → `paused`. Resume is `approved` when never launched, or `running` when `launchedAt` is set.
- Paused experiments still occupy the page and primary metric.
- Definition fields stay locked after `proposed`. Approve and pause cannot change metric, variants, guardrails, or sample rules.
- Transitions require `experiments.manage` and explicit `TenantContext`. Alpha cannot approve or pause a Beta experiment.

## 11. S2 rules

- Start moves `approved` → `running` and stamps `launchedAt`. Approve still does not start assignment.
- Only one experiment may run on a page at a time.
- Postgres `experiment_assignments` is the sticky source of truth keyed by `client_id`, experiment, and visitor anonymous id.
- Delivery serves the assigned published page version. Pause returns the current published pointer and stops new exposure.
- Preview assignments are `is_test` and are not production results.
- Experiment-sensitive Delivery HTML is `private, no-store`. PostHog may receive `experiment_id` / `variant_key` on `track` when not test traffic. Flags are not the source of truth.

## 12. S3 rules

- Predetermined metrics are stored on `experiment_metrics` at propose time and cannot be swapped for measurement.
- Production measurement excludes preview/`is_test` traffic and likely-bot user agents.
- Source mix that exceeds 70% on one variant for a source with at least 10 eligible visitors fails the source-imbalance guardrail.
- Bot share above 20% of production assignments fails the bot-contamination guardrail.
- Horizon and per-variant sample must both be met. A higher primary count on a small sample is not a win.
- `decisionReady` stays false until those checks pass. Early stop is blocked. Decision records and learning objects stay S4.

**Status (23 August 2026):** S0–S3 are in. Operators can start an approved experiment. Delivery assigns a sticky published-page variant per visitor. Preview stays test traffic. Measurement uses predetermined metrics and blocks early stop when horizon, sample, bots, or source mix fail. Decisions and learning objects stay later.
