# Email and Deliverability

## Initial provider

Resend behind a Vector owned `EmailProvider` in `packages/email`. Local/test uses the memory adapter when `RESEND_API_KEY` is unset. Tokens stay in env, not the browser or prompts.

## Activation checklist

SPF, DKIM, DMARC documentation, approved From addresses, unsubscribe, suppression, consent policy, complaint and bounce webhooks, test delivery.

Machine check: TXT on the apex must include `v=spf1` and Resend/SES; `{selector}._domainkey` must present DKIM; `_dmarc` must include `v=DMARC1`; From must match the domain and be operator-approved. Results live on `email_domains` and drive `email.sending`.

## Sending order

Preview/test → global pause → global suppression → client suppression → consent → topic preference → jurisdiction policy → campaign eligibility → domain/From → connection → provider send.

## Workflows

`packages/automation` defines Trigger.dev contracts for `lead-captured`, `nurture-step`, `enroll-eligible`, and `nurture-due-sweep` with idempotency keys. Slice 1–2 run them in-process from lead capture, operator enroll-eligible, and due-step processing. Postgres is the source of truth for engagement (sent, delivered, opened, clicked). Provider dashboards are not.

## Auto replies

Begin as drafts. Only clearly bounded low risk classes can graduate to automatic sending.

## Never automatic by default

Legal, refunds, disputes, material negotiation, sensitive complaints, unapproved pricing exceptions.
