# Funnel Engine and Design System

## Principle

Standardize capabilities, accessibility, performance, and analytics. Do not standardize every client's visual identity.

## Page model

Pages are schema validated documents composed of controlled section types.

## Versioning

Published page versions are immutable. Changes create new drafts.

## Required capabilities

Hero, proof, benefits, services, offers, pricing, comparison, process, case study, testimonial, video, gallery, FAQ, forms, booking CTA, sticky CTA, local details, interactive tools.

## Publication

Client page publication updates an immutable published version and invalidates relevant cache. It is not a Vector application code deployment. Most client launches and copy updates must not require a Git deploy.

## Performance

SSR and prerendering where appropriate, minimal hydration, optimized media, CDN caching, mobile first layout, Core Web Vitals release checks.

Cache static assets, stable public pages, and prerendered content at the edge when safe. Do not cache personalized, consent-sensitive, authenticated, or experiment-sensitive responses without an explicit cache key and policy.

## AI constraint

Agents may configure approved components and theme tokens. They may not inject arbitrary unsafe HTML, scripts, or unreviewed CSS.
