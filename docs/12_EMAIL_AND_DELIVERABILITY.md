# Email and Deliverability

## Initial provider

Resend behind a Vector owned `EmailProvider` in `packages/email`. Local/test uses the memory adapter when `RESEND_API_KEY` is unset. Tokens stay in env, not the browser or prompts.

## Activation checklist

SPF, DKIM, DMARC documentation, approved From addresses, unsubscribe, suppression, consent policy, complaint and bounce webhooks, test delivery.

Machine check: TXT on the apex must include `v=spf1` and Resend/SES; `{selector}._domainkey` must present DKIM; `_dmarc` must include `v=DMARC1`; From must match the domain and be operator-approved. Results live on `email_domains` and drive `email.sending`.

## Sending order

Preview/test → global pause → global suppression → client suppression → consent → topic preference → jurisdiction policy → campaign eligibility → domain/From → connection → provider send.

## Workflows

`packages/automation` defines Trigger.dev contracts for `lead-captured`, `nurture-step`, `enroll-eligible`, `nurture-due-sweep`, `inbound-email`, and `nurture-due-sweep-platform` with idempotency keys. Slice 4 runs them through `WorkflowRuntime`: in-process by default, Trigger.dev when `TRIGGER_SECRET_KEY` is set. Postgres is the source of truth for engagement and inbound drafts. Provider dashboards are not.

Inbound `email.received` events resolve the tenant from a unique sending domain or From address. Unknown or ambiguous recipients are dropped. Stored bodies are text-only. Classification is rule-based and never authorizes a send.

Email may later use lightweight Creative Engine banners (`docs/29`). Headlines, body, CTA, pricing, legal, and unsubscribe stay HTML text. Do not render an entire marketing email as an image.

Email reporting should later support delivered → clicked → lead progression → appointment → sale where attribution exists (`docs/30`). That join does not reopen the Phase 3 exit. Client Value may count eligible sends as work delivered; it must not equate send volume with value (`docs/plans/CLIENT_VALUE_TRACK.md`).

## Auto replies

Begin as drafts. Slice 3 stores inbound as drafts and never sends a reply. Only clearly bounded low risk classes can graduate to automatic sending in a later phase.

## Never automatic by default

Legal, refunds, disputes, material negotiation, sensitive complaints, unapproved pricing exceptions.
