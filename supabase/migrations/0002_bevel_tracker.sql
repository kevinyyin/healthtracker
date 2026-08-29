-- Recovery/strain analytics layer: nightly rollups, raw intraday HR, and the first
-- user-writable tables (journal entries, strength workouts). See migration 0001 for
-- the base per-user RLS convention this follows.

-- Nightly computed rollup: one row per user per wake-date, built from that night's
-- sleep_sessions + vitals_readings + intraday_hr. Safe to recompute/upsert repeatedly —
-- the sync pipeline does so for the last few nights on every run so late-arriving
-- vitals data self-heals without a backfill job.
create table if not exists health_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  sleep_session_id uuid references sleep_sessions (id) on delete set null,
  sleep_start timestamptz,
  sleep_end timestamptz,
  deep_sleep_minutes numeric,
  rem_sleep_minutes numeric,
  light_sleep_minutes numeric,
  awake_minutes numeric,
  total_sleep_minutes numeric,
  hrv_rmssd numeric,
  resting_hr numeric,
  spo2 numeric,
  skin_temp_delta numeric,
  computed_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table health_logs enable row level security;

create policy "select own health logs"
  on health_logs for select
  using (auth.uid() = user_id);

create index if not exists health_logs_user_date_idx
  on health_logs (user_id, date desc);

-- Raw heart rate stream at whatever granularity Google Health returns (assumed ~1-min,
-- unconfirmed). Distinct from the sparse vitals_readings table: Day Strain, Energy
-- Bank, and Stress Score all read from this directly.
create table if not exists intraday_hr (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  recorded_at timestamptz not null,
  bpm numeric not null,
  activity_session_id uuid references activity_sessions (id) on delete set null,
  source text,
  synced_at timestamptz not null default now(),
  unique (user_id, recorded_at)
);

alter table intraday_hr enable row level security;

create policy "select own intraday hr"
  on intraday_hr for select
  using (auth.uid() = user_id);

create index if not exists intraday_hr_user_time_idx
  on intraday_hr (user_id, recorded_at desc);

-- User-authored, not Google-synced. Written via a Server Action using the normal
-- session-scoped (RLS-respecting) client, not the admin client — first table in this
-- app with insert/update/delete policies rather than select-only.
create table if not exists journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  date date not null,
  habits text[] not null default '{}',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, date)
);

alter table journal_entries enable row level security;

create policy "select own journal entries" on journal_entries for select using (auth.uid() = user_id);
create policy "insert own journal entries" on journal_entries for insert with check (auth.uid() = user_id);
create policy "update own journal entries" on journal_entries for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own journal entries" on journal_entries for delete using (auth.uid() = user_id);

create index if not exists journal_entries_user_date_idx
  on journal_entries (user_id, date desc);

-- One row per logged set. session_id groups sets logged in one workout (generated
-- client-side via crypto.randomUUID() when the Strength Builder starts a new session).
-- volume is a generated column so weight*reps is never wrong/stale in app code.
create table if not exists strength_workouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  session_id uuid not null,
  date date not null,
  exercise_name text not null,
  set_number smallint not null default 1,
  reps integer not null,
  weight_kg numeric not null default 0,
  volume numeric generated always as (reps * weight_kg) stored,
  rpe smallint,
  created_at timestamptz not null default now()
);

alter table strength_workouts enable row level security;

create policy "select own strength workouts" on strength_workouts for select using (auth.uid() = user_id);
create policy "insert own strength workouts" on strength_workouts for insert with check (auth.uid() = user_id);
create policy "update own strength workouts" on strength_workouts for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own strength workouts" on strength_workouts for delete using (auth.uid() = user_id);

create index if not exists strength_workouts_user_date_idx on strength_workouts (user_id, date desc);
create index if not exists strength_workouts_user_session_idx on strength_workouts (user_id, session_id);
