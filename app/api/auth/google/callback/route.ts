import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { exchangeCodeForTokens } from "@/lib/google-health/oauth";
import { serverEnv } from "@/lib/env.server";

const STATE_COOKIE = "google_oauth_state";

export async function GET(request: NextRequest) {
  const settingsUrl = new URL("/settings", serverEnv.APP_BASE_URL);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", serverEnv.APP_BASE_URL));
  }

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieStore = await cookies();
  const expectedState = cookieStore.get(STATE_COOKIE)?.value;
  cookieStore.delete(STATE_COOKIE);

  if (!code || !state || !expectedState || state !== expectedState) {
    settingsUrl.searchParams.set("error", "invalid_state");
    return NextResponse.redirect(settingsUrl);
  }

  try {
    const tokens = await exchangeCodeForTokens(code);

    if (!tokens.refresh_token) {
      // Google only returns a refresh_token on the first consent for a given client/user
      // pair. If this route is ever hit again without one, the existing row (if any) must
      // already have a refresh_token, or the user needs to revoke access and reconnect.
      settingsUrl.searchParams.set("error", "missing_refresh_token");
      return NextResponse.redirect(settingsUrl);
    }

    const admin = createAdminClient();
    const { error } = await admin.from("google_oauth_tokens").upsert({
      user_id: user.id,
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      scope: tokens.scope,
      expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (error) throw error;

    settingsUrl.searchParams.set("connected", "1");
    return NextResponse.redirect(settingsUrl);
  } catch (err) {
    console.error("Google Health OAuth callback failed", err);
    settingsUrl.searchParams.set("error", "token_exchange_failed");
    return NextResponse.redirect(settingsUrl);
  }
}
