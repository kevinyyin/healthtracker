import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env.server";
import { describeError, syncUser } from "@/lib/google-health/sync";

/**
 * Pulls the latest Google Health data for every connected user and upserts it into
 * Supabase. Intended to be invoked by Vercel Cron (see vercel.json) with the
 * `Authorization: Bearer $CRON_SECRET` header Vercel adds automatically; also callable
 * manually with the same header for local testing.
 */
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${serverEnv.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data: tokens, error } = await admin
    .from("google_oauth_tokens")
    .select("user_id, access_token, refresh_token, expires_at")
    // Tokens the circuit breaker has disabled (see lib/google-health/sync.ts) are
    // excluded — without this, a dead/revoked token would retry forever, once per
    // 15-minute cron tick, indefinitely.
    .eq("sync_disabled", false);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = await Promise.allSettled((tokens ?? []).map((token) => syncUser(admin, token)));

  const summary = results.map((result, i) => {
    const user_id = tokens![i].user_id;
    if (result.status === "rejected") {
      return { user_id, status: "error" as const, error: describeError(result.reason) };
    }
    if (result.value.skipped) {
      // GitHub Actions (every 15 min) and Vercel Cron (daily) both hit this route
      // independently — the DB-level lock in syncUser skips a user whose sync is
      // already in flight from the other trigger, rather than racing it.
      return { user_id, status: "skipped" as const, reason: result.value.reason };
    }
    return { user_id, status: "success" as const };
  });

  return NextResponse.json({ synced: summary.length, results: summary });
}
