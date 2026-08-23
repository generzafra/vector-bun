# Phase 8 — Progressive Autonomy

**Status:** Implementation specification — S0 in  
**Phase:** 8  
**Prerequisite:** Phase 7 exit met. Risk classes and approval policies already exist from Phase 4. Do not start Level 5 or unconditioned auto-execute.

---

## 1. Goal

Selected low-risk workflows and launch steps run without daily human intervention, remain auditable, and can be paused by kill switch.

```text
action type + risk class + limits + expiry
→ kill switch and autonomy ceiling
→ policy decides auto-execute
→ trusted software executes (later slices)
→ audit + optional rollback
```

Governing principle:

> Policy decides. Confidence cannot authorize. A kill switch always wins.

---

## 2. Exit, must-take, and additive

Phase exits in [`docs/21`](../21_ROADMAP_ACCEPTANCE_GATES.md) and [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md) still govern.

**Exit (unchanged):** low-risk workflows and selected launch steps run without daily human intervention and remain auditable.

**Must take now:** reuse existing approval queue and kill switch. Per-action risk class, financial / content / provider limits, and approval expiry. Level 3 only for preapproved low-risk classes. Client kill-switch use is privileged and audited.

**Later on this calendar, not the exit:**

- Autonomy × data health × goal relevance (`docs/30`);
- Level 4 conditional execute (experiment promotion under Phase 7 policy);
- Automation canvas UI (`docs/28` orchestration primitives only — do not invent a second node language).

---

## 3. In scope

- Autonomy levels 3–4 for preapproved classes only
- Per-action risk class, financial/content/provider limits, approval expiry
- Launch automation policies (generate drafts, wire tracking, queue QA)
- Kill switches: client-level and platform-level, privileged and audited
- Automatic rollback for selected actions
- Confidence is never the only control

---

## 4. Out of scope

- Level 5 by default
- Auto legal, refund, DNS, domain, pricing, or destructive data actions
- Unrestricted ad spend
- Letting Cursor Automations replace Trigger.dev
- Letting model confidence authorize, unpause, or raise a ceiling

---

## 5. New packages and tables

No new package. Policy evaluation lives next to the existing AI gate in `packages/ai`. Domain orchestration is `packages/domain`.

- S0: `ai_action_policies` (platform catalog, no `client_id`), `ai_kill_switch_events` (tenant-owned)
- Later: launch automation policy rows and execution / rollback records on existing `ai_*` / workflow runtime — not a second job host

Capabilities stay `ai.read` and `ai.manage`. Authorize by capability.

AI _runs_ (draft / recommend) stay capped at Phase 4 max autonomy 2. Level 3 is an action-execution gate, not a license for Grok to skip approval on recommendations.

---

## 6. Vector 24 hook

This is when Vector 24 becomes operationally plausible: repeated launch steps that are universal get automated. First five clients remain exempt from the SLA. S0 catalogs launch steps; it does not auto-run them.

---

## 7. Implementation order

| Slice  | Work                                                                                                         | Gate     |
| ------ | ------------------------------------------------------------------------------------------------------------ | -------- |
| **S0** | Action policy catalog, Level 3 evaluate-only gate, privileged client kill-switch events, Control `/autonomy` | In       |
| **S1** | First trusted auto-execute of one preapproved low-risk class; still paused by kill switch                    | Later    |
| **S2** | Launch automation policy records (generate drafts, wire tracking, queue QA)                                  | Later    |
| **S3** | Auto-execute selected launch steps inside policy; unpublished drafts only                                    | Later    |
| **S4** | Automatic rollback for selected actions; Level 4 conditional (e.g. experiment promote under Phase 7)         | Later    |
| **S5** | Autonomy × data health × goal relevance                                                                      | Additive |

Phase 8 may exit after **S4**. S5 does not reopen that exit. S0 does not execute.

---

## 8. S0 rules

- Platform `ai_action_policies` have no `client_id`. Tenant kill-switch events require `client_id` and explicit `TenantContext`.
- Default client autonomy ceiling stays 2. Operators with `ai.manage` may raise it to 3, never 4 or 5.
- Level 3 auto-execute is allowed only when all of these hold: catalog row exists, `autoExecuteAllowed`, risk class `low`, not in the forbidden set, requested autonomy 3, ceiling ≥ 3, client pause off, platform pause off.
- Forbidden classes never auto-execute even if a catalog flag is wrong: legal reply, refund, DNS, domain, pricing, destructive data, ad spend, publish, send, social publish, experiment promote.
- Kill switch always wins. Confidence is ignored and cannot authorize, unpause, or raise a ceiling.
- Client pause / resume requires `ai.manage`, CSRF, and a written reason. Each change writes `ai_kill_switch_events` and the existing audit log.
- Platform pause remains `AI_EXECUTION_PAUSED` (ops-privileged env). Control shows it; S0 does not toggle it from the browser.
- S0 evaluates eligibility only. Trusted software does not execute, publish, send, enroll, or change a live page.
- Alpha cannot read Beta kill-switch events or set Beta pause / ceiling. Route client id cannot leak the other tenant. Missing TenantContext fails closed.
- Control `/autonomy` uses `docs/28` primitives. Do not ship an automation canvas in S0.

---

## 9. Do not start until

Phase 4 approvals and Phase 1 launch states exist. Prefer a completed Phase 7 experiment so promotion rules are real.

## Locked attachments

Low-risk auto-execute is the exit. Condition later autonomy on data health and outcome coverage (`docs/30`). Confidence still cannot authorize. No unrestricted ad spend. See [CROSS_CUTTING_TRACKS.md](CROSS_CUTTING_TRACKS.md).
