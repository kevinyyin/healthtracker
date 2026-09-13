import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import { env } from "@/lib/env";

/**
 * Supabase client for use in Server Components, Route Handlers, and Server Actions.
 * Respects RLS as the signed-in user (reads the session from cookies).
 */
export const createClient = cache(async () => {
  const cookieStore = await cookies();

  return createServerClient(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component with no writable response — middleware
          // refreshes the session instead, so this is safe to ignore.
        }
      },
    },
  });
});

/**
 * Returns the signed-in user's Supabase client + user, redirecting to /login if unauthenticated.
 * Wrapped in React's cache() so the layout and page rendering the same navigation share one
 * auth.getUser() network round-trip instead of each calling it separately.
 */
export const requireUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return { supabase, user };
});
