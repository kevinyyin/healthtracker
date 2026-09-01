import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { buildSinceFilter, listAllDataPoints } from "@/lib/google-health/client";
import { GOOGLE_HEALTH_DATA_TYPES, type GoogleHealthDataPoint } from "@/lib/google-health/types";

const ACTIVE_CALORIE_TAG_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;

/**
 * Overlap applied before the last-known timestamp when computing an incremental sync
 * window, so late-arriving/backfilled Google data isn't missed at the boundary. Every
 * ingest stream upserts on a stable conflict key (external_id, or (user_id,
 * recorded_at)), so re-fetching this overlap on every run is safe/idempotent — matches
 * the self-heal philosophy rollup.ts already uses for ROLLUP_LOOKBACK_MS.
 */
const SYNC_OVERLAP_MS = 2 * 24 * 60 * 60 * 1000;

/** Google mixes JSON numbers and numeric strings across (and even within) data types. */
function parseGoogleNumber(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const n = Number(value);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

function record(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : undefined;
}

/** Interval-shaped data points (sleep, exercise) nest start/end under `<payloadKey>.interval`. */
function readInterval(dp: GoogleHealthDataPoint, payloadKey: string) {
  const interval = record(record(dp[payloadKey])?.interval);
  return {
    startTime: interval?.startTime as string | undefined,
    endTime: interval?.endTime as string | undefined,
  };
}

/** Point-in-time data points (heart rate, HRV, SpO2) nest a timestamp under `<payloadKey>.sampleTime`. */
function readSampleTime(dp: GoogleHealthDataPoint, payloadKey: string): string | undefined {
  return record(record(dp[payloadKey])?.sampleTime)?.physicalTime as string | undefined;
}

/**
 * The start of this sync's request window: SYNC_OVERLAP_MS before the max already-
 * stored timestamp for this user+stream, or undefined (unbounded — full history) if
 * there's no prior data at all, so a brand-new user's first sync backfills everything.
 */
async function incrementalStartTime(
  admin: SupabaseClient,
  table: string,
  column: string,
  userId: string,
  extraEq?: { column: string; value: string },
): Promise<string | undefined> {
  let query = admin.from(table).select(column).eq("user_id", userId);
  if (extraEq) query = query.eq(extraEq.column, extraEq.value);
  const { data } = await query.order(column, { ascending: false }).limit(1).maybeSingle();

  // The Supabase client here isn't typed against the generated schema, so a
  // non-literal `column` string makes `.select()` infer an opaque error-shaped type
  // for `data` — go through `unknown` since it genuinely doesn't statically overlap.
  const latest = data ? (data as unknown as Record<string, unknown>)[column] : null;
  if (typeof latest !== "string") return undefined;

  return new Date(new Date(latest).getTime() - SYNC_OVERLAP_MS).toISOString();
}

export async function syncSleep(admin: SupabaseClient, userId: string, accessToken: string) {
  const since = await incrementalStartTime(admin, "sleep_sessions", "end_time", userId);
  const filter = buildSinceFilter(GOOGLE_HEALTH_DATA_TYPES.sleep, since);
  const dataPoints = await listAllDataPoints(accessToken, GOOGLE_HEALTH_DATA_TYPES.sleep, { filter });
  if (dataPoints.length === 0) return 0;

  const rows = dataPoints
    .map((dp) => {
      const { startTime, endTime } = readInterval(dp, "sleep");
      return { name: dp.name, startTime, endTime, stages: record(dp.sleep)?.stages };
    })
    .filter((s): s is typeof s & { name: string; startTime: string; endTime: string } => {
      const valid = Boolean(s.name) && Boolean(s.startTime) && Boolean(s.endTime);
      if (!valid) {
        console.error(`syncSleep: skipping ${s.name ?? "(no name)"} — missing name/start/end time`, {
          startTime: s.startTime,
          endTime: s.endTime,
        });
      }
      return valid;
    })
    .map((s) => ({
      user_id: userId,
      external_id: s.name,
      start_time: s.startTime,
      end_time: s.endTime,
      stage_summary: s.stages ?? null,
      source: "google_health",
      synced_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return 0;

  const { error } = await admin.from("sleep_sessions").upsert(rows, { onConflict: "user_id,external_id" });
  if (error) throw error;
  return rows.length;
}

export async function syncActivity(admin: SupabaseClient, userId: string, accessToken: string) {
  const since = await incrementalStartTime(admin, "activity_sessions", "end_time", userId);
  const filter = buildSinceFilter(GOOGLE_HEALTH_DATA_TYPES.exercise, since);
  const dataPoints = await listAllDataPoints(accessToken, GOOGLE_HEALTH_DATA_TYPES.exercise, { filter });
  if (dataPoints.length === 0) return 0;

  const rows = dataPoints
    .map((dp) => {
      const { startTime, endTime } = readInterval(dp, "exercise");
      const exercise = record(dp.exercise);
      const summary = record(exercise?.metricsSummary);
      return {
        name: dp.name,
        startTime,
        endTime,
        exerciseType: exercise?.exerciseType as string | undefined,
        summary,
        raw: dp,
      };
    })
    .filter((e): e is typeof e & { name: string; startTime: string; endTime: string } => {
      const valid = Boolean(e.name) && Boolean(e.startTime) && Boolean(e.endTime);
      if (!valid) {
        console.error(`syncActivity: skipping ${e.name ?? "(no name)"} — missing name/start/end time`, {
          startTime: e.startTime,
          endTime: e.endTime,
        });
      }
      return valid;
    })
    .map((e) => {
      const distanceMm = parseGoogleNumber(e.summary?.distanceMillimeters);
      return {
        user_id: userId,
        external_id: e.name,
        type: e.exerciseType ?? null,
        start_time: e.startTime,
        end_time: e.endTime,
        steps: parseGoogleNumber(e.summary?.steps),
        calories: parseGoogleNumber(e.summary?.caloriesKcal),
        distance_m: distanceMm != null ? distanceMm / 1000 : null,
        raw: e.raw as unknown as Record<string, unknown>,
        synced_at: new Date().toISOString(),
      };
    });

  if (rows.length === 0) return 0;

  const { error } = await admin.from("activity_sessions").upsert(rows, { onConflict: "user_id,external_id" });
  if (error) throw error;
  return rows.length;
}

/**
 * Raw heart rate stream — a continuous signal, not a sparse spot reading, so it lives
 * in intraday_hr rather than vitals_readings. Granularity is whatever Google returns
 * (assumed ~1-min, unconfirmed). Point-type: no `name`, so intraday_hr's upsert conflict
 * target is (user_id, recorded_at) rather than an external id.
 */
export async function syncIntradayHr(admin: SupabaseClient, userId: string, accessToken: string) {
  const since = await incrementalStartTime(admin, "intraday_hr", "recorded_at", userId);
  const filter = buildSinceFilter(GOOGLE_HEALTH_DATA_TYPES.heartRate, since);
  const dataPoints = await listAllDataPoints(accessToken, GOOGLE_HEALTH_DATA_TYPES.heartRate, { filter });
  if (dataPoints.length === 0) return 0;

  const rows = dataPoints
    .map((dp) => ({
      recorded_at: readSampleTime(dp, "heartRate"),
      bpm: parseGoogleNumber(record(dp.heartRate)?.beatsPerMinute),
    }))
    .filter((row): row is { recorded_at: string; bpm: number } => row.recorded_at != null && row.bpm != null)
    .map((row) => ({
      user_id: userId,
      recorded_at: row.recorded_at,
      bpm: row.bpm,
      source: "google_health",
      synced_at: new Date().toISOString(),
    }));

  if (rows.length === 0) return 0;

  const { error } = await admin.from("intraday_hr").upsert(rows, { onConflict: "user_id,recorded_at" });
  if (error) throw error;
  return rows.length;
}

const SPARSE_VITAL_METRICS = [
  {
    dataType: GOOGLE_HEALTH_DATA_TYPES.hrv,
    metricType: "hrv",
    unit: "ms",
    payloadKey: "heartRateVariability",
    valueKey: "rootMeanSquareOfSuccessiveDifferencesMilliseconds",
  },
  {
    dataType: GOOGLE_HEALTH_DATA_TYPES.spo2,
    metricType: "spo2",
    unit: "%",
    payloadKey: "oxygenSaturation",
    valueKey: "percentage",
  },
  // Skin temperature is NOT wired up: "skin-temperature" 400s with
  // INVALID_PARENT_DATA_TYPE_COLLECTION against the live API (confirmed 2026-08-30) —
  // it isn't a real data type ID. Re-add once the actual ID is confirmed.
] as const;

/** Sparse spot-reading vitals (HRV, SpO2) — generalizes the single-metric pattern. */
export async function syncSparseVitals(admin: SupabaseClient, userId: string, accessToken: string) {
  let total = 0;

  for (const metric of SPARSE_VITAL_METRICS) {
    try {
      const since = await incrementalStartTime(admin, "vitals_readings", "recorded_at", userId, {
        column: "metric_type",
        value: metric.metricType,
      });
      const filter = buildSinceFilter(metric.dataType, since);
      const dataPoints = await listAllDataPoints(accessToken, metric.dataType, { filter });
      if (dataPoints.length === 0) continue;

      const rows = dataPoints
        .map((dp) => ({
          recorded_at: readSampleTime(dp, metric.payloadKey),
          value: parseGoogleNumber(record(dp[metric.payloadKey])?.[metric.valueKey]),
          raw: dp,
        }))
        .filter(
          (row): row is { recorded_at: string; value: number; raw: GoogleHealthDataPoint } =>
            row.recorded_at != null && row.value != null,
        )
        .map((row) => ({
          user_id: userId,
          metric_type: metric.metricType,
          recorded_at: row.recorded_at,
          value: row.value,
          unit: metric.unit,
          raw: row.raw as unknown as Record<string, unknown>,
          synced_at: new Date().toISOString(),
        }));

      if (rows.length === 0) continue;

      const { error } = await admin
        .from("vitals_readings")
        .upsert(rows, { onConflict: "user_id,metric_type,recorded_at" });
      if (error) throw error;
      total += rows.length;
    } catch (err) {
      // One metric's data type being unsupported/unconfirmed (see the
      // GOOGLE_HEALTH_DATA_TYPES comment) shouldn't take down sleep/activity/HR sync —
      // log and move on to the next metric.
      console.error(`syncSparseVitals: failed to sync ${metric.metricType}`, err);
    }
  }

  return total;
}

/** Tags recent intraday_hr samples with the activity_session they fall inside, if any. */
export async function tagActiveCalories(admin: SupabaseClient, userId: string) {
  const since = new Date(Date.now() - ACTIVE_CALORIE_TAG_LOOKBACK_MS).toISOString();

  const { data: sessions } = await admin
    .from("activity_sessions")
    .select("id, start_time, end_time")
    .eq("user_id", userId)
    .gte("start_time", since);

  for (const session of sessions ?? []) {
    await admin
      .from("intraday_hr")
      .update({ activity_session_id: session.id })
      .eq("user_id", userId)
      .gte("recorded_at", session.start_time)
      .lte("recorded_at", session.end_time);
  }
}
