# Vector Execution Plans

These files turn the roadmap into Cursor-ready slices. Charters in `/docs` still govern. Where a plan and a charter disagree on _what_ to build, the charter wins. Where they disagree on _how_ to sequence Phase 0, this folder wins until an ADR says otherwise.

**Development agent:** Cursor Grok Bot writes and maintains this repository. Cursor Automations are optional engineering chores. They are not the production marketing runtime.

**Production intelligence:** xAI Grok API behind `AIProvider` starts in Phase 4. Trigger.dev owns durable client jobs from Phase 3 onward.

Do not implement the entire roadmap in one change. Do not start a later phase until the prior exit gate is met.

Phase 0 and Phase 1 exits are met. Next implementation slice is [02_PHASE_2_LEADS_ANALYTICS.md](02_PHASE_2_LEADS_ANALYTICS.md). Public frontend and funnel work remains governed by [../27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md](../27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md). Each later phase applies the Frontend Release Gate only to the public surface it ships.

| Plan                                                             | Phase                | Depth   |
| ---------------------------------------------------------------- | -------------------- | ------- |
| [00_PHASE_0_FOUNDATION.md](00_PHASE_0_FOUNDATION.md)             | Foundation           | Deep    |
| [01_PHASE_1_KNOWLEDGE_FUNNEL.md](01_PHASE_1_KNOWLEDGE_FUNNEL.md) | Knowledge and funnel | Outline |
| [02_PHASE_2_LEADS_ANALYTICS.md](02_PHASE_2_LEADS_ANALYTICS.md)   | Leads and analytics  | Outline |
| [03_PHASE_3_EMAIL_NURTURE.md](03_PHASE_3_EMAIL_NURTURE.md)       | Email and nurture    | Outline |
| [04_PHASE_4_INTELLIGENCE.md](04_PHASE_4_INTELLIGENCE.md)         | Vector Intelligence  | Outline |
| [05_PHASE_5_SOCIAL.md](05_PHASE_5_SOCIAL.md)                     | Social               | Outline |
| [06_PHASE_6_SEO_AEO.md](06_PHASE_6_SEO_AEO.md)                   | SEO and AEO          | Outline |
| [07_PHASE_7_CRO.md](07_PHASE_7_CRO.md)                           | CRO experiments      | Outline |
| [08_PHASE_8_AUTONOMY.md](08_PHASE_8_AUTONOMY.md)                 | Progressive autonomy | Outline |
| [09_PHASE_9_SCALE.md](09_PHASE_9_SCALE.md)                       | Multi-client scale   | Outline |

Gates also live in [../21_ROADMAP_ACCEPTANCE_GATES.md](../21_ROADMAP_ACCEPTANCE_GATES.md). Vector 24 is a mature-state target after the first supervised clients, not a Phase 0–2 promise.
