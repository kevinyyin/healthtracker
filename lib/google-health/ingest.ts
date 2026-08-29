import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listDataPoints } from "@/lib/google-health/client";
import { GOOGLE_HEALTH_DATA_TYPES, type GoogleHealthDataPoint } from "@/lib/google-health/types";

const ACTIVE_CALORIE_TAG_LOOKBACK_MS = 3 * 24 * 60 * 60 * 1000;

function extractNumericValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value: unknown }).value;
    if (typeof inner === "number") return inner;
  }
  return null;
}

export async function syncSleep(admin: SupabaseClient, userId: string, accessToken: string) {
  const { dataPoints } = await listDataPoints(accessToken, GOOGLE_HEALTH_DATA_TYPES.sleep);
  if (dataPoints.length === 0) return 0;

  const rows = dataPoints.map((dp: GoogleHealthDataPoint) => ({
    user_id: userId,
    external_id: dp.name,
    start_time: dp.startTime,
    end_time: dp.endTime,
    stage_summary: dp.value,
    source: "google_health",
    synced_at: new Date().toISOString(),
  }));

  const { error } = await admin.from("sleep_sessions").upsert(rows, { onConflict: "user_id,external_id" });
  if (error) throw error;
  return rows.length;
}

export async function syncActivity(admin: SupabaseClient, userId: string, accessToken: string) {
  const { dataPoints } = await listDataPoints(accessToken, GOOGLE_HEALTH_DATA_TYPES.exercise);
  if (dataPoints.length === 0) return 0;

  const rows = dataPoints.map((dp: GoogleHealthDataPoint) => ({
    user_id: userId,
    external_id: dp.name,
    type: (dp.metadata?.activityType as string | undefined) ?? null,
    start_time: dp.startTime,
    end_time: dp.endTime,
    steps: null,
    // Shape unconfirmed — try metadata.calories first, fall back to the data point's
    // own value in case Google encodes it there instead.
    calories: extractNumericValue(dp.metadata?.calories) ?? extractNumericValue(dp.value),
    distance_m: null,
    raw: dp as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await admin.from("activity_sessions").upsert(rows, { onConflict: "user_id,external_id" });
  if (error) throw error;
  return rows.length;
}

/**
 * Raw heart rate stream — a continuous signal, not a sparse spot reading, so it lives
 * in intraday_hr rather than vitals_readings. Granularity is whatever Google returns
 * (assumed ~1-min, unconfirmed).
 */
export async function syncIntradayHr(admin: SupabaseClient, userId: string, accessToken: string) {
  const { dataPoints } = await listDataPoints(accessToken, GOOGLE_HEALTH_DATA_TYPES.heartRate);
  if (dataPoints.length === 0) return 0;

  const rows = dataPoints
    .map((dp: GoogleHealthDataPoint) => ({
      user_id: userId,
      recorded_at: dp.startTime,
      bpm: extractNumericValue(dp.value),
      source: "google_health",
      synced_at: new Date().toISOString(),
    }))
    .filter((row): row is typeof row & { bpm: number } => row.bpm != null);

  if (rows.length === 0) return 0;

  const { error } = await admin.from("intraday_hr").upsert(rows, { onConflict: "user_id,recorded_at" });
  if (error) throw error;
  return rows.length;
}

const SPARSE_VITAL_METRICS = [
  { dataType: GOOGLE_HEALTH_DATA_TYPES.hrv, metricType: "hrv", unit: "ms" },
  { dataType: GOOGLE_HEALTH_DATA_TYPES.spo2, metricType: "spo2", unit: "%" },
  { dataType: GOOGLE_HEALTH_DATA_TYPES.skinTemperature, metricType: "skin_temp", unit: "°C" },
] as const;

/** Sparse spot-reading vitals (HRV, SpO2, skin temp) — generalizes the single-metric pattern. */
export async function syncSparseVitals(admin: SupabaseClient, userId: string, accessToken: string) {
  let total = 0;

  for (const metric of SPARSE_VITAL_METRICS) {
    const { dataPoints } = await listDataPoints(accessToken, metric.dataType);
    if (dataPoints.length === 0) continue;

    const rows = dataPoints.map((dp: GoogleHealthDataPoint) => ({
      user_id: userId,
      metric_type: metric.metricType,
      recorded_at: dp.startTime,
      value: extractNumericValue(dp.value),
      unit: metric.unit,
      raw: dp as unknown as Record<string, unknown>,
      synced_at: new Date().toISOString(),
    }));

    // No stable external id on vitals readings, so these are append-only inserts.
    const { error } = await admin.from("vitals_readings").insert(rows);
    if (error) throw error;
    total += rows.length;
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
