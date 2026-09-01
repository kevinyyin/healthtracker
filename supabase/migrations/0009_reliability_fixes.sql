-- Bundles the schema changes for 6 sync-pipeline reliability fixes.

-- 1) vitals_readings was append-only (no conflict target), and every 15-minute sync
-- re-fetched the same unbounded historical range from Google — duplicating rows on
-- every tick. Dedup existing duplicates (keep one arbitrary row per group via ctid),
-- then add the constraint the ingest code now upserts against.
delete from vitals_readings v
where v.ctid not in (
  select max(ctid)
  from vitals_readings
  group by user_id, metric_type, recorded_at
);

alter table vitals_readings
  add constraint vitals_readings_user_metric_time_key unique (user_id, metric_type, recorded_at);

-- 2) Circuit breaker for a revoked/dead Google OAuth grant — without this, a dead
-- token retries forever, once per cron tick (every 15 min), indefinitely.
alter table google_oauth_tokens
  add column if not exists consecutive_failures integer not null default 0,
  add column if not exists sync_disabled boolean not null default false,
  add column if not exists last_error text;

-- 3) Per-user timezone instead of a single hardcoded app-wide constant. Defaults to
-- the previous hardcoded value so existing behavior is unchanged until a user sets
-- their own in Settings.
alter table profiles
  add column if not exists timezone text not null default 'America/New_York';

-- 4) At most one in-flight sync per user, enforced at the DB level — GitHub Actions
-- (every 15 min) and Vercel Cron (daily) both hit /api/sync independently with no
-- coordination, so without this two triggers can race on the same user's token
-- refresh and sync_log rows.
create unique index if not exists sync_log_one_running_per_user
  on sync_log (user_id)
  where status = 'running';
