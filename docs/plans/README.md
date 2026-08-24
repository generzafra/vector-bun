# Vector Execution Plans

These files turn the roadmap into Cursor-ready slices. Charters in `/docs` still govern. Where a plan and a charter disagree on _what_ to build, the charter wins. Where they disagree on _how_ to sequence Phase 0, this folder wins until an ADR says otherwise.

**Development agent:** Cursor Grok Bot writes and maintains this repository. Cursor Automations are optional engineering chores. They are not the production marketing runtime.

**Production intelligence:** xAI Grok API behind `AIProvider` starts in Phase 4. Trigger.dev owns durable client jobs from Phase 3 onward.

Do not implement the entire roadmap in one change. Do not start a later phase until the prior exit gate is met.

Phase 0, Phase 1, Phase 2, Phase 3, Phase 4, and Phase 5 exits are met (Phase 5 via ADR-0010). Phase 6 S0–S8 are in. Phase 6 may exit after S1–S4 plus Control backlog. S8 cadence/budgets/portfolio queues are additive and do not reopen that exit. See [06_PHASE_6_SEO_AEO.md](06_PHASE_6_SEO_AEO.md). Phase 7 S0–S4 are in and the Phase 7 exit is met. See [07_PHASE_7_CRO.md](07_PHASE_7_CRO.md). Phase 8 S0–S4 are in. See [08_PHASE_8_AUTONOMY.md](08_PHASE_8_AUTONOMY.md). Phase 9 S0–S1 are in. See [09_PHASE_9_SCALE.md](09_PHASE_9_SCALE.md). Remaining unimplemented work is sequenced in [SHIP_REMAINING.md](SHIP_REMAINING.md) (ADR-0013). Charters stop at [../30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md](../30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md). Cross-cutting Creative (C0–C9), Outcomes (O1–O20), First Reveal (FR0–FR9), and Client Value (V0–V5) mapping is locked in [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md). Public frontend: [../27](../27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md). Control identity: [../28](../28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md). Creative machinery: [../29](../29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md). Client outcomes: [../30](../30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md). First Reveal spec: [FIRST_REVEAL_TRACK.md](FIRST_REVEAL_TRACK.md). Client Value spec: [CLIENT_VALUE_TRACK.md](CLIENT_VALUE_TRACK.md). Creative remaining slices: [CREATIVE_TRACK.md](CREATIVE_TRACK.md). Outcomes remaining slices and client operating UX: [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md). Phase 5 takes Creative C0 only so Social does not own blobs. Each later phase applies the Frontend Release Gate only to the public surface it ships.

| Plan                                                             | Phase / track                         | Depth   |
| ---------------------------------------------------------------- | ------------------------------------- | ------- |
| [00_PHASE_0_FOUNDATION.md](00_PHASE_0_FOUNDATION.md)             | Foundation                            | Deep    |
| [01_PHASE_1_KNOWLEDGE_FUNNEL.md](01_PHASE_1_KNOWLEDGE_FUNNEL.md) | Knowledge and funnel                  | Outline |
| [02_PHASE_2_LEADS_ANALYTICS.md](02_PHASE_2_LEADS_ANALYTICS.md)   | Leads and analytics                   | Outline |
| [03_PHASE_3_EMAIL_NURTURE.md](03_PHASE_3_EMAIL_NURTURE.md)       | Email and nurture                     | Outline |
| [04_PHASE_4_INTELLIGENCE.md](04_PHASE_4_INTELLIGENCE.md)         | Vector Intelligence                   | Outline |
| [05_PHASE_5_SOCIAL.md](05_PHASE_5_SOCIAL.md)                     | Social                                | Outline |
| [06_PHASE_6_SEO_AEO.md](06_PHASE_6_SEO_AEO.md)                   | SEO, AEO, and GEO                     | Spec    |
| [07_PHASE_7_CRO.md](07_PHASE_7_CRO.md)                           | CRO experiments                       | Outline |
| [08_PHASE_8_AUTONOMY.md](08_PHASE_8_AUTONOMY.md)                 | Progressive autonomy                  | Spec    |
| [09_PHASE_9_SCALE.md](09_PHASE_9_SCALE.md)                       | Multi-client scale                    | Spec    |
| [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md)               | C0–C9 + O1–O20 + FR0–FR9 + V0–V5 lock | Locked  |
| [SHIP_REMAINING.md](SHIP_REMAINING.md)                           | Remaining work waves A–E              | Index   |
| [OUTCOMES_TRACK.md](OUTCOMES_TRACK.md)                           | Client UX CU0–CU1 + Outcomes O3–O20   | Spec    |
| [CREATIVE_TRACK.md](CREATIVE_TRACK.md)                           | Creative C1–C9                        | Spec    |
| [FIRST_REVEAL_TRACK.md](FIRST_REVEAL_TRACK.md)                   | First Reveal FR0–FR9                  | Spec    |
| [CLIENT_VALUE_TRACK.md](CLIENT_VALUE_TRACK.md)                   | Client Value V0–V5                    | Spec    |
| [PLATFORM_OPS_TRACK.md](PLATFORM_OPS_TRACK.md)                   | Phase 9 S2–S4 + SRE / DR / retention  | Spec    |
| [SURFACE_COMPLETENESS_TRACK.md](SURFACE_COMPLETENESS_TRACK.md)   | Extra Delivery / Control / networks   | Outline |

Gates also live in [../21_ROADMAP_ACCEPTANCE_GATES.md](../21_ROADMAP_ACCEPTANCE_GATES.md). Vector 24 is a mature-state target after the first supervised clients, not a Phase 0–2 promise. Do not add `docs/31` or a Phase 10 plan. First Reveal and Client Value are tracks (ADR-0012), not new phases or numbered charters. Remaining execution lives in this folder (ADR-0013). Start the next slice from [SHIP_REMAINING.md](SHIP_REMAINING.md) Wave B (C1 brand visual profile).
