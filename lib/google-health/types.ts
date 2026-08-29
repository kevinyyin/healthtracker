/**
 * Data type identifiers for the `users/*\/dataTypes/{dataType}/dataPoints` resource path.
 * Confirm these against https://developers.google.com/health/reference/rest before relying
 * on them for real syncs — the API is still rolling out new data types through 2026.
 */
export const GOOGLE_HEALTH_DATA_TYPES = {
  sleep: "sleep",
  steps: "steps",
  exercise: "exercise",
  heartRate: "heart-rate",
  hrv: "heart-rate-variability", // UNCONFIRMED — extrapolated from the kebab-case pattern above
  spo2: "oxygen-saturation", // UNCONFIRMED
  skinTemperature: "skin-temperature", // UNCONFIRMED
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

export interface GoogleHealthDataPoint {
  name: string;
  startTime: string;
  endTime: string;
  value: unknown;
  metadata?: Record<string, unknown>;
}

export interface GoogleHealthDataPointsResponse {
  dataPoints: GoogleHealthDataPoint[];
  nextPageToken?: string;
}
