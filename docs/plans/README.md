# Vector Execution Plans

These files turn the roadmap into Cursor-ready slices. Charters in `/docs` still govern. Where a plan and a charter disagree on _what_ to build, the charter wins. Where they disagree on _how_ to sequence Phase 0, this folder wins until an ADR says otherwise.

**Development agent:** Cursor Grok Bot writes and maintains this repository. Cursor Automations are optional engineering chores. They are not the production marketing runtime.

**Production intelligence:** xAI Grok API behind `AIProvider` starts in Phase 4. Trigger.dev owns durable client jobs from Phase 3 onward.

Do not implement the entire roadmap in one change. Do not start a later phase until the prior exit gate is met.

Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, and Phase 5 exits are met (Phase 5 via ADR-0010). Phase 6 S0–S8 are in. Phase 6 may exit after S1–S4 plus Control backlog. S8 cadence/budgets/portfolio queues are additive and do not reopen that exit. See [06_PHASE_6_SEO_AEO.md](06_PHASE_6_SEO_AEO.md). Charters stop at [../30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md](../30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md). Cross-cutting Creative (C0–C9) and Outcomes (O1–O20) mapping is locked in [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md). Public frontend: [../27](../27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md). Control identity: [../28](../28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md). Creative machinery: [../29](../29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md). Client outcomes: [../30](../30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md). Phase 5 takes Creative C0 only so Social does not own blobs. Each later phase applies the Frontend Release Gate only to the public surface it ships.

| Plan                                                             | Phase                | Depth   |
| ---------------------------------------------------------------- | -------------------- | ------- |
| [00_PHASE_0_FOUNDATION.md](00_PHASE_0_FOUNDATION.md)             | Foundation           | Deep    |
| [01_PHASE_1_KNOWLEDGE_FUNNEL.md](01_PHASE_1_KNOWLEDGE_FUNNEL.md) | Knowledge and funnel | Outline |
| [02_PHASE_2_LEADS_ANALYTICS.md](02_PHASE_2_LEADS_ANALYTICS.md)   | Leads and analytics  | Outline |
| [03_PHASE_3_EMAIL_NURTURE.md](03_PHASE_3_EMAIL_NURTURE.md)       | Email and nurture    | Outline |
| [04_PHASE_4_INTELLIGENCE.md](04_PHASE_4_INTELLIGENCE.md)         | Vector Intelligence  | Outline |
| [05_PHASE_5_SOCIAL.md](05_PHASE_5_SOCIAL.md)                     | Social               | Outline |
| [06_PHASE_6_SEO_AEO.md](06_PHASE_6_SEO_AEO.md)                   | SEO, AEO, and GEO    | Spec    |
| [07_PHASE_7_CRO.md](07_PHASE_7_CRO.md)                           | CRO experiments      | Outline |
| [08_PHASE_8_AUTONOMY.md](08_PHASE_8_AUTONOMY.md)                 | Progressive autonomy | Outline |
| [09_PHASE_9_SCALE.md](09_PHASE_9_SCALE.md)                       | Multi-client scale   | Outline |
| [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md)               | C0–C9 + O1–O20 lock  | Locked  |

Gates also live in [../21_ROADMAP_ACCEPTANCE_GATES.md](../21_ROADMAP_ACCEPTANCE_GATES.md). Vector 24 is a mature-state target after the first supervised clients, not a Phase 0–2 promise. Do not add `docs/31` or a Phase 10 plan unless an ADR says the lock is wrong.
