# Security, Privacy, and Compliance

## Baseline

TLS, secure HttpOnly cookies, CSRF, CSP, XSS safe rendering, validation, rate limits, MFA for privileged roles, encrypted secrets, provider token encryption, audit logs, environment isolation, backups.

## Tenant security

Cross tenant access tests are a hard release gate. Unknown hostnames fail closed. Preview hostnames must not serve another tenant's production content or become indexed public sites.

## AI security

No secrets in prompts. Retrieved content is untrusted. Tool permissions exist outside the model. Public frontend generation follows schema and approved variants, not arbitrary HTML or scripts (`docs/07`, `docs/27`).

Search and GEO measurement use official or approved providers only (`docs/15`). Do not scrape restricted consumer AI interfaces. Retained generative answers are external untrusted content and cannot change tool permissions. Search-property tokens are encrypted at rest. GEO observation retention follows the data-class policy; do not keep full generated answers when a structured observation is enough.

Creative assets may contain people, customer photos, logos, copyrighted media, regulated claims, or PII (`docs/29`). Preserve provenance, rights state, access control, and tenant isolation. Do not publish unresolved-rights assets when policy requires confirmation. Generated people are never presented as real employees, customers, or credentials.

Revenue and sales outcomes are commercially sensitive (`docs/30`). Apply role permissions, minimization, audit, tenant isolation, and retention. Do not expose internal client revenue to unauthorized MGE staff or unrelated client users.

Client value baselines, replacement-cost benchmarks, salary/time inputs, and value snapshots are commercially sensitive (`docs/plans/CLIENT_VALUE_TRACK.md`). Do not expose MGE margin, wholesale provider cost, or internal labor cost on client views. Value exports are capability-gated.

## Consent

Maintain a purpose based consent ledger and suppression records. Public forms must include required privacy acknowledgement and must not hide consent behind animation or unreadable placeholders (`docs/27`).

## Retention

Define retention by data class and client jurisdiction. Do not keep all data forever.

## Legal configuration

Support client specific jurisdiction profiles. Legal counsel should approve actual policy language and compliance configurations for markets served.

Vector product Privacy Policy and Terms of Use are public Control routes (`/privacy`, `/terms`). The Control marketing homepage (`/`) is also public. POST `/logout` and POST `/v1/auth/logout` destroy the session and require CSRF when a session exists. They are not tenant Delivery pages and must not be treated as a client privacy policy. Counsel must replace remaining contact placeholders before production reliance.
