# VECTOR — Autonomous Growth OS

## Master Implementation Plan and Cursor Kickoff Blueprint

**Product name:** Vector  
**Category:** Autonomous Growth Operating System  
**Client implementation name:** Vector Growth System  
**AI layer:** Vector Intelligence  
**Automated workers:** Vector Agents  
**Analytics and optimization:** Vector Insights  
**Primary commercial owner:** Maximum Global Exposure  
**Document status:** Pre implementation master plan  
**Version:** 1.1  
**Prepared:** 22 August 2026  
**Appendix folded:** `docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md` (MGE/Vector split, shared hosting, scaling, Vector 24)

---

# 1. Executive Summary

Vector is a multi tenant autonomous growth operating system designed to create, operate, measure, and continuously improve the digital customer acquisition system of each client.

Vector is not primarily a website builder, social scheduler, email tool, SEO tool, CRM, analytics dashboard, or AI chatbot. Those are capabilities inside the system.

The core commercial proposition is:

> Every client receives a dedicated autonomous growth engine that can research its market, build and optimize conversion funnels, create and distribute content, capture and nurture leads, measure customer behavior and revenue, and recommend or execute improvements within defined human approval policies.

The system must be built around five principles:

1. **Revenue first.** Every major feature must connect to acquisition, conversion, retention, attribution, or operational efficiency.
2. **Multi tenant by design.** One platform should operate many client growth systems without copying entire applications per client.
3. **AI proposes, policy decides, software executes.** Large language models must not have unrestricted production access.
4. **Everything measurable.** Every important action and visitor behavior should map into a standardized event and outcome taxonomy.
5. **Progressive autonomy.** Vector should begin human supervised and earn greater autonomy only after client specific evidence demonstrates reliability.

The recommended core stack is:

| Layer                              | Recommended technology                      |
| ---------------------------------- | ------------------------------------------- |
| Primary language                   | TypeScript                                  |
| Runtime                            | Bun                                         |
| API framework                      | Hono                                        |
| Client and admin UI                | Svelte 5 with SvelteKit                     |
| Styling                            | Tailwind CSS                                |
| UI primitives                      | shadcn svelte and Bits UI where useful      |
| Relational database                | PostgreSQL                                  |
| ORM and migrations                 | Drizzle ORM                                 |
| Vector search                      | pgvector                                    |
| Cache and transient coordination   | Redis                                       |
| Durable automation                 | Trigger.dev                                 |
| Primary AI provider                | xAI Grok API                                |
| AI contracts                       | Zod plus JSON Schema structured outputs     |
| Analytics and session intelligence | PostHog                                     |
| Email delivery and inbound         | Resend                                      |
| Object storage                     | Cloudflare R2                               |
| DNS, CDN, WAF, edge controls       | Cloudflare                                  |
| Containers                         | Docker Compose                              |
| Reverse proxy                      | Traefik                                     |
| Source control and CI              | GitHub and GitHub Actions                   |
| Error monitoring                   | Sentry                                      |
| Telemetry                          | OpenTelemetry                               |
| Optional integration glue          | n8n                                         |
| Development environment            | Cursor with Grok Bot and Cursor Automations |

Cursor and Grok are the primary development and software maintenance environment. They are not the production workflow scheduler. Production automations must run through durable platform services and provider APIs so campaigns continue when no developer has Cursor open.

---

# 2. Product Positioning

## 2.1 Brand hierarchy

**Maximum Global Exposure**  
Commercial company and client relationship.

**Vector**  
The proprietary technology platform.

**Vector Autonomous Growth OS**  
The product category and formal product name.

**Vector Growth System**  
A dedicated configured deployment of Vector for one client.

**Vector Intelligence**  
AI reasoning, recommendation, generation, and research layer.

**Vector Agents**  
Specialized AI driven workers that perform bounded jobs.

**Vector Insights**  
Analytics, attribution, diagnosis, recommendations, experiments, and performance reporting.

**Vector 24**  
Mature-state launch standard: Vector Ready to a live initial growth system within 24 hours.

## 2.1.1 MGE, Vector, and client websites are separate layers

Maximum Global Exposure (`maxglobalexpo.com`) sells the service. Vector (`vector.maxglobalexpo.com`) is the operating platform. Client websites are served from the Delivery Plane on the client's custom domain.

Do not merge the MGE marketing website and the Vector control application. Once Vector can operate production clients, MGE itself becomes a Vector tenant for dogfooding and demonstration.

Clients experience `theircompany.com`, not a Vector subdomain, except for temporary preview URLs.

## 2.2 Primary positioning statement

Vector is an autonomous growth operating system that builds, operates, measures, and continuously improves a company's digital customer acquisition engine.

## 2.3 Client facing promise

Vector should be marketed around business outcomes rather than AI novelty.

Primary message:

> We deploy an autonomous growth engine for your business.

Supporting message:

> Vector connects your sales funnels, lead capture, email nurturing, social publishing, SEO and AEO, analytics, attribution, and continuous conversion optimization into one operating system.

## 2.4 What Vector must not become

Vector must not become:

- A generic AI website generator.
- A collection of disconnected third party dashboards.
- A social media spam generator.
- A mass content generator designed to manipulate search rankings.
- An unrestricted AI agent with direct access to client accounts.
- A page builder whose sites all look identical.
- A custom codebase fork for every client.
- A vanity reporting dashboard that cannot tie activities to leads and revenue.

---

# 3. Core Product Outcomes

Every client implementation should be capable of delivering the following outcomes.

## 3.1 Acquire

- Generate search visibility.
- Generate answer engine visibility where feasible.
- Publish social content.
- Operate paid or organic campaign landing pages.
- Create shareable campaign assets.
- Generate referral and direct response traffic.
- Support future paid advertising integrations.

## 3.2 Convert

- Build high performance landing pages and funnels.
- Display context appropriate calls to action.
- Capture leads with low friction.
- Support lead magnets.
- Support booking, quotation, inquiry, checkout, or external conversion actions.
- Run controlled experiments.
- Detect funnel abandonment.

## 3.3 Nurture

- Classify leads.
- Segment contacts.
- Trigger email sequences.
- Generate personalized follow ups.
- Route high value or sensitive leads to humans.
- Track engagement and response history.

## 3.4 Measure

- Capture standardized visitor and business events.
- Track UTM parameters and acquisition source.
- Track lead and sales attribution.
- Measure funnel stage conversion.
- Record content and campaign performance.
- Analyze returning visitors.
- Capture experiment exposure and outcome.
- Reconcile platform events with actual sales where integration is available.

## 3.5 Improve

- Detect performance anomalies.
- Generate optimization hypotheses.
- Prioritize opportunities by expected business impact.
- Create controlled variants.
- Evaluate experiments using predetermined rules.
- Promote winning variants only under the applicable approval policy.
- Build client specific institutional memory from validated outcomes.

---

# 4. Architectural Principle: Two Plane System

Vector should be explicitly divided into a **Control Plane** and a **Delivery Plane**.

## 4.1 Control Plane

The Control Plane is where operators, account managers, clients, and Vector Agents manage growth operations.

It owns:

- Organizations.
- Clients and tenants.
- Users.
- Roles and permissions.
- Brand profiles.
- Products and services.
- Offers.
- Personas.
- Campaigns.
- Content strategy.
- Funnel definitions.
- Email programs.
- Social programs.
- SEO plans.
- Experiments.
- AI policies.
- Approval queues.
- Automation definitions.
- Provider connections.
- Analytics dashboards.
- Recommendations.
- Audit logs.
- Usage and cost controls.

Primary UI:

- SvelteKit admin application.
- Server rendered where beneficial.
- Authenticated.
- Tenant aware.
- Role based.

Primary API:

- Bun plus Hono.
- Typed domain services.
- Explicit authorization at service and query boundaries.

## 4.2 Delivery Plane

The Delivery Plane serves and executes customer facing activity.

It owns:

- Public funnel rendering.
- Client custom domains.
- Lead forms.
- Conversion endpoints.
- Webhooks.
- Analytics ingestion.
- Asset delivery.
- Email provider calls.
- Social provider calls.
- Search provider jobs.
- Scheduled content execution.
- Durable automation jobs.
- Experiment assignment.
- Runtime feature flags.
- Redirects and campaign links.

The Delivery Plane should be optimized for high availability, low latency, safe retries, idempotency, and graceful provider failure.

## 4.3 Why this separation matters

This architecture provides:

- Clear tenant isolation.
- Safer deployments.
- Easier scaling.
- Easier auditing.
- Reduced blast radius.
- Independent performance tuning.
- Cleaner public versus private security boundaries.
- Easier future extraction into separate services without prematurely adopting microservices.

The Delivery Plane is one logical application that selects the tenant by verified hostname. The first production stage may run on one capable server. That must not become a permanent physical-server dependency. Scale from measured workload, not client count. See `docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md`.

---

# 5. Monorepo Structure

Recommended initial repository:

```text
vector/
├── apps/
│   ├── control/                  # SvelteKit operator and client control plane
│   ├── delivery/                 # SvelteKit public funnel renderer
│   ├── api/                      # Hono domain API
│   ├── webhooks/                 # Provider webhook entry points if separated later
│   └── worker-console/           # Optional internal automation inspection UI
│
├── packages/
│   ├── db/                       # Drizzle schema, migrations, repositories
│   ├── auth/                     # Sessions, RBAC, tenant authorization
│   ├── domain/                   # Core domain services and business rules
│   ├── contracts/                # Zod schemas and API contracts
│   ├── ai/                       # Provider abstraction, agents, prompts, tools
│   ├── automation/               # Trigger.dev tasks and workflow contracts
│   ├── analytics/                # Event taxonomy, attribution, PostHog adapters
│   ├── email/                    # Email provider abstraction
│   ├── social/                   # Social provider abstraction
│   ├── search/                   # Search and SEO provider integrations
│   ├── storage/                  # R2 and S3 compatible abstraction
│   ├── funnel-engine/            # Page schema, components, rendering logic
│   ├── experiments/              # Experiment domain and assignment
│   ├── content/                  # Content models and validation
│   ├── compliance/               # Consent, suppression, policy checks
│   ├── observability/            # Logging, metrics, traces, error helpers
│   ├── ui/                       # Shared primitives, not complete client themes
│   └── config/                   # Shared typed configuration
│
├── trigger/
│   ├── tasks/
│   └── trigger.config.ts
│
├── infra/
│   ├── docker/
│   ├── traefik/
│   ├── migrations/
│   ├── backups/
│   └── scripts/
│
├── docs/
├── .cursor/
│   └── rules/
├── AGENTS.md
├── package.json
├── bun.lock
└── README.md
```

Do not create one repository or full application fork per customer.

---

# 6. Multi Tenant Architecture

## 6.1 Tenant model

Recommended hierarchy:

```text
organization
  └── client
       ├── brands
       ├── sites
       ├── campaigns
       ├── contacts
       ├── funnels
       ├── providers
       └── data
```

An organization may be MGE or a future agency partner. A client is the operating tenant whose marketing data must be isolated.

## 6.2 Mandatory tenancy rules

Every tenant owned domain row must contain `client_id`.

All repository and service functions working with tenant owned data must require an explicit tenant context.

Never rely only on filtering performed by UI code.

Recommended request context:

```ts
type TenantContext = {
	organizationId: string;
	clientId: string;
	userId?: string;
	roleIds: string[];
	requestId: string;
};
```

The application must make it difficult to accidentally issue an unscoped tenant query.

## 6.3 Isolation strategy for v1

Use a shared PostgreSQL database with tenant scoped rows.

Add:

- Explicit `client_id` foreign keys.
- Compound indexes beginning with `client_id` where appropriate.
- Service layer authorization.
- Automated cross tenant leakage tests.
- Database roles for infrastructure components.
- Optional PostgreSQL row level security after core query patterns are stable.

Do not start with one database per client unless a specific enterprise contract requires it.

## 6.4 Custom domains

Create a domain registry:

```text
client_domains
  id
  client_id
  hostname
  canonical
  verification_status
  ssl_status
  redirect_policy
  created_at
```

Runtime lookup:

```text
request hostname
→ normalized hostname
→ domain registry
→ client id
→ site configuration
→ funnel/page rendering
```

Host header validation is mandatory. Unknown domains must not fall through to arbitrary tenant content.

Production identity is the client's custom domain. Preview uses a private hostname such as `preview-{client-slug}.vector.maxglobalexpo.com` with `noindex`, no production email or social, and test lead routing.

Dedicated delivery, dedicated database, or fully dedicated deployments are later enterprise options and must not complicate MVP.

---

# 7. Identity, Authentication, and Authorization

## 7.1 User categories

- MGE Super Admin.
- MGE Operator.
- MGE Strategist.
- MGE Content Reviewer.
- MGE Developer.
- Client Owner.
- Client Admin.
- Client Marketing User.
- Client Analyst.
- Client Reviewer.
- Read Only Client User.
- Service Account.
- Automation Actor.
- AI Actor.

## 7.2 Authentication

Recommended:

- HttpOnly secure cookie sessions.
- Server side session validation.
- CSRF protection.
- Login rate limiting.
- MFA for privileged users.
- Password reset rate limiting.
- Optional SSO later for enterprise clients.

## 7.3 Authorization

Use capabilities rather than only broad roles.

Examples:

```text
clients.read
clients.manage
brand.read
brand.manage
funnels.read
funnels.edit
funnels.publish
campaigns.manage
social.publish
email.send
experiments.launch
providers.manage
ai.approve
ai.policy.manage
billing.read
audit.read
```

Permissions should be checked inside domain services, not only route handlers.

## 7.4 Automation identities

Every automated action must be attributable to a distinct machine actor.

Example actor types:

```text
human
system
automation
ai
provider_webhook
```

Audit records must record both the initiating actor and execution actor where different.

---

# 8. Core Data Model

The final schema should be normalized around business concepts, not around third party provider payloads.

## 8.1 Platform and tenancy

- organizations
- clients
- client_settings
- client_domains
- users
- memberships
- roles
- permissions
- role_permissions
- sessions
- api_credentials
- service_accounts

## 8.2 Brand and business knowledge

- brands
- brand_assets
- brand_rules
- products
- services
- offers
- locations
- business_hours
- personas
- objections
- proof_points
- testimonials
- competitors
- knowledge_sources
- knowledge_documents
- knowledge_chunks
- embeddings

## 8.3 Funnel and web

- sites
- funnels
- funnel_steps
- pages
- page_versions
- page_components
- forms
- form_fields
- form_submissions
- redirects
- campaign_links

## 8.4 CRM and lead lifecycle

- contacts
- contact_identities
- leads
- lead_sources
- lead_scores
- lead_score_events
- lead_status_history
- contact_tags
- contact_segments
- conversations
- conversation_messages
- sales_outcomes

## 8.5 Campaigns and content

- campaigns
- campaign_channels
- content_items
- content_versions
- content_assets
- content_approvals
- content_publications
- content_performance

## 8.6 Social

- social_connections
- social_accounts
- social_posts
- social_publications
- social_metrics
- social_comments
- social_replies
- social_provider_events

## 8.7 Email

- email_connections
- email_domains
- email_contacts
- email_topics
- email_segments
- email_campaigns
- email_sequences
- email_sequence_steps
- email_messages
- email_events
- email_suppressions
- email_inbound_messages

## 8.8 SEO and AEO

- seo_properties
- seo_pages
- seo_keywords
- seo_queries
- seo_rank_snapshots
- seo_audits
- seo_issues
- seo_opportunities
- schema_entities
- content_briefs
- answer_targets

## 8.9 Analytics and attribution

- visitors
- anonymous_identities
- sessions
- analytics_events
- conversion_events
- attribution_touchpoints
- attribution_results
- revenue_events
- campaign_costs

PostHog can remain the high volume behavioral analytics system while Vector stores normalized business outcomes and references needed for durable reporting and agent reasoning.

## 8.10 Experiments

- experiments
- experiment_hypotheses
- experiment_variants
- experiment_assignments
- experiment_metrics
- experiment_results
- experiment_decisions

## 8.11 AI and automation

- ai_agents
- ai_agent_versions
- prompt_templates
- prompt_versions
- ai_runs
- ai_messages
- ai_tool_calls
- ai_decisions
- ai_feedback
- ai_cost_events
- automation_definitions
- automation_runs
- automation_steps
- automation_failures
- approval_requests
- approval_decisions

## 8.12 Compliance and audit

- consent_records
- consent_purposes
- consent_events
- suppression_records
- data_subject_requests
- data_retention_policies
- data_deletion_jobs
- audit_logs
- security_events

## 8.13 Launch, readiness, and usage

- client_readiness
- client_readiness_items
- client_launches
- client_launch_events
- client_launch_blocks
- client_launch_approvals
- infrastructure_usage_snapshots
- tenant_usage_limits
- tenant_usage_events

`client_launches` must record launch class, status, and the timestamps needed to separate Vector work from client delay: `vector_ready_at`, generation, QA, approval, domain ready, launch, live, and pause duration.

---

# 9. Analytics Event Taxonomy

Vector requires a standardized event vocabulary across all client funnels.

## 9.1 Naming standard

Use lower snake case and stable semantic names.

Avoid event names tied to page layout.

Good:

```text
service_viewed
lead_form_started
lead_form_submitted
booking_completed
purchase_completed
```

Bad:

```text
blue_button_clicked
hero_form_2
page_section_3_viewed
```

## 9.2 Core web events

- page_viewed
- landing_page_viewed
- service_viewed
- product_viewed
- offer_viewed
- pricing_viewed
- faq_viewed
- testimonial_viewed
- video_started
- video_completed
- cta_clicked
- phone_clicked
- email_clicked
- map_clicked
- outbound_link_clicked
- form_started
- form_field_error
- form_abandoned
- form_submitted
- lead_created
- booking_started
- booking_completed
- checkout_started
- purchase_completed
- file_downloaded
- share_clicked
- return_visit

## 9.3 Required common properties

Every eligible event should include as many of these as applicable:

```text
event_id
occurred_at
client_id
site_id
funnel_id
page_id
page_version_id
campaign_id
experiment_id
variant_id
visitor_id
session_id
contact_id
lead_id
utm_source
utm_medium
utm_campaign
utm_term
utm_content
referrer
landing_url
device_category
country_code
consent_state
```

Do not collect unnecessary personal data merely because it is technically available.

## 9.4 Identity stitching

Use anonymous visitor identifiers before identification.

On a valid lead submission:

```text
anonymous visitor
→ contact created or matched
→ visitor identity linked
→ future eligible events can be associated
```

Identity merging must have deterministic conflict rules.

## 9.5 Attribution

Implement in phases:

Phase 1:

- First touch.
- Last non direct touch.
- Lead source.
- Campaign source.

Phase 2:

- Multi touch reporting.
- Assisted conversions.
- Revenue weighting.
- Cost reconciliation.

Never present probabilistic attribution as absolute truth.

---

# 10. Funnel Engine

## 10.1 Principle

Standardize the engine and capabilities, not the visual appearance.

The system must avoid generating hundreds of visibly identical AI websites.

## 10.2 Page schema

A page should be represented as a validated structured document.

Example conceptual schema:

```json
{
	"pageType": "landing",
	"goal": "lead",
	"seo": {},
	"theme": {},
	"sections": [
		{
			"type": "hero",
			"variant": "split_visual",
			"props": {}
		}
	]
}
```

Every page version must be immutable after publication. Editing creates a new draft version.

## 10.3 Component classes

Initial reusable capabilities:

- Hero.
- Problem framing.
- Benefits.
- Feature list.
- Service cards.
- Product cards.
- Offer stack.
- Pricing.
- Comparison.
- Process.
- Timeline.
- Before and after.
- Case studies.
- Testimonials.
- Social proof.
- Logos.
- Stats.
- Video.
- Gallery.
- Interactive calculator.
- Quiz.
- Lead form.
- Booking call to action.
- FAQ.
- Sticky CTA.
- Countdown.
- Exit intent capture where lawful and appropriate.
- Related content.
- Local business details.
- Trust and compliance details.

## 10.4 Design system

Shared primitives may standardize:

- Accessibility.
- Responsive behavior.
- Form controls.
- Spacing scale.
- Motion constraints.
- Focus states.
- Image behavior.
- Loading states.
- Validation states.

Client brand configuration may control:

- Typography.
- Color tokens.
- Border character.
- Radius character.
- Density.
- Illustration style.
- Photography rules.
- Motion intensity.
- Voice.
- Layout preference.

Do not permit arbitrary generated CSS to bypass security or performance controls.

## 10.5 Rendering strategy

Use SvelteKit.

Recommended behavior:

- Prerender stable public content where practical.
- SSR dynamic client content and experiment aware routes.
- Hydrate only where interactivity requires it.
- Use progressive enhancement for forms.
- Apply CDN caching with explicit invalidation rules.
- Generate canonical metadata server side.
- Keep Core Web Vitals as a release gate.
- Treat client page publication as a database version plus cache invalidation, not a Vector code deployment.
- Do not cache personalized, consent-sensitive, authenticated, or experiment-sensitive responses without an explicit cache key and policy.

---

# 11. Client Knowledge System

Each client requires a structured source of truth before Vector should generate marketing content.

## 11.1 Client knowledge profile

Required fields:

- Legal and display name.
- Business description.
- Industry.
- Locations and service areas.
- Products.
- Services.
- Prices or pricing rules if allowed.
- Primary offers.
- Business goals.
- Target customers.
- Excluded audiences where applicable.
- Brand voice.
- Approved claims.
- Prohibited claims.
- Certifications.
- Licenses.
- Guarantees.
- Testimonials.
- Case studies.
- FAQs.
- Common objections.
- Competitors.
- Differentiators.
- Conversion destinations.
- Social accounts.
- Email domains.
- Legal pages.
- Compliance requirements.

## 11.2 Knowledge source classification

Every knowledge source should carry:

```text
source_type
authority_level
owner
effective_date
expires_at
verified_at
verification_status
```

Highest authority examples:

- Signed client supplied facts.
- Official product catalog.
- Approved price list.
- Executed contracts.
- Regulatory or licensing records.
- Client approved claims.

Lower authority:

- AI generated summaries.
- Competitor observations.
- Third party articles.
- Social comments.

Agents must never treat low authority generated material as an approved business fact.

## 11.3 Retrieval

Use PostgreSQL plus pgvector for semantic retrieval after the initial structured knowledge profile works.

Retrieval results should include source provenance.

---

# 12. Vector Intelligence Architecture

## 12.1 Provider abstraction

Do not hardcode xAI throughout the domain.

Create:

```ts
interface AIProvider {
	generateStructured<T>(request: StructuredRequest<T>): Promise<T>;
	generateText(request: TextRequest): Promise<TextResult>;
	useTools(request: ToolRequest): Promise<ToolResult>;
}
```

Initial provider:

- GrokProvider.

Future options:

- OpenAIProvider.
- AnthropicProvider.
- GeminiProvider.

The platform must support model selection by task.

## 12.2 Model routing

Do not use the most expensive model for every task.

Create task classes:

- Classification.
- Extraction.
- Copy generation.
- Strategic reasoning.
- Deep research.
- Content review.
- Data interpretation.
- Tool orchestration.
- Image understanding.

Model routing config should include:

```text
provider
model
reasoning_level
max_output
timeout
retry_policy
cost_ceiling
fallback
```

## 12.3 Structured outputs

Production agent decisions should use JSON Schema validated structured outputs wherever feasible.

Flow:

```text
context
→ model
→ structured result
→ Zod validation
→ policy validation
→ domain validation
→ approval decision
→ execution
```

Natural language must not be the execution contract.

## 12.4 Tool design

Every AI callable tool must have:

- Narrow purpose.
- Explicit input schema.
- Explicit authorization check.
- Tenant context.
- Idempotency behavior.
- Audit logging.
- Rate limiting where relevant.
- Financial or business impact classification.
- Clear result schema.

Never expose a generic `execute_sql`, `run_shell`, or unrestricted HTTP tool to production agents.

## 12.5 Agent catalog

Initial specialized agents:

### Research Agent

- Market research.
- Competitor analysis.
- Customer pain points.
- Offer research.
- Content opportunities.
- Search opportunity research.

### Funnel Strategist

- Map audience to offer.
- Choose conversion objective.
- Create page and funnel plan.
- Generate experiment hypotheses.

### Copy Agent

- Draft headlines.
- Page copy.
- Calls to action.
- Emails.
- Social content.
- Content briefs.

### SEO Agent

- Technical audit interpretation.
- Metadata suggestions.
- Internal linking suggestions.
- Schema recommendations.
- Content opportunity prioritization.

### AEO Agent

- Identify answer worthy questions.
- Improve explicit answers.
- Improve entity clarity.
- Generate source backed FAQ and explanatory structures.
- Never claim guaranteed AI citation or ranking.

### Social Agent

- Calendar creation.
- Post generation.
- Channel adaptation.
- Scheduling proposals.
- Performance analysis.

### Email Agent

- Sequence generation.
- Lead classification.
- Reply drafting.
- Nurture adaptation.
- Deliverability aware content checks.

### Analytics Agent

- Analyze performance.
- Detect anomalies.
- Explain funnel loss.
- Compare campaign quality.

### CRO Agent

- Generate hypotheses.
- Prioritize tests.
- Request variant creation.
- Analyze completed experiments.

### QA Agent

- Validate content rules.
- Check broken links.
- Check metadata.
- Check schema.
- Check factual claims.
- Check policy compliance.
- Check tenant context.

No agent should have unlimited powers.

---

# 13. Progressive Autonomy Model

Every agent action belongs to an autonomy level.

## Level 0 — Observe

The agent can read approved data and create internal analysis only.

Examples:

- Analyze funnel performance.
- Identify SEO issues.
- Summarize campaign outcomes.

## Level 1 — Draft

The agent can create drafts but cannot publish or send.

Examples:

- Draft social posts.
- Draft email sequence.
- Draft landing page variant.

## Level 2 — Recommend

The agent can produce a recommendation with expected impact and required approval.

Examples:

- Recommend promoting experiment variant.
- Recommend new offer.
- Recommend changing hero copy.

## Level 3 — Auto execute low risk

The system may execute preapproved low risk actions.

Examples:

- Schedule previously approved evergreen content.
- Add a lead to an approved nurture sequence.
- Generate internal weekly report.
- Apply approved metadata corrections.

## Level 4 — Conditional autonomy

The system may execute actions only when measurable rules are met.

Examples:

- Promote a winning page variant after minimum sample size and confidence requirements.
- Pause an automation after a predefined failure threshold.
- Send approved response classes to low risk inquiries.

## Level 5 — Full bounded autonomy

The system can run an entire defined operating loop without case by case human approval, but only inside strict policy and budget constraints.

No action should reach Level 5 by default.

## 13.1 Approval matrix

Each action type must define:

```text
risk_class
default_autonomy_level
allowed_roles
client_override
financial_limit
content_limit
provider_limit
time_window
approval_expiry
```

High risk actions should normally remain human controlled:

- Legal responses.
- Refunds.
- Contract changes.
- Material pricing changes.
- Unverified claims.
- Medical or regulated claims.
- High spend advertising changes.
- Account permission changes.
- Domain or DNS changes.
- Destructive data operations.

---

# 14. Prompt and Agent Versioning

Prompts are production code.

Every prompt must be versioned.

Store:

```text
prompt_id
prompt_version
agent_version
model
schema_version
created_by
approved_by
effective_at
retired_at
change_reason
```

Each AI run must record the exact versions used.

Never silently edit a production prompt and lose comparability.

Create regression test fixtures for:

- Common industries.
- Edge cases.
- Sensitive content.
- Ambiguous client facts.
- Missing data.
- Conflicting instructions.
- Provider outages.
- Malicious prompt injection inside retrieved sources.

---

# 15. Automation Engine

Trigger.dev should be the initial durable automation platform.

Cursor Automations may support development and repository operations but should not be the sole production job engine.

## 15.1 Workflow requirements

Every durable workflow must define:

- Trigger.
- Tenant.
- Input schema.
- Idempotency key.
- Retry policy.
- Timeout.
- Concurrency policy.
- Rate limits.
- Approval steps.
- Compensation or rollback behavior.
- Audit events.
- Failure escalation.

## 15.2 Initial workflows

### New client onboarding

```text
client created
→ onboarding checklist
→ provider connection checks
→ knowledge validation
→ baseline research
→ baseline analytics
→ draft growth strategy
→ approval
→ initial funnel
```

### Lead captured

```text
form submitted
→ validation
→ deduplication
→ contact and lead creation
→ consent evaluation
→ attribution
→ score
→ segment
→ notify if high intent
→ start eligible nurture
```

### Social publishing

```text
content approved
→ platform adaptation
→ asset readiness
→ provider validation
→ schedule
→ publish
→ capture provider id
→ collect metrics later
```

### Email campaign

```text
campaign approved
→ audience snapshot
→ suppression check
→ topic and consent check
→ send or schedule
→ webhook ingestion
→ metrics
→ follow up actions
```

### Weekly performance review

```text
collect normalized outcomes
→ check data completeness
→ summarize funnel
→ identify anomalies
→ generate opportunities
→ score opportunities
→ create recommendations
```

### Experiment lifecycle

```text
hypothesis approved
→ variant prepared
→ QA
→ eligibility rules
→ launch
→ exposure tracking
→ wait
→ evaluate predetermined metrics
→ recommend winner
→ approval or eligible auto promotion
→ archive learning
```

---

# 16. Social Media Architecture

## 16.1 Provider abstraction

Create a stable internal contract:

```ts
interface SocialProvider {
	validateConnection(): Promise<ConnectionHealth>;
	publish(request: PublishRequest): Promise<PublishResult>;
	schedule?(request: ScheduleRequest): Promise<ScheduleResult>;
	fetchPostMetrics(request: MetricsRequest): Promise<PostMetrics>;
	fetchComments?(request: CommentRequest): Promise<Comment[]>;
	replyToComment?(request: ReplyRequest): Promise<ReplyResult>;
	refreshConnection(): Promise<ConnectionHealth>;
}
```

Adapters may include:

- Meta.
- LinkedIn.
- TikTok.
- X.
- YouTube.

Implement only providers needed by real clients.

## 16.2 Token security

OAuth credentials must be encrypted at rest.

Never expose tokens to the browser or AI model.

Providers should be executed by trusted backend code.

## 16.3 Content workflow

Recommended lifecycle:

```text
idea
→ draft
→ reviewed
→ approved
→ scheduled
→ publishing
→ published
→ failed
→ archived
```

Every publication must record the exact content version and asset version sent.

## 16.4 Anti spam rule

Vector should optimize for useful content, not maximum post frequency.

Create client level frequency limits and duplicate similarity checks.

---

# 17. Email Marketing and Reply Architecture

## 17.1 Email provider

Use an email provider abstraction with Resend as the initial adapter.

## 17.2 Deliverability requirements before sending

A client email program must not activate until:

- Sending domain is verified.
- SPF is valid.
- DKIM is valid.
- DMARC policy is documented.
- From addresses are approved.
- Physical sender identity requirements are configured where applicable.
- Unsubscribe behavior is verified.
- Suppression handling is verified.
- Complaint and bounce webhooks are active.
- Marketing consent policy is configured.
- Test deliveries pass.

## 17.3 Suppression is authoritative

Before every marketing send:

```text
recipient
→ global suppression
→ client suppression
→ consent status
→ topic preference
→ jurisdiction rule
→ campaign eligibility
→ send
```

AI must never be able to bypass suppression.

## 17.4 Auto reply classification

Initial classes:

| Class                       | Default behavior                         |
| --------------------------- | ---------------------------------------- |
| Simple factual inquiry      | Draft, later eligible for auto response  |
| Product or service question | Draft                                    |
| Appointment interest        | Draft plus high intent alert             |
| Pricing inquiry             | Draft within approved pricing rules      |
| Negotiation                 | Human approval                           |
| Complaint                   | Human approval                           |
| Refund                      | Human only unless specific policy exists |
| Legal                       | Human only                               |
| Media                       | Human approval                           |
| Unknown or low confidence   | Human review                             |

Confidence must never be the only safety control. Category and policy also matter.

---

# 18. SEO and AEO Architecture

## 18.1 SEO foundation

Every site should support:

- Crawlable server rendered HTML.
- Correct status codes.
- Canonical URLs.
- XML sitemap.
- robots.txt.
- Redirect management.
- Metadata.
- Open Graph metadata.
- Structured data where relevant and accurate.
- Image alt text.
- Internal linking.
- Breadcrumbs where appropriate.
- Fast mobile performance.
- Accessibility.
- Search Console integration when approved.
- Bing Webmaster integration when approved.

## 18.2 Structured data

Schema markup must represent actual visible business facts.

Do not generate unsupported ratings, fake review schema, fake author credentials, or fabricated organizational details.

## 18.3 AEO operating definition

AEO inside Vector means improving the clarity, structure, provenance, and direct answer quality of client content for both people and machine mediated answer systems.

Practices may include:

- Clear entity descriptions.
- Explicit service and product facts.
- Direct questions and answers.
- Concise answer passages.
- Source backed claims.
- Expert attribution where genuine.
- Consistent organization identity.
- Useful comparisons.
- Tables where appropriate.
- Structured data where valid.
- Stable canonical content.

Do not promise placement inside AI answers.

## 18.4 Content quality rule

AI may scale production, but every published page must provide client specific value.

Do not create large volumes of near duplicate pages solely to capture keyword variants.

---

# 19. Analytics and PostHog Strategy

Use PostHog for behavioral analytics, web analytics, feature flags, experiments, and session replay where privacy settings allow it.

Vector should remain the business source of truth for:

- Client configuration.
- Leads.
- Consent.
- Sales outcomes.
- Revenue.
- Provider connections.
- AI decisions.
- Approvals.
- Durable campaign state.

## 19.1 Data contract

Never allow every developer or agent to invent analytics properties.

Maintain a versioned analytics dictionary.

## 19.2 Session replay privacy

Before enabling replay:

- Mask sensitive input fields.
- Never capture passwords.
- Mask financial data.
- Mask health or special category data unless a specific lawful requirement and configuration exists.
- Respect client and regional privacy configurations.

---

# 20. CRO and Experimentation

## 20.1 Experiment proposal

Every experiment needs:

- Problem.
- Evidence.
- Hypothesis.
- Eligible audience.
- Primary metric.
- Guardrail metrics.
- Minimum duration.
- Minimum sample expectation.
- Decision rule.
- Rollback rule.

## 20.2 Prevent invalid AI optimization

Vector must not simply choose the currently higher percentage.

Guard against:

- Tiny samples.
- Early stopping.
- Novelty effects.
- Traffic source imbalance.
- Bot traffic.
- Broken event instrumentation.
- Concurrent conflicting experiments.
- Changes to the primary metric after launch.

## 20.3 Learning memory

Completed experiments should create a durable learning object:

```text
client
industry
audience
hypothesis
change
result
confidence
conditions
decision
notes
```

Only validated completed outcomes should influence reusable "what works" memory.

---

# 21. Compliance and Consent Architecture

Vector will process personal and behavioral data. Compliance must be a first class architecture concern.

This plan is an engineering framework, not jurisdiction specific legal advice.

## 21.1 Consent ledger

Store evidence of meaningful consent and preference changes.

Recommended fields:

```text
contact_id or anonymous_id
purpose
status
source
policy_version
capture_method
captured_at
ip_hash or evidence reference where appropriate
user_agent_class if required
withdrawn_at
```

Purposes should be separate:

- Essential operation.
- Analytics.
- Marketing email.
- Personalized marketing.
- Advertising audiences.
- Other client specific purposes.

## 21.2 Jurisdiction profiles

Do not hardcode one global compliance assumption.

Create configurable policy profiles for markets clients operate in.

Examples to account for through counsel and policy configuration:

- Philippine Data Privacy Act and NPC guidance.
- GDPR and UK GDPR.
- CAN SPAM.
- CCPA and CPRA.
- Applicable electronic marketing and cookie rules.
- Sector specific restrictions.

## 21.3 Data subject operations

Support:

- Export.
- Correction.
- Marketing opt out.
- Consent withdrawal.
- Deletion workflow.
- Retention expiration.
- Suppression without accidental re subscription.

## 21.4 Retention

Define retention per data class.

Do not use "keep forever" as the default.

---

# 22. Security Architecture

## 22.1 Baseline

- TLS everywhere.
- Secure HttpOnly SameSite cookies.
- CSRF protection.
- CSP.
- XSS safe rendering.
- Input validation.
- Output encoding.
- SQL parameterization through ORM.
- Rate limiting.
- Brute force controls.
- MFA for privileged accounts.
- Encrypted secrets.
- Provider token encryption.
- Audit logging.
- Environment separation.
- Dependency scanning.
- Secret scanning.
- Backup encryption.

## 22.2 AI specific security

Treat retrieved documents, webpages, social posts, emails, and third party content as untrusted input.

Defend against prompt injection by:

- Separating instructions from retrieved content.
- Not allowing retrieved content to redefine tool permissions.
- Enforcing permissions outside the model.
- Requiring structured tools.
- Applying allow lists.
- Validating all execution requests.
- Keeping secrets out of model prompts.
- Recording tool call provenance.

## 22.3 Tenant isolation tests

Create automated security tests that attempt:

- Cross tenant ID enumeration.
- Cross tenant route access.
- Cross tenant API access.
- Cross tenant asset access.
- Cross tenant search.
- Cross tenant AI retrieval.
- Cross tenant export.
- Cross tenant background job access.

A release fails if any test demonstrates leakage.

---

# 23. Provider Integration Pattern

All external providers use adapters.

Common provider lifecycle:

```text
connect
→ authorize
→ store encrypted credential
→ validate
→ use
→ refresh
→ observe health
→ revoke
```

Every adapter must normalize provider errors into Vector error codes.

Examples:

```text
PROVIDER_AUTH_EXPIRED
PROVIDER_RATE_LIMITED
PROVIDER_PERMISSION_MISSING
PROVIDER_CONTENT_REJECTED
PROVIDER_TEMPORARY_FAILURE
PROVIDER_INVALID_PAYLOAD
```

Provider calls require idempotency where supported or locally simulated safeguards where not.

---

# 24. Object and Media Storage

Use Cloudflare R2 through its S3 compatible API.

Recommended key pattern:

```text
clients/{client_id}/
  brand/
  funnel/
  content/
  email/
  social/
  generated/
  source/
  export/
```

Do not expose raw bucket keys as authorization.

Generate signed or mediated access according to asset type.

Store metadata in PostgreSQL:

```text
asset_id
client_id
storage_key
mime_type
size_bytes
checksum
width
height
duration
visibility
created_by
created_at
```

Validate uploads by content type and size.

---

# 25. Observability

Every production operation should be traceable.

## 25.1 Logs

Use structured JSON logs containing:

```text
timestamp
level
service
request_id
trace_id
client_id
actor_type
actor_id
operation
result
error_code
```

Never log secrets.

Minimize personal data in logs.

## 25.2 Metrics

Track:

- HTTP latency.
- Error rate.
- Database latency.
- Queue delay.
- Automation success.
- Provider failure.
- AI request latency.
- AI request cost.
- Token usage.
- Email bounce rate.
- Email complaint rate.
- Funnel render latency.
- Conversion event ingestion failure.
- Webhook lag.
- Cache hit rate.
- Per-tenant workload share.
- Vector Ready to live time.
- Manual interventions per launch.

## 25.3 Tracing

OpenTelemetry should connect:

```text
request
→ domain service
→ database
→ AI
→ provider
→ durable task
```

## 25.4 Business health

Technical health is insufficient.

Per client monitor:

- Leads.
- Qualified leads.
- Conversion rate.
- Sales.
- Revenue.
- Acquisition source.
- Email health.
- Social publishing health.
- Search performance.
- Experiment status.

---

# 26. AI and Infrastructure Cost Ledger

Every costly event should be measurable by client.

Track:

- AI tokens.
- AI tool calls.
- AI provider cost.
- Email volume.
- Object storage.
- Bandwidth where billable.
- Workflow runtime.
- Third party API charges.
- Optional ad spend.
- Optional SMS or messaging spend.

Provide:

```text
client monthly allowance
soft warning threshold
hard policy threshold
operator override
```

This is necessary for profitable pricing.

---

# 27. Client Onboarding Workflow

Do not activate AI automation immediately after account creation.

## Phase A — Commercial onboarding

Capture:

- Scope.
- Services included.
- Markets.
- Goals.
- Success metrics.
- Approval contacts.
- Content approval SLA.
- Access responsibilities.

## Phase B — Business knowledge

Complete and approve:

- Brand profile.
- Products and services.
- Prices.
- Offers.
- Claims.
- Personas.
- Differentiators.
- Restrictions.
- FAQs.
- Testimonials.
- Competitors.

## Phase C — Technical connection

- Domain.
- Analytics.
- Search Console.
- Social accounts.
- Email domain.
- CRM if present.
- Booking system if present.
- Ecommerce if present.
- Payment or sales data if relevant.

## Phase D — Baseline measurement

Capture a pre Vector baseline where possible:

- Traffic.
- Lead volume.
- Conversion.
- Search visibility.
- Email list size.
- Social frequency.
- Sales.

## Phase E — Growth plan

Vector Intelligence drafts:

- Funnel plan.
- Acquisition priorities.
- Content pillars.
- Social cadence.
- Email sequences.
- SEO backlog.
- Measurement plan.
- Experiment backlog.

Human approval required.

## Phase F — Launch

Launch the initial system with high supervision.

## Phase G — Autonomy graduation

After sufficient successful operations, increase selected automation classes.

## 27.1 Vector 24 and Vector Readiness

Vector 24 is a mature-state operational standard: a normal client that has completed all Vector Readiness requirements can be launched within 24 hours.

The clock starts at **VECTOR READY**, not at contract signing. Report separately:

```text
Contract → Readiness
Readiness → Internal Build Complete
Build Complete → Client Approval
Approval → Domain Ready
Domain Ready → Live
```

The Vector 24 KPI is `vector_ready_at → live_at`, excluding documented client-caused pauses.

Onboarding must use a structured wizard that scores readiness across business, brand, claims, audience, domain, email, social, compliance, and approvals. Missing critical items block the SLA.

Launch states: `draft`, `onboarding`, `blocked`, `vector_ready`, `generating`, `qa`, `awaiting_client_approval`, `awaiting_domain`, `launching`, `live`, `launch_failed`, `paused`.

Launch classes: A 1–4 hours, B 4–12 hours, C 12–24 hours, D may exceed 24 hours. Do not promise Vector 24 to regulated or complex enterprise clients.

A homepage load is not a successful launch. Domain, HTTPS, approved copy, working lead path, attribution, analytics, SEO, included email and social readiness, provider health, mobile QA, no tenant leakage, and recorded approval are required.

The first five clients remain supervised learning cases and are exempt from the final SLA.

---

# 28. Operator and Client UX

## 28.1 Primary navigation

```text
Overview
Growth
  Funnels
  Campaigns
  Offers
Leads
  Contacts
  Pipeline
  Conversations
Content
  Calendar
  Library
Social
Email
Search
  SEO
  AEO
Analytics
Experiments
Vector Intelligence
  Recommendations
  Agents
  Approvals
  Activity
Connections
Settings
```

## 28.2 Home dashboard

The first screen should answer:

1. What happened?
2. Why did it happen?
3. What is Vector doing?
4. What requires approval?
5. What is likely to improve performance next?

Do not overload the homepage with every metric.

## 28.3 Recommendation card

Every recommendation should display:

- Finding.
- Evidence.
- Proposed action.
- Expected impact.
- Confidence.
- Risk.
- Cost.
- Whether human approval is required.
- Supporting data.
- Action buttons.

---

# 29. Environments and Deployment

Use at least:

```text
local
development
staging
production
```

Optional:

```text
preview
```

Never test provider side effects against real client audiences from development.

Create sandbox provider adapters where available.

## 29.1 Infrastructure

Initial production topology can remain simple:

```text
Cloudflare
→ Traefik
→ Docker Compose
   ├── control
   ├── delivery
   ├── api
   ├── postgres
   ├── redis
   └── support services
```

Trigger.dev may run hosted initially or self hosted after operational justification.

Do not adopt Kubernetes until real scaling or availability requirements justify the operational cost.

Guidance for the first 10–20 ordinary marketing clients: 8–12 vCPU, 16–32 GB RAM, NVMe, preferring 32 GB when commercially reasonable. Scale from requests, jobs, cache hit rate, and latency — not tenant count.

When measured demand requires it, split control/API, delivery, PostgreSQL, and workers, then scale delivery horizontally. Client custom domains must remain unchanged. Per-client quotas must prevent a noisy neighbor from exhausting the shared host.

---

# 30. Backup and Disaster Recovery

Required before first paying production client:

- Automated PostgreSQL backups.
- Encrypted off server backup copy.
- Restore test.
- R2 version and lifecycle strategy as appropriate.
- Provider connection re authorization procedure.
- Secret rotation procedure.
- Disaster recovery runbook.
- Target RPO.
- Target RTO.
- Incident owner.
- Status communication template.

A backup that has never been restored is not considered tested.

---

# 31. Testing Strategy

## 31.1 Unit tests

Focus on business invariants:

- Authorization.
- Tenant scoping.
- Consent.
- Suppression.
- Lead deduplication.
- Attribution.
- Approval policies.
- Experiment eligibility.
- AI action validation.
- Provider normalization.

## 31.2 Integration tests

- PostgreSQL.
- Redis.
- Trigger.dev jobs.
- Resend adapter.
- Social adapters.
- PostHog event emission.
- R2.
- AI structured outputs.

## 31.3 End to end tests

Critical paths:

- Client creation.
- Custom domain mapping.
- Funnel page render.
- Lead submission.
- Email nurture.
- Social publication.
- Approval.
- Experiment assignment.
- Analytics ingestion.

## 31.4 AI regression suite

Maintain versioned scenarios with expected properties rather than brittle exact wording.

Evaluate:

- Factuality.
- Brand compliance.
- Policy compliance.
- Correct tool selection.
- Correct refusal to execute.
- Schema compliance.
- Cross tenant safety.
- Cost.
- Latency.

---

# 32. Development Workflow with Cursor and Grok

Cursor should operate against explicit repository instructions.

## 32.1 Required repository context

Before implementation begins, Cursor must have:

- `AGENTS.md`.
- Architecture rules.
- Security rules.
- Tenant isolation rules.
- Coding conventions.
- Data modeling rules.
- Definition of done.
- Current roadmap.
- Decision log.
- Risk register.

## 32.2 Cursor task discipline

Every major implementation request should state:

- Goal.
- Scope.
- Non goals.
- Relevant docs.
- Acceptance criteria.
- Tests required.
- Migration impact.
- Security impact.

Do not instruct the agent with vague requests such as "build the whole marketing platform."

## 32.3 Pull request size

Prefer incremental vertical slices.

Example:

```text
Client entity
→ create client API
→ tenant context
→ client settings UI
→ tests
```

before:

```text
entire onboarding system
```

## 32.4 Cursor Automations

Use Cursor Automations for software engineering maintenance tasks such as:

- Dependency review.
- Test failure triage.
- Documentation freshness checks.
- Security scan review.
- PR hygiene.
- Repetitive codebase audits.

Do not depend on Cursor Automations as the only runtime for customer marketing operations.

---

# 33. Pre Implementation Documentation Gate

Implementation should not formally begin until the following documents exist at least in approved v0.1 form.

## P0 — Mandatory before core coding

1. `01_PRODUCT_VISION_AND_POSITIONING.md`
2. `02_SCOPE_AND_MVP.md`
3. `03_TENANCY_AND_DOMAIN_MODEL.md`
4. `04_SYSTEM_ARCHITECTURE.md`
5. `05_DATA_MODEL.md`
6. `06_EVENT_TAXONOMY_ATTRIBUTION.md`
7. `07_AI_AGENT_ARCHITECTURE_GOVERNANCE.md`
8. `08_AUTOMATION_WORKFLOWS.md`
9. `09_FUNNEL_ENGINE_DESIGN_SYSTEM.md`
10. `14_SECURITY_PRIVACY_COMPLIANCE.md`
11. `18_QA_TEST_STRATEGY.md`
12. `19_DEPLOYMENT_ENVIRONMENTS.md`
13. `22_CURSOR_AGENT_INSTRUCTIONS.md`
14. `23_DECISION_LOG.md`
15. `24_RISK_REGISTER.md`
16. `AGENTS.md`

Also required before onboarding, domain, delivery, or launch work:

- `26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md`

Its decisions are folded into `01`, `03`, `04`, `05`, `16`, `17`, `19`, and `21`. Where the appendix is more specific, it governs.

## P1 — Required before production integrations

17. `10_SEO_AEO_CONTENT_STANDARD.md`
18. `11_SOCIAL_PROVIDER_INTEGRATIONS.md`
19. `12_EMAIL_AND_DELIVERABILITY.md`
20. `13_ANALYTICS_CRO_EXPERIMENTS.md`
21. `15_API_INTEGRATION_CONTRACTS.md`
22. `16_OBSERVABILITY_SRE_DR.md`
23. `20_COSTS_USAGE_LIMITS.md`

## P2 — Required before first paying client launch

24. `17_CLIENT_ONBOARDING_OPERATIONS.md`
25. `21_ROADMAP_ACCEPTANCE_GATES.md`
26. Client specific onboarding worksheet.
27. Client data processing and privacy configuration.
28. Client provider access checklist.
29. Client approval policy.
30. Client launch checklist.
31. Incident and escalation contacts.
32. Client reporting definitions.

This generated starter pack creates the first 25 repository level documents plus the hosting and Vector 24 appendix so Cursor has a stable framework to refine.

---

# 34. MVP Definition

The MVP should prove that Vector can operate one client growth loop end to end.

## 34.1 MVP must include

### Platform

- Multi tenant organization and client model.
- User authentication.
- RBAC.
- Audit logs.
- Provider connection framework.

### Client knowledge

- Brand profile.
- Product or service catalog.
- Offer.
- Persona.
- Approved claims.
- Knowledge document storage.

### Funnel

- One configurable funnel.
- Custom domain.
- Preview hostname.
- Readiness and launch state tracking.
- Lead form.
- Server rendered metadata.
- Basic structured data.
- Conversion tracking.

### CRM

- Contacts.
- Leads.
- Lead lifecycle.
- Attribution.
- Lead score v1.

### Analytics

- PostHog integration.
- Standard event taxonomy.
- Funnel reporting.
- Source reporting.

### Email

- Resend integration.
- One nurture sequence.
- Suppression.
- Webhook ingestion.

### AI

- Research Agent.
- Funnel Strategist.
- Copy Agent.
- Analytics Agent.
- Structured output contracts.
- Approval workflow.
- AI run audit log.

### Automation

- Lead capture automation.
- Nurture automation.
- Weekly report.
- Recommendation generation.

## 34.2 Explicitly outside MVP

- Full social platform matrix.
- Full autonomous replies.
- Paid ad buying.
- Advanced multi touch attribution.
- Automatic budget movement.
- Full visual page builder.
- Marketplace.
- White label reseller system.
- Kubernetes.
- Custom email delivery infrastructure.
- Custom analytics warehouse.
- Broad full autonomy.

The MVP succeeds when one real client can be operated safely and measurably through Vector with substantially less repetitive manual labor.

---

# 35. Phased Roadmap

## Phase 0 — Specification and foundation

Deliver:

- Product documents.
- Architecture.
- Schema.
- Monorepo.
- CI.
- Local environment.
- Auth.
- Tenant context.
- Audit logging.
- Observability foundation.

Exit gate:

- Cross tenant tests pass.
- Core docs approved.
- Deployment pipeline works.

## Phase 1 — Client knowledge and funnel engine

Deliver:

- Client onboarding.
- Brand knowledge.
- Services and offers.
- Funnel schema.
- Renderer.
- Forms.
- Custom domains.
- Preview domain model.
- Client readiness model and scoring.
- Launch state machine.
- R2 assets.
- Metadata and SEO basics.

Exit gate:

- One client can publish a production grade lead funnel from a tracked launch state, including a private preview hostname.

## Phase 2 — Leads, analytics, and attribution

Deliver:

- Contacts.
- Leads.
- Event taxonomy.
- PostHog.
- Attribution v1.
- Dashboard.
- Conversion reporting.
- Launch-funnel analytics.
- Readiness and launch timing events.

Exit gate:

- A lead can be traced from acquisition source to conversion, and operators can see readiness-to-live timing.

## Phase 3 — Email and nurture

Deliver:

- Resend.
- Sending domain checks.
- Automated email domain readiness checks.
- Contact sync.
- Suppression.
- Sequence engine.
- Inbound hooks.
- Engagement events.

Exit gate:

- A new lead can safely enter and complete an approved nurture sequence.

## Phase 4 — Vector Intelligence v1

Deliver:

- AI provider interface.
- Grok.
- Prompt registry.
- Structured outputs.
- Research Agent.
- Copy Agent.
- Analytics Agent.
- Approvals.
- Cost ledger.

Exit gate:

- Every AI execution is typed, versioned, auditable, tenant scoped, and cost attributable.

## Phase 5 — Social

Deliver:

- Social provider interface.
- First priority platform adapters.
- Calendar.
- Approval.
- Publishing.
- Metrics collection.
- Automated social connection readiness checks.

Exit gate:

- Approved content can publish reliably to at least two priority platforms, and required social connections are readiness-gated.

## Phase 6 — SEO and AEO operations

Deliver:

- Search property connections.
- Crawl and page inventory.
- Technical issue model.
- Content opportunity model.
- Schema manager.
- Answer target workflows.

Exit gate:

- Vector can produce an evidence based prioritized search backlog.

## Phase 7 — CRO experimentation

Deliver:

- Hypothesis system.
- PostHog experiments.
- Variant lifecycle.
- Metrics.
- Decision records.

Exit gate:

- One full experiment runs from hypothesis through recorded learning.

## Phase 8 — Progressive autonomy

Deliver:

- Autonomy policies.
- Per action risk classes.
- Confidence and evidence thresholds.
- Conditional auto execution.
- Automatic rollback for selected actions.
- Launch automation policies.
- Low-risk launch auto-execution.

Exit gate:

- Low risk workflows and selected launch steps run without daily human intervention and remain auditable.

## Phase 9 — Multi client operational scale

Deliver:

- Usage quotas.
- Noisy-neighbor controls.
- Scaling alerts.
- Cost dashboards.
- Client level SLAs.
- Bulk monitoring.
- Provider health.
- Portfolio dashboard.
- Portfolio launch dashboard with Vector 24 clocks.
- Client templates.
- Operational queues.

Exit gate:

- Operators can oversee many clients by exception instead of manually reviewing every routine action, and a single tenant cannot exhaust shared resources.

---

# 36. First Five Client Learning Strategy

The first clients should deliberately serve as supervised system development cases.

## Client 1

Human led.

Goal:

- Discover missing business rules.
- Capture corrections.
- Build first vertical slice.

Every manual correction should answer:

```text
what was wrong
why it was wrong
what rule would prevent it
is the rule universal or client specific
how can it be tested
```

## Client 2

AI assisted.

Goal:

- Validate whether rules transfer.
- Identify client specific versus industry specific rules.
- Improve onboarding.

## Client 3

Workflow automated.

Goal:

- Allow entire low risk chains to execute automatically.
- Measure operator intervention rate.

## Client 4

Optimization focused.

Goal:

- Run controlled experiments.
- Build reusable learning objects.

## Client 5

Scale test.

Goal:

- Onboard with minimal engineering changes.
- Validate cost, reliability, documentation, and repeatability.

Do not call this model training unless actual model fine tuning is performed. It is primarily process codification, prompt and agent refinement, workflow refinement, and retrieval memory.

---

# 37. Definition of Done for Any Feature

A feature is not done when the UI works.

Definition of done:

- Business behavior documented.
- Tenant scoping implemented.
- Authorization implemented.
- Input validation implemented.
- Audit logging added where required.
- Analytics events defined.
- Errors normalized.
- Observability added.
- Unit tests pass.
- Integration tests pass where applicable.
- End to end path tested when critical.
- Accessibility checked.
- Mobile behavior checked.
- Security implications reviewed.
- Documentation updated.
- Migration rollback considered.
- Provider side effects tested safely.
- AI tools use structured contracts if applicable.
- Costs and quotas considered if applicable.

---

# 38. Key Product Improvements Added to the Original Concept

These are deliberate improvements beyond the original website plus social plus email plus analytics idea.

## 38.1 Growth memory

Vector should remember validated outcomes, not merely conversations.

The durable asset is:

```text
observation
→ action
→ result
→ context
→ confidence
→ reusable learning
```

## 38.2 Policy engine

AI autonomy should be configurable by:

- Client.
- Action.
- Channel.
- Risk.
- Cost.
- Time.
- Confidence.
- Evidence.
- Role.

## 38.3 Provider independence

Social, email, analytics, storage, and AI providers must be replaceable through internal adapters.

## 38.4 Revenue data

Do not stop at leads. Support imported or integrated sales outcomes so Vector can learn which acquisition sources create actual business value.

## 38.5 Cost aware optimization

A campaign that creates more leads but costs much more may be worse.

Vector Insights should eventually optimize for:

- Cost per qualified lead.
- Cost per acquisition.
- Gross revenue.
- Gross margin where available.
- Payback.
- Lifetime value where available.

## 38.6 Exception based operations

The long term goal is not a dashboard operators stare at all day.

The system should surface:

- Failures.
- Opportunities.
- Approvals.
- Anomalies.
- Risks.

Routine success should require minimal attention.

---

# 39. Risks and Mitigations

## Risk: AI produces incorrect business facts

Mitigation:

- Client knowledge authority model.
- Approved claims.
- Source provenance.
- Factual validation.
- Human review for sensitive claims.

## Risk: Cross tenant data leakage

Mitigation:

- Tenant context.
- Repository rules.
- automated leakage tests.
- security review.

## Risk: Provider account restrictions

Mitigation:

- Official APIs.
- rate limits.
- token health.
- provider adapters.
- fallbacks.
- clear failure queues.

## Risk: Email reputation damage

Mitigation:

- authentication.
- consent.
- suppression.
- gradual sending.
- bounce and complaint monitoring.

## Risk: Search spam classification

Mitigation:

- useful client specific content.
- human quality policy.
- no mass near duplicate generation.
- technical SEO standards.

## Risk: Agents make irreversible changes

Mitigation:

- policy engine.
- approvals.
- immutable versions.
- rollback.
- kill switches.
- bounded tools.

## Risk: Vendor lock in

Mitigation:

- internal provider interfaces.
- normalized database model.
- exported assets.
- structured AI contracts.

## Risk: AI spend grows unpredictably

Mitigation:

- model routing.
- token accounting.
- cache.
- budgets.
- cost ceilings.
- cheap models for simple tasks.

## Risk: Bad analytics creates bad decisions

Mitigation:

- event dictionary.
- instrumentation tests.
- data completeness checks.
- experiment governance.

---

# 40. Initial Build Order for Cursor

Cursor should execute in the following sequence.

1. Create the monorepo and baseline tooling.
2. Add environment validation and shared config.
3. Implement PostgreSQL, Drizzle, migrations, and seed framework.
4. Implement organization, client, user, membership, and tenant context.
5. Implement auth and RBAC.
6. Implement audit logging.
7. Add cross tenant integration tests.
8. Implement brand and client knowledge entities.
9. Implement R2 storage abstraction.
10. Implement funnel schema and renderer.
11. Implement custom domain registry, preview hostnames, and domain routing.
12. Implement forms, contacts, leads, and lead deduplication.
13. Implement standardized analytics events and PostHog adapter.
14. Implement attribution v1.
15. Implement Resend adapter, suppressions, and webhook ingestion.
16. Implement Trigger.dev workflow framework.
17. Implement lead capture to nurture workflow.
18. Implement AI provider abstraction and Grok adapter.
19. Implement prompt registry and structured output contracts.
20. Implement Research, Copy, and Analytics agents.
21. Implement approval workflow and activity feed.
22. Add social provider abstraction and first platform adapter.
23. Add SEO and AEO operational models.
24. Add experiments.
25. Add progressive autonomy policies.
26. Harden production operations.
27. Implement readiness scoring, launch states, and Vector 24 timing fields.
28. Onboard Client 1 under high supervision. Do not force the final 24-hour SLA.
29. Convert every discovered correction into documentation, tests, policy, or structured client configuration.

Cursor should not skip ahead to flashy AI autonomous features before tenant isolation, auditability, consent, events, and durable workflows exist.

---

# 41. First Cursor Kickoff Prompt

Use this only after Cursor has access to the repository and the documents in this pack.

```text
You are implementing Vector, an Autonomous Growth Operating System.

Read AGENTS.md, all P0 documents in /docs, and docs/26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md before writing code that touches onboarding, domains, delivery, or launch.

Do not implement the entire product at once.

Start with Phase 0 only.

Objectives:
1. Establish the Bun TypeScript monorepo structure defined in the architecture document.
2. Create SvelteKit control and delivery applications.
3. Create the Hono API application.
4. Create shared packages for config, contracts, database, auth, domain, observability, and UI.
5. Configure PostgreSQL with Drizzle migrations.
6. Implement organizations, clients, users, memberships, tenant context, and audit log foundations.
7. Implement secure session authentication and initial RBAC.
8. Add automated cross tenant isolation tests.
9. Add local Docker Compose development infrastructure for PostgreSQL and Redis.
10. Add CI for type checking, linting, tests, and migrations.

Constraints:
- TypeScript only unless a documented infrastructure reason requires another language.
- Bun is the default runtime.
- Svelte 5 and SvelteKit for frontend applications.
- Hono for domain API.
- PostgreSQL is the source of truth.
- Drizzle owns relational schema and migrations.
- Every tenant owned query must require client context.
- Never place provider secrets in frontend code.
- No production AI execution yet.
- No social integrations yet.
- No email sending yet.
- No premature microservices.
- No Kubernetes.
- No per-client application fork.
- No speculative abstractions without a current domain use.

Before coding:
1. Summarize the proposed Phase 0 changes.
2. Identify any conflict between the requested work and repository documents.
3. Create or update the implementation checklist in docs/21_ROADMAP_ACCEPTANCE_GATES.md.

Then implement Phase 0 as incremental vertical slices with tests.
```

---

# 42. Technology Validation Notes — August 2026

The following architecture assumptions were rechecked against current official documentation while preparing this plan.

## Cursor Automations

Cursor documents always on agents that can run on schedules or events including GitHub, Slack, and webhooks, with cloud sandboxes and memory. This is useful for engineering automation, but Vector production customer operations should remain in the product's own durable workflow layer.

Source:
https://cursor.com/changelog/03-05-26  
https://cursor.com/changelog/06-18-26  
https://cursor.com/blog/automations

## xAI Grok

xAI supports function calling and structured outputs. Current documentation states that strict tool arguments conform to JSON Schema, and supported schemas can be authored using tools such as Zod. This supports the design requirement that Vector agents produce typed decisions rather than executable free form prose.

Source:
https://docs.x.ai/developers/model-capabilities/text/structured-outputs  
https://docs.x.ai/developers/tools/function-calling  
https://docs.x.ai/developers/tools/overview

## Trigger.dev

Trigger.dev documents durable tasks, retries, checkpointing, versioning, idempotency, and Bun runtime support. This aligns well with the existing Bun oriented platform stack.

Source:
https://trigger.dev/product  
https://trigger.dev/blog/beta-to-latest-announcement

## PostHog

PostHog currently exposes Svelte support alongside analytics, session replay, web analytics, experiments, feature flags, dashboards, and other product analytics capabilities. This makes it a strong initial behavioral analytics and experimentation provider.

Source:
https://posthog.com/services

## Resend

Resend supports broadcast APIs, audience segmentation and topics, and webhook driven event notifications. These capabilities support outbound nurture, preference management, and delivery event ingestion.

Source:
https://resend.com/docs/dashboard/broadcasts/introduction  
https://resend.com/docs/dashboard/topics/introduction  
https://resend.com/docs/webhooks/introduction

## Cloudflare R2

Cloudflare R2 exposes an S3 compatible API and is appropriate for unstructured client media and generated assets.

Source:
https://developers.cloudflare.com/r2/get-started/s3/  
https://developers.cloudflare.com/r2/api/s3/api/

Technology choices must still be wrapped behind Vector owned interfaces because vendor capabilities and economics will change.

---

# 43. Final Architectural Decision

Build Vector as one multi tenant growth operating system with a shared core, client specific configuration, client specific knowledge, client specific policies, and client specific measurable learning.

MGE sells. Vector operates. Many independent client growth systems are served from one logical Delivery Plane. The first 10–20 ordinary clients may run on one capable server. The architecture must be able to leave that server later without changing client domains.

The long-term operational target is Vector 24: a normal client that has completed Vector Readiness can receive a production-ready initial growth system within 24 hours. That target governs onboarding, domains, publication, QA, and operator UX.

Use Cursor and Grok to accelerate development.

Use Grok through a production AI provider interface to reason.

Use structured contracts and policies to decide what an AI action is allowed to do.

Use Trigger.dev to execute durable work.

Use PostgreSQL as business source of truth.

Use PostHog to observe behavior and run controlled product experiments.

Use Resend to deliver and receive email.

Use official social provider APIs behind replaceable adapters.

Use Cloudflare and R2 for edge delivery and media.

Most importantly, optimize Vector around **business outcomes and accumulated validated learning**, not around how much content AI can generate.

The long term moat is not Grok itself.

The moat is the combination of:

```text
client knowledge
+ growth operating rules
+ measured outcomes
+ experiment history
+ reusable validated learning
+ safe automation
+ multi client operational scale
```

That is what should eventually make Vector better with every client it operates.
