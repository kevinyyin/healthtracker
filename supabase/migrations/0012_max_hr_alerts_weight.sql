-- 1) User-adjustable Max HR. Nullable — null means "compute 220 - age" at read
-- time (see lib/analytics/day-strain.ts's resolveMaxHr), not a second hardcoded
-- default living in two places.
alter table profiles add column if not exists max_hr integer;

-- 2) Manual weight entry reuses vitals_readings (already schema-loose: metric_type
-- + value/unit/raw — see the comment atop 0001_init.sql) rather than a new table.
-- vitals_readings is currently select-only (populated by sync via the admin
-- client) — this adds a narrowly-scoped carve-out so the session-scoped client can
-- write ONLY metric_type = 'weight' rows, leaving every sync-authored metric type
-- (steps, heart-rate, hrv, oxygen-saturation, ...) still select-only.
create policy "insert own weight readings" on vitals_readings
  for insert with check (auth.uid() = user_id and metric_type = 'weight');
create policy "update own weight readings" on vitals_readings
  for update using (auth.uid() = user_id and metric_type = 'weight')
  with check (auth.uid() = user_id and metric_type = 'weight');
create policy "delete own weight readings" on vitals_readings
  for delete using (auth.uid() = user_id and metric_type = 'weight');

-- 3) Push-alert dedupe (illness signal / low recovery). Lives on
-- google_oauth_tokens, not profiles: profiles' date_of_birth/biological_sex are
-- NOT NULL, so a user who hasn't filled in Settings > Profile has no profiles row
-- at all. google_oauth_tokens already has exactly one row per connected user
-- (it's the table /api/sync iterates) and already carries similar per-user sync
-- state (consecutive_failures/sync_disabled/last_error, added in 0009) — mirrors
-- alarms.last_fired_date's role from 0006_add_smart_alarm.sql.
alter table google_oauth_tokens
  add column if not exists last_illness_alert_date date,
  add column if not exists last_low_recovery_alert_date date;
