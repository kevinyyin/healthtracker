import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { listDataPoints } from "@/lib/google-health/client";
import { refreshAccessToken } from "@/lib/google-health/oauth";
import { GOOGLE_HEALTH_DATA_TYPES, type GoogleHealthDataPoint } from "@/lib/google-health/types";

interface TokenRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

const EXPIRY_SAFETY_MARGIN_MS = 5 * 60 * 1000;

/** Returns a live access token for the row, refreshing it first if it's near expiry. */
async function getValidAccessToken(admin: SupabaseClient, token: TokenRow): Promise<string> {
  const expiresAt = new Date(token.expires_at).getTime();
  if (expiresAt - Date.now() > EXPIRY_SAFETY_MARGIN_MS) {
    return token.access_token;
  }

  const refreshed = await refreshAccessToken(token.refresh_token);
  const newExpiresAt = new Date(Date.now() + refreshed.expires_in * 1000).toISOString();

  await admin
    .from("google_oauth_tokens")
    .update({
      access_token: refreshed.access_token,
      // Google only returns a new refresh_token occasionally; keep the old one otherwise.
      refresh_token: refreshed.refresh_token ?? token.refresh_token,
      expires_at: newExpiresAt,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", token.user_id);

  return refreshed.access_token;
}

function extractNumericValue(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "value" in value) {
    const inner = (value as { value: unknown }).value;
    if (typeof inner === "number") return inner;
  }
  return null;
}

async function syncSleep(admin: SupabaseClient, userId: string, accessToken: string) {
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

async function syncActivity(admin: SupabaseClient, userId: string, accessToken: string) {
  const { dataPoints } = await listDataPoints(accessToken, GOOGLE_HEALTH_DATA_TYPES.exercise);
  if (dataPoints.length === 0) return 0;

  const rows = dataPoints.map((dp: GoogleHealthDataPoint) => ({
    user_id: userId,
    external_id: dp.name,
    type: (dp.metadata?.activityType as string | undefined) ?? null,
    start_time: dp.startTime,
    end_time: dp.endTime,
    steps: null,
    calories: null,
    distance_m: null,
    raw: dp as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await admin.from("activity_sessions").upsert(rows, { onConflict: "user_id,external_id" });
  if (error) throw error;
  return rows.length;
}

async function syncVitals(admin: SupabaseClient, userId: string, accessToken: string) {
  const { dataPoints } = await listDataPoints(accessToken, GOOGLE_HEALTH_DATA_TYPES.heartRate);
  if (dataPoints.length === 0) return 0;

  const rows = dataPoints.map((dp: GoogleHealthDataPoint) => ({
    user_id: userId,
    metric_type: "heart_rate",
    recorded_at: dp.startTime,
    value: extractNumericValue(dp.value),
    unit: "bpm",
    raw: dp as unknown as Record<string, unknown>,
    synced_at: new Date().toISOString(),
  }));

  // No stable external id on vitals readings, so these are append-only inserts.
  const { error } = await admin.from("vitals_readings").insert(rows);
  if (error) throw error;
  return rows.length;
}

/** Pulls the latest data for one connected user and upserts it into Supabase. */
export async function syncUser(admin: SupabaseClient, token: TokenRow) {
  const startedAt = new Date().toISOString();
  const { data: logRow, error: logError } = await admin
    .from("sync_log")
    .insert({ user_id: token.user_id, started_at: startedAt, status: "running" })
    .select("id")
    .single();
  if (logError) throw logError;

  try {
    const accessToken = await getValidAccessToken(admin, token);

    const [sleepCount, activityCount, vitalsCount] = await Promise.all([
      syncSleep(admin, token.user_id, accessToken),
      syncActivity(admin, token.user_id, accessToken),
      syncVitals(admin, token.user_id, accessToken),
    ]);

    await admin
      .from("sync_log")
      .update({
        finished_at: new Date().toISOString(),
        status: "success",
        domains: { sleep: sleepCount, activity: activityCount, vitals: vitalsCount },
      })
      .eq("id", logRow.id);
  } catch (err) {
    await admin
      .from("sync_log")
      .update({
        finished_at: new Date().toISOString(),
        status: "error",
        error: err instanceof Error ? err.message : String(err),
      })
      .eq("id", logRow.id);
    throw err;
  }
}
