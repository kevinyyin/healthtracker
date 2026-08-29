import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshAccessToken } from "@/lib/google-health/oauth";
import { syncSleep, syncActivity, syncIntradayHr, syncSparseVitals, tagActiveCalories } from "@/lib/google-health/ingest";
import { syncNightlyRollups } from "@/lib/google-health/rollup";

interface TokenRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

const EXPIRY_SAFETY_MARGIN_MS = 5 * 60 * 1000;

/**
 * Supabase/PostgREST errors (and other plain error-shaped objects) aren't `instanceof
 * Error`, so the naive `err.message` check silently falls through to `String(err)` —
 * which stringifies an object as the useless "[object Object]". Try a `message` field
 * before giving up to a full JSON dump.
 */
export function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object" && "message" in err && typeof err.message === "string") {
    return err.message;
  }
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
}

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

    const [sleepCount, activityCount, intradayCount, sparseVitalsCount] = await Promise.all([
      syncSleep(admin, token.user_id, accessToken),
      syncActivity(admin, token.user_id, accessToken),
      syncIntradayHr(admin, token.user_id, accessToken),
      syncSparseVitals(admin, token.user_id, accessToken),
    ]);

    await tagActiveCalories(admin, token.user_id);
    const rollupCount = await syncNightlyRollups(admin, token.user_id);

    await admin
      .from("sync_log")
      .update({
        finished_at: new Date().toISOString(),
        status: "success",
        domains: {
          sleep: sleepCount,
          activity: activityCount,
          intraday_hr: intradayCount,
          sparse_vitals: sparseVitalsCount,
          rollups: rollupCount,
        },
      })
      .eq("id", logRow.id);
  } catch (err) {
    await admin
      .from("sync_log")
      .update({
        finished_at: new Date().toISOString(),
        status: "error",
        error: describeError(err),
      })
      .eq("id", logRow.id);
    throw err;
  }
}
