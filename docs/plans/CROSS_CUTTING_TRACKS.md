# Cross-cutting tracks — locked mapping

Charters in `/docs` stop at **30**. Further product law is an ADR or a fold into an existing document, not `docs/31`.

Phase exits in `../21_ROADMAP_ACCEPTANCE_GATES.md` still govern what a phase must ship. Tracks add work **inside or after** a phase. They never reopen an exited phase and never replace a phase exit.

| Track            | Charter       | What it is                                            |
| ---------------- | ------------- | ----------------------------------------------------- |
| Vector 24        | `docs/26`     | Ready → live operating standard                       |
| Delivery quality | `docs/27`     | Public visitor UX                                     |
| Control identity | `docs/28`     | Operator and authenticated client chrome              |
| Creative C0–C9   | `docs/29` §63 | Media ingest → generate → compose → approve → learn   |
| Outcomes O1–O20  | `docs/30` §88 | Goals → pipeline → revenue → client UX → entitlements |

## Locked phase attachments

| Phase | Exit (unchanged)               | Must take now                                    | Later on this phase’s calendar, not the exit           |
| ----- | ------------------------------ | ------------------------------------------------ | ------------------------------------------------------ |
| 0     | Isolation + CI                 | Tenancy, auth, audit                             | —                                                      |
| 1     | Preview funnel + `docs/27` MVP | `brand_assets`, `offers`, `StorageProvider`      | Creative C0 remainder; campaign-offer versions         |
| 2     | Source → lead + taxonomy       | `lead_status` including won/lost; attribution v1 | O1–O3 goals / `sales_outcomes`; confidence labels      |
| 3     | Safe nurture                   | Consent/suppression                              | Email → stage → sale join (O later)                    |
| 4     | Typed, costed drafts           | Recommendation cards; tools denied               | Ask Vector; data-health gate (O13–O15)                 |
| 5     | Two-platform publish           | Creative **C0**; optional social → lead          | C1–C6; O4+ client Today                                |
| 6     | Search backlog                 | Technical SEO + GEO-readiness baseline           | Search → qualified lead; OG from Creative; live GEO measurement when compliant |
| 7     | One experiment + learning      | `docs/27` variants                               | C8 creative tests; O offer/revenue metrics if coverage |
| 8     | Low-risk auto-execute          | Existing approval + kill switch                  | Autonomy × data health × goal relevance                |
| 9     | Portfolio by exception         | Quotas, launch clocks                            | Creative QuickStart; entitlements; client health       |

## Creative C0–C9 (do not start C2 before C0)

0. Asset schema, versions, rights, `StorageProvider` keys under `clients/{id}/creative/…`
1. Brand visual profile + onboarding confirm
2. `ImageProvider` (not `AIProvider`)
3. Deterministic composition
4. Derivatives / crop / compression
5. Funnel asset manifests
6. Social families
7. QA + client approval/revision
8. Creative analytics + learning objects
9. Video

Phase 5 **must** take C0. C2–C9 are not the Phase 5 exit.

## Outcomes O1–O20 (do not start Ask Vector before O1–O3)

1. Client goals
2. Keep Phase 2 lead stages (`new \| working \| qualified \| won \| lost \| spam`)
3. `sales_outcomes` (optional `amount_minor`)
4. Client Overview hierarchy
5. Today view
6. Data health foundation
7. Notification preferences
8. Approval Center grouping
9. Offer domain versions (extend Phase 1 `offers`)
10. `CRMProvider` interface
11. Revenue events
12. Attribution confidence
13. Recommendation evidence
14. Monthly Growth Review
15. Ask Vector
16. Client health
17. Package entitlements
18. Paid acquisition read-only
19. Billing architecture
20. Advanced revenue optimization

Phase 5 **may** persist social → lead. O1–O20 are not the Phase 5 exit. Revenue amounts stay optional. One Control app.

## First paying client (launch readiness, not Phase 0)

From `docs/30` §78, after supervised launch tooling exists:

- primary goal configured
- conversion defined
- pipeline can record won/lost (already true)
- notification defaults
- client-understandable approvals
- data health can flag a broken source

Not required: Ask Vector, CRM sync, ads, billing, entitlements, full Today polish.

## Forbidden

- New numbered charter (`docs/31+`) without an ADR that this file is wrong
- Replacing Phase 2 `lead_status` or Phase 1 `offers`
- `apps/client` fork
- `generateImage` on `AIProvider`
- Second object-store adapter
- Autonomous ad spend
- Presenting estimated attribution as fact
- Inventing sales or revenue
