# Phase 6 — SEO and AEO

**Status:** Outline  
**Prerequisite:** Phase 5 exit met (ADR-0010). Do not start until two social platforms can publish approved content. If a client has no social in-scope, Phase 5 exit may be waived by ADR — do not skip tenant and approval foundations.

---

## Goal

Every published client site has a technical SEO baseline and Vector can produce an evidence-based, client-specific search backlog.

## Exit gate

Vector can produce a prioritized SEO/AEO backlog grounded in client knowledge, not generic keyword spam.

## In scope

- Crawlable SSR HTML, status codes, canonicals, sitemap, robots, metadata, OG (`docs/27` motion and visuals must not hide essential copy)
- Accurate structured data only (no fake ratings, authors, or credentials)
- AEO: clear entities, direct answers, source-backed FAQs
- Search property connections when approved (Search Console / Bing)
- Opportunity and issue models, schema manager, answer targets
- Publishing requires a human or policy-approved factual basis in client knowledge

## Out of scope

- Scaled near-duplicate pages for keyword variants
- Guaranteed ranking or AI-citation claims
- Mass content generation without client-specific value

## New packages and tables

- `packages/search`
- `seo_properties`, `seo_pages`, `seo_keywords`, `seo_audits`, `seo_issues`, `seo_opportunities`
- `schema_entities`, `content_briefs`, `answer_targets`

## Vector 24 hook

Technical SEO baseline (metadata, sitemap, robots, schema) must be generated automatically at launch. Manual SEO setup must not block a normal Class A/B launch.

## Do not start until

Phase 1 page versions and Phase 4 knowledge authority exist. Prefer Phase 5 complete unless waived.

## Locked attachments

Technical SEO baseline is the exit. Search → qualified-lead reporting (`docs/30`) and Creative OG composition (`docs/29`) are additive. Do not optimize only for rank. Essential copy stays HTML (`docs/10`, `docs/27`). See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).
