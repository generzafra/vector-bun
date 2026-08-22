# Analytics, CRO, and Experiments

## Provider

Use PostHog for behavioral analytics, feature flags, session replay where permitted, and controlled experiments.

## Vector source of truth

Leads, sales outcomes, revenue, client settings, approvals, AI decisions, and durable campaign state remain in PostgreSQL.

## Experiment requirement

Problem, evidence, hypothesis, eligible audience, primary metric, guardrails, minimum duration, sample expectation, decision rule, rollback.

## Invalid optimization protections

No early winner promotion based on tiny samples or broken instrumentation. Do not change success metrics after launch.

## Learning

Completed validated experiments become durable learning objects.

Public conversion elements use the central Vector event taxonomy. Do not invent ad-hoc analytics names inside components.

Frontend CRO variants must support assignment, variant identification, exposure tracking, conversion measurement, rollback, and immutable result recording. One client's winning design is evidence, not a global visual rule. Variant quality still follows `docs/27`.
