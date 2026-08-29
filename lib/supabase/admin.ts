import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { env } from "@/lib/env";
import { serverEnv } from "@/lib/env.server";

/**
 * Admin Supabase client using the secret key (sb_secret_..., replaces the legacy
 * service_role key — Supabase is retiring anon/service_role through end of 2026).
 * Bypasses RLS — only use from trusted server code (OAuth callback, cron sync route),
 * never expose to the browser.
 */
export function createAdminClient() {
  return createSupabaseClient(env.NEXT_PUBLIC_SUPABASE_URL, serverEnv.SUPABASE_SECRET_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}
