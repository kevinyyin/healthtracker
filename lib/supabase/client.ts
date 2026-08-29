import { createBrowserClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/** Supabase client for use in Client Components. Respects RLS as the signed-in user. */
export function createClient() {
  return createBrowserClient(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
  );
}
