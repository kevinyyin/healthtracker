import { randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { buildAuthUrl } from "@/lib/google-health/oauth";
import { serverEnv } from "@/lib/env.server";

const STATE_COOKIE = "google_oauth_state";

/** Starts the Google Health OAuth consent flow. Requires an existing Supabase session. */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", serverEnv.APP_BASE_URL));
  }

  const state = randomBytes(32).toString("hex");
  const cookieStore = await cookies();
  cookieStore.set(STATE_COOKIE, state, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    maxAge: 60 * 10,
    path: "/",
  });

  return NextResponse.redirect(buildAuthUrl(state));
}
