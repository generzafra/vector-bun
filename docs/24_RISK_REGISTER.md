# Risk Register

| Risk                                       | Impact   | Likelihood | Mitigation                                                       | Owner            | Status |
| ------------------------------------------ | -------- | ---------- | ---------------------------------------------------------------- | ---------------- | ------ |
| Cross tenant data leak                     | Critical | Medium     | Tenant context, automated leakage tests                          | Engineering      | Open   |
| Incorrect AI claims                        | High     | High       | Authority model, approved claims, review                         | Product          | Open   |
| Email reputation damage                    | High     | Medium     | Auth, suppression, consent, monitoring                           | Growth Ops       | Open   |
| Provider API changes                       | Medium   | High       | Adapters, health checks                                          | Engineering      | Open   |
| Uncontrolled AI spend                      | Medium   | Medium     | Cost ledger, quotas, model routing                               | Engineering      | Open   |
| Bad analytics causes bad optimization      | High     | Medium     | Event governance and tests                                       | Analytics        | Open   |
| Agent executes high risk action            | Critical | Medium     | Policy engine and approval gate                                  | Product/Security | Open   |
| Search spam risk                           | High     | Medium     | Useful client specific content standard                          | SEO              | Open   |
| Noisy neighbor exhausts shared host        | High     | Medium     | Per-client quotas, concurrency, AI and email limits              | Engineering      | Open   |
| Single-server SPOF or saturation           | High     | Medium     | Design for later split; cache at edge; scale triggers            | Engineering      | Open   |
| 24-hour launch promised from signing       | High     | Medium     | Readiness gate; qualified commercial wording; class D exclusions | Product          | Open   |
| Client delays hidden in Vector 24 KPI      | Medium   | High       | Split SLA timestamps; pause clock on client blocks               | Growth Ops       | Open   |
| Preview or unknown hostname leaks a tenant | Critical | Medium     | Fail closed routing; preview isolation; launch leakage tests     | Engineering      | Open   |
