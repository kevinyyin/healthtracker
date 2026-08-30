/**
 * Data type identifiers for the `users/*\/dataTypes/{dataType}/dataPoints` resource path.
 * sleep/steps/exercise/heart-rate/heart-rate-variability/oxygen-saturation are all
 * confirmed live against real data (2026-08-30). There's no /dataTypes discovery
 * endpoint, so an unconfirmed ID can only be found wrong by trying it — skin-temperature
 * was tried and 400s with INVALID_PARENT_DATA_TYPE_COLLECTION, so it's deliberately not
 * wired up in ingest.ts pending the real ID.
 */
export const GOOGLE_HEALTH_DATA_TYPES = {
  sleep: "sleep",
  steps: "steps",
  exercise: "exercise",
  heartRate: "heart-rate",
  hrv: "heart-rate-variability",
  spo2: "oxygen-saturation",
  skinTemperature: "skin-temperature", // confirmed INVALID — see comment above
} as const;

export type GoogleHealthDataType =
  (typeof GOOGLE_HEALTH_DATA_TYPES)[keyof typeof GOOGLE_HEALTH_DATA_TYPES];

export interface GoogleOAuthTokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
}

/**
 * A data point's shape is NOT flat — confirmed against the live API (2026-08-30) by
 * probing every data type below. Each point nests its payload under a camelCase key
 * matching its data type (`sleep`, `heartRate`, `heartRateVariability`, ...), itself
 * containing either an `interval` (start/end) or a `sampleTime` (point-in-time), plus
 * type-specific fields. Point-type samples (heart-rate, HRV, SpO2) have no `name` at
 * all. Numeric fields are inconsistently typed by Google — some are JSON numbers
 * (percentage, rootMeanSquareOfSuccessiveDifferencesMilliseconds), others are strings
 * (beatsPerMinute, steps) — so every read must go through a permissive numeric coercion
 * rather than assuming `typeof number`. There's no confirmed way to enumerate valid data
 * type IDs (no /dataTypes discovery endpoint), so this stays a loosely-typed bag rather
 * than a discriminated union per data type.
 */
export interface GoogleHealthDataPoint {
  name?: string;
  dataSource?: Record<string, unknown>;
  [payloadKey: string]: unknown;
}

export interface GoogleHealthDataPointsResponse {
  dataPoints: GoogleHealthDataPoint[];
  nextPageToken?: string;
}
