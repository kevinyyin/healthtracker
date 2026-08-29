-- Per-user customizable Today-page widget selection/order. One row per user, storing
-- an ordered array of widget keys (see lib/dashboard-widgets.ts for the catalog) —
-- same "single ordered text[]" shape as journal_entries.habits, and the same full
-- insert/update/delete RLS pattern as profiles/journal_entries.
create table if not exists dashboard_widgets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  widget_keys text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table dashboard_widgets enable row level security;

create policy "select own dashboard widgets" on dashboard_widgets for select using (auth.uid() = user_id);
create policy "insert own dashboard widgets" on dashboard_widgets for insert with check (auth.uid() = user_id);
create policy "update own dashboard widgets" on dashboard_widgets for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own dashboard widgets" on dashboard_widgets for delete using (auth.uid() = user_id);
