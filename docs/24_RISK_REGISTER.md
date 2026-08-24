# Risk Register

| Risk                                       | Impact   | Likelihood | Mitigation                                                                        | Owner             | Status |
| ------------------------------------------ | -------- | ---------- | --------------------------------------------------------------------------------- | ----------------- | ------ |
| Cross tenant data leak                     | Critical | Medium     | Tenant context, automated leakage tests                                           | Engineering       | Open   |
| Incorrect AI claims                        | High     | High       | Authority model, approved claims, review                                          | Product           | Open   |
| Email reputation damage                    | High     | Medium     | Auth, suppression, consent, monitoring                                            | Growth Ops        | Open   |
| Provider API changes                       | Medium   | High       | Adapters, health checks                                                           | Engineering       | Open   |
| Uncontrolled AI spend                      | Medium   | Medium     | Cost ledger, quotas, model routing                                                | Engineering       | Open   |
| Bad analytics causes bad optimization      | High     | Medium     | Event governance and tests                                                        | Analytics         | Open   |
| Agent executes high risk action            | Critical | Medium     | Policy engine and approval gate                                                   | Product/Security  | Open   |
| Search spam risk                           | High     | Medium     | Useful client specific content standard (`docs/10`)                               | SEO               | Open   |
| GEO measurement volatility                 | Medium   | High       | Repeat observations; store provenance; no single-run conclusions                  | SEO               | Open   |
| GEO provider/API instability               | Medium   | High       | `SearchProvider` abstraction; manual fallback; health monitoring                  | Engineering       | Open   |
| AI visibility overclaim                    | High     | Medium     | Evidence classes; no guaranteed citation or GEO score                             | Product           | Open   |
| Third-party source manipulation            | High     | Medium     | Prohibit fake press, reviews, directories, and authority                          | Product/Security  | Open   |
| GEO spend growth                           | Medium   | Medium     | Query limits, cadence caps, client budgets (`docs/20`)                            | Engineering       | Open   |
| Noisy neighbor exhausts shared host        | High     | Medium     | Per-client quotas, concurrency, AI and email limits                               | Engineering       | Open   |
| Single-server SPOF or saturation           | High     | Medium     | Design for later split; cache at edge; scale triggers                             | Engineering       | Open   |
| 24-hour launch promised from signing       | High     | Medium     | Readiness gate; qualified commercial wording; class D exclusions                  | Product           | Open   |
| Client delays hidden in Vector 24 KPI      | Medium   | High       | Split SLA timestamps; pause clock on client blocks                                | Growth Ops        | Open   |
| Preview or unknown hostname leaks a tenant | Critical | Medium     | Fail closed routing; preview isolation; launch leakage tests                      | Engineering       | Open   |
| Generated media invents proof or people    | High     | Medium     | Source hierarchy, rights, approval, deterministic logos/text (`docs/29`)          | Product/Creative  | Open   |
| Creative spend or duplicate generation     | Medium   | Medium     | Per-client budgets, reuse search, hash/similarity guards                          | Engineering       | Open   |
| Uncertain attribution shown as fact        | High     | Medium     | Confidence labels; source of truth; no invented revenue (`docs/30`)               | Product/Analytics | Open   |
| Client UI exposes infrastructure           | Medium   | Medium     | Outcome-first copy; progressive disclosure; one Control app                       | Product           | Open   |
| Generic first website damages trust        | High     | Medium     | First Reveal Gate; winner-only spend; no raw first compose (`FIRST_REVEAL_TRACK`) | Product/Frontend  | Open   |
| Inflated or invented client ROI            | High     | Medium     | Evidence classes; no double count; software calculates (`CLIENT_VALUE_TRACK`)     | Product/Analytics | Open   |
