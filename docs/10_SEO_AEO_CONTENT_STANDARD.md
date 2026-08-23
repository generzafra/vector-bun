# SEO, AEO, GEO, and Content Standard

Standing cross-cutting content and search-quality rules. Phase 6 slices live in [`docs/plans/06_PHASE_6_SEO_AEO.md`](plans/06_PHASE_6_SEO_AEO.md).

S1 Delivery GEO-readiness, S2 `packages/search` + Control `/search`, S3 answer targets, S4 GEO query sets plus observation schema, S5 first compliant measurement, and S6 snapshots plus client-safe reporting are in. Answer targets map to an existing page when a published FAQ already carries the fact. Vector does not create a page per question. GEO query sets stay small and commercial (`GEO_QUERY_LIMIT`). Recorded observations and snapshots are not a GEO score. One observation is not a visibility pattern. Stale snapshots are not current. Manual and operator-assisted measurement is available. Official generative-engine APIs stay unsupported.

## SEO

Server-rendered crawlable HTML, correct status codes, path-aware canonical URLs, sitemap of that tenant’s published indexable URLs, robots.txt (including client AI-crawler policy), metadata, factual structured data, internal links, accessibility, mobile performance, image text alternatives. Preview stays `noindex` and must not serve production sitemap, schema, or machine-readable fact files.

## AEO

AEO means making content clear, direct, well structured, entity consistent, useful, and source-backed so people and answer systems can extract an accurate answer. Prefer mapping questions to existing pages. Do not auto-create one page per question.

## GEO

GEO means Generative Engine Optimization: improving the probability that accurate, useful, authoritative information about the client is discovered, selected, cited, mentioned, or incorporated into generative-engine answers.

GEO is probabilistic, engine-specific, and time-sensitive. It does not imply a stable universal AI ranking.

Launch-time GEO readiness (not measurement): consistent entities, citation-ready passages grounded in approved claims, factual JSON-LD, production `llms.txt` or equivalent generated from approved knowledge. Preview must not expose those files.

GEO measurement, when a compliant method exists, distinguishes mention, owned citation, earned citation, representation, accuracy, prominence, referral, and outcome. Record engine, query, locale, time, method, evidence class, and confidence. Do not conclude from one run. Do not scrape restricted consumer AI interfaces.

`GEO visibility observed ≠ visit proven ≠ lead proven`.

## Content quality

No scaled near-duplicate pages created only for keyword variants.
No fake authors, reviews, ratings, credentials, experts, press, or claims.
No guaranteed ranking or AI-citation claims.
No hidden machine-only content or prompt-injection intended to control AI systems.
No “GEO score” presented as a rank.

## Publishing requirement

Every page must have a human or policy-approved factual basis in the client knowledge system. JSON-LD, FAQ answers, and `llms.txt` fields fail closed when the fact is missing.

Visual and motion experimentation from `docs/27` must preserve heading hierarchy, crawlable important copy, descriptive links, canonical strategy, factual structured data, and accessible equivalents. Essential content must never exist only inside animation, canvas, image, or video. Open Graph images, alt text, and captions come from the Creative Engine (`docs/29`) when that track ships.

Search and generative-discovery work should eventually be judged against qualified leads, revenue, and goal contribution (`docs/30`), not rank, traffic, or citations alone.
