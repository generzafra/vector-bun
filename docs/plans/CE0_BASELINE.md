# CE0 baseline — 8 October 2026

**Status:** In. This file is the CE0 measurement.  
**No production behavior change** in CE0. **No migration.** No new section, motion preset, or screenshot runner. CE2 later added optional width modes on these same sections. CE3 later added an optional hero asset id. Compose still omits it until an approved photo is placed. CE4 later added an optional motion preset. CE5 later added structural viewport checks. Pixel screenshots were not captured. CE6 later added plain-language reveal change categories. CE7 later records a design learning from an existing experiment result and does not invent ROI.  
**Fixtures:** `tests/fixtures/ce0-industries.ts`  
**Tests:** `tests/ce0-baseline.test.ts`

Pixel screenshots are not part of this slice. The repo has no browser runner, and the track keeps rendered screenshots in **CE5**.

These five clients are synthetic. They are not seeded, they have no `client_id`, and they are not copied from another tenant.

| Id                     | Label                          | Personality | Slug                  | What compose ignores       |
| ---------------------- | ------------------------------ | ----------- | --------------------- | -------------------------- |
| `luxury-hospitality`   | Luxury hospitality             | premium     | `ce0-northline-house` | Courtyard and suite photos |
| `packaged-food`        | Packaged food                  | creative    | `ce0-harbor-rye`      | Pack-shot filename         |
| `enterprise-saas`      | Enterprise SaaS                | technology  | `ce0-ledgerline`      | Product-screen filename    |
| `local-professional`   | Local professional service     | corporate   | `ce0-calder-pine`     | Office photo filename      |
| `childrens-publishing` | Creative children's publishing | creative    | `ce0-meadow-press`    | Cover filename             |

## What the current composer does

`composeLeadPage` reads brand, services, the first offer, and approved claims. Personality chooses the layout. Industry, submitted filenames, and offer kind do not.

Default section sequences, locked by the CE0 test:

- Editorial (`premium`, `creative`): `hero-editorial, proof-featured, services-editorial, offer, faq, cta-minimal, lead-form`
- Minimal (`technology`, `growth`): `hero-minimal, services, offer, proof, lead-form, faq, cta`
- Split (`corporate`): `hero-split, proof, services, offer, faq, cta, lead-form`

Luxury hospitality, packaged food, and children's publishing therefore share one section-type sequence. The pages differ by copy and tokens only.

Approved claims render. Prohibited claims do not. Preview compose sets `noindex`. Prices stay integer minor units (`From USD 480.00` for the 48000-minor harbor room). Every page is `schemaVersion` 1 and re-parses.

Shared headings are generic: FAQ is always `Before you book`. Services are always `How {displayName} works`.

## Catalog in the renderer today

`APPROVED_SECTION_TYPES` and `apps/delivery/src/lib/sections/PageRenderer.svelte` cover the same twelve types:

`hero-minimal`, `hero-split`, `hero-editorial`, `proof`, `proof-featured`, `services`, `services-editorial`, `offer`, `cta`, `cta-minimal`, `faq`, `lead-form`.

`hero-editorial` and `hero-minimal` are headline, lede, and a call to action. `hero-split` adds an aside. At the CE0 measurement none of the three accepted an image, asset id, focal point, or motion preset. `hero-mosaic` still fails schema validation. CE2 added optional `widthMode` and `mobileTreatment`. `PageRenderer.svelte` still has no cinematic branch.

`visualDirectionManifestSchema` is strict. An `artDirection` field is rejected. Direction manifests still only choose the variants above.

`scoreVisualDirection` can report visual `85` or higher for an editorial, airy, premium candidate. `FIRST_REVEAL_CHECK_KEYS` has no `screenshot`, `crop`, or `fingerprint` check. That score is not evidence the page was rendered.

## Gaps this slice records

These are the current ceiling. They are not bugs to patch inside CE0.

1. Three of the five industries collapse to one section sequence.
2. Submitted photos never reach the page document.
3. Heroes cannot carry media.
4. At this measurement there was no width mode and no motion field. CE2 added width modes. Motion is still CE4.
5. A high visual score does not inspect a screenshot.
6. FAQ and service headings are templates.

## CE1 path

**Shipped.** CE1 stores an optional `experience` brief on the existing direction manifest (`schemaVersion` 1). A stored manifest without `experience` still parses. Page `schemaVersion` 1 and the twelve section types are unchanged. No migration was added. The notes below are the path that slice followed.

Extend:

- `packages/contracts/src/visual-direction.ts` — `visualDirectionManifestSchema` is `.strict()`. Add optional experience fields so a stored manifest without those fields still parses.
- `packages/domain/src/pages.ts` — it already writes `visual_directions.manifest`.
- `packages/db/src/schema.ts` — `visual_directions.manifest` is jsonb from `0036_fr4_visual_directions.sql`. Do not edit that applied migration. Do not add a table. Add a new migration only if CE1 needs a queryable column. The latest applied migration at this baseline is `0047_o15_ask_vector.sql`.

Leave unchanged in CE1:

- `packages/funnel-engine/src/schema.ts` page `schemaVersion` 1 and the twelve section types.
- `packages/funnel-engine/src/compose.ts` section grammar. The brief is data for a later slice.
- `apps/delivery` section components.
- `scoreVisualDirection` screenshot behavior. That is CE5.

Do not add `packages/creative-experience-engine`, a second renderer, `generateImage` on `AIProvider`, or a Playwright (or similar) dependency.

The five fixtures in `tests/fixtures/ce0-industries.ts` stay the inputs for later slices. Do not replace them with another tenant's rows.
