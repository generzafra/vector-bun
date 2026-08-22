# Vector

Autonomous Growth Operating System for Maximum Global Exposure.

Start with:

1. `VECTOR_MASTER_IMPLEMENTATION_PLAN.md`
2. `AGENTS.md`
3. P0 documents in `/docs`
4. `docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md` for MGE/Vector split, shared hosting, scaling, and Vector 24
5. `docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md` for public frontend, UX, and conversion quality
6. `docs/28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md` for Control / Vector product identity
7. Phase 0 in `docs/21_ROADMAP_ACCEPTANCE_GATES.md`
8. Execution plans in `docs/plans/` — start with `docs/plans/00_PHASE_0_FOUNDATION.md`

The `/docs` files are initial charters. Expand them as implementation decisions become concrete, but preserve their governing principles unless an ADR explicitly supersedes a decision.

The `.cursor/rules` files give Cursor persistent high priority project constraints.

## Phase 0 local run

Copy `.env.example` to `.env`. Ports avoid the MGE stack: Control `5183`, Delivery `5184`, API `3011`, Postgres `5436`, Redis `6382`.

```bash
bun install
bun run dev:db
bun run db:migrate
bun run db:seed
bun test
bun run dev:control
```

Seed accounts (see `.env.example`):

- `admin@vector.test` — org-wide MGE Super Admin
- `usera@vector.test` — Client Admin on Alpha only

Control signs in at `http://localhost:5183/login`. After seed, preview funnels are on `http://preview-alpha.localhost:5184` and `http://preview-beta.localhost:5184` (`bun run dev:delivery`). Unknown hosts fail closed as 404. Launch readiness and production domain activation live at `/launch`; Vector 24 is not measured yet. Brand assets upload on `/knowledge` and default to `.data/storage` until R2 env vars are set. Phase 1 public pages meet the `docs/27` MVP Frontend Release Gate (tokens, nav/forms, hero/proof/CTA, mobile, metadata). Control uses `docs/28` identity tokens; official PNG brand assets may replace the interim SVG mark later.

Optional Trigger.dev: set `TRIGGER_SECRET_KEY` and `TRIGGER_PROJECT_REF`, then `bun run dev:jobs`. Tests stay in-process.

Optional xAI Grok: set `XAI_API_KEY`. Tests and local default stay on the memory AI adapter. Control `/intelligence` drafts recommendations only; approval does not execute.

Format with `bun run format`. Check with `bun run format:check`.
