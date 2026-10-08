# VECTOR Client Experience, Revenue Intelligence & Growth Outcomes

## Client UX, Goals, Sales Outcomes, Revenue Attribution, Data Health, Offers, Entitlements, Client Success, and Commercial Scale

**Project:** Vector — Autonomous Growth OS  
**Document number:** 30  
**Document type:** Cross-cutting product, UX, analytics, revenue intelligence, and client operations standard  
**Recommended repository location:** `/docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md`  
**Status:** Accepted architecture standard (ADR-0009). Implementation follows the O1–O20 track. Client Value V0–V5 / O21–O22 extends this charter (`docs/plans/CLIENT_VALUE_TRACK.md`, ADR-0012) and is not a second source of truth. This does not reopen Phase 2, Phase 3, or Phase 4 exits.  
**Version:** 1.1  
**Date:** 22 August 2026  
**Applies to:** Client onboarding, client dashboard, CRM linkage, lead lifecycle, sales outcomes, revenue attribution, analytics confidence, goals/KPIs, offers, approvals, notifications, package entitlements, client success health, Vector Insights, CRO, paid acquisition readiness, billing readiness, and long-term autonomous optimization  
**Does not replace:** `docs/27` public visitor UX, `docs/28` Control / Vector product identity, or `docs/29` Creative Engine. Authenticated client screens use `docs/28` chrome and this document’s information architecture and copy. Client Value (`docs/plans/CLIENT_VALUE_TRACK.md`) extends this charter; it is not a second sales or revenue ledger.

---

# 1. Purpose

This document closes the gap between **marketing activity** and **actual client business outcomes**.

Vector must not stop at:

```text
traffic
→ page views
→ form submissions
→ leads
```

The system must progressively connect:

```text
traffic
→ lead
→ qualified lead
→ conversation
→ appointment / proposal / checkout
→ won sale
→ revenue
→ margin where available
→ repeat value where available
```

This document also establishes the client-facing UX philosophy required to make Vector easy for ordinary business owners to use without exposing unnecessary technical complexity.

Its two primary goals are:

1. Make Vector optimize toward **meaningful business outcomes**, not vanity metrics.
2. Make the client experience **simple, outcome-first, intuitive, low-friction, and decision-oriented**.

---

# 2. Core Product Principle

The governing principle is:

> **Clients should operate growth outcomes, not marketing infrastructure.**

A client should not need to understand:

- event schemas;
- model providers;
- attribution internals;
- SEO implementation details;
- webhooks;
- queue systems;
- prompt versions;
- provider adapters;
- experiment statistics;
- database entities.

The client should be able to answer:

```text
How are we doing?
Where are our leads coming from?
Which activities are producing revenue?
What is Vector doing?
What needs my approval?
What should we improve next?
```

Vector should translate technical complexity into business decisions.

---

# 3. Relationship to Existing Vector Documents

This document must be wired into the existing implementation pack.

## 3.1 `01_PRODUCT_VISION_AND_POSITIONING.md`

This document strengthens the positioning of Vector as an **Autonomous Growth OS**.

Vector is not only responsible for generating activity.

It must connect activities to:

- qualified opportunities;
- sales;
- revenue;
- strategic progress.

Recommended product framing:

> Vector continuously improves the systems that generate, convert, nurture, and measure customer demand.

Avoid unconditional claims that Vector guarantees revenue growth.

---

## 3.2 `02_SCOPE_AND_MVP.md`

The MVP should include a minimal sales outcome loop.

Minimum requirement:

```text
visitor
→ lead
→ lead status
→ won/lost outcome
→ optional revenue value
→ attribution
```

The MVP does not require:

- a full enterprise CRM;
- advanced sales forecasting;
- commission management;
- multi-touch algorithmic attribution;
- autonomous ad budget changes.

---

## 3.3 `03_TENANCY_AND_DOMAIN_MODEL.md`

All client-facing goals, revenue, deal values, pipeline activity, client health, notification settings, package entitlements, and data-quality records are tenant-owned and require explicit `client_id`.

Cross-tenant aggregation is permitted only for MGE internal reporting and must remain permission-controlled.

---

## 3.4 `04_SYSTEM_ARCHITECTURE.md`

This document primarily affects the **Control Plane**.

It adds major Control Plane capabilities:

```text
Client Overview
Today
Goals
Leads
Sales Outcomes
Revenue
Approvals
Insights
Client Health
Entitlements
Notifications
```

The Delivery Plane continues to collect reliable conversion signals.

---

## 3.5 `05_DATA_MODEL.md`

Add the entities defined later in this document.

Key new domains:

- client goals;
- sales pipeline;
- revenue outcomes;
- data health;
- attribution confidence;
- offers;
- entitlements;
- client health;
- notification preferences;
- reporting summaries.

---

## 3.6 `06_EVENT_TAXONOMY_ATTRIBUTION.md`

Extend the event taxonomy beyond lead creation.

Recommended outcome events:

```text
lead_contacted
lead_qualified
appointment_scheduled
appointment_completed
proposal_created
proposal_sent
proposal_accepted
deal_won
deal_lost
purchase_completed
revenue_recorded
refund_recorded
repeat_purchase
```

Do not treat all events as equally authoritative.

Revenue and sales events should record their source of truth.

---

## 3.7 `07_AI_AGENT_ARCHITECTURE_GOVERNANCE.md`

Vector agents may analyze sales and revenue data but must distinguish:

```text
observed
directly measured
inferred
estimated
unknown
```

AI must not invent sales, revenue, profit, close rates, attribution, or customer value.

Any recommendation based on incomplete outcome data must communicate uncertainty.

---

## 3.8 `08_AUTOMATION_WORKFLOWS.md`

Add workflows for:

- lead stage changes;
- high-intent lead alerts;
- stale lead reminders;
- sales outcome reconciliation;
- revenue imports;
- attribution reconciliation;
- goal progress reviews;
- data health checks;
- client digest generation;
- client health scoring;
- approval reminders;
- expiring connection alerts.

---

## 3.9 `09_FUNNEL_ENGINE_DESIGN_SYSTEM.md`

Funnels should report downstream outcome relationships.

Example:

```text
Funnel A

Leads:
120

Qualified:
38

Won:
11

Revenue:
₱462,000
```

This is more useful than funnel conversion alone.

---

## 3.10 `10_SEO_AEO_CONTENT_STANDARD.md`

Search and generative-discovery activity should eventually be evaluated against:

- qualified leads;
- revenue;
- target service demand;
- business goal contribution.

Do not optimize only for rankings, traffic, or AI citations.

The client dashboard must distinguish observed AI visibility from proven referral from proven business outcome. Do not assign revenue because a generative engine named the brand.

---

## 3.11 `11_SOCIAL_PROVIDER_INTEGRATIONS.md`

Social performance should support downstream attribution.

Examples:

```text
post
→ click
→ lead
→ qualified lead
→ sale
```

Engagement is useful but should not automatically be treated as business success.

---

## 3.12 `12_EMAIL_AND_DELIVERABILITY.md`

Email reporting should support:

```text
delivered
→ clicked
→ lead progression
→ appointment
→ sale
```

Where attribution is available.

---

## 3.13 `13_ANALYTICS_CRO_EXPERIMENTS.md`

Experiment success metrics should increasingly use business outcomes.

Examples:

Weak metric:

```text
CTA click rate
```

Better metric:

```text
qualified lead rate
```

Best metric where data volume permits:

```text
revenue per eligible visitor
```

Do not use downstream revenue metrics when sample size is too small or data quality is weak.

---

## 3.14 `14_SECURITY_PRIVACY_COMPLIANCE.md`

Revenue and customer outcome data may be commercially sensitive.

Apply:

- strict role permissions;
- minimization;
- audit;
- tenant isolation;
- retention rules.

Do not expose internal client revenue to unauthorized MGE staff or unrelated client users.

---

## 3.15 `15_API_INTEGRATION_CONTRACTS.md`

CRM, booking, ecommerce, POS, payment, and accounting sources should use adapter interfaces.

Suggested abstractions:

```text
CRMProvider
SalesOutcomeProvider
RevenueProvider
BookingProvider
CommerceProvider
AdProvider
BillingProvider
```

---

## 3.16 `16_OBSERVABILITY_SRE_DR.md`

Business data health must become observable alongside technical health.

Examples:

- lead ingestion healthy;
- CRM sync delayed;
- revenue import stale;
- Meta connection expired;
- search data stale;
- attribution incomplete.

---

## 3.17 `17_CLIENT_ONBOARDING_OPERATIONS.md`

Onboarding must capture:

- primary business goal;
- primary conversion;
- sales process;
- what counts as a qualified lead;
- what counts as a sale;
- revenue measurement method;
- current CRM or booking system;
- approval preferences;
- notification preferences.

Client should confirm these at a business level without technical configuration.

---

## 3.18 `18_QA_TEST_STRATEGY.md`

Add tests for:

- stage transitions;
- revenue recording;
- attribution reconciliation;
- goal calculations;
- entitlements;
- notification routing;
- client health scoring;
- data confidence display.

---

## 3.19 `20_COSTS_USAGE_LIMITS.md`

This document complements internal cost accounting by connecting client service costs to:

- client revenue;
- attributed revenue;
- package value;
- contribution margin.

Do not expose MGE internal margins to clients unless intentionally designed.

---

## 3.20 `21_ROADMAP_ACCEPTANCE_GATES.md`

Add the milestones defined later.

---

## 3.21 `22_CURSOR_AGENT_INSTRUCTIONS.md`

Cursor must treat client UI as business-outcome-first.

Do not expose internal technical complexity by default.

---

## 3.22 `26_MGE_VECTOR_HOSTING_SCALING_VECTOR24.md`

Vector 24 should launch a client with:

- primary goal configured;
- conversion definition configured;
- minimal lead pipeline configured;
- outcome tracking method configured;
- client notification defaults configured.

---

## 3.23 `27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md`

Document 27 governs public-facing visitor UX.

Document 30 governs **authenticated client UX and business intelligence presentation**.

The two should share:

- clarity;
- premium quality;
- progressive disclosure;
- mobile-first behavior;
- strong hierarchy;
- minimal cognitive load.

---

## 3.24 `28_VECTOR_HERO_AND_PRODUCT_VISUAL_LANGUAGE.md`

Document 28 is Control / Vector product identity. Authenticated client and operator screens live on the Control Plane and use those tokens.

This document governs **what those screens say and prioritize**: outcomes, goals, approvals, confidence, and progressive disclosure. It is not a second visual language. Do not apply `docs/27` cinematic Delivery art to client dashboards. Do not paint tenant Delivery sites with Vector Black / Blue.

## 3.25 `29_VECTOR_CREATIVE_ASSET_GENERATION_MEDIA_PIPELINE.md`

Creative performance should eventually connect to:

```text
creative
→ campaign
→ lead
→ sale
→ revenue
```

That join is Creative C8 plus this charter. It is not a Phase 5 social-publish requirement. This allows Vector to learn which creative approaches produce business outcomes, not merely clicks.

---

# 4. Client UX Philosophy

The client interface should optimize for five questions.

## 4.1 How are we doing?

Show:

- goal progress;
- qualified leads;
- sales;
- revenue;
- change versus prior period.

## 4.2 Where is growth coming from?

Show:

- channels;
- campaigns;
- funnels;
- services/products;
- offers.

## 4.3 What is Vector doing?

Show:

- active campaigns;
- nurtures;
- experiments;
- publishing;
- SEO actions;
- automations.

## 4.4 What needs me?

Show:

- approvals;
- missing access;
- expired connections;
- unresolved business facts.

## 4.5 What should we improve?

Show:

- ranked recommendations;
- evidence;
- expected impact;
- confidence;
- requested action.

---

# 5. Progressive Disclosure

Do not expose every subsystem in the default client navigation.

## Simple Client Navigation

Recommended default:

```text
Overview
Today
Leads
Campaigns
Approvals
Insights
```

Optional expanded modules:

```text
Analytics
Social
Email
Search
Creative
Experiments
Sales
Settings
```

The platform may unlock or display modules according to:

- package;
- client sophistication;
- role;
- active integrations.

---

# 6. Client Home Dashboard

The homepage should prioritize business outcomes.

Example:

```text
THIS MONTH

Revenue          ₱684,000
Sales                   23
Qualified Leads          52
Total Leads             147

Revenue          +18.4%
Qualified Leads  +12.1%
```

Then:

```text
TOP GROWTH SOURCES

Google Organic     ₱287,000
Facebook           ₱191,000
Email              ₱124,000
Direct              ₱82,000
```

Then:

```text
VECTOR STATUS

✓ 2 campaigns active
✓ 43 leads in nurture
✓ 4 posts scheduled
✓ 17 search opportunities monitored
✓ 1 experiment running

1 approval required
```

Avoid turning the home screen into a dense analytics console.

---

# 7. Today View

Create a dedicated **Today** view.

Its purpose is to provide an immediate operating summary.

Example:

```text
TODAY

8 new leads
3 high-intent leads
2 sales
₱78,000 attributed revenue
1 approval required
```

Then:

## What Needs You

```text
September Promotion
Awaiting campaign approval
```

## What Vector Handled

```text
✓ Sent 11 nurture messages
✓ Published 1 social post
✓ Fixed 3 SEO issues
✓ Generated 2 creative variants
```

## Important Changes

```text
Google leads +21%
Facebook conversion -9%
```

The client should be able to understand their growth system in under one minute.

---

# 8. Goals and KPI Model

Every client should have explicit goals.

## 8.1 Goal Types

Examples:

```text
qualified_leads
sales
revenue
bookings
appointments
subscriptions
purchases
calls
applications
custom
```

## 8.2 Goal Fields

```text
id
client_id
name
goal_type
target_value
unit
period
start_date
end_date
primary
baseline_value
status
data_source
created_by
approved_by
```

## 8.3 Goal UX

Example:

```text
MONTHLY TARGET

Qualified Leads
████████████████░░░░ 82 / 100

Revenue
██████████████░░░░░░ ₱710k / ₱1m
```

## 8.4 Goal Hierarchy

Allow:

```text
Business Goal
    ↓
Strategy
    ↓
Initiatives
    ↓
Activities
    ↓
Outcomes
```

Example:

```text
GOAL
Increase bookings

STRATEGY
Capture more high-intent search traffic

INITIATIVES
SEO
Landing page
Email nurture

OUTCOMES
Traffic
Qualified leads
Bookings
Revenue
```

Every major Vector recommendation should connect to a goal where possible.

---

# 9. Lightweight Sales Pipeline

Vector should include a lightweight sales outcome model even when the client has no external CRM.

Phase 2 already ships this enum. Do not rewrite it or edit applied migration `0006_phase2_leads.sql`:

```text
new
working
qualified
won
lost
spam
```

`working` is the contacted state. `spam` stays as a quality isolation state. `appointment` and `proposal` belong on `sales_outcomes.outcome_type` (or a later additive stage) rather than a destructive enum replace.

O3 is in: tenant-owned `sales_outcomes` with optional integer `amount_minor` + currency. Control `/leads` records Contacted / Qualified / Appointment / Won / Lost. Appointment does not change `lead_status`. A won lead may exist without this row.

Allow client-specific stage configuration later. Every transition still records actor, reason, and timestamp on `lead_status_history`.

## 9.1 Lead Record

Client-facing lead view may show:

```text
Maria Santos

Interest:
Dental Implants

Intent:
High

Status:
Qualified

Source:
Google Organic

Campaign:
Implant Cebu

Estimated Value:
₱85,000

Next Action:
Consultation tomorrow
```

## 9.2 Stage History

Every stage transition must record:

```text
from_stage
to_stage
timestamp
actor
reason
source
```

---

# 10. External CRM Integration

Vector should not require clients to abandon an existing CRM.

Use:

```text
CRMProvider
```

Possible future integrations:

- HubSpot;
- Salesforce;
- Pipedrive;
- Zoho;
- industry-specific CRMs;
- custom client systems.

Support:

```text
push lead
pull stage
pull deal
pull revenue
sync contact
```

Conflict rules must be explicit.

---

# 11. Sales Outcomes

Create durable sales outcome records.

Suggested fields:

```text
id
client_id
lead_id
contact_id
deal_id
outcome_type
service_id
product_id
offer_id
amount_minor
currency
gross_margin_minor
won_at
lost_at
source
source_record_id
confidence
created_at
updated_at
```

Outcome types may include:

```text
appointment
proposal
won
lost
purchase
subscription
renewal
refund
repeat_purchase
```

---

# 12. Revenue Intelligence

Vector should distinguish:

## Lead Volume

How many leads?

## Lead Quality

How many became qualified?

## Sales Conversion

How many became customers?

## Revenue

How much revenue resulted?

## Profitability

Where gross margin data is available, how much value did the growth activity produce?

---

# 13. Revenue Attribution

Revenue attribution must be presented carefully.

Use categories:

```text
Directly attributed
Strongly associated
Assisted
Estimated
Unattributed
```

Do not present uncertain attribution as fact.

## 13.1 Attribution Sources

Examples:

- explicit campaign IDs;
- server-side conversion records;
- CRM source;
- checkout order reference;
- booking reference;
- UTM;
- last non-direct touch;
- first touch;
- manually assigned source.

## 13.2 Attribution Confidence

Recommended:

```text
high
medium
low
unknown
```

---

# 14. Data Health

Create a first-class **Vector Data Health** capability.

## 14.1 Why

Bad data can produce bad strategy.

Vector must know whether the data it is analyzing is:

- fresh;
- complete;
- delayed;
- partially missing;
- inconsistent.

## 14.2 Health Sources

Check:

```text
website tracking
lead capture
email events
social metrics
search data
CRM sync
sales outcome sync
revenue sync
ad platform sync
experiment events
```

## 14.3 Client Display

Example:

```text
DATA HEALTH

Website Tracking     ✓ Healthy
Lead Tracking        ✓ Healthy
Email                ✓ Healthy
Revenue Sync         ⚠ Delayed
Meta                 ✓ Healthy
Google Search        ✓ Healthy

Overall Confidence: 94%
```

## 14.4 Agent Rule

Vector Intelligence must check data health before making important recommendations.

---

# 15. Analytics Confidence

Every reportable metric should have metadata where appropriate:

```text
source
last_updated_at
coverage
confidence
estimated
```

The UI may expose simplified labels:

```text
Measured
Estimated
Incomplete
```

Avoid false precision.

---

# 16. Server-Side Conversion Capture

High-value events should be captured server-side wherever Vector controls the transaction.

Examples:

```text
lead submission
booking
quote accepted
checkout
purchase
subscription
```

Preferred:

```text
Browser
   ↓
Vector API
   ↓
PostgreSQL
   ↓
Analytics providers
```

Do not rely only on client-side JavaScript for critical conversions.

---

# 17. Offer Model

Products and services are not the same as offers.

Example:

```text
SERVICE
Dental Implants
```

```text
OFFER
Free Implant Consultation
```

```text
CAMPAIGN
September Implant Campaign
```

Phase 1 already has tenant-scoped `offers` (`name`, `summary`, `starting_price_minor`, `currency`). That is a priced offer on the knowledge profile, not a colliding second table.

Campaign-offer fields below extend or version that domain. Do not create a second `offers` table without an explicit schema decision. Do not mutate the applied Phase 1 migration by hand.

## 17.1 Suggested Offer Fields

```text
id
client_id
name
description
offer_type
service_id
product_id
price_minor
discount_minor
currency
valid_from
valid_until
eligibility
terms
primary_cta
status
approved_by
```

---

# 18. Offer Testing

Vector should eventually test commercial propositions.

Examples:

```text
Offer A
Free consultation

Offer B
Free consultation + financing assessment

Offer C
Low-cost paid consultation
```

Measure:

- lead rate;
- qualified lead rate;
- sales rate;
- revenue;
- margin if available.

Offer optimization may create more value than purely visual optimization.

---

# 19. Recommendation Provenance

Every recommendation should explain its basis.

Required recommendation fields:

```text
finding
evidence
data_sources
goal
proposed_action
expected_impact
confidence
risk
cost
approval_required
```

Client view:

```text
RECOMMENDATION

Shorten the mobile lead form.

WHY
63% of mobile visitors who begin the form abandon before field 4.
Desktop abandonment is 21%.

EXPECTED EFFECT
+8–14% form completions

CONFIDENCE
High

[Approve Experiment]
```

---

# 20. Explainability Standard

Every client-facing AI recommendation should answer:

1. What happened?
2. Why does Vector think it happened?
3. What does Vector recommend?
4. What evidence supports this?
5. What is the expected benefit?
6. How confident is Vector?
7. What action is required from the client?

Avoid opaque messages such as:

> AI recommends optimizing your campaign.

---

# 21. Approval Center

Make approvals a first-class client experience.

Recommended categories:

```text
Campaign
Creative
Email
Social
Funnel
Offer
Experiment
Business Fact
Access
```

## 21.1 Approval Bundle

Prefer approving a coordinated business package.

Example:

```text
SEPTEMBER PROMOTION

Includes:
✓ Landing page
✓ 5 social posts
✓ 3 emails
✓ 8 creatives

[Preview Campaign]

[Approve All]
[Request Changes]
[Reject]
```

Do not force clients to approve every asset individually unless they choose detailed review.

---

# 22. Approval Preferences

Clients may define:

```text
social evergreen
auto-approve

major promotion
approval required

pricing
approval required

SEO metadata fixes
auto-approve

new email campaign
approval required
```

Approval policies must connect to the autonomy model.

---

# 23. Notification Preferences

The client should control when Vector contacts them.

Suggested categories:

```text
critical_system
high_intent_lead
approval_required
campaign_result
weekly_summary
monthly_report
provider_connection
data_health
routine_activity
```

Suggested frequency:

```text
immediate
daily_digest
weekly_digest
monthly
in_app_only
disabled
```

Example:

```text
Critical problems      Immediate
High-intent leads      Immediate
Approvals              Daily digest
Weekly performance     Monday
Routine activity       In app only
```

---

# 24. Ask Vector

Create a client-facing conversational intelligence interface.

Examples:

```text
Why were leads down this week?

Which service generated the most revenue?

What should we promote next month?

Why is Facebook underperforming?

What is preventing us from hitting our goal?
```

Requirements:

- tenant-scoped retrieval;
- business-data grounding;
- citations or drill-down references to internal evidence where practical;
- uncertainty disclosure;
- no unsupported business claims;
- respect permissions.

Ask Vector is not a generic chatbot.

It is a conversational interface to the client's verified growth system.

---

# 25. Monthly Growth Review

Generate an executive narrative.

Example:

```text
MONTHLY GROWTH REVIEW

Revenue
+17%

Qualified Leads
+24%

Best Channel
Google Organic

Best Campaign
Implant Consultation

Largest Opportunity
Whitening mobile funnel

Largest Issue
Facebook traffic quality declined

Vector completed
17 automated improvements

Recommended Next Move
Launch financing-focused implant funnel
```

Client should be able to:

```text
View Details
Download Report
Ask Vector
```

---

# 26. Client Success Health

Create a client health model.

Possible dimensions:

```text
growth_health
data_health
email_health
provider_health
client_engagement
approval_latency
goal_progress
billing_health
```

Example:

```text
ABC Dental

Growth Health       Healthy
Data Health         Healthy
Email Health        Healthy
Client Engagement   Warning
Approval Delay      4 days
```

---

# 27. Client Blockers

Show what is preventing Vector from acting.

Example:

```text
VECTOR NEEDS YOU

2 items are blocking improvements.

1. September campaign approval
   Waiting 4 days

2. Facebook connection expired
   Reconnect
```

This separates:

```text
Vector failure
```

from:

```text
client dependency
```

and improves accountability.

---

# 28. Package Entitlements

Vector must know what each client purchased.

Create:

```text
plans
plan_entitlements
client_subscriptions
client_entitlements
entitlement_usage
```

Example:

## Starter

```text
1 active funnel
2 social channels
8 posts/month
email nurture
basic SEO
monthly report
```

## Growth

```text
multiple funnels
4 social channels
20 posts/month
advanced email
AEO / GEO
experiments
creative variants
```

The software should enforce entitlements.

Do not rely on staff memory.

---

# 29. Entitlement UX

When a client encounters a non-included capability:

Do not show an error.

Show:

```text
Advanced CRO is available on Growth plans.

[See Upgrade Options]
```

Do not aggressively upsell inside every screen.

---

# 30. Internal Client Profitability

MGE should be able to measure internal economics.

Example:

```text
CLIENT ABC

Monthly Revenue            ₱40,000

AI Cost                     ₱1,900
Email                         ₱500
Infrastructure              ₱1,300
Creative Generation           ₱700
Estimated Operations        ₱5,000

Contribution               ₱30,600
```

This view is internal only unless a deliberate commercial reason exists.

---

# 31. Paid Acquisition Readiness

Paid advertising should be a future subsystem.

Create an abstraction:

```text
AdProvider
```

Possible future adapters:

- Google Ads;
- Meta Ads;
- TikTok Ads;
- LinkedIn Ads.

Initial scope should focus on reading:

```text
campaign
spend
clicks
conversions
creative
audience
revenue
```

Do not initially allow AI to change budgets automatically.

---

# 32. Paid Acquisition Autonomy

Recommended maturity:

## Level 0

Read and analyze.

## Level 1

Recommend changes.

## Level 2

Create draft campaign structures.

## Level 3

Execute pre-approved low-risk changes within limits.

## Level 4+

Only after substantial operational evidence.

Never allow unrestricted autonomous spend.

---

# 33. Billing Readiness

Billing is not required for early MVP but architecture should anticipate:

```text
subscription
setup_fee
monthly_fee
usage
add_on
overage
credit
discount
invoice
payment_status
```

Create a future `BillingProvider`.

Do not tightly couple the core platform to one payment processor.

---

# 34. Client UI Roles

Recommended client roles:

## Client Owner

Can:

- see all business outcomes;
- approve;
- manage team;
- manage package;
- configure major policies.

## Client Marketing

Can:

- see campaigns;
- review content;
- manage approvals;
- inspect analytics.

## Client Sales

Can:

- see leads;
- update pipeline;
- record outcomes.

## Client Analyst

Can:

- inspect analytics and reports.

## Client Reviewer

Can:

- approve assigned items only.

---

# 35. Mobile Client UX

The client mobile experience should prioritize:

```text
Today
High-intent leads
Approvals
Alerts
Goal progress
Ask Vector
```

Do not attempt to replicate a complex desktop analytics workspace on mobile.

---

# 36. Dashboard Information Hierarchy

Use three levels.

## Level 1 — Executive

```text
Revenue
Sales
Qualified Leads
Goal Progress
```

## Level 2 — Explanation

```text
Channels
Campaigns
Funnels
Offers
```

## Level 3 — Technical Detail

```text
events
attribution
source records
experiment detail
data coverage
```

Most clients should spend most of their time in Levels 1 and 2.

---

# 37. Default Client Navigation

Recommended:

```text
Today
Overview
Leads
Campaigns
Approvals
Insights
```

Expandable:

```text
Sales
Analytics
Social
Email
Search
Creative
Experiments
Settings
```

---

# 38. MGE Operator Navigation

Operators may require:

```text
Portfolio
Launches
Clients
Approvals
Alerts
Campaigns
Leads
Creative
Search
Email
Social
Experiments
Data Health
Client Health
Usage
Costs
Connections
Agents
Automation
Settings
```

Client and operator navigation must not be identical.

---

# 39. Portfolio View

MGE should operate many clients by exception.

Example:

```text
CLIENT            GROWTH      DATA       ACTION
ABC Dental        Healthy     Healthy    None
XYZ Plumbing      Healthy     Warning    CRM Sync
DEF Consulting    Warning     Healthy    Approval
```

The operator should not need to open every client every day.

---

# 40. Exception-Based Operations

Surface:

- failures;
- risks;
- approvals;
- opportunities;
- data gaps;
- health problems;
- launch blockers.

Hide routine success by default.

Example:

```text
20 Clients

17 Healthy
2 Need Approval
1 Needs Attention
```

---

# 41. Client Goal Review Workflow

Recommended monthly:

```text
current goal progress
    ↓
performance summary
    ↓
data quality check
    ↓
strategy review
    ↓
new recommendations
    ↓
goal adjustment if needed
```

Goal changes should be recorded.

Do not retroactively alter historical targets.

---

# 42. Lead Intent Model

Lead score should be explainable.

Example:

```text
High Intent

Why:
✓ Pricing viewed
✓ Service page viewed twice
✓ Financing FAQ viewed
✓ Form submitted
```

Avoid opaque:

```text
AI score: 87
```

without explanation.

---

# 43. Lead Quality Feedback

Allow client sales staff to provide feedback:

```text
Good lead
Bad fit
Spam
No budget
Wrong service
Ready to buy
```

This becomes a critical learning signal.

Vector can use it to improve:

- targeting;
- funnel qualification;
- content;
- campaigns;
- scoring.

---

# 44. Lost Reason

When a deal is lost, optionally record:

```text
price
timing
competitor
no response
not qualified
wrong service
capacity
other
```

This data may identify commercial problems that marketing alone cannot fix.

---

# 45. Revenue Data Sources

Possible:

- manual entry;
- CRM;
- booking software;
- ecommerce;
- payment provider;
- POS;
- accounting;
- imported CSV.

Every revenue record must preserve source provenance.

---

# 46. Revenue Reconciliation

Do not blindly duplicate revenue from multiple sources.

Use:

```text
source_record_id
transaction_reference
amount
timestamp
customer identity
```

to deduplicate and reconcile.

---

# 47. Client-Supplied Revenue Privacy

Clients may choose not to supply revenue values.

Vector must still work with:

```text
won deals
qualified leads
appointments
conversion rates
```

Revenue optimization becomes limited but not required.

---

# 48. Data Freshness

Record expected update cadence.

Examples:

```text
Web analytics
near real-time

CRM
every 15 minutes

Search Console
daily

Revenue import
daily
```

If freshness exceeds expected tolerance, mark health as degraded.

---

# 49. Recommendation Prioritization

Rank recommendations by:

```text
expected business impact
confidence
effort
cost
risk
goal relevance
data quality
```

Example conceptual score:

```text
priority =
impact
× confidence
× goal relevance
÷ effort/risk
```

Do not rely on one formula permanently; keep the scoring explainable.

---

# 50. Opportunity Queue

Vector should maintain a prioritized queue.

Example:

```text
HIGH
Shorten mobile lead form

HIGH
Create financing-focused implant page

MEDIUM
Test testimonial placement

LOW
Change footer CTA
```

Operators and clients can see why.

---

# 51. Strategy Versioning

Growth strategies should be versioned.

Store:

```text
strategy_version
effective_date
goals
assumptions
initiatives
approved_by
outcome_summary
```

This allows Vector to later evaluate whether the strategy worked.

---

# 52. Strategy Learning

At the end of a strategy period:

```text
What was planned?
What was executed?
What happened?
What was learned?
What changes next?
```

This creates institutional learning rather than endless AI regeneration.

---

# 53. Client Approval Friction Metric

Measure:

```text
median approval time
approval backlog
expired approvals
launch delays due to approval
```

A client who waits six days to approve a campaign should not appear as a Vector execution failure.

---

# 54. Client Engagement Health

Possible signals:

- login frequency;
- approval responsiveness;
- sales outcome updates;
- unread important alerts;
- stale access requests;
- strategy review completion.

Use carefully.

Do not manipulate or penalize clients unfairly.

---

# 55. Client Satisfaction

Eventually capture:

```text
campaign satisfaction
lead quality satisfaction
platform satisfaction
support satisfaction
```

Use lightweight surveys.

Do not create survey fatigue.

---

# 56. Vector Success Metrics

Vector itself should track:

```text
time_to_vector_ready
ready_to_live
manual_interventions_per_launch
qualified_leads_per_client
sales_outcome_coverage
revenue_attribution_coverage
client_approval_latency
recommendation_acceptance_rate
experiment_win_rate
automation_success_rate
client_retention
```

---

# 57. Outcome Coverage

Create an internal metric:

```text
sales_outcome_coverage
```

Example:

```text
87% of qualified leads have a known outcome
```

If only 20% of leads have known outcomes, revenue recommendations should have lower confidence.

---

# 58. Attribution Coverage

Example:

```text
Revenue Attribution Coverage
82%
```

This tells operators whether Vector understands enough of the business cycle.

---

# 59. Client Reporting Language

Use business language.

Prefer:

```text
12 new sales
```

over:

```text
12 conversion events
```

Prefer:

```text
Google generated ₱287k
```

when directly measured and defensible.

If uncertain:

```text
Google is associated with approximately ₱287k
```

---

# 60. Do Not Hide Bad Results

Vector should clearly surface:

```text
Traffic increased
but qualified leads fell.
```

Do not create artificially positive summaries.

Credibility is more important than optimism.

---

# 61. External Factors

Allow strategy notes for factors such as:

- seasonality;
- inventory;
- staffing;
- price change;
- service outage;
- holiday;
- economic events;
- sales capacity.

These may explain performance changes unrelated to marketing.

---

# 62. Capacity Constraints

Vector should eventually know:

```text
maximum bookings/week
inventory availability
sales team capacity
```

Do not aggressively optimize demand beyond what the client can fulfill.

---

# 63. Goal Constraints

A client's growth target may conflict with:

- budget;
- capacity;
- geography;
- sales team;
- inventory.

Vector should flag unrealistic assumptions rather than blindly promising.

---

# 64. Revenue Chance vs Guarantee

Vector's commercial positioning should distinguish:

```text
improves the probability and efficiency of revenue generation
```

from:

```text
guarantees revenue
```

The latter should not be promised.

---

# 65. Client UI Copy Standard

Client UI copy should be:

- plain language;
- short;
- outcome-focused;
- non-technical;
- explainable.

Avoid:

```text
Attribution model confidence degradation detected.
```

Prefer:

```text
Revenue tracking is incomplete because your CRM has not synced for 8 hours.
```

---

# 66. Empty States

Client empty states should guide action.

Example:

```text
No sales outcomes recorded yet.

Connect your CRM or mark lead outcomes manually to help Vector understand which channels generate real revenue.

[Connect CRM]
[Update Leads]
```

---

# 67. Error States

Example:

Bad:

```text
OAuth token invalid.
```

Better:

```text
Your Facebook connection expired.

Reconnect to continue publishing and performance tracking.

[Reconnect Facebook]
```

---

# 68. Trust and Transparency

Every major automated action should be inspectable.

Client may view:

```text
What Vector changed
Why
When
Who approved
What happened afterward
```

This supports trust.

---

# 69. Client Export

Clients should be able to export:

- leads;
- contacts;
- sales outcomes;
- reports;
- approved assets;
- campaign summaries.

Subject to permissions and legal policies.

Avoid unnecessary lock-in.

---

# 70. Recommended New Entities

Add:

```text
client_goals
goal_progress_snapshots

lead_pipeline_stages
lead_stage_events
sales_outcomes
revenue_events

attribution_results
attribution_confidence
data_health_checks
data_health_incidents

offers
offer_versions
offer_experiments

client_notification_preferences
client_notification_events

plans
plan_entitlements
client_subscriptions
client_entitlements
entitlement_usage

client_health_snapshots
client_blockers

growth_strategies
growth_strategy_versions
strategy_initiatives
strategy_reviews

monthly_growth_reports
recommendation_evidence

lead_quality_feedback
lost_reasons
```

---

# 71. Suggested `client_goals`

Fields:

```text
id
client_id
name
goal_type
target_value
unit
period
baseline_value
primary
start_date
end_date
data_source
status
created_by
approved_by
created_at
updated_at
```

---

# 72. Suggested `data_health_checks`

Fields:

```text
id
client_id
source_type
connection_id
status
coverage_percent
freshness_seconds
confidence
last_success_at
last_failure_at
message
created_at
```

---

# 73. Suggested `client_health_snapshots`

Fields:

```text
id
client_id
growth_health
data_health
provider_health
email_health
approval_health
engagement_health
goal_health
overall_health
reasons_json
created_at
```

---

# 74. Suggested `recommendation_evidence`

Fields:

```text
id
recommendation_id
evidence_type
source_reference
metric_name
metric_value
comparison_value
confidence
description
created_at
```

---

# 75. Cursor Rule

Create:

```text
/.cursor/rules/client-outcomes-ux.mdc
```

with:

```text
---
description: Vector client UX, revenue intelligence, goals, and outcome rules
alwaysApply: false
---

When implementing authenticated client UI, lead outcome tracking, goals,
revenue attribution, client dashboards, recommendations, client health,
notifications, offers, package entitlements, or client reporting, read:

docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md

Rules:
- Client UX is outcome-first, not infrastructure-first.
- Prefer simple business language.
- Use progressive disclosure.
- Never imply attribution certainty when data is estimated or incomplete.
- AI must check data health before important recommendations.
- Marketing optimization should progress from traffic → lead → qualified lead → sale → revenue where data allows.
- Keep external systems behind provider adapters.
- Every tenant-owned outcome must be client-scoped.
```

---

# 76. Required `AGENTS.md` Addition

Append:

```text
## Client Experience and Revenue Outcomes

For work involving authenticated client UX, dashboards, goals, KPIs,
lead stages, sales outcomes, revenue, attribution confidence, data health,
offers, client notifications, entitlements, client health, or business
reporting, read:

docs/30_VECTOR_CLIENT_EXPERIENCE_REVENUE_INTELLIGENCE_GROWTH_OUTCOMES.md

Client-facing interfaces must prioritize business outcomes and decisions.

Do not expose technical platform complexity by default.

Do not present uncertain attribution or estimates as factual.

Where outcome data exists, optimize beyond lead volume toward qualified
leads, sales, and attributable business value.
```

---

# 77. Roadmap mapping — do not reopen exited gates

Phase 2 already exited with contacts, leads, statuses including `won` / `lost`, score events, first-touch / last-non-direct attribution, and conversion-step analytics. That is not a client outcome dashboard and not `sales_outcomes` with money. Do not change the Phase 2 exit.

Phase 3 already exited with consent-safe nurture. Email → lead-stage → sale joins are later Outcomes work.

Phase 4 already exited with typed recommendation cards (`finding`, evidence, `expectedImpact`, `riskClass`, `confidence`) on operator `/intelligence`. Ask Vector, data-health gates, and goal-linked provenance are later. Do not change the Phase 4 exit.

Map Outcomes work **forward**. The O1–O20 order in §88 is a cross-cutting track. It is not a new numbered Vector phase and must not replace the Phase 5 social-publish exit. Client and operator stay one Control app; navigation differs by capability. Client Value V0–V5 (`docs/plans/CLIENT_VALUE_TRACK.md`) extends this charter as O21–O22. It consumes these facts. It does not replace them.

## Phase 5 — additive

- Persist social → lead on the existing attribution path when a post produces a lead.
- Creative → lead relationships wait for Creative C0+ and are not the Phase 5 exit.

## Phase 6 — additive

- Search / AEO / GEO visibility → observable visit/referral when available → lead → qualified lead → sale / revenue.
- Do not optimize only for rank, traffic, or citation.
- Live generative measurement is additive when a compliant method exists. It is not the Phase 6 exit.

## Phase 7 — additive

- Revenue-aware experiment metrics only when sample and data health allow.
- Offer experiments on the existing `offers` domain.

## Phase 8 — additive

- Autonomy conditioned on data health and outcome coverage.
- Goal-aware recommendation prioritization. Confidence still cannot authorize.

## Phase 9 — additive

- Portfolio health, client success health, entitlements, operator exception queues.
- Client Value V5 portfolio / renewal reporting when coverage exists.

First Reveal client card (`docs/plans/FIRST_REVEAL_TRACK.md`): Control shows a business-language “your first Vector site — preview / approve / request changes” state. Do not expose hero schema, model prompts, or variant-score internals.

## Outcomes track (O1–O20)

Build in the order in §88. First paying-client bar (§78) is launch readiness, not a Phase 0 reopen. Revenue value may remain optional. Ask Vector, CRM sync, ads, and billing stay later slices.

Client operating UX is first-class: capability-filtered default nav (CU0 in), Outcomes QuickStart (CU1 in), Approval Center (O8 in), `sales_outcomes` (O3 in), and V0 activity proof on `/value` before more operator screens (`docs/30` §2, §5, §81–85). Execution: [`docs/plans/OUTCOMES_TRACK.md`](plans/OUTCOMES_TRACK.md). Sequence: [`docs/plans/SHIP_REMAINING.md`](plans/SHIP_REMAINING.md). O4 Overview is in on Control `/overview`. O5 Today is in on Control `/today` and in the default client nav. O9 offer versions are in on Control `/knowledge`. O10 `CRMProvider` is in as a memory adapter with no vendor. O11 revenue events are in. O12 attribution confidence is in. O13 recommendation evidence is in. O14 monthly growth review is in. V1 lead and goal value join is in on Control `/value`. V2 client baselines and V3 revenue-to-fee are in on Control `/value`. V4 incremental counts are in on Control `/value`. C9 is in. Next is Wave E P9-S2. CE0–CE7 are in. Do not put Knowledge / Funnel / Autonomy / Portfolio in the default client nav. The `docs/17` 16-step catalog is operator readiness, not the client form.

---

# 78. P0 Additions Before First Paying Client

Before first paying client, ensure:

- primary goal configured;
- primary conversion defined;
- minimal lead pipeline exists;
- won/lost outcome can be recorded;
- client notification preferences exist;
- data health can identify major broken sources;
- dashboard uses business language;
- approval center works;
- First Reveal Gate pass or documented operator override (`docs/plans/FIRST_REVEAL_TRACK.md`);
- V0 activity proof when package/fee is known. No ROI claim required (`docs/plans/CLIENT_VALUE_TRACK.md`). **In** on Control `/value`.

Revenue value may remain optional at first.

---

# 79. P1 Additions

After initial production stability:

- external CRM adapter;
- revenue events;
- attribution confidence;
- offer management;
- client health;
- monthly growth reports;
- Ask Vector.

---

# 80. P2 Additions

Later:

- paid ad providers;
- billing;
- advanced attribution;
- capacity-aware optimization;
- lifetime value;
- margin-aware optimization.

---

# 81. Client Onboarding Additions

QuickStart should ask:

```text
What is your primary goal?

What counts as a good lead?

What usually happens after a lead contacts you?

What counts as a sale?

Do you already use a CRM or booking system?

Would you like Vector to notify you immediately about high-intent leads?

Who approves campaigns?
```

These questions should use plain language.

---

# 82. Suggested Goal Onboarding UX

Example:

```text
What would you most like Vector to improve?

○ More qualified leads
○ More bookings
○ More sales
○ More revenue
○ More subscriptions
○ Other
```

Then:

```text
Do you have a target?

○ Yes
○ Not yet
```

Do not force the client to create complicated KPI frameworks.

---

# 83. Suggested Sales Process UX

Example:

```text
What usually happens after someone becomes a lead?

○ We call them
○ They book an appointment
○ We send a quote
○ They purchase online
○ Other
```

Vector maps this answer into a default pipeline.

---

# 84. Suggested Outcome Capture UX

For clients without CRM:

```text
Maria Santos
Dental Implants

What happened?

[Contacted]
[Qualified]
[Appointment]
[Won]
[Lost]
```

Updating outcomes should be extremely fast on mobile.

---

# 85. Client UX Acceptance Checklist

Before client-facing functionality is considered ready:

## Clarity

- [ ] Can a non-technical owner understand the screen?
- [ ] Does the screen answer a business question?
- [ ] Is technical jargon hidden or explained?

## Hierarchy

- [ ] Most important outcome appears first.
- [ ] Required client action is obvious.
- [ ] Supporting detail is secondary.

## Trust

- [ ] Recommendations explain why.
- [ ] Estimates are labeled.
- [ ] Data gaps are visible.
- [ ] Automated actions are inspectable.

## Action

- [ ] Client can act without navigating multiple screens.
- [ ] Approval flows are bundled where appropriate.
- [ ] Lead outcome updates are fast.

## Mobile

- [ ] High-intent leads work well on mobile.
- [ ] Approval works well on mobile.
- [ ] Today view is useful on mobile.
- [ ] No dense desktop table is required for core tasks.

---

# 86. Internal Operator UX Acceptance Checklist

- [ ] Portfolio health is visible.
- [ ] Exceptions are prioritized.
- [ ] Client blockers are distinct from platform failures.
- [ ] Data-health problems are visible.
- [ ] Approval latency is visible.
- [ ] Revenue/outcome coverage is visible.
- [ ] Client entitlement violations are prevented.
- [ ] Cost and profitability can be analyzed internally.

---

# 87. Definition of Done

A client-outcome feature is not done when a metric renders.

It is done when:

- source is known;
- tenant scope is correct;
- permissions are correct;
- calculation is documented;
- confidence/coverage is handled;
- stale data is detected;
- UI uses understandable language;
- mobile behavior works;
- audit exists where applicable;
- AI usage respects data health;
- tests cover core invariants.

---

# 88. Implementation Order

Phase mapping is locked in `docs/plans/CROSS_CUTTING_TRACKS.md`. These twenty items are the Outcomes track (O1–O20), not a new Vector phase. Client Value extends them. Remaining execution, including CU0–CU1 client operating UX before O4–O20: [`docs/plans/OUTCOMES_TRACK.md`](plans/OUTCOMES_TRACK.md).

21. Versioned client baseline (V2 / O21) is in. Client-stated previous monthly spend, labeled estimated. Time-savings ranges stay later.
22. Revenue-linked value statement (V3 / O22) is in. Revenue-to-fee only when the fee, recorded revenue, and attribution coverage match. Replacement cost is not ROI.

V0 activity proof is in on Control `/value`. V1 joins O1–O3 in Wave C. V2 client baselines and V3 revenue-to-fee are in on the same page. V4 incremental counts are in on the same page. V5 waits for Phase 9 later.

Recommended:

0. Capability-filtered client nav (CU0 in) and Outcomes QuickStart (CU1 in) (`docs/plans/OUTCOMES_TRACK.md`) — do not overwhelm the client with operator modules.
1. Client goals.
2. Minimal lead stages.
3. Sales outcome records (O3 in).
4. Client dashboard outcome hierarchy.
5. Today view.
6. Data health foundation.
7. Client notification preferences.
8. Approval Center improvements.
9. Offer domain.
10. External CRM adapter interface.
11. Revenue events.
12. Attribution confidence.
13. Recommendation evidence.
14. Monthly Growth Review.
15. Ask Vector.
16. Client health.
17. Package entitlements.
18. Paid acquisition read-only.
19. Billing architecture.
20. Advanced revenue optimization.

---

# 89. Example End-to-End Client Experience

```text
Client signs
    ↓
QuickStart
    ↓
Primary goal:
100 qualified leads/month
    ↓
Vector builds growth system
    ↓
Traffic arrives
    ↓
Lead generated
    ↓
Vector scores lead
    ↓
Client notified
    ↓
Lead qualified
    ↓
Appointment
    ↓
Deal won
    ↓
Revenue recorded
    ↓
Attribution updated
    ↓
Vector Insights learns
    ↓
Recommendation generated
    ↓
Client approves experiment
    ↓
Performance improves
```

This is the complete growth loop.

---

# 90. Strategic Outcome

The purpose of this document is to ensure Vector does not become:

```text
AI content machine
+
website generator
+
analytics dashboard
```

Instead, it should become:

```text
Business Goal
    ↓
Growth Strategy
    ↓
Execution
    ↓
Lead Generation
    ↓
Sales Outcomes
    ↓
Revenue Intelligence
    ↓
Learning
    ↓
Continuous Improvement
```

---

# 91. Final Client Experience Principle

The ideal client should feel:

> Vector already understands the state of my growth system, tells me what matters, asks me only for decisions or business truth, and continuously works to improve results.

The client should not feel:

> I have been given another complicated marketing dashboard that requires me to understand every channel and technical implementation.

---

# 92. Final Operating Principle

MGE should operate Vector by **exception, evidence, and outcome**.

Clients should operate Vector by **confirmation, approval, and business decisions**.

Vector Agents should operate by **bounded autonomy, measurable goals, verified data, and transparent evidence**.

The system should progressively optimize toward:

```text
more qualified demand
+
better conversion
+
better sales outcomes
+
better attributable business value
```

while remaining honest about uncertainty and external factors outside Vector's control.
