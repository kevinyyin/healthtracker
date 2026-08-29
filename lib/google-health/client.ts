import "server-only";
import type { GoogleHealthDataPointsResponse, GoogleHealthDataType } from "@/lib/google-health/types";

const BASE_URL = "https://health.googleapis.com/v4";

/**
 * Thin fetch wrapper over the Google Health API. Takes a live access token — callers
 * (the sync route) are responsible for refreshing an expired token before calling this.
 */
export async function listDataPoints(
  accessToken: string,
  dataType: GoogleHealthDataType,
  options: { startTime?: string; endTime?: string; pageToken?: string } = {},
): Promise<GoogleHealthDataPointsResponse> {
  const params = new URLSearchParams();
  if (options.startTime) params.set("startTime", options.startTime);
  if (options.endTime) params.set("endTime", options.endTime);
  if (options.pageToken) params.set("pageToken", options.pageToken);

  const url = `${BASE_URL}/users/me/dataTypes/${dataType}/dataPoints?${params.toString()}`;

  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error(`Google Health API request failed (${response.status}): ${await response.text()}`);
  }

  return response.json() as Promise<GoogleHealthDataPointsResponse>;
}
