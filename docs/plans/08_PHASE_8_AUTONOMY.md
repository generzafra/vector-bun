# Phase 8 — Progressive Autonomy

**Status:** Outline  
**Prerequisite:** Phase 7 exit met, or Phase 4 approvals plus enough production evidence. Do not start until risk classes and approval policies exist.

---

## Goal

Selected low-risk workflows and launch steps run without daily human intervention, remain auditable, and can be paused by kill switch.

## Exit gate

Low-risk workflows and selected launch steps auto-execute inside policy and stay auditable.

## In scope

- Autonomy levels 3–4 for preapproved classes only
- Per-action risk class, financial/content/provider limits, approval expiry
- Launch automation policies (generate drafts, wire tracking, queue QA)
- Kill switches: client-level and platform-level, privileged and audited
- Automatic rollback for selected actions
- Confidence is never the only control

## Out of scope

- Level 5 by default
- Auto legal, refund, DNS, domain, pricing, or destructive data actions
- Letting Cursor Automations replace Trigger.dev

Automation operator UI, when built, reuses `docs/28` orchestration primitives. Do not invent a second node language.

## New packages and tables

- Policy tables on existing `ai_*` and `automation_*`
- Kill-switch audit events
- Launch automation policy records

## Vector 24 hook

This is when Vector 24 becomes operationally plausible: repeated launch steps that are universal get automated. First five clients remain exempt from the SLA.

## Do not start until

Phase 4 approvals and Phase 1 launch states exist. Prefer a completed Phase 7 experiment so promotion rules are real.
