const SCOPE_PREFIX = "https://www.googleapis.com/auth/googlehealth";

export const GOOGLE_HEALTH_SCOPES = {
  sleepReadonly: `${SCOPE_PREFIX}.sleep.readonly`,
  activityAndFitnessReadonly: `${SCOPE_PREFIX}.activity_and_fitness.readonly`,
  healthMetricsAndMeasurementsReadonly: `${SCOPE_PREFIX}.health_metrics_and_measurements.readonly`,
  profileReadonly: `${SCOPE_PREFIX}.profile.readonly`,
} as const;

/** Scopes this app requests during the OAuth consent flow. Read-only by design. */
export const REQUESTED_SCOPES = Object.values(GOOGLE_HEALTH_SCOPES);
