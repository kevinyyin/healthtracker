export const SLEEP_STAGE_COLORS = {
  deep: "#3d5d73",
  rem: "#5a85a0",
  light: "#9cc0ce",
  awake: "#b9afa1",
} as const;

export const BATTERY_COLOR = "#5c7a8c";
export const STRESS_COLOR = "#b8925a";
export const BIO_AGE_COLOR = "#8c6478";
export const CHRONO_AGE_COLOR = "#a39a8c";
export const METRIC_TREND_COLOR = "#52847c";

export const RING_COLORS = {
  strain: STRESS_COLOR,
  recovery: "var(--color-success)",
  sleep: BATTERY_COLOR,
  bioAge: BIO_AGE_COLOR,
} as const;
