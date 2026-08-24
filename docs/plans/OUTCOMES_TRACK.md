# Outcomes track — client UX + O3–O20

**Status:** Implementation specification — O1, O2, O6, O7 thin-in; **CU0 in**; **CU1 in**; **O8 in**; **O3 in**; remainder open  
**Track:** Outcomes (not a Vector phase)  
**Standing law:** [`docs/30`](../30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md) §2, §5–7, §65, §81–88  
**Sequence:** [SHIP_REMAINING.md](SHIP_REMAINING.md) Wave A then C then E  
**Prerequisite:** Phase 2 `lead_status` including won/lost. First-client bar: `client_goals`, `data_health_checks`, `client_notification_preferences`. Do not replace `lead_status` or Phase 1 `offers`. Do not start Ask Vector before O1–O3.

---

## 1. Goal

Clients operate **growth outcomes**, not marketing infrastructure. Operators keep the full cockpit. One Control app; navigation differs by capability.

```text
capability-filtered nav (CU0)
→ plain-language QuickStart (CU1)
→ approvals in business language (O8)
→ sales_outcomes (O3)
→ Overview / Today (O4 / O5)
→ offers / CRM / revenue / confidence / evidence / monthly review
→ Ask Vector only when coverage exists
→ health / entitlements / ads / billing last
```

Governing principle:

> A non-technical owner should answer: how are we doing, where leads come from, what Vector did, what needs approval, what to improve next — without event schemas, providers, or queue internals.

---

## 2. Client operating UX (do this before more operator screens)

This cluster is first-class. It is not [SURFACE_COMPLETENESS_TRACK.md](SURFACE_COMPLETENESS_TRACK.md). The 16-step Knowledge wizard in `docs/17` is the readiness **catalog**. It is not what the client fills.

### CU0 — capability-filtered default nav

**Must take in Wave A.**

Default **client** nav (`docs/30` §5):

```text
Overview
Today
Leads
Campaigns
Approvals
Insights
```

Until Campaigns / Today / Approvals routes exist, show only the subset that exists (Overview, Leads, Approvals-or-Intelligence, Goals as “Goals” not a KPI lab). Do **not** put Knowledge, Funnel, Email, Social, Search, Autonomy, Portfolio, Experiments, Members, or Launch in the default client set.

Operator (and client users granted `control.operator`) keep the current cockpit.

Rules:

- Authorize by capability, not role-string equality. Client Owner / Marketing / Sales / Reviewer from `docs/30` §34 map onto capabilities (`leads.read`, `ai.read`, `goals.read`). `control.operator` unlocks the operator shell.
- Copy: plain, short, outcome-focused (`docs/30` §65). Prefer “Your Facebook connection expired” over “OAuth token invalid.”
- Pass the Client UX Acceptance Checklist (`docs/30` §85) for every new or changed client-facing screen.
- Chrome stays `docs/28`. Do not paint Delivery. Do not invent `apps/client`.
- Tests: a client-capability actor does not see Autonomy / Portfolio / Knowledge in the default shell; an operator-capability actor does.

**In:** Control `AppShell` filters by `controlNavFor`. Default client links are Overview, Leads, Approvals (`/approvals`), Goals. Operator modules stay off the default client set. Client-facing copy on those four screens follows §85. Today / Campaigns / Insights wait for those routes.

### CU1 — Outcomes QuickStart

**Must take in Wave A**, after or with CU0.

Ask only (`docs/30` §81):

```text
What is your primary goal?
What counts as a good lead?
What usually happens after a lead contacts you?
What counts as a sale?
Do you already use a CRM or booking system?
Would you like Vector to notify you immediately about high-intent leads?
Who approves campaigns?
```

Rules:

- Plain language. Multiple choice where `docs/30` §82–83 shows examples. Map answers into `client_goals`, existing `lead_status` defaults, O7 notification prefs, and O8 approver — not a new parallel pipeline enum.
- Do not force a KPI framework. Revenue value stays optional.
- CRM connect is optional and deferrable (`docs/29` §50). Recording “we call them / they book / they buy online” must work without `CRMProvider`.
- Knowledge remains the operator encyclopedia. CU1 must not require the client to complete every Knowledge field.
- Tenant-scoped. Alpha cannot read Beta QuickStart answers.

**In:** Control `/quickstart` records the seven answers on `client_outcome_quickstarts`. Optional numeric target writes `client_goals`. High-intent maps to O7 `high_intent_lead`. Self-approver stores the actor. CRM “later” does not call a CRM adapter. Knowledge is not required. Overview and Goals link here; the route is not in the default client nav.

### O8 — Approval Center

**§78 leftover. Wave A after CU1.**

`approval_requests` / `approval_decisions` already exist. Group them for the client: campaigns, content, site direction (FR8 later), connections. Business labels. Bundle actions so the client is not hopping Intelligence / Funnel / Social / Launch.

Rules:

- Reuse the existing approval tables. Do not create a second queue.
- Client Reviewer sees assigned items only.
- Empty state tells them what to do (`docs/30` §66).
- Alpha cannot list Beta approvals. Route client id cannot leak the other tenant.

**In:** Control `/approvals` groups existing `approval_requests` into campaigns, content, site direction, and connections. Decide reuses Phase 4 `decideIntelligenceApproval` (no second queue, no publish/send). A reviewer without `ai.manage` only sees items when QuickStart has not assigned someone else. Default client nav Approvals points here; operators keep `/intelligence`. Clients hitting `/intelligence` redirect here.

---

## 3. Exit, must-take, and additive

No phase exit. Phase 2 already exited with won/lost on `leads`.

**Wave A must-take:** CU0, CU1, O8, O3 — **in**.  
**Wave C:** O4, O5, O9–O14, then O15.  
**Wave E:** O16–O20.

V0–V5 stay in [CLIENT_VALUE_TRACK.md](CLIENT_VALUE_TRACK.md). They consume these facts; they do not replace them.

---

## 4. In scope

- Capability-filtered Control navigation
- Outcomes QuickStart
- Approval Center grouping
- `sales_outcomes` with optional money
- Overview hierarchy and Today
- Offer versions on existing `offers`
- `CRMProvider` then revenue events and confidence labels
- Recommendation evidence, Monthly Growth Review, Ask Vector
- Client health, entitlements, read-only ads, billing architecture, advanced optimization

---

## 5. Out of scope

- Replacing `lead_status`
- A second offers table
- `apps/client`
- Inventing sales or revenue
- Ask Vector as a chatbot over unrestricted SQL/tools
- Autonomous ad spend
- Exposing MGE margin or wholesale cost on client screens
- Putting operator modules in the default client nav “so they can find everything”

---

## 6. Packages and tables

No new package for CU0/CU1/O8 (Control + existing approvals + goals).

- O3: `sales_outcomes` (tenant-owned). Optional `amount_minor` + `currency`. Status `won`/`lost` on `leads` is not this row. **In.**
- O4/O5: views over existing facts; no vanity invented metrics
- O9: `offer_versions` (immutable), extend Phase 1 `offers`
- O10: `packages/crm` with `CRMProvider` (memory default)
- O11: `revenue_events` (tenant-owned). Integer minor units + currency. Source of truth labeled
- O12: confidence on existing `attribution_results` or `attribution_confidence` rows — observed / measured / inferred / estimated / unknown
- O13: `recommendation_evidence` (tenant-owned)
- O14: `monthly_growth_reports` (tenant-owned)
- O15: Ask Vector uses existing `AIProvider` + tools already denied; new tools stay narrow, typed, tenant-scoped
- O16: `client_health_snapshots`
- O17: `client_entitlements` / usage
- O18: `AdProvider` read-only
- O19: `BillingProvider` architecture only until a processor is chosen
- O20: later

Capabilities: keep `goals.read` / `goals.manage`. O3 records sales with `leads.read` / `leads.manage` (capture is a lead action). Add `outcomes.read` / `outcomes.manage` when O11 revenue events need a ledger cap that is not lead manage. Authorize by capability.

Same `WorkflowRuntime` for alerts, reconciliation, digests.

---

## 7. Vector 24 hook

Launch with a primary goal, conversion definition, minimal pipeline (already true), outcome method, and notification defaults. Full Today polish is not a Vector Ready blocker. CU0 is launch-readiness for a _paying client who logs in_, not a Phase 1 reopen.

---

## 8. Implementation order

| Slice   | Work                                                      | Gate             |
| ------- | --------------------------------------------------------- | ---------------- |
| **O1**  | Primary goal + Control `/goals`                           | **In** (thin)    |
| **O2**  | Keep `new \| working \| qualified \| won \| lost \| spam` | **In** (Phase 2) |
| **O6**  | Data health flags                                         | **In** (thin)    |
| **O7**  | Notification preferences                                  | **In** (thin)    |
| **CU0** | Capability-filtered default nav + §85 copy                | **In**           |
| **CU1** | Outcomes QuickStart                                       | **In**           |
| **O8**  | Approval Center grouping                                  | **In**           |
| **O3**  | `sales_outcomes`                                          | **In**           |
| **O4**  | Overview outcome hierarchy                                | Wave C           |
| **O5**  | Today                                                     | Wave C           |
| **O9**  | Offer versions                                            | Wave C           |
| **O10** | `CRMProvider` interface                                   | Wave C           |
| **O11** | Revenue events                                            | After O3         |
| **O12** | Attribution confidence                                    | After O11        |
| **O13** | Recommendation evidence + data-health gate                | After O6 + O12   |
| **O14** | Monthly Growth Review                                     | After O13        |
| **O15** | Ask Vector                                                | After O1–O3 + O6 |
| **O16** | Client health                                             | Wave E           |
| **O17** | Package entitlements                                      | Wave E           |
| **O18** | Paid acquisition read-only                                | P2               |
| **O19** | Billing architecture                                      | P2               |
| **O20** | Advanced revenue optimization                             | Last             |

---

## 9. O3 rules — sales_outcomes

- Tenant-owned. Explicit `TenantContext`. Optional `amount_minor` + `currency`. Never floats.
- Do not rewrite historical `lead_status`. A won lead may exist without a sales_outcome row. Coverage is observable (`docs/30` §57).
- Fast mobile capture (`docs/30` §84): Contacted / Qualified / Appointment / Won / Lost on the existing lead, plus optional amount when won.
- AI must not invent outcomes. Empty state asks the client to mark outcomes or connect CRM later.
- Alpha cannot read Beta outcomes.

**In:** Tenant-owned `sales_outcomes` with optional integer `amount_minor` + currency. Control `/leads` fast-captures Contacted / Qualified / Appointment / Won / Lost. Appointment does not change `lead_status`. A won lead may exist without this row; coverage is observed. No `CRMProvider`. AI does not invent amounts.

---

## 10. O4–O5 rules — Overview and Today

- Level 1 executive: sales, qualified leads, goal progress; revenue only when O11 coverage exists. Unknown stays unlabeled.
- Do not turn home into a dense analytics console.
- Today: new leads, high-intent, sales, what needs you, what Vector handled, important changes. Understandable in under one minute. Mobile-first (`docs/30` §35).
- “What Vector handled” is observed (nurture sent, post published) — not invented SEO “fixes.”
- Estimates labeled. Data-health warnings visible. No fake-positive summaries (`docs/30` §60).

---

## 11. O9–O14 rules

- O9 versions are immutable. Do not collide with Phase 1 `offers`.
- O10 is an adapter family. Memory default. Do not couple the domain to one CRM.
- O11 revenue events are the money ledger. Client Value reads them. No second revenue store.
- O12 labels evidence class. Incomplete coverage lowers recommendation confidence and cannot unlock high-impact auto-execute (Phase 8 S5 later).
- O13 evidence rows on existing Intelligence recommendations. Data health must be checked before important recommendations.
- O14 is a monthly client-safe report. Operator internals stay off the client copy.

---

## 12. O15 rules — Ask Vector

- Only after O1–O3 and data health. Not a Wave A item.
- Tools remain narrow, typed, authorized, tenant-scoped. No unrestricted SQL, shell, HTTP, or secrets.
- Answers must distinguish observed / measured / inferred / estimated / unknown. Must not invent revenue.
- Kill switch still wins.

---

## 13. O16–O20 rules

- O16 health snapshots are tenant-owned. Reasons JSON, not a mystery score.
- O17 entitlements fail closed. Denied capability is a business message (`docs/30` § package UX), not a stack trace.
- O18 ads are read-only. No autonomous spend.
- O19 billing is architecture + adapter. Do not hardcode one processor in the domain.
- O20 waits for coverage, capacity constraints, and labeled data.

---

## 14. Tests

Cross-tenant isolation on every new table. Capability nav tests (client vs operator). CU1 does not require Knowledge.complete. O3 money integer + currency. O12 unknown ≠ measured. O15 cannot run tools the actor lacks. Approval list tenant-scoped.

---

## 15. Do not start until

CU0 is in on current routes (hide operator links). O4/O5 should wait for O3 so Overview is not a lead-only vanity panel forever — a qualified-lead Overview is allowed if sales coverage is unknown and labeled.

## Locked attachments

V1 joins O1–O3. V3 waits for O11–O12 / O14. Phase 8 S5 conditions autonomy on data health. See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).
