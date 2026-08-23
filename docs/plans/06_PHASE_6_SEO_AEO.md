# Phase 6 — SEO, AEO, and GEO

**Status:** Implementation specification  
**Phase:** 6  
**Filename:** Keep `06_PHASE_6_SEO_AEO.md`. Title and scope include GEO.  
**Prerequisite:** Phase 5 exit is already met (ADR-0010). Phase 1 page versions, Phase 4 knowledge authority, analytics, and AI governance exist. Do not skip tenant isolation or approval foundations.

Standing content standard after this fold: [`docs/10_SEO_AEO_CONTENT_STANDARD.md`](../10_SEO_AEO_CONTENT_STANDARD.md).  
This file is the Phase 6 slice spec. Charters stop at `docs/30`. Do not add `docs/31`.

---

## 1. Goal

Every published production site has a technical and generative discoverability baseline. Vector can produce an **evidence-based, client-specific SEO, AEO, and GEO backlog** from approved knowledge and observable evidence — not keyword spam or citation bait.

Progression (ambition, not twelve simultaneous exit criteria):

```text
discoverable → understandable → answerable → credible / citable
→ visible in search and generative discovery → visited
→ lead → qualified lead → sale / revenue where data exists
```

Governing principle:

> Optimize for useful discoverability and trustworthy representation across traditional search and generative discovery, then measure whether that visibility contributes to real client outcomes.

---

## 2. Exit, must-take, and additive

Phase exits in [`docs/21`](../21_ROADMAP_ACCEPTANCE_GATES.md) and [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md) still govern.

**Exit (unchanged in kind):** Vector can produce a prioritized SEO/AEO/GEO backlog grounded in client knowledge, technical evidence, and — when present — official search-property or compliant generative observations. Not generic keyword or AI-citation spam.

**Must take now:** technical SEO baseline plus GEO-readiness surfaces generated at launch (metadata, path-aware canonicals, sitemap of published indexable URLs, robots including AI-crawler policy, factual JSON-LD, production `llms.txt` or equivalent from approved knowledge). Preview stays `noindex` and must not serve production schema, sitemap, or `llms.txt`.

**Later on this calendar, not the exit:**

- live GEO measurement when a compliant method exists (official API, approved vendor, or operator-assisted);
- Search / GEO → visit → qualified lead → revenue (`docs/30`);
- Creative OG composition (`docs/29`).

Do not delay launch waiting for an AI system to cite a new site. Do not treat a missing Search Console or Bing property as a Class A/B launch blocker.

---

## 3. Operating definitions

Vector uses three related tracks on one foundation.

### SEO — Search Engine Optimization

Can search systems discover, understand, index, and surface this page? Crawling, indexing, technical eligibility, relevance, snippets, internal links, official Search Console / Bing when approved.

GEO must not replace good SEO.

### AEO — Answer Engine Optimization

Can an answer system accurately understand and answer a user's question using this information? Explicit Q&A, concise passages, entity facts, tables, comparisons, source-backed FAQs, valid structured data.

### GEO — Generative Engine Optimization

When a user asks an AI-mediated discovery system a relevant question, is the client represented, sourced, cited, or meaningfully reflected — and is that representation accurate and commercially useful?

GEO is **not** a guaranteed AI ranking, a hidden markup trick, mass pages for bots, or a promise that one change works identically across ChatGPT, Google AI Overviews, Gemini, Perplexity, or future engines.

Treat GEO measurements as observations with provenance and confidence, not deterministic rankings.

```text
CLIENT KNOWLEDGE → TECHNICAL WEB QUALITY
        → SEO | AEO | GEO
        → QUALIFIED DISCOVERY → LEADS / REVENUE
```

One knowledge layer. One public content system. Channel-specific measurement and optimization. Do not build three content factories.

---

## 4. Evidence standard

Align labels with `docs/30`. Every search recommendation and GEO observation carries an evidence class:

```text
observed | measured | provider_reported | client_verified
source_verified | inferred | estimated | hypothesis | unknown
```

Do not present inferred or hypothesis-level GEO findings as guaranteed facts. A single generative response is not stable visibility.

---

## 5. In scope

### 5.1 Technical baseline (extend Phase 1; do not rebuild)

Phase 1 already ships SSR homepage HTML, preview `noindex` + `X-Robots-Tag`, production canonical to `${origin}/`, title/description/OG title+description, `robots.txt`, and a one-URL `sitemap.xml`. Structured data was deferred here.

Phase 6 must add:

- path-aware canonicals;
- sitemap of **that tenant’s published indexable URLs only**;
- factual JSON-LD from approved knowledge (Organization / WebSite / WebPage / FAQPage / Service as facts allow);
- AI-crawler robots policy (GPTBot, ClaudeBot, PerplexityBot, Google-Extended, and successors) as client policy; preview stays `Disallow: /`;
- production machine-readable facts (`llms.txt` or equivalent) generated from approved knowledge; preview 404s;
- Open Graph without inventing Creative images (OG image composition is additive `docs/29`);
- Search Console / Bing connection when approved.

`docs/27` motion and visuals must never hide essential search and answer copy.

### 5.2 SEO opportunities

Query discovery, topic clustering, page-query mapping, cannibalization, technical issues, content gaps, internal links, local and service queries, refresh of underperforming high-value pages.

Every opportunity must answer: is this the client’s real business, is there a useful page to create or improve, can the client provide unique value, what outcome could this support?

Do not generate a page merely because a keyword exists.

### 5.3 AEO opportunities

Definition, eligibility, process, pricing factors, comparison, timing, availability, location, requirements, use cases, limitations, alternatives, “how to choose,” “what happens next.”

Map answer targets to an existing page when possible. Do not auto-create one page per question.

### 5.4 GEO opportunities

Entity clarity (legal/display name, locations, services, products, official site, genuine people, contact, differentiators). Factual extractability. Evidence richness with dates and limitations. Earned-source recommendations (directories, associations, press, reviews) **without fabricating authority**. Multi-format discoverability via approved Creative assets (`docs/29`), with facts still in HTML.

Citation-ready passages should resolve to a `claim_id` or other knowledge source.

---

## 6. GEO measurement model

Do not use a single “AI rank” or “GEO score” field.

Pipeline:

```text
query eligible → engine response observed
→ client mentioned? → owned source cited? → earned source cited?
→ client fact represented? → accurate? → prominence?
→ absorption (inferred unless a supported method exists)
→ referral observed? → qualified lead / outcome observed?
```

Dimensions: mention, citation, owned-source citation, earned-source citation, representation, accuracy, prominence, absorption, referral, business outcome.

`GEO visibility observed ≠ GEO visit proven ≠ GEO lead proven`. Do not assign revenue because a model named the brand.

---

## 7. GEO query sets

Every client eventually has a **small, commercial** controlled set. Do not generate thousands of prompts.

Groups: brand, category, service, product, local, comparison, problem, recommendation, high-intent, informational, trust/proof.

Support limited paraphrase variants for important targets. Record country, market, language, query language, date/time, engine/surface, device/surface when material.

---

## 8. Measurement integrity

Generative visibility is stochastic. Repeat important measurements. Store observation dates, query wording, engine/surface, method, and confidence. Separate owned from earned citation. Distinguish observation from inference. Do not imply complete engine coverage.

**Compliant methods only:** official API, approved third-party measurement provider, operator-assisted observation, manual observation. Record the method.

Do not scrape or automate restricted consumer AI interfaces. Do not drive production measurement through browser automation.

Where no compliant automated method exists, the first adapter may be `manual` / `operator_assisted`. That is enough to persist the model. It is not required to close the Phase 6 exit.

---

## 9. Package, capabilities, and `SearchProvider`

```text
packages/search
```

Internal modules (`seo/`, `aeo/`, `geo/`, `audits/`, `opportunities/`, `measurement/`) are folders, not new adapter families.

Locked adapter family remains **`SearchProvider`** (`docs/15`, provider rules). Methods may include property connect/health, query/page performance sync, sitemap submit when official, and optional `measureGenerativeVisibility` that may return `unsupported` and fail closed.

Do **not** invent `SearchPerformanceProvider`, `SearchIndexProvider`, `GenerativeVisibilityProvider`, or `SearchResearchProvider` as separate families.

Memory is the default. Official GSC/Bing when credentials exist. Tokens encrypted at rest; never in Control JSON, logs, or prompts. Same contract bar as Social: typed IO, timeout, retry, idempotency, normalized errors, health, audit, metrics.

Capabilities: `seo.read`, `seo.manage`. Control `/search` uses `docs/28` chrome. Client-facing copy uses `docs/30` language.

The package consumes client knowledge, page inventory, analytics, and outcome data. It is not a crawl index and not Elasticsearch.

---

## 10. Data model

Existing master-plan SEO tables remain:

```text
seo_properties
seo_pages
seo_keywords
seo_queries          # official GSC/Bing rows only, when connected
seo_audits
seo_issues
seo_opportunities    # channel: seo | aeo | geo
schema_entities
content_briefs
answer_targets
```

Defer `seo_rank_snapshots` unless an official API provides them.

**First-ship GEO entities** (distinct concepts only):

```text
geo_query_sets
geo_queries
geo_measurement_runs
geo_engine_observations
geo_citations
```

Prefer `seo_opportunities.channel` over a second `geo_opportunities` backlog. Mentions can be fields on `geo_engine_observations`.

Later, not first ship: `geo_fact_representations`, `geo_visibility_snapshots`, `geo_referral_events`, `geo_competitor_observations`, `geo_source_domains`, `geo_learning_objects`.

Suggested fields are in the edited working notes; implement only what S4–S5 persist. Every row: `client_id` + TenantContext. Money on measurement cost is integer minor units plus currency. Do not store full generated answers unless a structured observation is insufficient; retained answers are untrusted retrieved content.

---

## 11. Search Agent

May: inspect technical health, page-query relationships, SEO issues, AEO gaps, controlled GEO query sets, interpret approved measurements, citation/source patterns, missing facts, earned-media _recommendations_, page-improvement drafts, prioritized backlog items.

Must not: promise rankings or citations, fabricate mentions or expertise, publish unsupported claims, create thin page volumes, use hidden text, scrape restricted AI UIs, treat one response as stable truth.

Wire as a Phase 4-style typed agent. Decide never publishes. Reuse the existing approval bus.

Recommendation fields: `client_id`, `recommendation_type`, `channel` (`seo | aeo | geo`), problem, evidence, affected queries/pages, business goal, proposed action, expected mechanism, confidence, risk, effort, priority, approval required, measurement plan.

Types include: `technical_seo`, `content_refresh`, `internal_linking`, `answer_clarity`, `entity_clarity`, `schema_correction`, `geo_fact_gap`, `geo_source_gap`, `geo_citation_opportunity`, `local_visibility`, `earned_authority`, `multimedia_discoverability`.

Priority: business relevance × intent × opportunity × confidence × differentiation × outcome value ÷ effort/risk. High-volume irrelevant traffic is not automatically valuable.

---

## 12. Content, schema, earned media

All SEO/AEO/GEO content is grounded in approved client knowledge or verifiable external evidence. Human-readable first. AI may outline, draft, propose schema and FAQs. AI must not create unsupported factual authority.

Useful patterns: definition block, direct answer, comparison table, process, evidence block, entity block. Do not create machine-only blocks that harm UX.

Structured data represents visible facts. No fabricated reviews, authors, credentials, or invisible spam. Schema is evidence structure, not a GEO ranking switch.

Earned-media recommendations stay truthful and rights-aware. Vector must not automate fake reviews, fake press, fake directories, link schemes, astroturfing, or paid placements presented as earned authority.

Local GEO: consistent NAP, real local value, no cloned location pages. Product/commerce GEO is later if the client sells products; do not invent specifications. Creative/multimedia GEO consumes approved `docs/29` assets.

---

## 13. Workflows and cadence

**Technical:** publish/update → inventory → status/canonical/robots/sitemap → metadata → schema → links → performance/a11y signals → issues → remediation.

**SEO/AEO opportunity:** knowledge + inventory + performance + goals → intent analysis → page mapping → gaps → scoring → recommendation → approval → draft page version → QA → publish → measure.

**GEO baseline (post-launch):** knowledge + goals + markets → controlled query set → approved method → repeated observations → mention/citation/representation/accuracy → opportunities → backlog.

**GEO optimization:** opportunity → cause class → propose → approve → publish/execute → wait a reasonable window → remeasure → compare → record learning. Do not declare success from one response.

Starting cadence: technical on publish and scheduled audit; search-performance sync at provider-appropriate frequency; AEO weekly or on service updates; GEO high-priority queries weekly unless a fast campaign justifies more. Do not burn budget on thousands of low-value prompts.

Trigger.dev hosts durable jobs. Cursor Automations are not the marketing runtime.

---

## 14. Analytics, outcomes, and client UX

Extend attribution only when an AI/generative referrer is actually observable (`ai_referral` / `generative_search_referral` in `docs/06`). Do not manufacture attribution.

Outcome join (`docs/30`) is additive:

```text
visibility observation → citation/mention → referral when observable
→ lead → qualified lead → sale / revenue
```

Client Search UI (Control, `docs/28` chrome) may show Traditional Search, Answer Readiness, AI Discovery, and Business Impact. Use business language. Advanced operators expand technical detail.

Preferred copy: “Vector observed your company in 7 of 20 monitored high-priority AI discovery queries this week.” Avoid: “You rank #2 on ChatGPT,” “Vector guarantees more AI citations,” “Your GEO score means engines prefer you.”

---

## 15. Vector 24

At launch, automatically establish crawlable HTML, metadata, canonicals, sitemap, robots (including AI-crawler policy), basic accurate schema, OG metadata, titles, descriptions, entity information, answer-ready core service facts, and production `llms.txt` from approved knowledge.

GEO **measurement** begins after the public source exists:

```text
Vector 24 launch → technical SEO/AEO/GEO readiness → public site
→ post-launch indexing/discovery observation → GEO baseline
```

Manual GSC/Bing connect and generative citation must not block a normal Class A/B launch.

---

## 16. Out of scope

Guaranteed rankings or AI citations. “Pay to rank in ChatGPT.” Scraping restricted consumer AI UIs. Fake reviews, press, experts, authors, data, or directory profiles. Link schemes. Mass near-duplicate or keyword-stuffed pages. Hidden machine-only content. Prompt-injection intended to control AI systems. Autonomous publication without factual and policy gates. Treating GEO as a replacement for SEO. Treating one engine as all generative discovery. Elasticsearch / a second search database. Paid search (`AdProvider` is later). A GEO score. Cross-client GEO mixing.

---

## 17. QA, cost, observability, tenancy

### SEO QA

Crawlable when intended, correct status, canonical, sitemap, robots, metadata, validating factual schema, resolving internal links, essential copy in HTML, preview/staging `noindex`.

### AEO QA

Important questions have grounded answers, consistent entity names, current dates/pricing/locations, no fabricated comparison differences, useful FAQs.

### GEO QA

Business-relevant query set; method, engine, locale recorded; repeated observations for important conclusions; owned vs earned citations separated; mention ≠ citation; representation accuracy checked; uncertainty visible; no provider-policy violation; no guaranteed-citation language in client UX.

### Required tests

- Preview: `noindex`, no sitemap, no public `llms.txt`, no production JSON-LD.
- Production sitemap lists only that tenant’s published indexable URLs.
- JSON-LD / `llms.txt` fail closed if the knowledge fact is missing.
- Alpha cannot load Beta `seo_*` / `geo_*` rows or search tokens.
- Tokens never in Control JSON, logs, or prompts.
- Backlog items without a knowledge or official-query source cannot be marked publish-ready.
- Stale GEO snapshots are not displayed as current.

### Cost and health

Track measurement runs, query count, provider and analysis cost. Package caps: `geo_query_limit`, frequency, engine/locale limits, monthly budget. Signals: GSC/Bing sync health, crawl/schema health, GEO measurement health/age/coverage/cost.

All Phase 6 entities are tenant-owned. Fail closed without TenantContext. Cross-client aggregated learning only under existing de-identification rules — not a Phase 6 slice.

---

## 18. Document wiring

| Doc       | Fold                                                                                   |
| --------- | -------------------------------------------------------------------------------------- |
| `docs/03` | GEO queries/observations tenant-scoped; no cross-client retrieval                      |
| `docs/05` | SEO + first-ship GEO tables                                                            |
| `docs/06` | `ai_referral` / `generative_search_referral` only when observable                      |
| `docs/07` | Search Agent may/must-not; observations are not rankings                               |
| `docs/08` | Technical audit, search sync, GEO baseline/scheduled measure                           |
| `docs/09` | Essential copy in HTML; improvements create page versions                              |
| `docs/10` | Standing SEO/AEO/**GEO** content standard                                              |
| `docs/13` | Search/GEO experiments must not trade outcomes for a citation                          |
| `docs/14` | No restricted-interface scraping; retained answers untrusted; GEO retention            |
| `docs/15` | `SearchProvider` methods; do not hardcode vendors in the domain                        |
| `docs/16` | Search/GEO provider health, freshness, cost                                            |
| `docs/17` | Markets, languages, priority services, official entity facts — not manual prompt entry |
| `docs/18` | SEO/AEO/GEO QA and tenant tests                                                        |
| `docs/20` | GEO monitoring budgets                                                                 |
| `docs/21` | Phase 6 title + exit/additive split                                                    |
| `docs/22` | Read this plan + `docs/10` for search/GEO work                                         |
| `docs/24` | GEO volatility, overclaim, spend, fake-authority risks                                 |
| `docs/25` | GEO glossary                                                                           |
| `docs/26` | Launch readiness; measurement post-launch                                              |
| `docs/27` | SEO/AEO/GEO discoverability; crawlable essential copy                                  |
| `docs/28` | Control `/search` chrome only                                                          |
| `docs/29` | Creative consume: OG, alt, captions, transcripts                                       |
| `docs/30` | Visibility ≠ referral ≠ outcome; search → qualified lead additive                      |

Do **not** create `docs/31`. First-reveal / crawlable launch copy stays in `docs/27` and `docs/26`.

Do not sprinkle GEO into email, social-provider, or auth docs unless an implementation dependency appears.

---

## 19. Implementation order

| Slice  | Work                                                                                                                       | Gate                 |
| ------ | -------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| **S0** | Audit Delivery/knowledge. Do not rebuild robots/sitemap from zero.                                                         | Done                 |
| **S1** | JSON-LD, real sitemap, path canonicals, AI-crawler robots, `llms.txt`, preview isolation                                   | Done                 |
| **S2** | `packages/search`, memory `SearchProvider`, `seo.read`/`seo.manage`, issues/opportunities, official GSC/Bing when approved | Done                 |
| **S3** | Answer targets, entities, source-backed FAQ gaps                                                                           | Toward exit          |
| **S4** | GEO query sets + observation schema. No live measurement required.                                                         | Toward exit          |
| **S5** | First compliant measurement adapter (start manual / operator-assisted)                                                     | Optional for exit    |
| **S6** | Snapshots, accuracy, client-safe reporting                                                                                 | After S5             |
| **S7** | Search/GEO → lead/revenue                                                                                                  | Additive (`docs/30`) |
| **S8** | Cadence, budgets, portfolio queues                                                                                         | Phase 9 / later      |

Phase 6 may exit after **S1–S4** plus Control backlog. S5–S6 when a method is legal. S7–S8 do not reopen this exit.

---

## 20. Definition of done

Not done because a sitemap exists, FAQs were generated, a brand appeared once in ChatGPT, or an “AI visibility score” is displayed.

**Exit done when:** technical eligibility is reliable; pages are knowledge-grounded; SEO/AEO/GEO opportunities are evidence-based and tenant-scoped; GEO is modeled as generative visibility rather than magical ranking; no system promises ranking or citation; client UX language is non-misleading; Vector 24 stays fast because post-launch GEO observation does not block launch.

**Later:** high-value GEO queries measured through approved methods; mention/citation/representation/accuracy/referral distinguished in live data; search/discovery progresses toward qualified leads where data permits.

---

## 21. Precedence

1. Security, privacy, law, tenant isolation.
2. Factual integrity and approved client knowledge.
3. Explicit client business requirements.
4. Accessibility and technical web quality.
5. Business outcome relevance.
6. SEO/AEO/GEO standards.
7. Individual optimization hypotheses.

Do not optimize only for rank. Do not optimize only for citation. Optimize for **accurate, useful, attributable business discovery**.

Authoritative in their domains: `docs/10` (content/search quality), `docs/27` (public UX), `docs/28` (Control chrome), `docs/29` (creative), `docs/30` (outcomes), this plan (Phase 6 slices), `CROSS_CUTTING_TRACKS.md` (exit vs later).

---

## 22. Final principle

Phase 6 should make Vector capable of saying:

> We make your business discoverable in search, easier for answer systems to understand, and more accurately represented across emerging generative discovery surfaces — then we measure whether that visibility contributes to real growth.

It must never imply:

> We can guarantee where an AI engine will rank, cite, or recommend you.

```text
approved knowledge + technically excellent site + useful content
+ entity and evidence clarity + search measurement
+ generative visibility measurement when compliant
+ attribution + qualified-lead and revenue intelligence
+ continuous optimization
```
