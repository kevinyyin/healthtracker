-- Manual biometric profile (date of birth, biological sex) needed for the age/sex-
-- normed Biological Age analytics. Google Health has no reliable profile-demographics
-- API, so this is user-entered via Settings — one row per user, matching journal_entries'
-- full insert/update/delete RLS pattern from 0002_bevel_tracker.sql.
create table if not exists profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  date_of_birth date not null,
  biological_sex text not null check (biological_sex in ('male', 'female')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table profiles enable row level security;

create policy "select own profile" on profiles for select using (auth.uid() = user_id);
create policy "insert own profile" on profiles for insert with check (auth.uid() = user_id);
create policy "update own profile" on profiles for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "delete own profile" on profiles for delete using (auth.uid() = user_id);
