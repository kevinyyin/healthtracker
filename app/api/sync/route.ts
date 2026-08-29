import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { serverEnv } from "@/lib/env.server";
import { syncUser } from "@/lib/google-health/sync";

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
    .select("user_id, access_token, refresh_token, expires_at");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const results = await Promise.allSettled((tokens ?? []).map((token) => syncUser(admin, token)));

  const summary = results.map((result, i) => ({
    user_id: tokens![i].user_id,
    status: result.status,
    ...(result.status === "rejected" ? { error: String(result.reason) } : {}),
  }));

  return NextResponse.json({ synced: summary.length, results: summary });
}
