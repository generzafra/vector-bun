# Funnel Engine and Design System

## Principle

Standardize capabilities, accessibility, performance, and analytics. Do not standardize every client's visual identity.

Public visual quality, UX, sales narrative, motion, conversion, anti-generic rules, and the Frontend Release Gate live in `docs/27_VECTOR_FRONTEND_UI_UX_SALES_FUNNEL_STANDARD.md`. This document owns schemas, rendering, component contracts, publishing, theme configuration, and safe composition. Where `docs/27` is more specific on experience quality, it governs.

## Page model

Pages are schema validated documents composed of controlled section types.

## Versioning

Published page versions are immutable. Changes create new drafts.

## Required capabilities

Hero, proof, benefits, services, offers, pricing, comparison, process, case study, testimonial, video, gallery, FAQ, forms, booking CTA, sticky CTA, local details, interactive tools.

Each major family needs multiple variants over time (`hero-minimal`, `hero-split`, `hero-cinematic`, `services-editorial`, `services-bento`, `cases-featured`). Prefer variants over one giant conditional component. AI selects a variant from context; it does not invent unsafe markup.

Phase 1 approved section types (reject anything else): `hero-minimal`, `hero-split`, `proof`, `services`, `offer`, `cta`, `faq`, `lead-form`. Do not add cinematic or interactive variants until a real client needs them.

## Publication

Client page publication updates an immutable published version and invalidates relevant cache. It is not a Vector application code deployment. Most client launches and copy updates must not require a Git deploy.

## Performance

SSR and prerendering where appropriate, minimal hydration, optimized media, CDN caching, mobile first layout, Core Web Vitals release checks.

Cache static assets, stable public pages, and prerendered content at the edge when safe. Do not cache personalized, consent-sensitive, authenticated, or experiment-sensitive responses without an explicit cache key and policy.

## AI constraint

Agents may configure approved components and theme tokens. They may not inject arbitrary unsafe HTML, scripts, or unreviewed CSS.

Theme tokens cover color, surface, type, spacing, radius, motion, and z-index. Client tokens change appearance; they do not fork the renderer. A published page must pass the Frontend Release Gate in `docs/27` before it is treated as production-ready.

Capability tokens (spacing, radius, motion, section variants) are the shared engine. Identity tokens are per plane: Delivery uses the client palette; Control uses `docs/28`. Do not import Control identity tokens into the Delivery renderer.
