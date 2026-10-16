# Health Tracker

A personal recovery and health dashboard. It takes the sleep, activity, and vitals data your phone or watch already syncs to the **Google Health API** and computes WHOOP-style analytics from it: recovery, strain, sleep score, sleep debt, stress, energy bank, VO₂max, and biological age. You don't need a subscription or any new hardware.

It's built for one user (the owner), but every table uses per-user row-level security, so it can support more users later without a rewrite.

## Features

- **Today dashboard**: recovery, strain, and sleep rings plus an energy bank, guidance, and a workout recommender. You can add, remove, and reorder widgets.
- **Sleep**: a 7-factor sleep score, hypnogram, stage breakdown, sleep debt, and manual corrections.
- **Activity and strain**: day strain on a 0–100 scale and active calories.
- **Vitals**: heart-rate history, max HR, weight log, and trend charts.
- **Cardio fitness and biological age**: VO₂max estimate and a biological age trend.
- **Trends and recap**: long-range charts and a printable or exportable recap.
- **Illness detection**: flags unusual deviations from your baseline.
- **Smart alarm**: picks a wake time inside your window and sends it as a Web Push notification.
- **Installable on iOS** from the home screen. Includes light and dark themes and a choice of metric or imperial units.

## Stack

Next.js 16 (App Router), React 19, Supabase (Postgres, Auth, RLS), Tailwind CSS v4, Recharts, Zod, web-push, and Vitest. Uses pnpm.

## How it works

```
Google Health API ──OAuth──▶ sync (ingest + nightly rollups) ──▶ Supabase
                                                                   │
                       UI (Server Components) ◀── lib/analytics ◀──┘
```

1. **Connect**: Google OAuth (`app/api/auth/google/*`) stores tokens in `google_oauth_tokens`.
2. **Sync**: `GET /api/sync` (requires `Authorization: Bearer $CRON_SECRET`) runs `syncUser()` for each connected account. It ingests sleep, activity, intraday HR, and sparse vitals, then rebuilds the last few nights of `health_logs` so vitals that arrive late get filled in automatically.
3. **Schedule**: GitHub Actions calls the sync endpoint every 15 minutes (`.github/workflows/sync.yml`) and the alarm check every minute (`alarm.yml`). Vercel Cron also runs a daily sync as a backup (`vercel.json`).
4. **Analytics**: the scores are pure functions in `lib/analytics/` that read already-synced data and never call Google.

For a deeper architecture tour, see [`CLAUDE.md`](./CLAUDE.md).

## Getting started

### Prerequisites

- Node.js and pnpm (the version is pinned in `package.json`)
- A Supabase project
- A Google Cloud project with the Google Health API enabled and an OAuth client (see [developers.google.com/health/setup](https://developers.google.com/health/setup))

### Setup

```bash
pnpm install
cp .env.local.example .env.local   # fill in the values, see below
```

Apply the SQL migrations in `supabase/migrations/` in order. You can use `supabase db push` with the Supabase CLI or paste each file into the SQL editor.

```bash
pnpm dev    # http://localhost:3000
```

Sign in, go to **Settings**, and connect Google Health. To pull data right away instead of waiting for the next scheduled run:

```bash
curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/sync
```

### Environment variables

`.env.local.example` lists every variable with notes on where to get it.

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase client (safe for the browser) |
| `SUPABASE_SECRET_KEY` | Admin client used by sync and the OAuth callback (bypasses RLS, server only) |
| `GOOGLE_HEALTH_CLIENT_ID`, `GOOGLE_HEALTH_CLIENT_SECRET`, `GOOGLE_HEALTH_REDIRECT_URI` | Google Health OAuth |
| `APP_BASE_URL` | The app's public base URL |
| `CRON_SECRET` | Bearer token for `/api/sync` and `/api/alarms/fire` |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` | Web Push for the smart alarm |

Zod validates both env schemas (`lib/env.ts` for public values, `lib/env.server.ts` for server-only secrets) when they're imported, so a missing value fails right away.

## Scripts

```bash
pnpm dev      # dev server
pnpm build    # production build
pnpm start    # serve the production build
pnpm lint     # eslint
pnpm test     # vitest (analytics, rollups, alerts, and helper tests)
```

## Deployment

The app deploys to Vercel. Set the env vars above in the project and update `GOOGLE_HEALTH_REDIRECT_URI` and `APP_BASE_URL` to the production URL. Add that redirect URI to the Google OAuth client too.

For the GitHub Actions schedules, add the `CRON_SECRET` repository secret and an `APP_URL` repository variable.

## Project layout

```
app/(app)/        authenticated pages: today, sleep, activity, vitals, trends,
                  cardio-fitness, biological-age, recap, settings
app/api/          sync, Google OAuth, alarm fire, recap export
lib/google-health OAuth, ingest, rollups, alerts
lib/analytics     scoring functions (+ tests)
lib/supabase      browser / server / admin clients
lib/actions       Server Actions for user-authored data
components/       UI, charts, dashboard widgets
supabase/         SQL migrations
```
