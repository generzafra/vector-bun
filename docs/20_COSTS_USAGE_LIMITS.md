# Costs and Usage Limits

## Goal

Make client profitability measurable.

## Attribute

AI tokens and tool calls, email volume, object storage, workflow runtime, paid provider charges, optional advertising spend. Image generation, image edit, video generation, transformation, creative storage, and bandwidth are attributable to a client and campaign (`docs/29`). Use per-client and per-campaign generation budgets.

## Controls

Monthly allowance, soft warning, hard policy threshold, operator override, per workflow cost ceiling.

## Noisy-neighbor limits

A single client must not be able to exhaust shared resources. Enforce per-client API rate limits, workflow concurrency, AI budgets, email quotas, provider rate controls, upload limits, and analytics abuse detection.

Phase 9 S0–S1 persist those six families on `tenant_usage_limits` and record `tenant_usage_events`. Default mode is `enforce`: over-limit API, AI, email, upload, and analytics consumes are stored as `would_deny` and the caller is refused. Evaluate-only rows still record and return. Operators may override a hard limit and mode with a written reason. Windows are fixed per family.

GEO monitoring needs explicit caps: query count, measurement frequency, engine/locale limits, and monthly budget. S8 persists those caps on `search_cadence_settings` and refuses paid measurement that would exceed the month. Do not allow uncontrolled recurring generative-engine testing. Attribute GEO provider and analysis cost to the client in integer minor units plus currency.

## AI model routing

Use lower cost models for classification and extraction; reserve advanced models for high value reasoning.

## Reporting

Expose internal cost per client, cost per qualified lead where possible, and margin by service package. Connect service cost to attributed client revenue and contribution margin (`docs/30`). Do not expose MGE internal margins to clients unless intentionally designed.
