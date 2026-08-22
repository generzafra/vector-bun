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
