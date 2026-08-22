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

Phase 2 conversion reporting reads Postgres event counts. PostHog is an optional production fan-out and must skip preview/test events and form fields. Control `/analytics` is tables, not charts.

Frontend CRO variants must support assignment, variant identification, exposure tracking, conversion measurement, rollback, and immutable result recording. One client's winning design is evidence, not a global visual rule. Variant quality still follows `docs/27`. Creative variants (`docs/29`) are first-class experiment inputs when that track reaches C8. Learnings stay per tenant and are not auto-promoted into a universal style.

Experiment success should progress from CTA click → qualified-lead rate → revenue per eligible visitor when sample size and data health allow (`docs/30`). Do not use downstream revenue as the primary metric when coverage is weak.
