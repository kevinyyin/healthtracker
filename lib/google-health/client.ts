import "server-only";
import { fetchWithRetry } from "@/lib/google-health/http";
import type { GoogleHealthDataPoint, GoogleHealthDataPointsResponse, GoogleHealthDataType } from "@/lib/google-health/types";

const BASE_URL = "https://health.googleapis.com/v4";
const MAX_PAGES = 25;

/**
 * dataPoints.list's `filter` query param (AIP-160 syntax, https://google.aip.dev/160)
 * accepts exactly one specific, snake_case member path per data type for time-range
 * filtering — plausible-looking alternatives return
 * INVALID_DATA_POINT_FILTER_DATA_TYPE_MEMBER (e.g. sleep rejects
 * `sleep.interval.start_time` but accepts `sleep.interval.end_time`; exercise rejects
 * both `start_time` and `end_time` but accepts `civil_start_time`). There's no
 * documented reference for this — confirmed empirically against the live API
 * (2026-08-31) for every data type this app actually syncs, by probing candidates and
 * reading the INVALID_DATA_POINT_FILTER_DATA_TYPE_MEMBER responses.
 */
const FILTERABLE_FIELD: Partial<Record<GoogleHealthDataType, { path: string; kind: "utc" | "civil" }>> = {
  sleep: { path: "sleep.interval.end_time", kind: "utc" },
  // Only civil_start_time (local wall-clock, no trailing "Z") is accepted for exercise
  // — not start_time/end_time. Treating our UTC cutoff's clock digits as if they were
  // civil time is an approximation, but the error it introduces (at most the data
  // source's UTC offset, well under a day) is comfortably absorbed by
  // ingest.ts's SYNC_OVERLAP_MS (2 days).
  exercise: { path: "exercise.interval.civil_start_time", kind: "civil" },
  "heart-rate": { path: "heart_rate.sample_time.physical_time", kind: "utc" },
  "heart-rate-variability": { path: "heart_rate_variability.sample_time.physical_time", kind: "utc" },
  "oxygen-saturation": { path: "oxygen_saturation.sample_time.physical_time", kind: "utc" },
};

/**
 * Builds a "everything at/after this instant" filter expression in whichever syntax
 * the given data type's filterable field actually accepts. Returns undefined (an
 * unbounded fetch) for a data type with no confirmed-working filter field, or when
 * there's no prior sync to bound against yet.
 */
export function buildSinceFilter(dataType: GoogleHealthDataType, sinceIso: string | undefined): string | undefined {
  if (!sinceIso) return undefined;
  const field = FILTERABLE_FIELD[dataType];
  if (!field) return undefined;
  const value = field.kind === "civil" ? sinceIso.replace("Z", "") : sinceIso;
  return `${field.path} >= "${value}"`;
}

/**
 * Thin fetch wrapper over the Google Health API. Takes a live access token — callers
 * (the sync route) are responsible for refreshing an expired token before calling this.
 * Retries transient failures (429/5xx) — see lib/google-health/http.ts.
 */
export async function listDataPoints(
  accessToken: string,
  dataType: GoogleHealthDataType,
  options: { filter?: string; pageToken?: string } = {},
): Promise<GoogleHealthDataPointsResponse> {
  const params = new URLSearchParams();
  if (options.filter) params.set("filter", options.filter);
  if (options.pageToken) params.set("pageToken", options.pageToken);

  const url = `${BASE_URL}/users/me/dataTypes/${dataType}/dataPoints?${params.toString()}`;

  const response = await fetchWithRetry(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  // Google omits `dataPoints` entirely (rather than returning []) when a data type has
  // no points in the requested range, so default it — callers rely on it always being an array.
  const body = (await response.json()) as Partial<GoogleHealthDataPointsResponse>;
  return { dataPoints: body.dataPoints ?? [], nextPageToken: body.nextPageToken };
}

/**
 * Follows `nextPageToken` until Google stops returning one, concatenating every page's
 * `dataPoints`. Capped at MAX_PAGES as a safety backstop (a single page has historically
 * been enough for a personal dashboard's data volumes) — if the cap is hit, whatever was
 * fetched so far is still returned rather than thrown away, and a warning is logged so
 * the truncation isn't silent.
 */
export async function listAllDataPoints(
  accessToken: string,
  dataType: GoogleHealthDataType,
  options: { filter?: string } = {},
): Promise<GoogleHealthDataPoint[]> {
  const all: GoogleHealthDataPoint[] = [];
  let pageToken: string | undefined;
  let pages = 0;

  do {
    const page = await listDataPoints(accessToken, dataType, { ...options, pageToken });
    all.push(...page.dataPoints);
    pageToken = page.nextPageToken;
    pages += 1;
  } while (pageToken && pages < MAX_PAGES);

  if (pageToken) {
    console.error(`listAllDataPoints: hit MAX_PAGES (${MAX_PAGES}) for ${dataType} — more pages remained`);
  }

  return all;
}
