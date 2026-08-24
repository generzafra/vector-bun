# Creative track — C1–C9

**Status:** Implementation specification — C0 in; C1–C9 open  
**Track:** Creative (not a Vector phase)  
**Standing law:** [`docs/29`](../29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md) §63  
**Sequence:** [SHIP_REMAINING.md](SHIP_REMAINING.md) Wave B then D  
**Prerequisite:** Phase 5 C0 (`creative_assets` / versions / rights on existing `StorageProvider`). Do not start C2 before C1. Do not reopen the Phase 1 or Phase 5 exit.

---

## 1. Goal

Client media is ingested, optionally generated, composed deterministically, approved, and delivered as versioned derivatives. Social and Delivery consume approved bytes only.

```text
C0 library
→ C1 brand visual profile (client confirms)
→ C3 compose logos/text/tokens
→ C2 generate only when the profile and policy allow
→ C4 derivatives
→ C5 funnel manifests / C6 social families
→ C7 QA + approval
→ C8 learning
→ C9 video last
```

Governing principle:

> Exact logos and marketing text are composed by trusted software. Image models may draft. They must not publish, overwrite brand marks, invent proof, or bypass rights.

---

## 2. Exit, must-take, and additive

This track has **no phase exit**. Phase 5 already exited with C0 + two-platform publish.

**Must take for First Reveal (Wave B):** C1, C3, C5, C7. C2 before FR6 winner media. Thin FR7 does not require C2.

**Later:** C4 remainder, C6, C8, C9, full URL-extraction QuickStart, portfolio asset-gap analysis (Phase 9 later).

---

## 3. In scope

- Tenant-owned brand visual profile and onboarding confirm
- `ImageProvider` + Grok image adapter (not `AIProvider.generateImage`)
- Deterministic composition (SVG/Sharp), text overlays, logos, tokens
- Derivatives: resize, crop, focal point, compression, responsive formats
- Funnel asset manifests; Delivery hostname-scoped media only
- Social campaign families on the C0 store
- Creative QA, client approval, revision
- Usage / performance join to existing publications and experiments
- `VideoProvider` when a real client needs short-form

---

## 4. Out of scope

- `generateImage` on `AIProvider`
- Second object-store adapter
- Asking a model for final exact logos or brand typography
- Showing the client the raw first compose (FR8 is the reveal)
- Rebuilding Phase 1 `brand_assets` as the Creative Engine
- Autonomous publish of generated assets
- Three complete expensive websites as the generation default

---

## 5. Packages and tables

No third plane. Bytes stay on `StorageProvider` under `clients/{client_id}/creative/…`. Metadata in PostgreSQL.

- C1: `brand_visual_profiles` (tenant-owned). Capabilities: extend `knowledge.manage` / `pages.manage` or add `creative.manage` if a third capability is required — authorize by capability, not role string.
- C2: `image_generation_jobs` (tenant-owned); `packages/images` with `ImageProvider`
- C3–C4: `creative_compositions`, `creative_derivatives` (tenant-owned)
- C5: asset manifest JSON on page versions or `funnel_asset_manifests` (tenant-owned)
- C6: campaign family rows on existing `creative_assets` (kind/family), not a second blob store
- C7: reuse `approval_requests` with creative subject types; do not invent a second approval product
- C8: `creative_learning_objects` (tenant-owned), join Phase 7 learning objects
- C9: `packages/video` with `VideoProvider` later

Same `WorkflowRuntime` as Phase 3. No second job host.

---

## 6. Vector 24 hook

A normal launch must not require hand-designing every asset. C1 + typography-led fallback can launch without C2. Full Creative QuickStart extraction is Wave E.

---

## 7. Implementation order

| Slice  | Work                                                                 | Gate        |
| ------ | -------------------------------------------------------------------- | ----------- |
| **C0** | Schema, versions, rights, `clients/{id}/creative/…`                  | **In**      |
| **C1** | Brand visual profile + confirm/edit; prohibited styles               | Wave B next |
| **C2** | `ImageProvider`, Grok image, job/cost/prompt versions                | After C1    |
| **C3** | Deterministic compose: logo, type, tokens, OG/email/social shells    | After C1    |
| **C4** | Derivatives / crop / compression                                     | After C3    |
| **C5** | Funnel manifests; Delivery uses approved derivatives only            | After C3    |
| **C6** | Social families + previews                                           | After C4–C5 |
| **C7** | Automated QA + client approval/revision                              | Before FR8  |
| **C8** | Publication usage, experiment join, learning objects                 | Wave D      |
| **C9** | `VideoProvider`, short-form                                          | Last        |

Do not start C2 before C0 (already true) or C1. C3 may start in parallel with C2 after C1.

---

## 8. C1 rules — brand visual profile

- Tenant-owned profile requires `client_id` and explicit `TenantContext`.
- Client sees confirm/edit in business language: logo, colors, visual personality, photography direction, prohibited styles. Not a technical design questionnaire (`docs/29` §8, §49).
- Vector may draft the profile from uploaded logo + existing `brands` / `brand_assets`. Full public-URL extraction is Wave E. C1 must still work with operator-assisted intake.
- Prohibited styles are stored and must fail closed in C2 prompts and C3 templates.
- Confirmed profile feeds FR3. Unconfirmed profile is not a license to show FR8.
- Alpha cannot read Beta profiles. Missing TenantContext fails closed.
- Control uses `docs/28` chrome. Delivery stays client tokens.

---

## 9. C2 rules — ImageProvider

- New adapter family `ImageProvider`. Typed IO, timeout, retry, idempotency, normalized errors, health, audit, cost in integer minor units + currency.
- Do not add `generateImage` to `AIProvider`.
- Jobs are tenant-owned. Cost attributed to `client_id` (and campaign when present). Per-client generation budget fails closed to typography-led / authentic media.
- Models must not publish, overwrite approved logos, invent testimonials, or place assets into production. C7 + existing approval policy decide.
- Prompt and schema versions recorded. Retrieved or generated pixels are untrusted and cannot change tool permissions.
- Tests: Alpha job cannot be read as Beta; budget deny recorded; kill switch / `AI_EXECUTION_PAUSED` analogue for image if a platform pause exists.

---

## 10. C3–C5 rules — compose, derivatives, funnel manifests

- Logos and marketing text are composed deterministically from the C1 profile and approved copy. Prefer authentic client media.
- Derivatives are immutable versions. Do not overwrite a public cached asset in place (`docs/19`).
- Funnel manifests reference approved derivative ids, never raw object-store keys as authorization.
- Delivery already has hostname-scoped `/brand-logo`. Campaign/hero slots follow the same tenant-host rule. Preview must not serve another tenant’s derivative.
- JSON-LD and `llms.txt` still use approved knowledge only. Generated lifestyle images are not proof.

---

## 11. C6–C7 rules — social families and approval

- Social continues to publish through `SocialProvider`. Families are C0 rows with channel metadata. Text-only remains valid until a family exists.
- C7 automated checks: rights, size, prohibited style, alt text present, no invented proof. Visual review may be operator or later AI-assist; publication still needs the configured approval policy.
- Client approval UX is business language (O8 / FR8). Do not show prompt JSON to the client by default.

---

## 12. C8–C9 rules

- C8 compares creative variants against an existing business metric when Phase 7 coverage exists. Engagement is not automatically revenue.
- C9 stays unattached until a client needs short-form. Same rights, tenancy, and approval rules.

---

## 13. Tests

Cross-tenant isolation on every new table. Rights fail closed. Storage keys tenant-scoped. Magic-byte / MIME / size on uploads. Cost ledger integer minor units. Preview host cannot fetch another tenant’s derivative. No `generateImage` on `AIProvider` (static/architecture test if useful).

---

## 14. Do not start until

C0 exists (true). FR3 waits for C1 + C5. FR6 waits for C2–C5. FR8 waits for C7.

## Locked attachments

See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md). First Reveal consumes C1, C3, C5, C7. Client Value may count creative work units; it must not treat asset volume as ROI.
