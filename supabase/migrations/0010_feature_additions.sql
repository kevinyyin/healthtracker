-- Manual correction/backfill of synced biometric values. health_logs/vitals_readings
-- are select-only under RLS and get their whole row overwritten on every sync
-- (lib/google-health/rollup.ts's upsert), so a correction can't live there directly —
-- it would just get clobbered on the next sync. This is a separate, user-writable
-- table merged on top of the synced data at read time (see lib/health-log-overrides.ts),
-- following journal_entries'/activity_status_periods' full-CRUD RLS pattern.
create table if not exists health_log_overrides (
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  hrv_rmssd numeric,
  resting_hr numeric,
  spo2 numeric,
  total_sleep_minutes numeric,
  deep_sleep_minutes numeric,
  rem_sleep_minutes numeric,
  light_sleep_minutes numeric,
  awake_minutes numeric,
  updated_at timestamptz not null default now(),
  primary key (user_id, date)
);

alter table health_log_overrides enable row level security;

create policy "select own health log overrides" on health_log_overrides for select using (auth.uid() = user_id);
create policy "insert own health log overrides" on health_log_overrides for insert with check (auth.uid() = user_id);
create policy "update own health log overrides" on health_log_overrides for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own health log overrides" on health_log_overrides for delete using (auth.uid() = user_id);

-- Metric/imperial display preference. Defaults to metric (the unit the app already
-- stores everything in — e.g. activity_sessions.distance_m).
alter table profiles
  add column if not exists unit_system text not null default 'metric' check (unit_system in ('metric', 'imperial'));
