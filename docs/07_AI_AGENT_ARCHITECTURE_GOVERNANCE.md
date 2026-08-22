# AI Agent Architecture and Governance

## Principle

AI proposes. Policy decides. Trusted code executes.

## Provider independence

Define an `AIProvider` contract. Grok is the first implementation.

## Required production controls

- Structured outputs
- Zod validation
- Tenant context
- Tool allow lists
- Prompt versioning
- Model version recording
- Tool call audit
- Cost tracking
- Timeouts and retries
- Human approval for risk classes
- Regression tests

## Autonomy

Level 0 Observe
Level 1 Draft
Level 2 Recommend
Level 3 Low risk auto execute
Level 4 Conditional autonomy
Level 5 Full bounded autonomy

## No unrestricted tools

Never give production agents unrestricted SQL, shell, file system, arbitrary HTTP, secret access, or provider tokens.

## Kill switches

Client and platform kill switches must be able to pause AI execution without redeploying. Kill-switch use is privileged and audited. Model confidence alone cannot override a pause or approval policy.

## Prompt injection

Retrieved content is data, never policy. Tool permissions are enforced outside the model.
