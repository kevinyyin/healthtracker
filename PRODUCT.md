# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The developer/owner themselves, personal use only. This is a single-user app (the underlying schema is per-user RLS so it can grow into multi-user later without a rewrite, but there is no current plan or timeline to open it to other users). The user checks it daily to understand their own recovery, strain, sleep, and biological age.

## Product Purpose

Pulls sleep, activity, and vitals data the user's phone/watch already syncs to Google Health, and computes WHOOP-style recovery/strain/biological-age analytics from it on a themeable, customizable dashboard — without needing a WHOOP/Oura/etc. subscription or proprietary hardware.

## Positioning

A free alternative to paid wearable-analytics subscriptions: the same category of recovery/strain/sleep-debt/biological-age scoring, computed from data already flowing into Google Health, with no ongoing subscription cost and no new hardware.

## Operating Context

- Data pipeline runs unattended: Google Health OAuth once, then background sync (Vercel Cron daily + GitHub Actions every 15 min) keeps `health_logs` and related tables current — the user does not manually trigger syncs day to day.
- Primary usage moment is checking the Today dashboard (recovery/strain/sleep rings, energy bank, etc.), plus drill-down pages for Sleep, Activity, Vitals, Trends, and Biological Age.
- Used as an installed iOS home-screen app (PWA-style), not just in a browser tab — this is a first-class usage scenario, not an edge case.
- Dashboard widget set is user-customizable (add/remove/reorder via a drawer), so the design must accommodate a variable, user-chosen layout rather than one fixed composition.

## Capabilities and Constraints

- Data source is exclusively the Google Health API; metric coverage is limited to whatever that API exposes, and is still expanding (see `vitals_readings`' deliberately schema-loose design in the codebase).
- No test suite exists yet — intentional for now; this is a solo, fast-moving personal project. Design/dev work should not push for test infrastructure as a side effect.
- Single external identity: Google OAuth is the only sign-in path currently wired up.

## Evidence on Hand

- Real synced health data (sleep, activity, HR, vitals) once Google Health is connected — no fabricated sample data should be presented as if real.
- No testimonials, case studies, press, or third-party proof exist or are needed (personal-use tool, not a marketing surface).

## Product Principles

1. Personal-use-first: every design decision optimizes for the owner's own daily glanceability, not for onboarding strangers or converting visitors.
2. Free-tier honesty: the product's value proposition depends on visibly matching (not just imitating) the recovery/strain/bio-age concepts wearable subscriptions charge for — don't undercut that by looking like a toy.
3. Installed-app-first: treat the iOS home-screen install as a primary surface, not a responsive afterthought — mobile ergonomics (bottom nav, thumb reach, safe areas) take priority over desktop-first patterns.
4. Data self-heals, UI should reflect that calmly: since nightly rollups and late-arriving vitals correct themselves automatically, avoid alarming error states for normal sync latency.
5. Schema/architecture is multi-user-ready, but the product experience should not be designed around that yet — no team/sharing/invite features unless explicitly requested.

## Accessibility & Inclusion

No product-specific accessibility requirement has been established beyond standard web accessibility practice.
