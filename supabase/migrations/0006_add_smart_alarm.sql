-- Smart Alarm: one wake-window per user, plus per-device Web Push registrations so
-- the alarm can fire an OS-level notification even with the phone locked. The "which
-- moment within the window to fire" decision lives in lib/alarms/schedule.ts (a stub
-- today; see that file for the future historical-cycle-length prediction seam).

create table if not exists alarms (
  user_id uuid primary key references auth.users (id) on delete cascade,
  enabled boolean not null default false,
  wake_from time not null,
  wake_to time not null,
  last_fired_date date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table alarms enable row level security;

create policy "select own alarm" on alarms for select using (auth.uid() = user_id);
create policy "insert own alarm" on alarms for insert with check (auth.uid() = user_id);
create policy "update own alarm" on alarms for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own alarm" on alarms for delete using (auth.uid() = user_id);

-- Multiple rows per user (one per subscribed browser/device), unlike the
-- one-row-per-user tables above — same shape as sleep_sessions/activity_sessions.
create table if not exists push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  endpoint text not null,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  unique (user_id, endpoint)
);

alter table push_subscriptions enable row level security;

create policy "select own push subscriptions" on push_subscriptions for select using (auth.uid() = user_id);
create policy "insert own push subscriptions" on push_subscriptions for insert with check (auth.uid() = user_id);
create policy "delete own push subscriptions" on push_subscriptions for delete using (auth.uid() = user_id);

create index if not exists push_subscriptions_user_idx on push_subscriptions (user_id);
