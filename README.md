# Vector Documentation Starter Pack

Start with:

1. `VECTOR_MASTER_IMPLEMENTATION_PLAN.md`
2. `AGENTS.md`
3. P0 documents in `/docs`
4. `docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md` for MGE/Vector split, shared hosting, scaling, and Vector 24
5. Phase 0 in `docs/21_ROADMAP_ACCEPTANCE_GATES.md`
6. Execution plans in `docs/plans/` — start with `docs/plans/00_PHASE_0_FOUNDATION.md`

The `/docs` files are initial charters. Expand them as implementation decisions become concrete, but preserve their governing principles unless an ADR explicitly supersedes a decision.

The `.cursor/rules` files give Cursor persistent high priority project constraints.

Format with `bun run format`. Check with `bun run format:check`.

Recommended first implementation instruction: use the "First Cursor Kickoff Prompt" in the master plan and execute only [docs/plans/00_PHASE_0_FOUNDATION.md](docs/plans/00_PHASE_0_FOUNDATION.md).
