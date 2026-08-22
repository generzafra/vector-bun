# Cursor Agent Instructions

## Read before coding

`AGENTS.md`, all P0 documents, and `docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md` whenever the work touches onboarding, domains, hosting, delivery, launch, or scaling.

## Work method

Implement one bounded vertical slice at a time.

Before changes:

1. State goal and affected modules.
2. Identify architecture or security implications.
3. State tests to add.
4. If the work is onboarding, deployment, domain management, analytics, or automation, answer: does this architecture support repeatable client launch without custom engineering?

After changes:

1. Run relevant tests.
2. Update docs.
3. Record material architectural decisions.
4. Do not claim completion if tests are skipped.
5. If a repeated manual launch step was discovered, record it, classify it, automate it if safe, add a test, add it to the launch checklist, and update Vector 24 metrics.

## Constraints

Bun, TypeScript, Svelte 5, SvelteKit, Hono, PostgreSQL, Drizzle.
No premature microservices.
No unrestricted AI tools.
No tenant unscoped repositories.
No client secrets in code or frontend.
No provider specific concepts leaking into core domain without an adapter.
No per-client application fork or deployment for a normal client.
No 24-hour launch promise from contract signing.
No architecture that cannot leave a single physical server later.
