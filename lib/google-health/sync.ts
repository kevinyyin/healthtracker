import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { refreshAccessToken, isPermanentAuthError } from "@/lib/google-health/oauth";
import { syncSleep, syncActivity, syncIntradayHr, syncSparseVitals, tagActiveCalories } from "@/lib/google-health/ingest";
import { syncNightlyRollups } from "@/lib/google-health/rollup";
import { evaluateAndSendAlerts } from "@/lib/google-health/alerts";
import { getUserTimezone } from "@/lib/timezone";

interface TokenRow {
  user_id: string;
  access_token: string;
  refresh_token: string;
  expires_at: string;
}

const EXPIRY_SAFETY_MARGIN_MS = 5 * 60 * 1000;
const MAX_CONSECUTIVE_FAILURES = 5;
/** A "running" sync_log row older than this is assumed to be from a crashed/interrupted
 *  run rather than a genuinely in-flight one, and is reaped so it doesn't permanently
 *  block future syncs via the one-running-per-user unique index (see migration 0009). */
const STALE_RUNNING_MS = 15 * 60 * 1000;
/** Postgres SQLSTATE for unique_violation. */
const UNIQUE_VIOLATION = "23505";

export type SyncResult = { skipped: true; reason: string } | { skipped: false };

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

/** Marks the token row as healthy again — called after a successful sync. */
async function markTokenHealthy(admin: SupabaseClient, userId: string) {
  await admin
    .from("google_oauth_tokens")
    .update({ consecutive_failures: 0, sync_disabled: false, last_error: null })
    .eq("user_id", userId);
}

/**
 * Records a sync failure against the token row, disabling further automatic sync
 * attempts either immediately (a permanent auth error — the refresh token was revoked,
 * so retrying is pointless) or once MAX_CONSECUTIVE_FAILURES is reached (a persistent
 * transient failure). Without this, a dead token would retry forever, once per cron
 * tick, indefinitely.
 */
async function recordTokenFailure(admin: SupabaseClient, userId: string, err: unknown) {
  const { data: current } = await admin
    .from("google_oauth_tokens")
    .select("consecutive_failures")
    .eq("user_id", userId)
    .maybeSingle();

  const failures = (current?.consecutive_failures ?? 0) + 1;
  const permanent = isPermanentAuthError(err);

  await admin
    .from("google_oauth_tokens")
    .update({
      consecutive_failures: failures,
      last_error: describeError(err),
      sync_disabled: permanent || failures >= MAX_CONSECUTIVE_FAILURES,
    })
    .eq("user_id", userId);
}

/**
 * Reaps a stale "running" sync_log row for this user (see STALE_RUNNING_MS), then
 * inserts a fresh one. GitHub Actions (every 15 min) and Vercel Cron (daily) both hit
 * /api/sync independently — if another trigger already has this user's sync in flight,
 * the one-running-per-user unique index (migration 0009) makes this insert fail with a
 * unique_violation, which is treated as "skip, don't race it" rather than an error.
 */
async function claimSyncLock(
  admin: SupabaseClient,
  userId: string,
): Promise<{ logId: string } | { skipped: true }> {
  await admin
    .from("sync_log")
    .update({ status: "error", error: "timed out (stale running row)", finished_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("status", "running")
    .lt("started_at", new Date(Date.now() - STALE_RUNNING_MS).toISOString());

  const { data: logRow, error: logError } = await admin
    .from("sync_log")
    .insert({ user_id: userId, started_at: new Date().toISOString(), status: "running" })
    .select("id")
    .single();

  if (logError) {
    if (logError.code === UNIQUE_VIOLATION) {
      return { skipped: true };
    }
    throw logError;
  }

  return { logId: logRow.id };
}

/** Pulls the latest data for one connected user and upserts it into Supabase. */
export async function syncUser(admin: SupabaseClient, token: TokenRow): Promise<SyncResult> {
  const claim = await claimSyncLock(admin, token.user_id);
  if ("skipped" in claim) {
    return { skipped: true, reason: "sync already running" };
  }
  const { logId } = claim;

  try {
    const accessToken = await getValidAccessToken(admin, token);
    const timezone = await getUserTimezone(admin, token.user_id);

    const [sleepCount, activityCount, intradayCount, sparseVitalsCount] = await Promise.all([
      syncSleep(admin, token.user_id, accessToken),
      syncActivity(admin, token.user_id, accessToken),
      syncIntradayHr(admin, token.user_id, accessToken),
      syncSparseVitals(admin, token.user_id, accessToken),
    ]);

    await tagActiveCalories(admin, token.user_id);
    const rollupCount = await syncNightlyRollups(admin, token.user_id, timezone);
    await evaluateAndSendAlerts(admin, token.user_id, timezone);

    await markTokenHealthy(admin, token.user_id);

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
      .eq("id", logId);

    return { skipped: false };
  } catch (err) {
    await recordTokenFailure(admin, token.user_id, err);

    await admin
      .from("sync_log")
      .update({
        finished_at: new Date().toISOString(),
        status: "error",
        error: describeError(err),
      })
      .eq("id", logId);
    throw err;
  }
}
