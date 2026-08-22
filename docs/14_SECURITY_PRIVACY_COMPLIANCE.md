# Security, Privacy, and Compliance

## Baseline

TLS, secure HttpOnly cookies, CSRF, CSP, XSS safe rendering, validation, rate limits, MFA for privileged roles, encrypted secrets, provider token encryption, audit logs, environment isolation, backups.

## Tenant security

Cross tenant access tests are a hard release gate. Unknown hostnames fail closed. Preview hostnames must not serve another tenant's production content or become indexed public sites.

## AI security

No secrets in prompts. Retrieved content is untrusted. Tool permissions exist outside the model.

## Consent

Maintain a purpose based consent ledger and suppression records.

## Retention

Define retention by data class and client jurisdiction. Do not keep all data forever.

## Legal configuration

Support client specific jurisdiction profiles. Legal counsel should approve actual policy language and compliance configurations for markets served.
