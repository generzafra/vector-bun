# Phase 7 — CRO Experiments

**Status:** Outline  
**Prerequisite:** Phase 6 exit met, or Phase 2+ analytics plus Phase 1 variants if an ADR allows a thinner path. Do not start without event taxonomy and immutable page versions.

---

## Goal

Run one governed experiment from hypothesis through a recorded learning object. Promote a winner only under policy — never because a percentage looks better on a tiny sample.

## Exit gate

One full experiment completes: hypothesis, variants, exposure, predetermined metrics, decision record, durable learning object.

## In scope

- Experiment proposal fields: problem, evidence, hypothesis, audience, primary metric, guardrails, min duration, sample, decision rule, rollback
- PostHog flags / experiments for assignment
- Variant lifecycle on immutable page versions; variants still pass `docs/27` quality, not generic AI restyles or Vector Control identity copied onto tenants
- Guardrails: no early stop, no metric swap after launch, bot and source imbalance checks
- Learning objects from validated outcomes only
- Creative variants (`docs/29` C8) may be experiment inputs when that track exists. One client's winning style is not a universal rule.

## Out of scope

- Automatic production rewrite without approval (unless Phase 8 policy later allows)
- Concurrent conflicting experiments on the same primary metric without rules
- Using unvalidated AI taste as the decision

## New packages and tables

- `packages/experiments`
- `experiments`, `experiment_hypotheses`, `experiment_variants`, `experiment_assignments`
- `experiment_metrics`, `experiment_results`, `experiment_decisions`

## Vector 24 hook

First launch ships one control variant. Experiments start after live. Do not block Vector 24 on having an A/B test running.

## Do not start until

Phase 2 events and Phase 1 immutable page versions exist.

## Locked attachments

One experiment + learning object is the exit. Variants still pass `docs/27`. Creative C8 and Outcomes offer/revenue metrics are additive and require coverage. See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).
