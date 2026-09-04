-- Extends health_log_overrides (0010) to cover the 3 Sleep Score inputs that weren't
-- correctable yet: Restfulness (wake_count), Latency (sleep_latency_minutes), and
-- Timing (sleep_start) — see lib/analytics/sleep-score.ts. Types match health_logs'
-- own columns for these fields (0008_add_sleep_score_factors.sql, 0001_init.sql).
alter table health_log_overrides
  add column if not exists wake_count integer,
  add column if not exists sleep_latency_minutes numeric,
  add column if not exists sleep_start timestamptz;
