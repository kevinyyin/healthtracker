-- Health & recovery tracker: core schema.
-- Single-user app, but modeled with per-user RLS so it can grow into multi-user
-- without a rewrite. All writes go through the service-role client (OAuth callback,
-- cron sync route) — the anon/browser client only ever reads its own rows.

create table if not exists google_oauth_tokens (
  user_id uuid primary key references auth.users (id) on delete cascade,
  access_token text not null,
  refresh_token text not null,
  scope text not null,
  expires_at timestamptz not null,
  updated_at timestamptz not null default now()
);

alter table google_oauth_tokens enable row level security;

create policy "select own token row"
  on google_oauth_tokens for select
  using (auth.uid() = user_id);

create table if not exists sleep_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  external_id text not null,
  start_time timestamptz not null,
  end_time timestamptz not null,
  stage_summary jsonb,
  source text,
  synced_at timestamptz not null default now(),
  unique (user_id, external_id)
);

alter table sleep_sessions enable row level security;

create policy "select own sleep sessions"
  on sleep_sessions for select
  using (auth.uid() = user_id);

create index if not exists sleep_sessions_user_start_idx
  on sleep_sessions (user_id, start_time desc);

create table if not exists activity_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  external_id text not null,
  type text,
  start_time timestamptz not null,
  end_time timestamptz not null,
  steps integer,
  calories numeric,
  distance_m numeric,
  raw jsonb,
  synced_at timestamptz not null default now(),
  unique (user_id, external_id)
);

alter table activity_sessions enable row level security;

create policy "select own activity sessions"
  on activity_sessions for select
  using (auth.uid() = user_id);

create index if not exists activity_sessions_user_start_idx
  on activity_sessions (user_id, start_time desc);

-- Deliberately schema-loose: Google is actively expanding vitals coverage through
-- 2026 (HRV/SpO2/ECG landed Q2, blood pressure/BMR planned Q3), so new metric types
-- just become new rows here instead of new migrations.
create table if not exists vitals_readings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  metric_type text not null,
  recorded_at timestamptz not null,
  value numeric,
  unit text,
  raw jsonb,
  synced_at timestamptz not null default now()
);

alter table vitals_readings enable row level security;

create policy "select own vitals readings"
  on vitals_readings for select
  using (auth.uid() = user_id);

create index if not exists vitals_readings_user_metric_time_idx
  on vitals_readings (user_id, metric_type, recorded_at desc);

create table if not exists sync_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',
  domains jsonb,
  error text
);

alter table sync_log enable row level security;

create policy "select own sync log"
  on sync_log for select
  using (auth.uid() = user_id);
