-- Activity Status Toggles: lets the user flag themselves Sick/Injured/Traveling for a
-- span of days, so analytics baselines (Recovery Score's 14-day and Biological Age's
-- 30-day comparison windows, plus Habit Correlations' confound exclusion) can skip
-- those days instead of letting an atypical week skew weeks of subsequent scores. See
-- lib/activity-status.ts for the status catalog and the period-to-excluded-dates
-- expansion helper.
--
-- "Active" (the fourth toggle option in the UI) isn't stored here — it just means "no
-- open period," i.e. clearing back to normal.

create table if not exists activity_status_periods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  status text not null check (status in ('sick', 'injured', 'traveling')),
  started_on date not null,
  ended_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table activity_status_periods enable row level security;

create policy "select own activity status periods" on activity_status_periods for select using (auth.uid() = user_id);
create policy "insert own activity status periods" on activity_status_periods for insert with check (auth.uid() = user_id);
create policy "update own activity status periods" on activity_status_periods for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own activity status periods" on activity_status_periods for delete using (auth.uid() = user_id);

create index if not exists activity_status_periods_user_idx on activity_status_periods (user_id, started_on desc);

-- Enforces "toggle" semantics at the DB level: at most one open (ended_on is null) period per user.
create unique index if not exists activity_status_periods_one_open_per_user
  on activity_status_periods (user_id) where (ended_on is null);
