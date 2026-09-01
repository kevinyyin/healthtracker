import "server-only";
import { serverEnv } from "@/lib/env.server";
import { REQUESTED_SCOPES } from "@/lib/google-health/scopes";
import { fetchWithRetry, GoogleApiError } from "@/lib/google-health/http";
import type { GoogleOAuthTokenResponse } from "@/lib/google-health/types";

const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";

/** Builds the Google OAuth consent screen URL. `state` should be an unguessable CSRF token. */
export function buildAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: serverEnv.GOOGLE_HEALTH_CLIENT_ID,
    redirect_uri: serverEnv.GOOGLE_HEALTH_REDIRECT_URI,
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    include_granted_scopes: "true",
    scope: REQUESTED_SCOPES.join(" "),
    state,
  });

  return `${AUTH_ENDPOINT}?${params.toString()}`;
}

async function requestToken(body: URLSearchParams): Promise<GoogleOAuthTokenResponse> {
  // fetchWithRetry throws GoogleApiError on failure — a 400 invalid_grant (revoked
  // refresh token) isn't retried, so callers can detect it via err.status/err.body.
  const response = await fetchWithRetry(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });

  return response.json() as Promise<GoogleOAuthTokenResponse>;
}

/** True for a token-endpoint failure that retrying can't fix — the refresh token was
 *  revoked (by the user disconnecting on Google's side, or the grant expiring), so the
 *  only recovery is the user reconnecting via OAuth consent again. */
export function isPermanentAuthError(err: unknown): boolean {
  return err instanceof GoogleApiError && err.status === 400 && /invalid_grant/i.test(err.body);
}

/** Exchanges an authorization code (from the OAuth callback) for access/refresh tokens. */
export function exchangeCodeForTokens(code: string): Promise<GoogleOAuthTokenResponse> {
  return requestToken(
    new URLSearchParams({
      client_id: serverEnv.GOOGLE_HEALTH_CLIENT_ID,
      client_secret: serverEnv.GOOGLE_HEALTH_CLIENT_SECRET,
      code,
      grant_type: "authorization_code",
      redirect_uri: serverEnv.GOOGLE_HEALTH_REDIRECT_URI,
    }),
  );
}

/** Exchanges a stored refresh token for a fresh access token. */
export function refreshAccessToken(refreshToken: string): Promise<GoogleOAuthTokenResponse> {
  return requestToken(
    new URLSearchParams({
      client_id: serverEnv.GOOGLE_HEALTH_CLIENT_ID,
      client_secret: serverEnv.GOOGLE_HEALTH_CLIENT_SECRET,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  );
}
