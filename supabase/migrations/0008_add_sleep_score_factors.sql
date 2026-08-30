-- Adds two nullable columns to health_logs, derived from stage_summary's raw AWAKE
-- segment boundaries during rollup (see lib/google-health/rollup.ts's
-- parseStageMinutes). These power the Restfulness and Latency contributors in the
-- multi-factor Sleep Score (lib/analytics/sleep-score.ts).
--
-- Nullable, no backfill: syncNightlyRollups only self-heals the last ~3 nights on
-- each sync (ROLLUP_LOOKBACK_MS), so older health_logs rows will simply have these
-- null permanently. The Sleep Score's weight-redistribution logic treats that as an
-- expected "exclude this factor" case, not an error.
alter table health_logs
  add column if not exists wake_count integer,
  add column if not exists sleep_latency_minutes numeric;
