import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import { DEFAULT_TIMEZONE } from "@/lib/date";

/**
 * The signed-in user's saved IANA timezone, falling back to DEFAULT_TIMEZONE if they
 * haven't filled in a profile yet. Works with either the session-scoped client (RLS
 * restricts to the caller's own row) or the admin client (sync/cron routes, which have
 * no session and must pass a userId explicitly).
 */
export async function getUserTimezone(client: SupabaseClient, userId: string): Promise<string> {
  const { data } = await client.from("profiles").select("timezone").eq("user_id", userId).maybeSingle();
  return data?.timezone ?? DEFAULT_TIMEZONE;
}
