# AGENTS.md — Vector

You are working on **Vector, an Autonomous Growth Operating System**.

## Read first

Before implementation, read:

1. `VECTOR_MASTER_IMPLEMENTATION_PLAN.md`
2. `docs/01_PRODUCT_VISION_AND_POSITIONING.md`
3. `docs/02_SCOPE_AND_MVP.md`
4. `docs/03_TENANCY_AND_DOMAIN_MODEL.md`
5. `docs/04_SYSTEM_ARCHITECTURE.md`
6. `docs/05_DATA_MODEL.md`
7. `docs/07_AI_AGENT_ARCHITECTURE_GOVERNANCE.md`
8. `docs/14_SECURITY_PRIVACY_COMPLIANCE.md`
9. `docs/18_QA_TEST_STRATEGY.md`
10. `docs/21_ROADMAP_ACCEPTANCE_GATES.md`
11. `docs/plans/README.md` and the plan for the current phase. Phase 0 is `docs/plans/00_PHASE_0_FOUNDATION.md`.
12. `docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md` when the work touches onboarding, domains, hosting, delivery, launch, or scaling. Its decisions are folded into `01`, `03`, `04`, `05`, `16`, `17`, `19`, and `21`; where it is more specific, it governs.

## Non negotiable architecture

- TypeScript is the default language.
- Bun is the default runtime.
- Svelte 5 and SvelteKit power control and delivery UIs.
- Hono powers the API.
- PostgreSQL is the durable business source of truth.
- Drizzle owns schema and migrations.
- Redis is transient infrastructure, not the business source of truth.
- Trigger.dev owns durable production workflows.
- External providers sit behind Vector owned adapters.
- Grok is accessed through an `AIProvider` abstraction.
- AI output is never trusted execution input without schema, policy, and domain validation.
- Every tenant owned query requires explicit tenant context.
- Audit important state changes and automated actions.
- One logical Delivery Plane serves many client custom domains. Do not fork an application per client.
- MGE website and Vector application stay separate products. MGE should become a Vector tenant.
- Vector 24 measures Vector Ready to live, not contract signing to live.
- Design so the platform can leave a single physical server without changing client domains.

## Implementation behavior

Do not implement the entire roadmap in one change.

Prefer small vertical slices with tests and updated documentation.

Do not introduce microservices, Kubernetes, Kafka, Elasticsearch, or a new database without an accepted ADR and demonstrated requirement.

Do not give AI agents unrestricted SQL, shell, filesystem, arbitrary HTTP, or secrets.

Do not bypass consent, suppression, approval, or tenant checks.

## Definition of done

A feature is done only when applicable tests pass, authorization and tenant scoping are present, errors are handled, observability is included, and relevant docs are updated.
